
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

export default function InvestmentDetails() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedInvestment, setSelectedInvestment] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('1M');

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const [portfolioRes, transactionsRes] = await Promise.all([
        supabase
          .from('investments')
          .select(`
            *,
            product:product_id (
              name,
              type,
              risk_level,
              annual_return,
              description
            ),
            account:account_id (
              account_type,
              account_number
            )
          `)
          .eq('user_id', session.user.id)
          .order('invested_at', { ascending: false }),
        supabase
          .from('investment_transactions')
          .select(`
            *,
            investment:investment_id (
              product:product_id (
                name,
                type
              )
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (portfolioRes.data) {
        setPortfolio(portfolioRes.data);
        if (portfolioRes.data.length > 0) {
          setSelectedInvestment(portfolioRes.data[0]);
        }
      }

      if (transactionsRes.data) {
        const userInvestmentIds = portfolioRes.data?.map(inv => inv.id) || [];
        const filteredTransactions = transactionsRes.data.filter(
          tx => userInvestmentIds.includes(tx.investment_id)
        );
        setTransactions(filteredTransactions);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateTotalInvested = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0);
  };

  const calculateTotalValue = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
  };

  const calculateTotalGain = () => {
    return calculateTotalValue() - calculateTotalInvested();
  };

  const calculateGainPercentage = () => {
    const invested = calculateTotalInvested();
    if (invested === 0) return 0;
    return ((calculateTotalGain() / invested) * 100).toFixed(2);
  };

  const getAssetAllocation = () => {
    const allocation = {};
    portfolio.forEach(inv => {
      const type = inv.product?.type || 'other';
      if (!allocation[type]) {
        allocation[type] = 0;
      }
      allocation[type] += parseFloat(inv.current_value || 0);
    });
    return allocation;
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[risk] || '#6b7280';
  };

  const getTypeIcon = (type) => {
    const icons = {
      stock: '📈',
      mutual_fund: '💼',
      bond: '📊',
      crypto: '₿',
      etf: '📉',
      other: '💰'
    };
    return icons[type] || '💰';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      paddingBottom: '4rem'
    },
    header: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      textDecoration: 'none'
    },
    backButton: {
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2rem'
    },
    pageTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '2rem',
      textAlign: 'center'
    },
    summaryCards: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
      gap: '1rem',
      marginBottom: '2rem'
    },
    summaryCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: '1px solid #059669'
    },
    summaryLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    summaryValue: {
      fontSize: isMobile ? '1.5rem' : '1.75rem',
      fontWeight: '700',
      color: '#1a365d'
    },
    summaryChange: {
      fontSize: '0.875rem',
      fontWeight: '600',
      marginTop: '0.5rem'
    },
    tabs: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '2rem',
      flexWrap: 'wrap'
    },
    tab: {
      flex: 1,
      minWidth: isMobile ? '100%' : 'auto',
      padding: '1rem',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      color: 'white'
    },
    activeTab: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#1a365d'
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669'
    },
    cardTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669'
    },
    holdingsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    holdingItem: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    selectedHolding: {
      border: '2px solid #059669',
      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
    },
    holdingHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.75rem'
    },
    holdingName: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    holdingValue: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#059669'
    },
    holdingDetails: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginTop: '0.25rem'
    },
    allocationChart: {
      display: 'grid',
      gap: '1rem'
    },
    allocationItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    allocationBar: {
      flex: 1,
      height: '40px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1rem',
      color: 'white',
      fontWeight: '600',
      fontSize: '0.875rem'
    },
    allocationLabel: {
      minWidth: '120px',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    performanceMetrics: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1rem'
    },
    metricItem: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    },
    metricLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    metricValue: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    transactionsList: {
      maxHeight: '400px',
      overflowY: 'auto'
    },
    transactionItem: {
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      border: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    riskBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: 'white'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    timeRangeSelector: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1rem',
      flexWrap: 'wrap'
    },
    timeRangeButton: {
      padding: '0.5rem 1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      background: 'white',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    activeTimeRange: {
      backgroundColor: '#1e40af',
      color: 'white',
      borderColor: '#1e40af'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading investment details...</p>
      </div>
    );
  }

  const allocation = getAssetAllocation();
  const totalValue = calculateTotalValue();
  const totalInvested = calculateTotalInvested();
  const totalGain = calculateTotalGain();
  const gainPercentage = calculateGainPercentage();

  return (
    <>
      <Head>
        <title>Investment Details - Oakline Bank</title>
        <meta name="description" content="View detailed investment portfolio analytics and performance" />
      </Head>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/dashboard" style={styles.logo}>🏦 Oakline Bank</Link>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link href="/investment" style={styles.backButton}>← Investment Portfolio</Link>
            <Link href="/dashboard" style={styles.backButton}>Dashboard</Link>
          </div>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>📊 Investment Portfolio Details</h1>

          {/* Summary Cards */}
          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Portfolio Value</div>
              <div style={styles.summaryValue}>{formatCurrency(totalValue)}</div>
              <div style={{
                ...styles.summaryChange,
                color: totalGain >= 0 ? '#10b981' : '#ef4444'
              }}>
                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Invested</div>
              <div style={styles.summaryValue}>{formatCurrency(totalInvested)}</div>
              <div style={styles.summaryChange}>
                Principal Amount
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Return</div>
              <div style={{
                ...styles.summaryValue,
                color: gainPercentage >= 0 ? '#10b981' : '#ef4444'
              }}>
                {gainPercentage >= 0 ? '+' : ''}{gainPercentage}%
              </div>
              <div style={styles.summaryChange}>
                Overall Performance
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Active Holdings</div>
              <div style={styles.summaryValue}>{portfolio.length}</div>
              <div style={styles.summaryChange}>
                Investment Products
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'overview' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('overview')}
            >
              📊 Portfolio Overview
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'performance' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('performance')}
            >
              📈 Performance Analysis
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'transactions' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('transactions')}
            >
              📋 Transaction History
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Investment Holdings</h2>
                {portfolio.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</p>
                    <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Holdings</h3>
                    <p>Start investing to see your portfolio here.</p>
                  </div>
                ) : (
                  <div style={styles.holdingsList}>
                    {portfolio.map(holding => (
                      <div
                        key={holding.id}
                        style={{
                          ...styles.holdingItem,
                          ...(selectedInvestment?.id === holding.id ? styles.selectedHolding : {})
                        }}
                        onClick={() => setSelectedInvestment(holding)}
                      >
                        <div style={styles.holdingHeader}>
                          <div>
                            <div style={styles.holdingName}>
                              {getTypeIcon(holding.product?.type)} {holding.product?.name}
                            </div>
                            <div style={styles.holdingDetails}>
                              Invested: {formatDate(holding.invested_at)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={styles.holdingValue}>
                              {formatCurrency(holding.current_value)}
                            </div>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: parseFloat(holding.current_value) >= parseFloat(holding.amount_invested) ? '#10b981' : '#ef4444'
                            }}>
                              {parseFloat(holding.current_value) >= parseFloat(holding.amount_invested) ? '+' : ''}
                              {formatCurrency(parseFloat(holding.current_value) - parseFloat(holding.amount_invested))}
                            </div>
                          </div>
                        </div>
                        <div style={styles.holdingDetails}>
                          Cost Basis: {formatCurrency(holding.amount_invested)} • 
                          Type: {holding.product?.type?.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Asset Allocation</h2>
                {Object.keys(allocation).length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No asset allocation data available</p>
                  </div>
                ) : (
                  <div style={styles.allocationChart}>
                    {Object.entries(allocation).map(([type, value]) => {
                      const percentage = ((value / totalValue) * 100).toFixed(1);
                      const colors = {
                        stock: '#3b82f6',
                        mutual_fund: '#8b5cf6',
                        bond: '#10b981',
                        crypto: '#f59e0b',
                        etf: '#06b6d4',
                        other: '#64748b'
                      };
                      return (
                        <div key={type} style={styles.allocationItem}>
                          <div style={styles.allocationLabel}>
                            {getTypeIcon(type)} {type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div
                            style={{
                              ...styles.allocationBar,
                              backgroundColor: colors[type] || '#64748b',
                              width: `${percentage}%`,
                              minWidth: '80px'
                            }}
                          >
                            {percentage}%
                          </div>
                          <div style={{ fontSize: '0.875rem', fontWeight: '600', minWidth: '100px', textAlign: 'right' }}>
                            {formatCurrency(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Performance Metrics</h2>
                <div style={styles.timeRangeSelector}>
                  {['1D', '1W', '1M', '3M', '6M', '1Y', 'ALL'].map(range => (
                    <button
                      key={range}
                      style={{
                        ...styles.timeRangeButton,
                        ...(timeRange === range ? styles.activeTimeRange : {})
                      }}
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </button>
                  ))}
                </div>
                
                <div style={styles.performanceMetrics}>
                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Average Return</div>
                    <div style={{
                      ...styles.metricValue,
                      color: gainPercentage >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {gainPercentage >= 0 ? '+' : ''}{gainPercentage}%
                    </div>
                  </div>

                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Total Gain/Loss</div>
                    <div style={{
                      ...styles.metricValue,
                      color: totalGain >= 0 ? '#10b981' : '#ef4444'
                    }}>
                      {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                    </div>
                  </div>

                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Diversification Score</div>
                    <div style={styles.metricValue}>
                      {Object.keys(allocation).length > 1 ? 'High' : 'Low'}
                    </div>
                  </div>

                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Risk Level</div>
                    <div style={styles.metricValue}>
                      {portfolio.some(p => p.product?.risk_level === 'high') ? 'Aggressive' : 
                       portfolio.some(p => p.product?.risk_level === 'medium') ? 'Moderate' : 'Conservative'}
                    </div>
                  </div>

                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Portfolio Age</div>
                    <div style={styles.metricValue}>
                      {portfolio.length > 0 ? 
                        Math.floor((new Date() - new Date(portfolio[portfolio.length - 1].invested_at)) / (1000 * 60 * 60 * 24)) + ' days'
                        : 'N/A'}
                    </div>
                  </div>

                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Expected Annual Return</div>
                    <div style={styles.metricValue}>
                      {portfolio.length > 0 ? 
                        (portfolio.reduce((sum, p) => sum + parseFloat(p.product?.annual_return || 0), 0) / portfolio.length).toFixed(2) + '%'
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {selectedInvestment && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>Selected Investment Details</h2>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a365d', marginBottom: '0.5rem' }}>
                      {getTypeIcon(selectedInvestment.product?.type)} {selectedInvestment.product?.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                      {selectedInvestment.product?.description}
                    </div>
                  </div>

                  <div style={styles.performanceMetrics}>
                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Current Value</div>
                      <div style={styles.metricValue}>{formatCurrency(selectedInvestment.current_value)}</div>
                    </div>

                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Amount Invested</div>
                      <div style={styles.metricValue}>{formatCurrency(selectedInvestment.amount_invested)}</div>
                    </div>

                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Gain/Loss</div>
                      <div style={{
                        ...styles.metricValue,
                        color: parseFloat(selectedInvestment.current_value) >= parseFloat(selectedInvestment.amount_invested) ? '#10b981' : '#ef4444'
                      }}>
                        {formatCurrency(parseFloat(selectedInvestment.current_value) - parseFloat(selectedInvestment.amount_invested))}
                      </div>
                    </div>

                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Return %</div>
                      <div style={{
                        ...styles.metricValue,
                        color: parseFloat(selectedInvestment.current_value) >= parseFloat(selectedInvestment.amount_invested) ? '#10b981' : '#ef4444'
                      }}>
                        {((parseFloat(selectedInvestment.current_value) - parseFloat(selectedInvestment.amount_invested)) / parseFloat(selectedInvestment.amount_invested) * 100).toFixed(2)}%
                      </div>
                    </div>

                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Risk Level</div>
                      <div>
                        <span style={{
                          ...styles.riskBadge,
                          backgroundColor: getRiskColor(selectedInvestment.product?.risk_level)
                        }}>
                          {selectedInvestment.product?.risk_level?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={styles.metricItem}>
                      <div style={styles.metricLabel}>Expected Return</div>
                      <div style={styles.metricValue}>{selectedInvestment.product?.annual_return || 0}%</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Investment Transaction History</h2>
              {transactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ fontSize: '2rem' }}>📋</p>
                  <p>No transaction history yet</p>
                </div>
              ) : (
                <div style={styles.transactionsList}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={styles.transactionItem}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1e293b' }}>
                          {tx.type?.toUpperCase()} - {tx.investment?.product?.name || 'Investment'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: tx.type === 'buy' ? '#ef4444' : '#10b981' }}>
                        {tx.type === 'buy' ? '-' : '+'}{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
