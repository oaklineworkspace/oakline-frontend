import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Crypto() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [cryptoData, setCryptoData] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [loading, setLoading] = useState(true);
  const [trading, setTrading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    fetchCryptoData();

    // Set up real-time price updates every 30 seconds
    const interval = setInterval(fetchCryptoData, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchUserAccounts(user.id, user.email);
      await fetchUserPortfolio(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccounts = async (userId, email) => {
    try {
      let { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId);

      if (!data || data.length === 0) {
        const { data: emailAccounts, error: emailError } = await supabase
          .from('accounts')
          .select('*')
          .eq('email', email);
        data = emailAccounts;
        error = emailError;
      }

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCryptoData = async () => {
    try {
      // Using CoinGecko API for real crypto prices
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,polkadot,dogecoin,avalanche-2,polygon,chainlink&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Crypto API Response:', data);

        const formattedData = Object.entries(data).map(([id, info]) => ({
          id,
          name: getCryptoName(id),
          symbol: getCryptoSymbol(id),
          price: info.usd || 0,
          change24h: info.usd_24h_change || 0,
          marketCap: info.usd_market_cap || 0,
          icon: getCryptoIcon(id)
        }));

        setCryptoData(formattedData);
      } else {
        console.log('API request failed, using fallback data');
        setCryptoData(getFallbackCryptoData());
      }
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      setCryptoData(getFallbackCryptoData());
    }
  };

  const fetchUserPortfolio = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('crypto_portfolio')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setPortfolio(data || []);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setPortfolio([]);
    }
  };

  const getCryptoName = (id) => {
    const names = {
      'bitcoin': 'Bitcoin',
      'ethereum': 'Ethereum',
      'binancecoin': 'BNB',
      'cardano': 'Cardano',
      'solana': 'Solana',
      'polkadot': 'Polkadot',
      'dogecoin': 'Dogecoin',
      'avalanche-2': 'Avalanche',
      'polygon': 'Polygon',
      'chainlink': 'Chainlink'
    };
    return names[id] || id;
  };

  const getCryptoSymbol = (id) => {
    const symbols = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'binancecoin': 'BNB',
      'cardano': 'ADA',
      'solana': 'SOL',
      'polkadot': 'DOT',
      'dogecoin': 'DOGE',
      'avalanche-2': 'AVAX',
      'polygon': 'MATIC',
      'chainlink': 'LINK'
    };
    return symbols[id] || id.toUpperCase();
  };

  const getCryptoIcon = (id) => {
    const icons = {
      'bitcoin': '₿',
      'ethereum': 'Ξ',
      'binancecoin': '🟡',
      'cardano': '🔷',
      'solana': '◉',
      'polkadot': '●',
      'dogecoin': '🐕',
      'avalanche-2': '🔺',
      'polygon': '🔴',
      'chainlink': '🔗'
    };
    return icons[id] || '🪙';
  };

  const getFallbackCryptoData = () => [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', price: 45000, change24h: 2.5, marketCap: 850000000000, icon: '₿' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', price: 3200, change24h: 1.8, marketCap: 380000000000, icon: 'Ξ' },
    { id: 'binancecoin', name: 'BNB', symbol: 'BNB', price: 320, change24h: -0.5, marketCap: 50000000000, icon: '🟡' },
    { id: 'cardano', name: 'Cardano', symbol: 'ADA', price: 0.65, change24h: 3.2, marketCap: 23000000000, icon: '🔷' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', price: 98, change24h: -2.1, marketCap: 42000000000, icon: '◉' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const handleTrade = async () => {
    if (!selectedCrypto || !tradeAmount || trading) return;

    setTrading(true);
    try {
      const amount = parseFloat(tradeAmount);
      const totalCost = amount * selectedCrypto.price;

      // In a real implementation, you would process the trade here
      console.log(`${tradeType.toUpperCase()} ${amount} ${selectedCrypto.symbol} for ${formatCurrency(totalCost)}`);

      // For demo, just show success message
      alert(`Trade successful! ${tradeType.toUpperCase()} ${amount} ${selectedCrypto.symbol} for ${formatCurrency(totalCost)}`);

      setSelectedCrypto(null);
      setTradeAmount('');
      await fetchUserPortfolio(user.id);
    } catch (error) {
      console.error('Error processing trade:', error);
      alert('Trade failed. Please try again.');
    } finally {
      setTrading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>Loading crypto data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/main-menu" style={styles.backButton}>
            ← Back to Menu
          </Link>
          <h1 style={styles.title}>₿ Crypto Trading</h1>
          <div style={styles.headerActions}>
            <Link href="/dashboard" style={styles.navButton}>Dashboard</Link>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Market Overview */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Market Overview</h2>
          <div style={styles.cryptoGrid}>
            {cryptoData.map(crypto => (
              <div 
                key={crypto.id} 
                style={styles.cryptoCard}
                onClick={() => setSelectedCrypto(crypto)}
              >
                <div style={styles.cryptoHeader}>
                  <span style={styles.cryptoIcon}>{crypto.icon}</span>
                  <div>
                    <h3 style={styles.cryptoName}>{crypto.name}</h3>
                    <p style={styles.cryptoSymbol}>{crypto.symbol}</p>
                  </div>
                </div>
                <div style={styles.cryptoPrice}>
                  <span style={styles.price}>{formatCurrency(crypto.price)}</span>
                  <span style={{
                    ...styles.change,
                    color: crypto.change24h >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                  </span>
                </div>
                <div style={styles.marketCap}>
                  Market Cap: ${formatNumber(crypto.marketCap)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Portfolio */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Portfolio</h2>
          {portfolio.length > 0 ? (
            <div style={styles.portfolioGrid}>
              {portfolio.map((holding, index) => (
                <div key={index} style={styles.portfolioCard}>
                  <h3>{holding.crypto_symbol}</h3>
                  <p>Amount: {holding.amount}</p>
                  <p>Value: {formatCurrency(holding.current_value || 0)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyPortfolio}>
              <p>Your portfolio is empty. Start trading to build your crypto portfolio!</p>
            </div>
          )}
        </section>

        {/* Trading Interface */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Quick Trade</h2>
          {selectedCrypto ? (
            <div style={styles.tradingCard}>
              <h3>Trade {selectedCrypto.name} ({selectedCrypto.symbol})</h3>
              <p>Current Price: {formatCurrency(selectedCrypto.price)}</p>

              <div style={styles.tradeForm}>
                <div style={styles.tradeTypeSelector}>
                  <button
                    style={{
                      ...styles.tradeTypeButton,
                      backgroundColor: tradeType === 'buy' ? '#10b981' : '#6b7280'
                    }}
                    onClick={() => setTradeType('buy')}
                  >
                    Buy
                  </button>
                  <button
                    style={{
                      ...styles.tradeTypeButton,
                      backgroundColor: tradeType === 'sell' ? '#ef4444' : '#6b7280'
                    }}
                    onClick={() => setTradeType('sell')}
                  >
                    Sell
                  </button>
                </div>

                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="Amount to trade"
                  style={styles.tradeInput}
                />

                <div style={styles.tradeInfo}>
                  Total: {tradeAmount ? formatCurrency(parseFloat(tradeAmount) * selectedCrypto.price) : '$0.00'}
                </div>

                <div style={styles.tradeButtons}>
                  <button
                    onClick={handleTrade}
                    disabled={!tradeAmount || trading}
                    style={styles.executeButton}
                  >
                    {trading ? 'Processing...' : `${tradeType.toUpperCase()} ${selectedCrypto.symbol}`}
                  </button>
                  <button
                    onClick={() => setSelectedCrypto(null)}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.selectCrypto}>
              <p>Select a cryptocurrency above to start trading</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  loading: {
    fontSize: '1.2rem',
    color: '#64748b'
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
    color: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 4px 20px rgba(30, 58, 138, 0.3)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: '500'
  },
  title: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: '700'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem'
  },
  navButton: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  section: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  cryptoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem'
  },
  cryptoCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent'
  },
  cryptoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  cryptoIcon: {
    fontSize: '2rem',
    width: '50px',
    height: '50px',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cryptoName: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  cryptoSymbol: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#64748b'
  },
  cryptoPrice: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  price: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  change: {
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  marketCap: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  portfolioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  portfolioCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  emptyPortfolio: {
    textAlign: 'center',
    padding: '3rem',
    color: '#64748b'
  },
  tradingCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
  },
  tradeForm: {
    marginTop: '1.5rem'
  },
  tradeTypeSelector: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  tradeTypeButton: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: '600',
    cursor: 'pointer'
  },
  tradeInput: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    marginBottom: '1rem'
  },
  tradeInfo: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  tradeButtons: {
    display: 'flex',
    gap: '1rem'
  },
  executeButton: {
    flex: 1,
    padding: '0.75rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  selectCrypto: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b',
    backgroundColor: 'white',
    borderRadius: '12px'
  }
};