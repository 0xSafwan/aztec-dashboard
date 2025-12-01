// API Route: /api/provers
// Aztec Ignition Prover Dashboard - v5 with correct epoch parsing

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const ROLLUP_CONTRACT = '0x603bb2c05d474794ea97805e8de69bccfb3bca12';
  
  const debug = { step: 'starting' };
  
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'API key not set',
        data: emptyData()
      });
    }
    
    // Fetch transactions using V2 API
    const etherscanUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${ROLLUP_CONTRACT}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    
    const response = await fetch(etherscanUrl);
    const data = await response.json();
    
    if (data.status !== '1' || !Array.isArray(data.result)) {
      return res.status(200).json({
        success: false,
        error: `Etherscan error: ${data.message || data.result}`,
        debug,
        data: emptyData()
      });
    }
    
    const transactions = data.result;
    
    // Filter incoming transactions to the contract
    const incomingTxs = transactions.filter(tx => 
      tx.isError === '0' && 
      tx.to && 
      tx.to.toLowerCase() === ROLLUP_CONTRACT.toLowerCase()
    );
    
    debug.totalTxs = transactions.length;
    debug.incomingTxs = incomingTxs.length;
    
    const epochMap = new Map();
    const proverMap = new Map();
    const submissions = [];
    
    incomingTxs.forEach(tx => {
      // Parse epoch number from transaction input data
      // The "submitEpochProof" function has the epoch number in the input
      // Function signature: 0x12345678 followed by parameters
      // Epoch number is typically in the first parameter (bytes 10-74, first uint256)
      
      let epochNum = 0;
      const input = tx.input || '';
      
      if (input.length >= 74) {
        // Extract epoch number from input data
        // Skip function selector (first 10 chars including 0x)
        // First parameter is usually the epoch number
        try {
          const epochHex = '0x' + input.slice(10, 74);
          epochNum = parseInt(epochHex, 16);
          
          // Sanity check - if epoch is unreasonably large, it might be wrong parameter
          if (epochNum > 100000) {
            // Try alternative: sometimes epoch is in different position
            // Check if there's a smaller number in the data
            const altEpochHex = '0x' + input.slice(74, 138);
            const altEpoch = parseInt(altEpochHex, 16);
            if (altEpoch > 0 && altEpoch < 100000) {
              epochNum = altEpoch;
            }
          }
        } catch (e) {
          epochNum = 0;
        }
      }
      
      // If epoch parsing failed, skip this transaction
      if (epochNum === 0 || epochNum > 100000) {
        return;
      }
      
      const prover = tx.from.toLowerCase();
      const timestamp = parseInt(tx.timeStamp) * 1000;
      const gasUsed = parseInt(tx.gasUsed);
      const gasPrice = parseInt(tx.gasPrice || 0);
      const txFee = (gasUsed * gasPrice) / 1e18; // ETH
      
      submissions.push({
        id: tx.hash,
        epochNumber: epochNum,
        prover: tx.from,
        gasUsed,
        txFee: parseFloat(txFee.toFixed(6)),
        timestamp,
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber),
        status: 'confirmed'
      });
      
      // Epoch tracking
      if (!epochMap.has(epochNum)) {
        epochMap.set(epochNum, {
          epochNumber: epochNum,
          provers: new Map(),
          totalGas: 0,
          totalFee: 0,
          timestamp: timestamp,
          status: 'proven',
          submissionCount: 0
        });
      }
      
      const epoch = epochMap.get(epochNum);
      epoch.submissionCount += 1;
      
      if (!epoch.provers.has(prover)) {
        epoch.provers.set(prover, {
          address: tx.from,
          gasUsed: 0,
          txFee: 0,
          proofCount: 0,
          timestamp
        });
      }
      
      const epochProver = epoch.provers.get(prover);
      epochProver.gasUsed += gasUsed;
      epochProver.txFee += txFee;
      epochProver.proofCount += 1;
      epoch.totalGas += gasUsed;
      epoch.totalFee += txFee;
      epoch.timestamp = Math.max(epoch.timestamp, timestamp);
      
      // Prover tracking
      if (!proverMap.has(prover)) {
        proverMap.set(prover, {
          address: tx.from,
          totalGasUsed: 0,
          totalTxFee: 0,
          totalProofs: 0,
          epochs: new Set(),
          firstSeen: timestamp,
          lastSeen: timestamp
        });
      }
      
      const proverStats = proverMap.get(prover);
      proverStats.totalGasUsed += gasUsed;
      proverStats.totalTxFee += txFee;
      proverStats.totalProofs += 1;
      proverStats.epochs.add(epochNum);
      proverStats.lastSeen = Math.max(proverStats.lastSeen, timestamp);
    });
    
    // Convert to arrays
    const epochs = Array.from(epochMap.values())
      .map(e => ({
        epochNumber: e.epochNumber,
        proverCount: e.provers.size,
        provers: Array.from(e.provers.values()).map(p => ({
          ...p,
          txFee: parseFloat(p.txFee.toFixed(6))
        })),
        totalGas: e.totalGas,
        totalFee: parseFloat(e.totalFee.toFixed(6)),
        submissionCount: e.submissionCount,
        timestamp: e.timestamp,
        status: e.status
      }))
      .sort((a, b) => b.epochNumber - a.epochNumber);
    
    const provers = Array.from(proverMap.values())
      .map(p => ({
        address: p.address,
        totalGasUsed: p.totalGasUsed,
        totalTxFee: parseFloat(p.totalTxFee.toFixed(6)),
        totalProofs: p.totalProofs,
        epochCount: p.epochs.size,
        avgFeePerEpoch: parseFloat((p.totalTxFee / p.epochs.size).toFixed(6)),
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen
      }))
      .sort((a, b) => b.totalProofs - a.totalProofs);
    
    const stats = {
      totalGasUsed: provers.reduce((sum, p) => sum + p.totalGasUsed, 0),
      totalTxFees: parseFloat(provers.reduce((sum, p) => sum + p.totalTxFee, 0).toFixed(6)),
      totalProofs: provers.reduce((sum, p) => sum + p.totalProofs, 0),
      totalEpochs: epochs.length,
      activeProvers: provers.length,
      currentEpoch: epochs.length > 0 ? epochs[0].epochNumber : 0
    };
    
    debug.step = 'complete';
    debug.epochsFound = epochs.length;
    debug.proversFound = provers.length;
    debug.currentEpoch = stats.currentEpoch;
    
    return res.status(200).json({
      success: true,
      data: {
        epochs: epochs.slice(0, 100),
        provers,
        submissions: submissions.slice(0, 200),
        stats
      },
      debug,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      debug,
      data: emptyData()
    });
  }
}

function emptyData() {
  return {
    epochs: [],
    provers: [],
    submissions: [],
    stats: {
      totalGasUsed: 0,
      totalTxFees: 0,
      totalProofs: 0,
      totalEpochs: 0,
      activeProvers: 0,
      currentEpoch: 0
    }
  };
}
