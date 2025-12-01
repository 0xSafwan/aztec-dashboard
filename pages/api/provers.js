// API Route: /api/provers
// Simple Aztec Prover Rewards Checker

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const ROLLUP_CONTRACT = '0x603bb2c05d474794ea97805e8de69bccfb3bca12';
  
  // Get prover address from query (optional)
  const { prover } = req.query;
  
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'API key not configured'
      });
    }
    
    // Fetch transactions to the rollup contract
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${ROLLUP_CONTRACT}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1' || !Array.isArray(data.result)) {
      return res.status(200).json({
        success: false,
        error: data.message || 'Failed to fetch data'
      });
    }
    
    // Filter successful incoming transactions
    const txs = data.result.filter(tx => 
      tx.isError === '0' && 
      tx.to?.toLowerCase() === ROLLUP_CONTRACT.toLowerCase()
    );
    
    // Parse epoch from input data and group by epoch
    const epochData = new Map();
    const proverData = new Map();
    
    txs.forEach(tx => {
      const input = tx.input || '';
      if (input.length < 74) return;
      
      // Parse epoch number from first parameter
      let epochNum = 0;
      try {
        const epochHex = '0x' + input.slice(10, 74);
        epochNum = parseInt(epochHex, 16);
        if (epochNum > 50000 || epochNum < 1) return;
      } catch (e) {
        return;
      }
      
      const proverAddr = tx.from.toLowerCase();
      const timestamp = parseInt(tx.timeStamp) * 1000;
      const gasUsed = parseInt(tx.gasUsed);
      const gasPrice = parseInt(tx.gasPrice || 0);
      const txFeeEth = (gasUsed * gasPrice) / 1e18;
      
      // Track epoch data
      if (!epochData.has(epochNum)) {
        epochData.set(epochNum, {
          epochNumber: epochNum,
          provers: new Set(),
          submissions: [],
          timestamp: timestamp,
          totalGas: 0
        });
      }
      
      const epoch = epochData.get(epochNum);
      epoch.provers.add(proverAddr);
      epoch.totalGas += gasUsed;
      epoch.timestamp = Math.max(epoch.timestamp, timestamp);
      epoch.submissions.push({
        prover: tx.from,
        txHash: tx.hash,
        gasUsed,
        txFeeEth,
        timestamp
      });
      
      // Track prover data
      if (!proverData.has(proverAddr)) {
        proverData.set(proverAddr, {
          address: tx.from,
          epochs: new Map(),
          totalSubmissions: 0,
          totalGasUsed: 0,
          totalTxFeeEth: 0
        });
      }
      
      const proverInfo = proverData.get(proverAddr);
      proverInfo.totalSubmissions += 1;
      proverInfo.totalGasUsed += gasUsed;
      proverInfo.totalTxFeeEth += txFeeEth;
      
      if (!proverInfo.epochs.has(epochNum)) {
        proverInfo.epochs.set(epochNum, {
          epochNumber: epochNum,
          submissions: 0,
          gasUsed: 0,
          txFeeEth: 0,
          timestamp
        });
      }
      
      const proverEpoch = proverInfo.epochs.get(epochNum);
      proverEpoch.submissions += 1;
      proverEpoch.gasUsed += gasUsed;
      proverEpoch.txFeeEth += txFeeEth;
    });
    
    // Get current/latest epoch
    const allEpochs = Array.from(epochData.keys()).sort((a, b) => b - a);
    const currentEpoch = allEpochs[0] || 0;
    
    // Build response
    const epochs = allEpochs.slice(0, 100).map(num => {
      const e = epochData.get(num);
      return {
        epochNumber: num,
        proverCount: e.provers.size,
        submissionCount: e.submissions.length,
        timestamp: e.timestamp
      };
    });
    
    // If specific prover requested, return their data
    if (prover) {
      const proverLower = prover.toLowerCase();
      const proverInfo = proverData.get(proverLower);
      
      if (!proverInfo) {
        return res.status(200).json({
          success: true,
          prover: prover,
          found: false,
          message: 'Prover not found',
          currentEpoch
        });
      }
      
      const proverEpochs = Array.from(proverInfo.epochs.values())
        .sort((a, b) => b.epochNumber - a.epochNumber);
      
      return res.status(200).json({
        success: true,
        prover: proverInfo.address,
        found: true,
        currentEpoch,
        summary: {
          totalEpochsParticipated: proverInfo.epochs.size,
          totalSubmissions: proverInfo.totalSubmissions,
          totalGasUsed: proverInfo.totalGasUsed,
          totalTxFeeEth: parseFloat(proverInfo.totalTxFeeEth.toFixed(6))
        },
        epochs: proverEpochs.map(e => ({
          epochNumber: e.epochNumber,
          submissions: e.submissions,
          gasUsed: e.gasUsed,
          txFeeEth: parseFloat(e.txFeeEth.toFixed(6))
        })),
        lastUpdated: new Date().toISOString()
      });
    }
    
    // Return general stats
    const allProvers = Array.from(proverData.values())
      .map(p => ({
        address: p.address,
        epochCount: p.epochs.size,
        totalSubmissions: p.totalSubmissions,
        totalGasUsed: p.totalGasUsed,
        totalTxFeeEth: parseFloat(p.totalTxFeeEth.toFixed(6))
      }))
      .sort((a, b) => b.totalSubmissions - a.totalSubmissions);
    
    return res.status(200).json({
      success: true,
      currentEpoch,
      stats: {
        totalEpochs: epochData.size,
        totalProvers: proverData.size,
        totalSubmissions: txs.length
      },
      recentEpochs: epochs.slice(0, 20),
      topProvers: allProvers.slice(0, 20),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
