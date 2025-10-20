
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Investments() {
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [selectedInvestment, setSelectedInvestment] = useState('');
  const [amount, setAmount] = useState('');
  const [investmentType, setInvestmentType] = useState('stocks');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('portfolio');
  const router = useRouter();

  useEffect(() => {
    fetchPortfolio();
    fetchMarketData();
  }, []);

  const fetchPortfolio = () => {
    // Mock portfolio data
    setPortfolio([
      { 
        symbol: 'AAPL', 
        name: 'Apple Inc.', 
        shares: 50, 
        price: 175.25, 
        value: 8762.50, 
        profit: '+$1,250.00',
        change: '+2.4%',
        type: 'stock'
      },
      { 
        symbol: 'MSFT', 
        name: 'Microsoft Corp.', 
        shares: 25, 
        price: 415.80, 
        value: 10395.00, 
        profit: '+$2,100.00',
        change: '+1.8%',
        type: 'stock'
      },
      { 
        symbol: 'VTSAX', 
        name: 'Vanguard Total Stock', 
        shares: 100, 
        price: 112.45, 
        value: 11245.00, 
        profit: '+$845.00',
        change: '+0.9%',
        type: 'mutual_fund'
      },
      { 
        symbol: 'BOND-FUND', 
        name: 'Government Bond Fund', 
        shares: 200, 
        price: 25.30, 
        value: 5060.00, 
        profit: '+$120.00',
        change: '+0.3%',
        type: 'bond'
      }
    ]);
  };

  const fetchMarketData = () => {
    // Mock market data
    setMarketData([
      { symbol: 'AAPL', name: 'Apple Inc.', price: 175.25, change: '+2.4%', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.80, change: '+1.2%', sector: 'Technology' },
      { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: '+5.7%', sector: 'Automotive' },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.30, change: '+3.1%', sector: 'Technology' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', price: 512.45, change: '+1.1%', sector: 'ETF' },
      { symbol: 'QQQ', name: 'Invesco QQQ Trust', price: 425.60, change: '+1.8%', sector: 'ETF' }
    ]);
  };

  const handleInvestment = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Add your investment logic here
      setMessage(`Investment order for $${amount} in ${selectedInvestment} submitted successfully!`);
      setAmount('');
      setSelectedInvestment('');
      
      // Refresh portfolio
      fetchPortfolio();
    } catch (error) {
      setMessage('Error processing investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalValue = () => {
    return portfolio.reduce((total, item) => total + item.value, 0);
  };

  const calculateTotalProfit = () => {
    return portfolio.reduce((total, item) => {
      const profit = parseFloat(item.profit.replace(/[+$,]/g, ''));
      return total + profit;
    }, 0);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📈 Investment Portfolio</h1>
          <p style={styles.subtitle}>Grow your wealth with Oakline Bank Investments</p>
        </div>
        <Link href="/main-menu" style={styles.backButton}>
          ← Back to Menu
        </Link>
      </div>

      {/* Portfolio Overview */}
      <div style={styles.overviewSection}>
        <div style={styles.overviewGrid}>
          <div style={styles.overviewCard}>
            <h3>Total Portfolio Value</h3>
            <p style={styles.totalValue}>${calculateTotalValue().toLocaleString()}</p>
            <span style={styles.profitIndicator}>
              +${calculateTotalProfit().toLocaleString()} (+12.8%)
            </span>
          </div>
          <div style={styles.overviewCard}>
            <h3>24h Change</h3>
            <p style={styles.changeValue}>+$547.25</p>
            <span style={styles.profitIndicator}>+1.54%</span>
          </div>
          <div style={styles.overviewCard}>
            <h3>Holdings</h3>
            <p style={styles.holdingsCount}>{portfolio.length} Investments</p>
            <span style={styles.diversification}>Diversified Portfolio</span>
          </div>
          <div style={styles.overviewCard}>
            <h3>Risk Level</h3>
            <p style={styles.riskLevel}>Moderate</p>
            <span style={styles.riskIndicator}>Balanced Risk/Reward</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabsContainer}>
        <button 
          style={activeTab === 'portfolio' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('portfolio')}
        >
          💼 My Portfolio
        </button>
        <button 
          style={activeTab === 'market' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('market')}
        >
          📊 Market Data
        </button>
        <button 
          style={activeTab === 'invest' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('invest')}
        >
          💰 New Investment
        </button>
      </div>

      {/* Portfolio Tab */}
      {activeTab === 'portfolio' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>💼 Your Investment Portfolio</h2>
          <div style={styles.portfolioGrid}>
            {portfolio.map((investment) => (
              <div key={investment.symbol} style={styles.investmentCard}>
                <div style={styles.investmentHeader}>
                  <div>
                    <h3 style={styles.investmentSymbol}>{investment.symbol}</h3>
                    <p style={styles.investmentName}>{investment.name}</p>
                    <span style={styles.investmentType}>
                      {investment.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <span style={investment.change.startsWith('+') ? styles.positive : styles.negative}>
                    {investment.change}
                  </span>
                </div>
                <div style={styles.investmentDetails}>
                  <p style={styles.shares}>{investment.shares} shares @ ${investment.price}</p>
                  <p style={styles.value}>${investment.value.toLocaleString()}</p>
                  <p style={styles.profit}>{investment.profit}</p>
                </div>
                <div style={styles.investmentActions}>
                  <button style={styles.buyButton}>Buy More</button>
                  <button style={styles.sellButton}>Sell</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Data Tab */}
      {activeTab === 'market' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>📊 Market Data</h2>
          <div style={styles.marketGrid}>
            {marketData.map((stock) => (
              <div key={stock.symbol} style={styles.marketCard}>
                <div style={styles.marketHeader}>
                  <div>
                    <h3 style={styles.stockSymbol}>{stock.symbol}</h3>
                    <p style={styles.stockName}>{stock.name}</p>
                    <span style={styles.sector}>{stock.sector}</span>
                  </div>
                  <span style={stock.change.startsWith('+') ? styles.positive : styles.negative}>
                    {stock.change}
                  </span>
                </div>
                <p style={styles.stockPrice}>${stock.price}</p>
                <button 
                  style={styles.investButton}
                  onClick={() => {
                    setSelectedInvestment(stock.symbol);
                    setActiveTab('invest');
                  }}
                >
                  Invest Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investment Tab */}
      {activeTab === 'invest' && (
        <div style={styles.tabContent}>
          <h2 style={styles.sectionTitle}>💰 Make New Investment</h2>
          <div style={styles.investmentForm}>
            <form onSubmit={handleInvestment} style={styles.form}>
              <div style={styles.formRow}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Investment Type</label>
                  <select 
                    value={investmentType} 
                    onChange={(e) => setInvestmentType(e.target.value)}
                    style={styles.select}
                  >
                    <option value="stocks">📈 Individual Stocks</option>
                    <option value="etf">📊 ETFs</option>
                    <option value="mutual_funds">🏦 Mutual Funds</option>
                    <option value="bonds">💰 Bonds</option>
                    <option value="reit">🏢 REITs</option>
                  </select>
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Investment</label>
                  <select 
                    value={selectedInvestment} 
                    onChange={(e) => setSelectedInvestment(e.target.value)}
                    style={styles.select}
                    required
                  >
                    <option value="">Select Investment</option>
                    {marketData.map((stock) => (
                      <option key={stock.symbol} value={stock.symbol}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Investment Amount (USD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={styles.input}
                  placeholder="Enter amount to invest"
                  min="100"
                  step="0.01"
                  required
                />
              </div>

              <div style={styles.riskWarning}>
                ⚠️ <strong>Investment Disclaimer:</strong> All investments carry risk. Past performance does not guarantee future results. Please consult with a financial advisor before making investment decisions.
              </div>

              <button 
                type="submit" 
                style={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Invest $${amount || '0'} in ${selectedInvestment || 'Selection'}`}
              </button>
            </form>

            {message && (
              <div style={styles.message}>
                {message}
              </div>
            )}
          </div>

          {/* Investment Options */}
          <div style={styles.investmentOptions}>
            <h3 style={styles.optionsTitle}>📋 Investment Options</h3>
            <div style={styles.optionsGrid}>
              <div style={styles.optionCard}>
                <h4>📈 Stocks</h4>
                <p>Individual company shares with high growth potential</p>
                <span style={styles.riskBadge}>High Risk</span>
              </div>
              <div style={styles.optionCard}>
                <h4>📊 ETFs</h4>
                <p>Diversified funds tracking market indices</p>
                <span style={styles.moderateRisk}>Moderate Risk</span>
              </div>
              <div style={styles.optionCard}>
                <h4>🏦 Mutual Funds</h4>
                <p>Professionally managed diversified portfolios</p>
                <span style={styles.moderateRisk}>Moderate Risk</span>
              </div>
              <div style={styles.optionCard}>
                <h4>💰 Bonds</h4>
                <p>Fixed-income securities with steady returns</p>
                <span style={styles.lowRisk}>Low Risk</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={styles.quickActions}>
        <Link href="/dashboard" style={styles.actionButton}>
          📊 Dashboard
        </Link>
        <Link href="/transactions" style={styles.actionButton}>
          📋 Transaction History
        </Link>
        <Link href="/profile" style={styles.actionButton}>
          👤 Profile
        </Link>
        <Link href="/crypto" style={styles.actionButton}>
          ₿ Crypto Trading
        </Link>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    margin: '5px 0 0 0'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    backdropFilter: 'blur(10px)'
  },
  overviewSection: {
    marginBottom: '30px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  overviewCard: {
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)'
  },
  totalValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: '10px 0'
  },
  changeValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: '10px 0'
  },
  holdingsCount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
    margin: '10px 0'
  },
  riskLevel: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f59e0b',
    margin: '10px 0'
  },
  profitIndicator: {
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: '500'
  },
  diversification: {
    color: '#3b82f6',
    fontSize: '14px'
  },
  riskIndicator: {
    color: '#f59e0b',
    fontSize: '14px'
  },
  tabsContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  tab: {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    backdropFilter: 'blur(10px)'
  },
  activeTab: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    backdropFilter: 'blur(10px)'
  },
  tabContent: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '20px'
  },
  portfolioGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  investmentCard: {
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  investmentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  investmentSymbol: {
    color: 'white',
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  investmentName: {
    color: 'rgba(255,255,255,0.7)',
    margin: '2px 0',
    fontSize: '14px'
  },
  investmentType: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  investmentDetails: {
    marginBottom: '15px'
  },
  shares: {
    color: 'rgba(255,255,255,0.8)',
    margin: '2px 0',
    fontSize: '14px'
  },
  value: {
    color: 'white',
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '5px 0'
  },
  profit: {
    color: '#22c55e',
    fontSize: '14px',
    fontWeight: '500',
    margin: '2px 0'
  },
  investmentActions: {
    display: 'flex',
    gap: '10px'
  },
  buyButton: {
    flex: 1,
    background: '#22c55e',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  sellButton: {
    flex: 1,
    background: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500'
  },
  marketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px'
  },
  marketCard: {
    background: 'rgba(255,255,255,0.1)',
    padding: '20px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  marketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  stockSymbol: {
    color: 'white',
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold'
  },
  stockName: {
    color: 'rgba(255,255,255,0.7)',
    margin: '2px 0',
    fontSize: '14px'
  },
  sector: {
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#a855f7',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  stockPrice: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '15px 0'
  },
  investButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  positive: {
    color: '#22c55e',
    fontWeight: '500'
  },
  negative: {
    color: '#ef4444',
    fontWeight: '500'
  },
  investmentForm: {
    background: 'rgba(255,255,255,0.1)',
    padding: '25px',
    borderRadius: '12px',
    marginBottom: '30px',
    backdropFilter: 'blur(10px)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '500'
  },
  select: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    background: 'rgba(255,255,255,0.9)'
  },
  input: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    background: 'rgba(255,255,255,0.9)'
  },
  riskWarning: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: 'white',
    border: 'none',
    padding: '15px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  message: {
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    marginTop: '20px'
  },
  investmentOptions: {
    background: 'rgba(255,255,255,0.1)',
    padding: '25px',
    borderRadius: '12px',
    backdropFilter: 'blur(10px)'
  },
  optionsTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px'
  },
  optionCard: {
    background: 'rgba(255,255,255,0.05)',
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  riskBadge: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  moderateRisk: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  lowRisk: {
    background: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500'
  },
  quickActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  actionButton: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '500',
    backdropFilter: 'blur(10px)'
  }
};
