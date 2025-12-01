// API Route: /api/provers
// This runs on Vercel's servers, so no CORS issues!

const AZTEC_CONFIG = {
  ROLLUP_CONTRACT: '0x603bb2c05D474794ea97805e8De69bCcFb3bCA12',
  GENESIS_BLOCK: 21218000,
  BLOCKS_PER_EPOCH: 32
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get API key from environment variable (set in Vercel dashboard)
    const apiKey = process.env.ETHERSCAN_API_KEY || 'YourApiKeyToken';
    
    // Fetch transactions to the rollup contract
    const txUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${AZTEC_CONFIG.ROLLUP_CONTRACT}&startblock=${AZTEC_CONFIG.GENESIS_BLOCK}&endblock=latest&sort=desc&apikey=${apiKey}`;
    
    const txResponse = await fetch(txUrl);
    const txData = await txResponse.json();
    
    if (txData.status !== '1') {
      // Return empty data if no transactions or error
      return res.status(200).json({
        success: true,
        data: {
          epochs: [],
          provers: [],
          submissions: [],
          stats: {
            totalRewards: 0,
            totalProofs: 0,
            totalEpochs: 0,
            activeProvers: 0
          }
        },
        message: txData.message || 'No data found'
      });
    }
    
    const transactions = txData.result;
    
    // Process transactions into epochs and provers
    const processed = processTransactions(transactions);
    
    res.status(200).json({
      success: true,
      data: processed,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function getEpochFromBlock(blockNumber) {
  return Math.floor((blockNumber - AZTEC_CONFIG.GENESIS_BLOCK) / AZTEC_CONFIG.BLOCKS_PER_EPOCH);
}

function processTransactions(transactions) {
  const epochMap = new Map();
  const proverMap = new Map();
  const submissions = [];
  
  // Filter successful transactions
  const validTxs = transactions.filter(tx => 
    tx.isError === '0' && 
    tx.to?.toLowerCase() === AZTEC_CONFIG.ROLLUP_CONTRACT.toLowerCase()
  );
  
  validTxs.forEach((tx, index) => {
    const blockNum = parseInt(tx.blockNumber);
    const epochNum = getEpochFromBlock(blockNum);
    const prover = tx.from.toLowerCase();
    const timestamp = parseInt(tx.timeStamp) * 1000;
    const gasUsed = parseInt(tx.gasUsed);
    
    // Simulated reward (in real implementation, this would come from event logs)
    // Reward calculation would need to parse the actual contract events
    const estimatedReward = parseFloat((gasUsed / 10000).toFixed(4));
    
    // Track submissions
    submissions.push({
      id: tx.hash,
      epochNumber: epochNum,
      prover: tx.from,
      gasUsed,
      reward: estimatedReward,
      proofCount: 1,
      timestamp,
      txHash: tx.hash,
      blockNumber: blockNum,
      status: 'confirmed'
    });
    
    // Epoch tracking
    if (!epochMap.has(epochNum)) {
      epochMap.set(epochNum, {
        epochNumber: epochNum,
        blockStart: AZTEC_CONFIG.GENESIS_BLOCK + (epochNum * AZTEC_CONFIG.BLOCKS_PER_EPOCH),
        blockEnd: AZTEC_CONFIG.GENESIS_BLOCK + ((epochNum + 1) * AZTEC_CONFIG.BLOCKS_PER_EPOCH) - 1,
        provers: [],
        proverAddresses: new Set(),
        totalReward: 0,
        totalGas: 0,
        timestamp: timestamp,
        status: 'proven'
      });
    }
    
    const epoch = epochMap.get(epochNum);
    if (!epoch.proverAddresses.has(prover)) {
      epoch.proverAddresses.add(prover);
      epoch.provers.push({
        address: tx.from,
        gasUsed,
        reward: estimatedReward,
        proofCount: 1,
        timestamp
      });
    } else {
      const existingProver = epoch.provers.find(p => p.address.toLowerCase() === prover);
      if (existingProver) {
        existingProver.gasUsed += gasUsed;
        existingProver.reward += estimatedReward;
        existingProver.proofCount += 1;
      }
    }
    epoch.totalReward += estimatedReward;
    epoch.totalGas += gasUsed;
    epoch.timestamp = Math.max(epoch.timestamp, timestamp);
    
    // Prover tracking
    if (!proverMap.has(prover)) {
      proverMap.set(prover, {
        address: tx.from,
        totalRewards: 0,
        totalProofs: 0,
        totalGasUsed: 0,
        epochsParticipated: new Set(),
        submissions: [],
        firstSeen: timestamp,
        lastSeen: timestamp
      });
    }
    
    const proverStats = proverMap.get(prover);
    proverStats.totalRewards += estimatedReward;
    proverStats.totalProofs += 1;
    proverStats.totalGasUsed += gasUsed;
    proverStats.epochsParticipated.add(epochNum);
    proverStats.submissions.push({
      epochNumber: epochNum,
      reward: estimatedReward,
      proofCount: 1,
      timestamp,
      txHash: tx.hash
    });
    proverStats.firstSeen = Math.min(proverStats.firstSeen, timestamp);
    proverStats.lastSeen = Math.max(proverStats.lastSeen, timestamp);
  });
  
  // Convert maps to arrays
  const epochs = Array.from(epochMap.values())
    .map(e => ({
      ...e,
      proverCount: e.provers.length,
      totalReward: parseFloat(e.totalReward.toFixed(4)),
      proverAddresses: undefined // Remove Set from response
    }))
    .sort((a, b) => b.epochNumber - a.epochNumber);
  
  const provers = Array.from(proverMap.values())
    .map(p => ({
      ...p,
      totalRewards: parseFloat(p.totalRewards.toFixed(4)),
      epochCount: p.epochsParticipated.size,
      avgRewardPerEpoch: parseFloat((p.totalRewards / p.epochsParticipated.size).toFixed(4)),
      epochsParticipated: undefined // Remove Set from response
    }))
    .sort((a, b) => b.totalRewards - a.totalRewards);
  
  // Calculate stats
  const stats = {
    totalRewards: parseFloat(provers.reduce((sum, p) => sum + p.totalRewards, 0).toFixed(4)),
    totalProofs: provers.reduce((sum, p) => sum + p.totalProofs, 0),
    totalEpochs: epochs.length,
    activeProvers: provers.length
  };
  
  return {
    epochs: epochs.slice(0, 100), // Limit to 100 epochs
    provers,
    submissions: submissions.slice(0, 200), // Limit to 200 submissions
    stats
  };
}
