import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [address, setAddress] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/provers')
      .then(r => r.json())
      .then(d => d.success && setStats(d))
      .catch(() => {});
  }, []);

  const search = async () => {
    if (!address || address.length < 42) {
      setError('Enter a valid address');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const r = await fetch(`/api/provers?prover=${address}`);
      const d = await r.json();
      if (d.success) setResult(d);
      else setError(d.error || 'Not found');
    } catch (e) {
      setError('Failed to fetch');
    }
    setLoading(false);
  };

  const fmt = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '';

  return (
    <>
      <Head>
        <title>Aztec Prover Rewards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={s.page}>
        <h1 style={s.title}>🔮 Aztec Prover Rewards</h1>
        <p style={s.sub}>Track your AZTEC rewards per epoch</p>
        
        {stats && (
          <p style={s.epoch}>Current Epoch: <b style={{color:'#22c55e',fontSize:'1.2em'}}>#{stats.currentEpoch}</b></p>
        )}
        
        <div style={s.searchBox}>
          <input
            style={s.input}
            placeholder="Enter prover wallet (0x...)"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && search()}
          />
          <button style={s.btn} onClick={search} disabled={loading}>
            {loading ? '...' : 'Search'}
          </button>
        </div>
        
        {error && <p style={s.error}>{error}</p>}
        
        {result?.found && (
          <div style={s.card}>
            <div style={s.header}>
              <span style={s.addr}>{fmt(result.prover)}</span>
              <a href={`https://etherscan.io/address/${result.prover}`} target="_blank" rel="noreferrer" style={s.link}>Etherscan ↗</a>
            </div>
            
            <div style={s.grid}>
              <div style={s.stat}>
                <div style={s.label}>Total Rewards</div>
                <div style={s.value}>{result.summary.totalRewards.toLocaleString()} AZTEC</div>
              </div>
              <div style={s.stat}>
                <div style={s.label}>Epochs</div>
                <div style={s.value}>{result.summary.totalEpochs}</div>
              </div>
              <div style={s.stat}>
                <div style={s.label}>Submissions</div>
                <div style={s.value}>{result.summary.totalSubmissions}</div>
              </div>
            </div>
            
            <h3 style={s.h3}>Rewards by Epoch</h3>
            <div style={s.table}>
              <div style={s.row}>
                <span style={s.th}>Epoch</span>
                <span style={s.th}>Reward (AZTEC)</span>
                <span style={s.th}>Submissions</span>
              </div>
              {result.epochs.slice(0, 50).map(e => (
                <div key={e.epoch} style={s.row}>
                  <span style={s.td}>#{e.epoch}</span>
                  <span style={{...s.td, color:'#22c55e', fontWeight:'bold'}}>{e.reward}</span>
                  <span style={s.td}>{e.submissions}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {result && !result.found && (
          <p style={s.notFound}>❌ No submissions found for this address</p>
        )}
        
        {!result && stats && (
          <div style={s.card}>
            <h3 style={s.h3}>Top Provers</h3>
            <div style={s.table}>
              <div style={s.row}>
                <span style={s.th}>#</span>
                <span style={s.th}>Address</span>
                <span style={s.th}>Total Rewards</span>
                <span style={s.th}>Epochs</span>
              </div>
              {stats.topProvers?.map((p, i) => (
                <div key={p.address} style={{...s.row, cursor:'pointer'}} onClick={() => {setAddress(p.address); search();}}>
                  <span style={s.td}>{i+1}</span>
                  <span style={{...s.td, color:'#60a5fa'}}>{fmt(p.address)}</span>
                  <span style={{...s.td, color:'#22c55e', fontWeight:'bold'}}>{p.totalRewards.toLocaleString()}</span>
                  <span style={s.td}>{p.epochCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <footer style={s.footer}>
          Contract: <a href="https://etherscan.io/address/0x603bb2c05d474794ea97805e8de69bccfb3bca12" target="_blank" rel="noreferrer" style={s.link}>0x603b...CA12</a>
        </footer>
      </div>
    </>
  );
}

const s = {
  page: { minHeight:'100vh', background:'#0a0a12', color:'#e0e0e0', fontFamily:'system-ui', padding:'20px', maxWidth:'800px', margin:'0 auto' },
  title: { textAlign:'center', color:'#a855f7', fontSize:'1.8rem', marginBottom:'5px' },
  sub: { textAlign:'center', color:'#666', marginTop:0 },
  epoch: { textAlign:'center', color:'#888' },
  searchBox: { display:'flex', gap:'10px', marginBottom:'20px', flexWrap:'wrap' },
  input: { flex:1, minWidth:'200px', padding:'14px', borderRadius:'10px', border:'2px solid #333', background:'#1a1a2e', color:'#fff', fontSize:'1rem' },
  btn: { padding:'14px 28px', borderRadius:'10px', border:'none', background:'#a855f7', color:'#fff', fontWeight:'bold', cursor:'pointer', fontSize:'1rem' },
  error: { background:'#7f1d1d', color:'#fca5a5', padding:'12px', borderRadius:'8px', textAlign:'center' },
  card: { background:'#1a1a2e', borderRadius:'14px', padding:'20px', marginBottom:'20px' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', flexWrap:'wrap', gap:'10px' },
  addr: { fontSize:'1.2rem', color:'#a855f7', fontWeight:'bold' },
  link: { color:'#60a5fa', textDecoration:'none', fontSize:'0.9rem' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:'12px', marginBottom:'20px' },
  stat: { background:'#252545', borderRadius:'10px', padding:'15px', textAlign:'center' },
  label: { color:'#888', fontSize:'0.85rem', marginBottom:'5px' },
  value: { color:'#22c55e', fontSize:'1.4rem', fontWeight:'bold' },
  h3: { color:'#ccc', fontSize:'1rem', marginBottom:'10px' },
  table: { background:'#12121f', borderRadius:'10px', overflow:'hidden' },
  row: { display:'grid', gridTemplateColumns:'1fr 2fr 1fr', padding:'10px 15px', borderBottom:'1px solid #222' },
  th: { color:'#888', fontSize:'0.8rem' },
  td: { fontSize:'0.95rem' },
  notFound: { textAlign:'center', padding:'30px', background:'#1a1a2e', borderRadius:'14px' },
  footer: { textAlign:'center', color:'#555', fontSize:'0.85rem', marginTop:'30px' }
};
