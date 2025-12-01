import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [proverAddress, setProverAddress] = useState('');
  const [searchedProver, setSearchedProver] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Load initial stats
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/provers');
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const searchProver = async () => {
    if (!proverAddress || proverAddress.length < 42) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSearchedProver(null);
    
    try {
      const res = await fetch(`/api/provers?prover=${proverAddress}`);
      const data = await res.json();
      
      if (data.success) {
        setSearchedProver(data);
      } else {
        setError(data.error || 'Failed to fetch prover data');
      }
    } catch (e) {
      setError('Failed to fetch prover data');
    }
    
    setLoading(false);
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleString();
  };

  return (
    <>
      <Head>
        <title>Aztec Prover Rewards</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>🔮 Aztec Prover Rewards</h1>
          <p style={styles.subtitle}>Check your epoch rewards on Ignition Mainnet</p>
          {stats && (
            <div style={styles.currentEpoch}>
              Current Epoch: <span style={styles.epochHighlight}>#{stats.currentEpoch}</span>
            </div>
          )}
        </header>

        {/* Search Box */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Enter prover wallet address (0x...)"
            value={proverAddress}
            onChange={(e) => setProverAddress(e.target.value)}
            style={styles.input}
            onKeyPress={(e) => e.key === 'Enter' && searchProver()}
          />
          <button 
            onClick={searchProver} 
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Prover Results */}
        {searchedProver && searchedProver.found && (
          <div style={styles.results}>
            <div style={styles.proverHeader}>
              <h2 style={styles.proverTitle}>Prover: {formatAddress(searchedProver.prover)}</h2>
              <a 
                href={`https://etherscan.io/address/${searchedProver.prover}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.etherscanLink}
              >
                View on Etherscan ↗
              </a>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Epochs</div>
                <div style={styles.summaryValue}>{searchedProver.summary.totalEpochsParticipated}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Submissions</div>
                <div style={styles.summaryValue}>{searchedProver.summary.totalSubmissions}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Gas Used</div>
                <div style={styles.summaryValue}>{(searchedProver.summary.totalGasUsed / 1e6).toFixed(2)}M</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total TX Fees (ETH)</div>
                <div style={styles.summaryValue}>{searchedProver.summary.totalTxFeeEth.toFixed(4)}</div>
              </div>
            </div>

            {/* Epoch Table */}
            <h3 style={styles.sectionTitle}>Epoch Participation</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Epoch</th>
                    <th style={styles.th}>Submissions</th>
                    <th style={styles.th}>Gas Used</th>
                    <th style={styles.th}>TX Fee (ETH)</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedProver.epochs.map((epoch) => (
                    <tr key={epoch.epochNumber} style={styles.tr}>
                      <td style={styles.td}>
                        <span style={styles.epochBadge}>#{epoch.epochNumber}</span>
                      </td>
                      <td style={styles.td}>{epoch.submissions}</td>
                      <td style={styles.td}>{epoch.gasUsed.toLocaleString()}</td>
                      <td style={styles.td}>{epoch.txFeeEth.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {searchedProver && !searchedProver.found && (
          <div style={styles.notFound}>
            <p>❌ No submissions found for this address</p>
            <p style={styles.notFoundHint}>Make sure you entered a valid prover address</p>
          </div>
        )}

        {/* General Stats (when not searching) */}
        {!searchedProver && stats && (
          <div style={styles.statsSection}>
            <h3 style={styles.sectionTitle}>Network Overview</h3>
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Epochs</div>
                <div style={styles.summaryValue}>{stats.stats.totalEpochs}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Active Provers</div>
                <div style={styles.summaryValue}>{stats.stats.totalProvers}</div>
              </div>
              <div style={styles.summaryCard}>
                <div style={styles.summaryLabel}>Total Submissions</div>
                <div style={styles.summaryValue}>{stats.stats.totalSubmissions.toLocaleString()}</div>
              </div>
            </div>

            <h3 style={styles.sectionTitle}>Top Provers</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>#</th>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Epochs</th>
                    <th style={styles.th}>Submissions</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProvers?.slice(0, 10).map((prover, i) => (
                    <tr 
                      key={prover.address} 
                      style={styles.tr}
                      onClick={() => {
                        setProverAddress(prover.address);
                        searchProver();
                      }}
                    >
                      <td style={styles.td}>{i + 1}</td>
                      <td style={{...styles.td, ...styles.clickable}}>
                        {formatAddress(prover.address)}
                      </td>
                      <td style={styles.td}>{prover.epochCount}</td>
                      <td style={styles.td}>{prover.totalSubmissions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer style={styles.footer}>
          <p>Contract: <a href="https://etherscan.io/address/0x603bb2c05d474794ea97805e8de69bccfb3bca12" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>0x603b...CA12</a></p>
          {stats?.lastUpdated && <p>Last updated: {formatTime(stats.lastUpdated)}</p>}
        </footer>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0f',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    paddingTop: '20px'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#a855f7',
    margin: '0 0 10px 0'
  },
  subtitle: {
    color: '#888',
    fontSize: '1rem',
    margin: '0'
  },
  currentEpoch: {
    marginTop: '15px',
    fontSize: '1.1rem',
    color: '#888'
  },
  epochHighlight: {
    color: '#22c55e',
    fontWeight: 'bold',
    fontSize: '1.3rem'
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  input: {
    flex: 1,
    minWidth: '250px',
    padding: '15px 20px',
    fontSize: '1rem',
    borderRadius: '12px',
    border: '2px solid #333',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    outline: 'none'
  },
  button: {
    padding: '15px 30px',
    fontSize: '1rem',
    fontWeight: 'bold',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: '#a855f7',
    color: '#fff',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  results: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '25px',
    marginBottom: '30px'
  },
  proverHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px'
  },
  proverTitle: {
    fontSize: '1.3rem',
    color: '#a855f7',
    margin: 0
  },
  etherscanLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontSize: '0.9rem'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginBottom: '25px'
  },
  summaryCard: {
    backgroundColor: '#252540',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center'
  },
  summaryLabel: {
    color: '#888',
    fontSize: '0.85rem',
    marginBottom: '8px'
  },
  summaryValue: {
    color: '#22c55e',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    color: '#ccc',
    marginBottom: '15px',
    marginTop: '20px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px 15px',
    borderBottom: '1px solid #333',
    color: '#888',
    fontSize: '0.85rem',
    fontWeight: 'normal'
  },
  tr: {
    borderBottom: '1px solid #222'
  },
  td: {
    padding: '12px 15px',
    fontSize: '0.95rem'
  },
  epochBadge: {
    backgroundColor: '#3b3b5c',
    color: '#a855f7',
    padding: '4px 10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  clickable: {
    cursor: 'pointer',
    color: '#60a5fa'
  },
  notFound: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#1a1a2e',
    borderRadius: '16px'
  },
  notFoundHint: {
    color: '#666',
    fontSize: '0.9rem'
  },
  statsSection: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '25px'
  },
  footer: {
    textAlign: 'center',
    color: '#555',
    fontSize: '0.85rem',
    marginTop: '40px',
    paddingBottom: '20px'
  },
  footerLink: {
    color: '#60a5fa',
    textDecoration: 'none'
  }
};
