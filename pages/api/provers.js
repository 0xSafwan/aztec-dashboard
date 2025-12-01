export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const ROLLUP_CONTRACT = '0x603bb2c05d474794ea97805e8de69bccfb3bca12';
  const { prover } = req.query;
  
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return res.status(200).json({ success: false, error: 'API key not configured' });
    }
    
    const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=${ROLLUP_CONTRACT}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
    const txResponse = await fetch(txUrl);
    const txData = await txResponse.json();
    
    if (txData.status !== '1' || !Array.isArray(txData.result)) {
      return res.status(200).json({ success: false, error: txData.message || 'Failed to fetch' });
    }
    
    const txs = txData.result.filter(tx => 
      tx.isError === '0' && tx.to?.toLowerCase() === ROLLUP_CONTRACT.toLowerCase()
    );
    
    const epochData = new Map();
    const proverData = new Map();
    const BASE_EPOCH_REWARD = 625; // AZTEC per epoch
    
    txs.forEach(tx => {
      const input = tx.input || '';
      if (input.length < 74) return;
      
      let epochNum = 0;
      try {
        epochNum = parseInt('0x' + input.slice(10, 74), 16);
        if (epochNum > 50000 || epochNum < 1) return;
      } catch (e) { return; }
      
      const proverAddr = tx.from.toLowerCase();
      const timestamp = parseInt(tx.timeStamp) * 1000;
      const gasUsed = parseInt(tx.gasUsed);
      
      if (!epochData.has(epochNum)) {
        epochData.set(epochNum, { epochNumber: epochNum, provers: new Map(), timestamp, totalReward: BASE_EPOCH_REWARD });
      }
      
      const epoch = epochData.get(epochNum);
      epoch.timestamp = Math.max(epoch.timestamp, timestamp);
      
      if (!epoch.provers.has(proverAddr)) {
        epoch.provers.set(proverAddr, { address: tx.from, submissions: 0, gasUsed: 0 });
      }
      epoch.provers.get(proverAddr).submissions += 1;
      epoch.provers.get(proverAddr).gasUsed += gasUsed;
      
      if (!proverData.has(proverAddr)) {
        proverData.set(proverAddr, { address: tx.from, epochs: new Map(), totalSubmissions: 0, totalGasUsed: 0 });
      }
      
      const proverInfo = proverData.get(proverAddr);
      proverInfo.totalSubmissions += 1;
      proverInfo.totalGasUsed += gasUsed;
      
      if (!proverInfo.epochs.has(epochNum)) {
        proverInfo.epochs.set(epochNum, { epochNumber: epochNum, submissions: 0, gasUsed: 0, timestamp });
      }
      proverInfo.epochs.get(epochNum).submissions += 1;
      proverInfo.epochs.get(epochNum).gasUsed += gasUsed;
    });
    
    // Calculate rewards
    epochData.forEach((epoch, epochNum) => {
      const proverCount = epoch.provers.size;
      const rewardPerProver = proverCount > 0 ? epoch.totalReward / proverCount : 0;
      
      epoch.provers.forEach((p, addr) => {
        p.reward = parseFloat(rewardPerProver.toFixed(2));
        const proverInfo = proverData.get(addr);
        if (proverInfo?.epochs.has(epochNum)) {
          proverInfo.epochs.get(epochNum).reward = p.reward;
        }
      });
    });
    
    proverData.forEach(p => {
      p.totalRewards = 0;
      p.epochs.forEach(e => { p.totalRewards += e.reward || 0; });
      p.totalRewards = parseFloat(p.totalRewards.toFixed(2));
    });
    
    const allEpochs = Array.from(epochData.keys()).sort((a, b) => b - a);
    const currentEpoch = allEpochs[0] || 0;
    
    if (prover) {
      const proverInfo = proverData.get(prover.toLowerCase());
      if (!proverInfo) return res.status(200).json({ success: true, prover, found: false, currentEpoch });
      
      return res.status(200).json({
        success: true, prover: proverInfo.address, found: true, currentEpoch,
        summary: { totalEpochs: proverInfo.epochs.size, totalSubmissions: proverInfo.totalSubmissions, totalRewards: proverInfo.totalRewards },
        epochs: Array.from(proverInfo.epochs.values()).sort((a,b) => b.epochNumber - a.epochNumber).map(e => ({ epoch: e.epochNumber, reward: e.reward || 0, submissions: e.submissions })),
        lastUpdated: new Date().toISOString()
      });
    }
    
    const provers = Array.from(proverData.values()).map(p => ({ address: p.address, epochCount: p.epochs.size, totalRewards: p.totalRewards, totalSubmissions: p.totalSubmissions })).sort((a, b) => b.totalRewards - a.totalRewards);
    
    return res.status(200).json({
      success: true, currentEpoch,
      stats: { totalEpochs: epochData.size, totalProvers: proverData.size },
      topProvers: provers.slice(0, 15),
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
