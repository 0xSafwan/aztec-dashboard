import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Dynamic import for Recharts (client-side only)
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

// ============================================
// CONFIG
// ============================================
const AZTEC_CONFIG = {
  ROLLUP_CONTRACT: '0x603bb2c05D474794ea97805e8De69bCcFb3bCA12',
  BLOCKS_PER_EPOCH: 32,
  NETWORK: 'Ethereum Mainnet'
};

// ============================================
// DESIGN SYSTEM
// ============================================
const colors = {
  gold: '#D4AF37',
  jade: '#00A86B',
  obsidian: '#0D1117',
  obsidianLight: '#161B22',
  stone: '#21262D',
  slate: '#30363D',
  azure: '#58A6FF',
  purple: '#A371F7',
  coral: '#F78166',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  success: '#3FB950',
  warning: '#D29922',
  error: '#F85149'
};

const proverColors = ['#D4AF37', '#00A86B', '#58A6FF', '#A371F7', '#F78166', '#FF6B6B', '#4ECDC4', '#45B7D1'];

// ============================================
// UTILITIES
// ============================================
const formatAddress = (addr, short = true) => {
  if (!addr) return 'Unknown';
  return short ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
};

const formatNumber = (num, decimals = 2) => {
  if (num >= 1000000) return (num / 1000000).toFixed(decimals) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(decimals) + 'K';
  return typeof num === 'number' ? num.toFixed(decimals) : num;
};

const formatTimeAgo = (ts) => {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// ============================================
// COMPONENTS
// ============================================

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
      <div style={{
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: colors.textMuted,
        fontSize: '16px'
      }}>
        🔍
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '14px 14px 14px 44px',
          borderRadius: '12px',
          border: `2px solid ${colors.slate}`,
          background: colors.stone,
          color: colors.text,
          fontSize: '14px',
          outline: 'none',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      />
    </div>
  );
}

function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px',
        borderRadius: '10px',
        border: 'none',
        background: active ? `${colors.gold}20` : 'transparent',
        color: active ? colors.gold : colors.textMuted,
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: active ? `2px solid ${colors.gold}` : '2px solid transparent'
      }}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

function StatCard({ title, value, subtitle, icon, color = colors.gold }) {
  return (
    <div style={{
      background: colors.obsidianLight,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${colors.slate}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontSize: '60px',
        opacity: 0.08
      }}>
        {icon}
      </div>
      <div style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
        {title}
      </div>
      <div style={{ color: color, fontSize: '28px', fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ color: colors.textMuted, fontSize: '12px', marginTop: '4px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    proven: { bg: `${colors.success}20`, border: colors.success, color: colors.success },
    proving: { bg: `${colors.warning}20`, border: colors.warning, color: colors.warning },
    pending: { bg: `${colors.textMuted}20`, border: colors.textMuted, color: colors.textMuted }
  };
  const s = config[status] || config.pending;
  
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '20px',
      fontSize: '10px',
      fontWeight: '700',
      textTransform: 'uppercase',
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color
    }}>
      {status}
    </span>
  );
}

