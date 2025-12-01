// API Route: /api/provers
// Aztec Ignition Prover Dashboard - Using Etherscan API V2

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const ROLLUP_CONTRACT = '0x603bb2c05d474794ea97805e8de69bccfb3bca12';
  const BLOCKS_PER_EPOCH = 32;
  
  const debug = {
    step: 'starting',
    apiKeyExists: false,
    apiKeyLength: 0
  };
  
  try {
    debug.step = 'checking_api_key';
    const apiKey = process.env.ETHERSCAN_API_KEY;
    debug.apiKeyExists = !!apiKey;
    debug.apiKeyLength = apiKey ? apiKey.length : 0;
    debug.apiKeyPreview = apiKey ? apiKey.substring(0, 8) + '...' : 'NOT SET';
    
    if (!apiKey) {
      return res.status(200).json({
        success: false,
        error: 'ETHERSCAN_API_KEY environment variable is not set',
        debug,
        data: emptyData()
      });
    }
    
    // UPDATED: Using Etherscan API V2 with chainid=1 for Ethereum mainnet
    debug.step = 'building_url';
    const etherscanUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${ROLLUP_CONTRACT}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    debug.etherscanUrl = etherscanUrl.replace(apiKey, 'HIDDEN');
    
    debug.step = 'fetching';
    const response = await fetch(etherscanUrl);
    debug.fetchStatus = response.status;
    debug.fetchOk = response.ok;
    
    debug.step = 'parsing';
    const data = await response.json();
    debug.etherscanStatus = data.status;
    debug.etherscanMessage = data.message;
    debug.resultType = typeof data.result;
    debug.resultLength = Array.isArray(data.result) ? data.result.length : 'not array';
    
    if (data.status !== '1') {
      debug.step = 'etherscan_error';
      return res.status(200).json({
        success: false,
        error: `Etherscan returned: ${data.message || data.result}`,
        debug,
        data: emptyData()
      });
    }
    
    if (!Array.isArray(data.result) || data.result.length === 0) {
      debug.step = 'no_transactions';
      return res.status(200).json({
        success: false,
        error: 'No transactions found',
        debug,
        data: emptyData()
      });
    }
    
    debug.step = 'processing';
    const transactions = data.result;
    
    const allBlocks = transactions.map(tx => parseInt(tx.blockNumber));
    const genesisBlock = Math.min(...allBlocks);
    debug.genesisBlock = genesisBlock;
    debug.latestBlock = Math.max(...allBlocks);
    
    const incomingTxs = transactions.filter(tx => 
      tx.isError === '0' && 
      tx.to && 
      tx.to.toLowerCase() === ROLLUP_CONTRACT.toLowerCase()
    );
    debug.incomingTxCount = incomingTxs.length;
    
    const epochMap = new Map();
    const proverMap = new Map();
    const submissions = [];
    
    incomingTxs.forEach(tx => {
      const blockNum = parseInt(tx.blockNumber);
      const epochNum = Math.floor((blockNum - genesisBlock) / BLOCKS_PER_EPOCH);
      const prover = tx.from.toLowerCase();
      const timestamp = parseInt(tx.timeStamp) * 1000;
      const gasUsed = parseInt(tx.gasUsed);
      const reward = parseFloat((gasUsed / 10000).toFixed(4));
      
      submissions.push({
        id: tx.hash,
        epochNumber: epochNum,
        prover: tx.from,
        gasUsed,
        reward,
        timestamp,
        txHash: tx.hash,
        blockNumber: blockNum,
        status: 'confirmed'
      });
      
      if (!epochMap.has(epochNum)) {
        epochMap.set(epochNum, {
          epochNumber: epochNum,
          blockStart: genesisBlock + (epochNum * BLOCKS_PER_EPOCH),
          blockEnd: genesisBlock + ((epochNum + 1) * BLOCKS_PER_EPOCH) - 1,
          provers: new Map(),
          totalReward: 0,
          totalGas: 0,
          timestamp: timestamp,
          status: 'proven'
        });
      }
      
      const epoch = epochMap.get(epochNum);
      if (!epoch.provers.has(prover)) {
        epoch.provers.set(prover, {
          address: tx.from,
          gasUsed: 0,
          reward: 0,
          proofCount: 0,
          timestamp
        });
      }
      const epochProver = epoch.provers.get(prover);
      epochProver.gasUsed += gasUsed;
      epochProver.reward += reward;
      epochProver.proofCount += 1;
      epoch.totalReward += reward;
      epoch.totalGas += gasUsed;
      epoch.timestamp = Math.max(epoch.timestamp, timestamp);
      
      if (!proverMap.has(prover)) {
        proverMap.set(prover, {
          address: tx.from,
          totalRewards: 0,
          totalProofs: 0,
          totalGasUsed: 0,
          epochs: new Set(),
          firstSeen: timestamp,
          lastSeen: timestamp
        });
      }
      const proverStats = proverMap.get(prover);
      proverStats.totalRewards += reward;
      proverStats.totalProofs += 1;
      proverStats.totalGasUsed += gasUsed;
      proverStats.epochs.add(epochNum);
      proverStats.lastSeen = Math.max(proverStats.lastSeen, timestamp);
    });
    
    const epochs = Array.from(epochMap.values())
      .map(e => ({
        epochNumber: e.epochNumber,
        blockStart: e.blockStart,
        blockEnd: e.blockEnd,
        proverCount: e.provers.size,
        provers: Array.from(e.provers.values()),
        totalReward: parseFloat(e.totalReward.toFixed(4)),
        totalGas: e.totalGas,
        timestamp: e.timestamp,
        status: e.status
      }))
      .sort((a, b) => b.epochNumber - a.epochNumber);
    
    const provers = Array.from(proverMap.values())
      .map(p => ({
        address: p.address,
        totalRewards: parseFloat(p.totalRewards.toFixed(4)),
        totalProofs: p.totalProofs,
        totalGasUsed: p.totalGasUsed,
        epochCount: p.epochs.size,
        avgRewardPerEpoch: parseFloat((p.totalRewards / p.epochs.size).toFixed(4)),
        firstSeen: p.firstSeen,
        lastSeen: p.lastSeen
      }))
      .sort((a, b) => b.totalRewards - a.totalRewards);
    
    const stats = {
      totalRewards: parseFloat(provers.reduce((sum, p) => sum + p.totalRewards, 0).toFixed(4)),
      totalProofs: provers.reduce((sum, p) => sum + p.totalProofs, 0),
      totalEpochs: epochs.length,
      activeProvers: provers.length
    };
    
    debug.step = 'complete';
    debug.processedEpochs = epochs.length;
    debug.processedProvers = provers.length;
    
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
    debug.step = 'error';
    debug.error = error.message;
    
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
      totalRewards: 0,
      totalProofs: 0,
      totalEpochs: 0,
      activeProvers: 0
    }
  };
}