function ProverCard({ prover, rank, onClick, isSelected }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? `${colors.gold}15` : colors.obsidianLight,
        borderRadius: '12px',
        padding: '16px',
        border: `1px solid ${isSelected ? colors.gold : colors.slate}`,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: `${proverColors[rank % proverColors.length]}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '700',
          color: proverColors[rank % proverColors.length]
        }}>
          #{rank + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: colors.text, fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
            {formatAddress(prover.address)}
          </div>
          <div style={{ color: colors.textMuted, fontSize: '11px' }}>
            Last active {formatTimeAgo(prover.lastSeen)}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Rewards</div>
          <div style={{ color: colors.gold, fontSize: '14px', fontWeight: '600' }}>{formatNumber(prover.totalRewards)}</div>
        </div>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Proofs</div>
          <div style={{ color: colors.jade, fontSize: '14px', fontWeight: '600' }}>{prover.totalProofs}</div>
        </div>
        <div>
          <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Epochs</div>
          <div style={{ color: colors.azure, fontSize: '14px', fontWeight: '600' }}>{prover.epochCount}</div>
        </div>
      </div>
    </div>
  );
}

function ProverDetailPanel({ prover, onClose }) {
  if (!prover) return null;
  
  const rewardsByEpoch = (prover.submissions || [])
    .slice(-20)
    .map(s => ({
      epoch: `#${s.epochNumber}`,
      reward: s.reward
    }));
  
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999
        }}
      />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '500px',
        height: '100vh',
        background: colors.obsidianLight,
        borderLeft: `1px solid ${colors.slate}`,
        zIndex: 1000,
        overflowY: 'auto',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${colors.slate}`,
          position: 'sticky',
          top: 0,
          background: colors.obsidianLight
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: colors.textMuted, fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Prover Details
              </div>
              <div style={{ color: colors.text, fontSize: '14px', fontFamily: "'JetBrains Mono', monospace", wordBreak: 'break-all' }}>
                {prover.address}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: colors.stone,
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                color: colors.textMuted,
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            <a
              href={`https://etherscan.io/address/${prover.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.azure, fontSize: '12px', textDecoration: 'none' }}
            >
              View on Etherscan →
            </a>
          </div>
        </div>
        
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: colors.stone, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Total Rewards</div>
              <div style={{ color: colors.gold, fontSize: '24px', fontWeight: '700' }}>{formatNumber(prover.totalRewards)}</div>
            </div>
            <div style={{ background: colors.stone, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Avg per Epoch</div>
              <div style={{ color: colors.jade, fontSize: '24px', fontWeight: '700' }}>{formatNumber(prover.avgRewardPerEpoch)}</div>
            </div>
            <div style={{ background: colors.stone, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Total Proofs</div>
              <div style={{ color: colors.azure, fontSize: '24px', fontWeight: '700' }}>{prover.totalProofs}</div>
            </div>
            <div style={{ background: colors.stone, borderRadius: '12px', padding: '16px' }}>
              <div style={{ color: colors.textMuted, fontSize: '10px', textTransform: 'uppercase' }}>Epochs</div>
              <div style={{ color: colors.purple, fontSize: '24px', fontWeight: '700' }}>{prover.epochCount}</div>
            </div>
          </div>
          
          {rewardsByEpoch.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: colors.text, fontSize: '14px', marginBottom: '12px' }}>Rewards History</h4>
              <div style={{ background: colors.stone, borderRadius: '12px', padding: '16px', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rewardsByEpoch}>
                    <defs>
                      <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.gold} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.gold} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.slate} />
                    <XAxis dataKey="epoch" stroke={colors.textMuted} tick={{ fontSize: 10 }} />
                    <YAxis stroke={colors.textMuted} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: colors.obsidianLight, border: `1px solid ${colors.slate}`, borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="reward" stroke={colors.gold} fill="url(#rewardGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          <div>
            <h4 style={{ color: colors.text, fontSize: '14px', marginBottom: '12px' }}>Recent Submissions</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(prover.submissions || []).slice(0, 10).map((sub, i) => (
                <div key={i} style={{
                  background: colors.stone,
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ color: colors.text, fontSize: '13px' }}>Epoch #{sub.epochNumber}</div>
                    <div style={{ color: colors.textMuted, fontSize: '11px' }}>{formatTimeAgo(sub.timestamp)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: colors.gold, fontSize: '13px', fontWeight: '600' }}>+{sub.reward}</div>
                    <a
                      href={`https://etherscan.io/tx/${sub.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: colors.azure, fontSize: '10px', textDecoration: 'none' }}
                    >
                      View TX →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EpochTable({ epochs, onProverClick }) {
  const [expandedEpoch, setExpandedEpoch] = useState(null);
  
  return (
    <div style={{
      background: colors.obsidianLight,
      borderRadius: '16px',
      border: `1px solid ${colors.slate}`,
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 120px 100px 80px',
        gap: '12px',
        padding: '14px 20px',
        background: colors.stone,
        color: colors.textMuted,
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontWeight: '700'
      }}>
        <div>Epoch</div>
        <div>Provers</div>
        <div>Total Reward</div>
        <div>Time</div>
        <div>Status</div>
      </div>
      
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {epochs.map((epoch) => (
          <div key={epoch.epochNumber}>
            <div
              onClick={() => setExpandedEpoch(expandedEpoch === epoch.epochNumber ? null : epoch.epochNumber)}
              style={{
                display: 'grid',
                gridTemplateColumns: '100px 1fr 120px 100px 80px',
                gap: '12px',
                padding: '14px 20px',
                borderBottom: `1px solid ${colors.slate}`,
                cursor: 'pointer',
                background: expandedEpoch === epoch.epochNumber ? colors.stone : 'transparent'
              }}
            >
              <div style={{ color: colors.gold, fontWeight: '700', fontFamily: "'JetBrains Mono', monospace" }}>
                #{epoch.epochNumber}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(epoch.provers || []).map((p, i) => (
                  <span
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onProverClick(p.address); }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${proverColors[i % proverColors.length]}20`,
                      color: proverColors[i % proverColors.length],
                      fontSize: '11px',
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: 'pointer'
                    }}
                  >
                    {formatAddress(p.address)}
                  </span>
                ))}
              </div>
              <div style={{ color: colors.jade, fontWeight: '600' }}>
                {epoch.totalReward}
              </div>
              <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                {formatTimeAgo(epoch.timestamp)}
              </div>
              <div>
                <StatusBadge status={epoch.status} />
              </div>
            </div>
            
            {expandedEpoch === epoch.epochNumber && (
              <div style={{
                padding: '16px 20px',
                background: colors.stone,
                borderBottom: `1px solid ${colors.slate}`
              }}>
                <div style={{ color: colors.textMuted, fontSize: '11px', marginBottom: '12px', textTransform: 'uppercase' }}>
                  Prover Breakdown
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(epoch.provers || []).map((prover, i) => (
                    <div
                      key={i}
                      onClick={() => onProverClick(prover.address)}
                      style={{
                        background: colors.obsidianLight,
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto auto auto',
                        gap: '20px',
                        alignItems: 'center',
                        cursor: 'pointer',
                        border: `1px solid ${colors.slate}`
                      }}
                    >
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", color: colors.text, fontSize: '12px' }}>
                        {formatAddress(prover.address)}
                      </div>
                      <div>
                        <div style={{ color: colors.textMuted, fontSize: '10px' }}>Reward</div>
                        <div style={{ color: colors.gold, fontWeight: '600' }}>{prover.reward}</div>
                      </div>
                      <div>
                        <div style={{ color: colors.textMuted, fontSize: '10px' }}>Proofs</div>
                        <div style={{ color: colors.jade, fontWeight: '600' }}>{prover.proofCount}</div>
                      </div>
                      <div>
                        <div style={{ color: colors.textMuted, fontSize: '10px' }}>Gas</div>
                        <div style={{ color: colors.azure }}>{formatNumber(prover.gasUsed)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveFeed({ submissions }) {
  return (
    <div style={{
      background: colors.obsidianLight,
      borderRadius: '16px',
      border: `1px solid ${colors.slate}`,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.slate}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: colors.success,
          animation: 'pulse 2s infinite'
        }} />
        <h3 style={{ margin: 0, fontSize: '14px', color: colors.text }}>Live Proof Submissions</h3>
      </div>
      
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {(submissions || []).slice(0, 15).map((sub, i) => (
          <div key={sub.id || i} style={{
            padding: '12px 20px',
            borderBottom: `1px solid ${colors.slate}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${colors.gold}20`,
                  color: colors.gold,
                  fontSize: '10px',
                  fontWeight: '700'
                }}>
                  PROOF
                </span>
                <span style={{ color: colors.text, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  {formatAddress(sub.prover)}
                </span>
              </div>
              <div style={{ color: colors.textMuted, fontSize: '11px' }}>
                Epoch #{sub.epochNumber} • {formatNumber(sub.gasUsed)} gas
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: colors.gold, fontSize: '13px', fontWeight: '600' }}>+{sub.reward}</div>
              <div style={{ color: colors.textMuted, fontSize: '10px' }}>{formatTimeAgo(sub.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProver, setSelectedProver] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch data from API
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/provers');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Filter provers by search
  const filteredProvers = useMemo(() => {
    if (!data?.provers) return [];
    if (!searchQuery) return data.provers;
    const q = searchQuery.toLowerCase();
    return data.provers.filter(p => p.address.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // Find prover by address
  const findProver = (address) => {
    if (!data?.provers) return null;
    return data.provers.find(p => p.address.toLowerCase() === address.toLowerCase());
  };

  const handleProverClick = (address) => {
    const prover = findProver(address);
    setSelectedProver(prover);
  };

  return (
    <>
      <Head>
        <title>Aztec Prover Dashboard | Epoch Rewards Tracker</title>
        <meta name="description" content="Track Aztec Ignition mainnet prover rewards in real-time" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: colors.obsidian,
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: colors.text
      }}>
        {/* Header */}
        <header style={{
          background: colors.obsidianLight,
          borderBottom: `1px solid ${colors.slate}`,
          padding: '16px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                background: `linear-gradient(135deg, ${colors.gold} 0%, ${colors.jade} 100%)`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: '700',
                color: colors.obsidian
              }}>
                A
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Aztec Epoch Rewards</h1>
                <div style={{ color: colors.textMuted, fontSize: '12px' }}>
                  Ignition Mainnet • Real-time prover tracking
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {lastUpdated && (
                <span style={{ color: colors.textMuted, fontSize: '11px' }}>
                  Updated: {lastUpdated}
                </span>
              )}
              <button
                onClick={fetchData}
                disabled={loading}
                style={{
                  background: colors.stone,
                  border: `1px solid ${colors.slate}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: colors.text,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
              >
                {loading ? 'Refreshing...' : '🔄 Refresh'}
              </button>
              <a
                href={`https://etherscan.io/address/${AZTEC_CONFIG.ROLLUP_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: colors.stone,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  color: colors.azure,
                  fontSize: '12px',
                  fontFamily: "'JetBrains Mono', monospace",
                  textDecoration: 'none',
                  border: `1px solid ${colors.slate}`
                }}
              >
                {formatAddress(AZTEC_CONFIG.ROLLUP_CONTRACT)}
              </a>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search prover wallet address (0x...)"
            />
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon="📊">
                Overview
              </TabButton>
              <TabButton active={activeTab === 'epochs'} onClick={() => setActiveTab('epochs')} icon="📦">
                Epochs
              </TabButton>
              <TabButton active={activeTab === 'provers'} onClick={() => setActiveTab('provers')} icon="⚡">
                Provers
              </TabButton>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
          {error ? (
            <div style={{
              background: `${colors.error}20`,
              border: `1px solid ${colors.error}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div style={{ color: colors.error, fontSize: '16px', marginBottom: '8px' }}>Error loading data</div>
              <div style={{ color: colors.textMuted, fontSize: '14px' }}>{error}</div>
              <button
                onClick={fetchData}
                style={{
                  marginTop: '16px',
                  background: colors.gold,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  color: colors.obsidian,
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Retry
              </button>
            </div>
          ) : loading && !data ? (
            <div style={{ textAlign: 'center', padding: '60px', color: colors.textMuted }}>
              <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
              <div>Loading prover data from Ethereum...</div>
            </div>
          ) : (
            <>
              {/* Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <StatCard title="Total Rewards" value={formatNumber(data?.stats?.totalRewards || 0)} subtitle="Estimated" icon="💰" color={colors.gold} />
                <StatCard title="Total Proofs" value={formatNumber(data?.stats?.totalProofs || 0, 0)} subtitle="Submitted" icon="📜" color={colors.jade} />
                <StatCard title="Epochs" value={data?.stats?.totalEpochs || 0} subtitle="Tracked" icon="📦" color={colors.azure} />
                <StatCard title="Active Provers" value={data?.stats?.activeProvers || 0} subtitle="Unique" icon="⚡" color={colors.purple} />
              </div>

              {/* Search Results */}
              {searchQuery && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ color: colors.text, fontSize: '16px', marginBottom: '12px' }}>
                    Search Results ({filteredProvers.length} found)
                  </h3>
                  {filteredProvers.length === 0 ? (
                    <div style={{
                      background: colors.obsidianLight,
                      borderRadius: '12px',
                      padding: '40px',
                      textAlign: 'center',
                      color: colors.textMuted,
                      border: `1px solid ${colors.slate}`
                    }}>
                      No provers found matching "{searchQuery}"
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                      {filteredProvers.slice(0, 6).map((prover, i) => (
                        <ProverCard
                          key={prover.address}
                          prover={prover}
                          rank={data.provers.indexOf(prover)}
                          onClick={() => setSelectedProver(prover)}
                          isSelected={selectedProver?.address === prover.address}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content */}
              {!searchQuery && activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <h3 style={{ color: colors.text, fontSize: '16px', marginBottom: '12px' }}>🏆 Top Provers</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                        {(data?.provers || []).slice(0, 4).map((prover, i) => (
                          <ProverCard
                            key={prover.address}
                            prover={prover}
                            rank={i}
                            onClick={() => setSelectedProver(prover)}
                            isSelected={selectedProver?.address === prover.address}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 style={{ color: colors.text, fontSize: '16px', marginBottom: '12px' }}>📦 Recent Epochs</h3>
                      <EpochTable epochs={(data?.epochs || []).slice(0, 10)} onProverClick={handleProverClick} />
                    </div>
                  </div>
                  
                  <LiveFeed submissions={data?.submissions} />
                </div>
              )}

              {!searchQuery && activeTab === 'epochs' && (
                <EpochTable epochs={data?.epochs || []} onProverClick={handleProverClick} />
              )}

              {!searchQuery && activeTab === 'provers' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {(data?.provers || []).map((prover, i) => (
                    <ProverCard
                      key={prover.address}
                      prover={prover}
                      rank={i}
                      onClick={() => setSelectedProver(prover)}
                      isSelected={selectedProver?.address === prover.address}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Prover Detail Panel */}
        {selectedProver && (
          <ProverDetailPanel prover={selectedProver} onClose={() => setSelectedProver(null)} />
        )}

        <style jsx global>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: ${colors.obsidian}; }
          ::-webkit-scrollbar-thumb { background: ${colors.slate}; border-radius: 3px; }
          
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        `}</style>
      </div>
    </>
  );
}
