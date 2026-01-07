
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

export default function Investment() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [investmentPeriod, setInvestmentPeriod] = useState('long_term');
  const [riskTolerance, setRiskTolerance] = useState('moderate');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);

  // Market data state
  const [marketData, setMarketData] = useState({
    sp500: { value: 4783.45, change: 1.2 },
    nasdaq: { value: 15043.12, change: 0.8 },
    dow: { value: 37440.34, change: 0.5 },
    bonds: { value: 4.2, change: -0.1 }
  });

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

      const [accountsRes, productsRes, portfolioRes, transactionsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true }),
        supabase
          .from('investment_products')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('investments')
          .select(`
            *,
            product:product_id (
              name,
              type,
              risk_level,
              annual_return,
              description,
              expense_ratio,
              dividend_yield
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

      if (accountsRes.data && accountsRes.data.length > 0) {
        setAccounts(accountsRes.data);
        setSelectedAccount(accountsRes.data[0].id);
      }

      if (productsRes.data) {
        setProducts(productsRes.data);
        if (productsRes.data.length > 0) {
          setSelectedProduct(productsRes.data[0].id);
        }
      }

      if (portfolioRes.data) {
        setPortfolio(portfolioRes.data);
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
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setPageLoading(false);
    }
  };

  const handleInvest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const investmentAmount = parseFloat(amount);
      if (isNaN(investmentAmount) || investmentAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const product = products.find(p => p.id === selectedProduct);
      if (!product) {
        throw new Error('Please select an investment product');
      }

      if (investmentAmount < parseFloat(product.min_investment || 100)) {
        throw new Error(`Minimum investment amount is ${formatCurrency(product.min_investment || 100)}`);
      }

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        throw new Error('Please select an account');
      }

      if (parseFloat(account.balance) < investmentAmount) {
        throw new Error('Insufficient funds in selected account');
      }

      const newBalance = parseFloat(account.balance) - investmentAmount;

      // Create investment record
      const { data: investment, error: investmentError } = await supabase
        .from('investments')
        .insert([{
          user_id: user.id,
          account_id: selectedAccount,
          product_id: selectedProduct,
          amount_invested: investmentAmount,
          current_value: investmentAmount,
          status: 'active'
        }])
        .select()
        .single();

      if (investmentError) throw investmentError;

      // Update account balance
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', selectedAccount)
        .eq('user_id', user.id);

      if (updateError) {
        await supabase.from('investments').delete().eq('id', investment.id);
        throw new Error('Failed to update account balance. Investment cancelled.');
      }

      const reference = `INV${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: selectedAccount,
          type: 'debit',
          amount: investmentAmount,
          description: `Investment in ${product.name} - ${product.type}`,
          status: 'completed',
          reference: reference,
          balance_before: parseFloat(account.balance),
          balance_after: newBalance
        }]);

      if (transactionError) {
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(account.balance), updated_at: new Date().toISOString() })
          .eq('id', selectedAccount)
          .eq('user_id', user.id);
        await supabase.from('investments').delete().eq('id', investment.id);
        throw new Error('Failed to record transaction. Investment cancelled.');
      }

      // Create investment transaction
      const { error: invTransactionError } = await supabase
        .from('investment_transactions')
        .insert([{
          investment_id: investment.id,
          type: 'buy',
          amount: investmentAmount
        }]);

      if (invTransactionError) {
        console.error('Warning: Failed to record investment transaction:', invTransactionError);
      }

      const receipt = {
        reference: reference,
        date: new Date().toLocaleString(),
        productName: product.name,
        productType: product.type,
        riskLevel: product.risk_level,
        expectedReturn: product.annual_return,
        amount: investmentAmount,
        account: {
          type: account.account_type,
          number: account.account_number,
          balance: newBalance
        },
        investmentPeriod: investmentPeriod,
        riskTolerance: riskTolerance
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setAmount('');
      setMessage('');

      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Investment failed. Please try again.');
      setMessageType('error');
      console.error('Investment error:', error);
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

  const formatPercent = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getTypeIcon = (type) => {
    const icons = {
      stock: '📈',
      mutual_fund: '💼',
      bond: '📊',
      crypto: '₿',
      etf: '📉',
      reit: '🏢',
      commodity: '🌾',
      index_fund: '📑',
      money_market: '💵',
      other: '💰'
    };
    return icons[type] || '💰';
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: '#10b981',
      moderate: '#f59e0b',
      medium: '#f59e0b',
      high: '#ef4444',
      very_high: '#dc2626'
    };
    return colors[risk] || '#6b7280';
  };

  const getRiskLabel = (risk) => {
    const labels = {
      low: 'Low Risk',
      moderate: 'Moderate Risk',
      medium: 'Medium Risk',
      high: 'High Risk',
      very_high: 'Very High Risk'
    };
    return labels[risk] || risk;
  };

  const calculatePortfolioTotal = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
  };

  const calculateTotalInvested = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0);
  };

  const calculateTotalGain = () => {
    return calculatePortfolioTotal() - calculateTotalInvested();
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

  const getRiskDistribution = () => {
    const distribution = { low: 0, moderate: 0, medium: 0, high: 0, very_high: 0 };
    portfolio.forEach(inv => {
      const risk = inv.product?.risk_level || 'moderate';
      distribution[risk] = (distribution[risk] || 0) + parseFloat(inv.current_value || 0);
    });
    return distribution;
  };

  const getRecommendedProducts = () => {
    if (!products.length) return [];
    
    const riskMapping = {
      conservative: ['low', 'moderate'],
      moderate: ['moderate', 'medium'],
      aggressive: ['medium', 'high', 'very_high']
    };

    const allowedRisks = riskMapping[riskTolerance] || ['moderate'];
    return products.filter(p => allowedRisks.includes(p.risk_level)).slice(0, 3);
  };

  const viewProductDetail = (product) => {
    setSelectedProductDetail(product);
    setShowProductDetail(true);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      paddingTop: isMobile ? '1rem' : '2rem',
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
    headerButtons: {
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap'
    },
    backButton: {
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      display: 'inline-block'
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
      marginBottom: '1rem',
      textAlign: 'center'
    },
    subtitle: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      color: 'rgba(255,255,255,0.8)',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    marketTicker: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '2rem',
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap: '1rem',
      border: '1px solid rgba(255,255,255,0.2)'
    },
    marketItem: {
      textAlign: 'center'
    },
    marketLabel: {
      fontSize: '0.75rem',
      color: 'rgba(255,255,255,0.7)',
      marginBottom: '0.25rem'
    },
    marketValue: {
      fontSize: isMobile ? '1rem' : '1.25rem',
      fontWeight: '700',
      color: 'white'
    },
    marketChange: {
      fontSize: '0.75rem',
      fontWeight: '600',
      marginTop: '0.25rem'
    },
    portfolioSummary: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #10b981',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
      gap: '1.5rem'
    },
    summaryItem: {
      textAlign: 'center'
    },
    summaryLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    summaryValue: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#0f172a'
    },
    summarySubtext: {
      fontSize: '0.75rem',
      color: '#94a3b8',
      marginTop: '0.25rem'
    },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      overflowX: 'auto',
      paddingBottom: '0.5rem'
    },
    tab: {
      flex: isMobile ? '1 0 auto' : 1,
      minWidth: isMobile ? '120px' : 'auto',
      padding: '0.875rem 1rem',
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      border: 'none',
      borderRadius: '12px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      color: 'white',
      whiteSpace: 'nowrap'
    },
    activeTab: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      color: '#0f172a',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #10b981',
      marginBottom: '1.5rem'
    },
    cardTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #10b981',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    productsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    productCard: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      transition: 'all 0.3s',
      cursor: 'pointer',
      position: 'relative'
    },
    productCardSelected: {
      border: '2px solid #10b981',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      backgroundColor: '#f0fdf4'
    },
    productHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '1rem'
    },
    productName: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    productType: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '1rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    productDetails: {
      fontSize: '0.875rem',
      color: '#374151',
      marginTop: '0.5rem',
      lineHeight: '1.6'
    },
    riskBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: 'white',
      marginTop: '0.5rem'
    },
    productMetrics: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.75rem',
      marginTop: '1rem',
      paddingTop: '1rem',
      borderTop: '1px solid #e2e8f0'
    },
    metricItem: {
      textAlign: 'center'
    },
    metricLabel: {
      fontSize: '0.7rem',
      color: '#64748b',
      marginBottom: '0.25rem'
    },
    metricValue: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#10b981'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    gridContainer: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem'
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
    allocationLabel: {
      minWidth: '120px',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1e293b'
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
      fontSize: '0.875rem',
      transition: 'all 0.3s'
    },
    investmentsList: {
      display: 'grid',
      gap: '1rem'
    },
    investmentItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s'
    },
    investmentHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '1rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    investmentName: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    investmentValue: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#10b981'
    },
    receiptModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 31, 68, 0.95)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(8px)'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '2.5rem',
      maxWidth: '550px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      border: '2px solid #10b981'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '3px solid #10b981',
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      background: 'linear-gradient(135deg, #0f172a 0%, #10b981 100%)',
      margin: '-2.5rem -2.5rem 2rem -2.5rem',
      padding: '2rem 2.5rem',
      borderRadius: '18px 18px 0 0',
      color: 'white'
    },
    receiptTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      marginBottom: '0.5rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e2e8f0'
    },
    receiptLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      fontSize: '0.875rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    },
    receiptButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    receiptButton: {
      flex: 1,
      padding: '1rem',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
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
      borderTop: '4px solid #10b981',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    infoBox: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #86efac',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem'
    },
    warningBox: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fde047',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.loadingContainer}>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading investment platform...</p>
      </div>
    );
  }

  const totalInvested = calculateTotalInvested();
  const totalValue = calculatePortfolioTotal();
  const totalGain = calculateTotalGain();
  const gainPercentage = calculateGainPercentage();
  const allocation = getAssetAllocation();
  const riskDistribution = getRiskDistribution();

  return (
    <>
      <Head>
        <title>Investment Portfolio - Oakline Bank</title>
        <meta name="description" content="Professional investment management platform" />
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
          <div style={styles.headerButtons}>
            <Link href="/investment-details" style={styles.backButton}>📊 Analytics</Link>
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>💼 Investment Portfolio</h1>
          <p style={styles.subtitle}>Professional Investment Management Platform</p>

          {/* Market Ticker */}
          <div style={styles.marketTicker}>
            <div style={styles.marketItem}>
              <div style={styles.marketLabel}>S&P 500</div>
              <div style={styles.marketValue}>{marketData.sp500.value.toLocaleString()}</div>
              <div style={{...styles.marketChange, color: marketData.sp500.change >= 0 ? '#10b981' : '#ef4444'}}>
                {marketData.sp500.change >= 0 ? '+' : ''}{marketData.sp500.change}%
              </div>
            </div>
            <div style={styles.marketItem}>
              <div style={styles.marketLabel}>NASDAQ</div>
              <div style={styles.marketValue}>{marketData.nasdaq.value.toLocaleString()}</div>
              <div style={{...styles.marketChange, color: marketData.nasdaq.change >= 0 ? '#10b981' : '#ef4444'}}>
                {marketData.nasdaq.change >= 0 ? '+' : ''}{marketData.nasdaq.change}%
              </div>
            </div>
            <div style={styles.marketItem}>
              <div style={styles.marketLabel}>DOW JONES</div>
              <div style={styles.marketValue}>{marketData.dow.value.toLocaleString()}</div>
              <div style={{...styles.marketChange, color: marketData.dow.change >= 0 ? '#10b981' : '#ef4444'}}>
                {marketData.dow.change >= 0 ? '+' : ''}{marketData.dow.change}%
              </div>
            </div>
            <div style={styles.marketItem}>
              <div style={styles.marketLabel}>10Y TREASURY</div>
              <div style={styles.marketValue}>{marketData.bonds.value}%</div>
              <div style={{...styles.marketChange, color: marketData.bonds.change >= 0 ? '#10b981' : '#ef4444'}}>
                {marketData.bonds.change >= 0 ? '+' : ''}{marketData.bonds.change}%
              </div>
            </div>
          </div>

          {/* Portfolio Summary */}
          <div style={styles.portfolioSummary}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Invested</div>
              <div style={styles.summaryValue}>{formatCurrency(totalInvested)}</div>
              <div style={styles.summarySubtext}>Principal Amount</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Current Value</div>
              <div style={styles.summaryValue}>{formatCurrency(totalValue)}</div>
              <div style={styles.summarySubtext}>Market Value</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Gain/Loss</div>
              <div style={{
                ...styles.summaryValue,
                color: totalGain >= 0 ? '#10b981' : '#ef4444'
              }}>
                {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
              </div>
              <div style={styles.summarySubtext}>
                {totalGain >= 0 ? '+' : ''}{gainPercentage}%
              </div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Active Holdings</div>
              <div style={styles.summaryValue}>{portfolio.length}</div>
              <div style={styles.summarySubtext}>Investment Products</div>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: messageType === 'error' ? '#fee2e2' : '#d1fae5',
              color: messageType === 'error' ? '#dc2626' : '#059669',
              borderColor: messageType === 'error' ? '#fca5a5' : '#6ee7b7'
            }}>
              {message}
            </div>
          )}

          {/* Tabs */}
          <div style={styles.tabs}>
            <button
              style={{...styles.tab, ...(activeTab === 'overview' ? styles.activeTab : {})}}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button
              style={{...styles.tab, ...(activeTab === 'invest' ? styles.activeTab : {})}}
              onClick={() => setActiveTab('invest')}
            >
              💰 Invest
            </button>
            <button
              style={{...styles.tab, ...(activeTab === 'portfolio' ? styles.activeTab : {})}}
              onClick={() => setActiveTab('portfolio')}
            >
              💼 Portfolio
            </button>
            <button
              style={{...styles.tab, ...(activeTab === 'analytics' ? styles.activeTab : {})}}
              onClick={() => setActiveTab('analytics')}
            >
              📈 Analytics
            </button>
            <button
              style={{...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {})}}
              onClick={() => setActiveTab('history')}
            >
              📋 History
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={styles.gridContainer}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Asset Allocation</h2>
                {Object.keys(allocation).length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No investments yet. Start investing to see your asset allocation.</p>
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
                        reit: '#ec4899',
                        commodity: '#14b8a6',
                        index_fund: '#6366f1',
                        money_market: '#84cc16',
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
                              minWidth: '100px'
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

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Risk Distribution</h2>
                {portfolio.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No investments yet. Start investing to see your risk distribution.</p>
                  </div>
                ) : (
                  <div style={styles.allocationChart}>
                    {Object.entries(riskDistribution).filter(([_, value]) => value > 0).map(([risk, value]) => {
                      const percentage = ((value / totalValue) * 100).toFixed(1);
                      return (
                        <div key={risk} style={styles.allocationItem}>
                          <div style={styles.allocationLabel}>
                            {getRiskLabel(risk)}
                          </div>
                          <div
                            style={{
                              ...styles.allocationBar,
                              backgroundColor: getRiskColor(risk),
                              width: `${percentage}%`,
                              minWidth: '100px'
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

          {/* Invest Tab */}
          {activeTab === 'invest' && (
            <>
              <div style={styles.infoBox}>
                <strong>💡 Investment Tips:</strong> Diversify your portfolio across different asset classes to minimize risk. Consider your investment timeline and risk tolerance when selecting products.
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  <span>Available Investment Products</span>
                  <span style={{fontSize: '0.85rem', fontWeight: '500', color: '#64748b'}}>
                    {products.length} Products
                  </span>
                </h2>
                {products.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</p>
                    <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Products Available</h3>
                    <p>Investment products will appear here when available.</p>
                  </div>
                ) : (
                  <>
                    <div style={styles.productsGrid}>
                      {products.map(product => (
                        <div
                          key={product.id}
                          style={{
                            ...styles.productCard,
                            ...(selectedProduct === product.id ? styles.productCardSelected : {})
                          }}
                          onClick={() => setSelectedProduct(product.id)}
                        >
                          <div style={styles.productHeader}>
                            <div>
                              <div style={styles.productName}>
                                {getTypeIcon(product.type)} {product.name}
                              </div>
                              <div style={styles.productType}>
                                {product.type?.replace('_', ' ')}
                              </div>
                            </div>
                            <div
                              style={{
                                ...styles.riskBadge,
                                backgroundColor: getRiskColor(product.risk_level)
                              }}
                            >
                              {getRiskLabel(product.risk_level)}
                            </div>
                          </div>
                          {product.description && (
                            <div style={styles.productDetails}>{product.description}</div>
                          )}
                          <div style={styles.productMetrics}>
                            <div style={styles.metricItem}>
                              <div style={styles.metricLabel}>Expected Return</div>
                              <div style={styles.metricValue}>
                                {product.annual_return ? `${product.annual_return}%` : 'Variable'}
                              </div>
                            </div>
                            <div style={styles.metricItem}>
                              <div style={styles.metricLabel}>Min. Investment</div>
                              <div style={styles.metricValue}>
                                {formatCurrency(product.min_investment || 100)}
                              </div>
                            </div>
                            {product.expense_ratio > 0 && (
                              <div style={styles.metricItem}>
                                <div style={styles.metricLabel}>Expense Ratio</div>
                                <div style={styles.metricValue}>{formatPercent(product.expense_ratio)}</div>
                              </div>
                            )}
                            {product.dividend_yield > 0 && (
                              <div style={styles.metricItem}>
                                <div style={styles.metricLabel}>Dividend Yield</div>
                                <div style={styles.metricValue}>{formatPercent(product.dividend_yield)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {accounts.length === 0 ? (
                      <div style={styles.warningBox}>
                        <strong>⚠️ No Active Accounts:</strong> You need an active account to invest. Please contact support or wait for account approval.
                      </div>
                    ) : (
                      <form onSubmit={handleInvest}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#0f172a', marginBottom: '1rem', marginTop: '2rem' }}>
                          Investment Details
                        </h3>
                        
                        <div style={styles.gridContainer}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>From Account *</label>
                            <select
                              style={styles.select}
                              value={selectedAccount}
                              onChange={(e) => setSelectedAccount(e.target.value)}
                              required
                            >
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>
                                  {account.account_type?.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.label}>Investment Period</label>
                            <select
                              style={styles.select}
                              value={investmentPeriod}
                              onChange={(e) => setInvestmentPeriod(e.target.value)}
                            >
                              <option value="short_term">Short Term (Under 1 year)</option>
                              <option value="medium_term">Medium Term (1-5 years)</option>
                              <option value="long_term">Long Term (5+ years)</option>
                            </select>
                          </div>
                        </div>

                        <div style={styles.gridContainer}>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Amount ($) *</label>
                            <input
                              type="number"
                              style={styles.input}
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="Enter amount"
                              step="0.01"
                              min="1"
                              required
                            />
                            {selectedProduct && (
                              <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                                Minimum: {formatCurrency(products.find(p => p.id === selectedProduct)?.min_investment || 100)}
                              </small>
                            )}
                          </div>

                          <div style={styles.formGroup}>
                            <label style={styles.label}>Risk Tolerance</label>
                            <select
                              style={styles.select}
                              value={riskTolerance}
                              onChange={(e) => setRiskTolerance(e.target.value)}
                            >
                              <option value="conservative">Conservative</option>
                              <option value="moderate">Moderate</option>
                              <option value="aggressive">Aggressive</option>
                            </select>
                          </div>
                        </div>

                        {selectedAccount && (
                          <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '1rem',
                            borderRadius: '12px',
                            marginBottom: '1rem',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>
                              Available Balance
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b' }}>
                              {formatCurrency(accounts.find(a => a.id === selectedAccount)?.balance || 0)}
                            </div>
                            {amount && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                                Balance after investment: {formatCurrency(
                                  parseFloat(accounts.find(a => a.id === selectedAccount)?.balance || 0) - parseFloat(amount || 0)
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          style={{
                            ...styles.submitButton,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                          }}
                          disabled={loading}
                        >
                          {loading ? '🔄 Processing Investment...' : `💰 Invest ${formatCurrency(parseFloat(amount) || 0)}`}
                        </button>
                      </form>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span>My Investment Holdings</span>
                <Link href="/investment-details" style={{fontSize: '0.85rem', fontWeight: '500', color: '#10b981', textDecoration: 'none'}}>
                  View Details →
                </Link>
              </h2>
              {portfolio.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</p>
                  <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Holdings Yet</h3>
                  <p>Start building your portfolio by investing in available products.</p>
                </div>
              ) : (
                <div style={styles.investmentsList}>
                  {portfolio.map(investment => {
                    const gain = parseFloat(investment.current_value) - parseFloat(investment.amount_invested);
                    const gainPercent = ((gain / parseFloat(investment.amount_invested)) * 100).toFixed(2);
                    
                    return (
                      <div key={investment.id} style={styles.investmentItem}>
                        <div style={styles.investmentHeader}>
                          <div>
                            <div style={styles.investmentName}>
                              {getTypeIcon(investment.product?.type)} {investment.product?.name}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                              Invested: {new Date(investment.invested_at).toLocaleDateString()} • 
                              Type: {investment.product?.type?.replace('_', ' ').toUpperCase()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={styles.investmentValue}>
                              {formatCurrency(investment.current_value)}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                              Cost: {formatCurrency(investment.amount_invested)}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid #e2e8f0'
                        }}>
                          <div>
                            <span style={{
                              ...styles.riskBadge,
                              backgroundColor: getRiskColor(investment.product?.risk_level)
                            }}>
                              {getRiskLabel(investment.product?.risk_level)}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: gain >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gain >= 0 ? '+' : ''}{gainPercent}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div style={styles.gridContainer}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Performance Metrics</h2>
                <div style={styles.productMetrics}>
                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Average Return</div>
                    <div style={{...styles.metricValue, color: gainPercentage >= 0 ? '#10b981' : '#ef4444'}}>
                      {gainPercentage >= 0 ? '+' : ''}{gainPercentage}%
                    </div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Total Gain/Loss</div>
                    <div style={{...styles.metricValue, color: totalGain >= 0 ? '#10b981' : '#ef4444'}}>
                      {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                    </div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Portfolio Diversity</div>
                    <div style={styles.metricValue}>
                      {Object.keys(allocation).length} {Object.keys(allocation).length === 1 ? 'Asset' : 'Assets'}
                    </div>
                  </div>
                  <div style={styles.metricItem}>
                    <div style={styles.metricLabel}>Risk Level</div>
                    <div style={styles.metricValue}>
                      {portfolio.some(p => p.product?.risk_level === 'high' || p.product?.risk_level === 'very_high') ? 'High' : 
                       portfolio.some(p => p.product?.risk_level === 'medium' || p.product?.risk_level === 'moderate') ? 'Moderate' : 'Low'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Recommended Products</h2>
                {getRecommendedProducts().length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>No recommendations available</p>
                  </div>
                ) : (
                  <div style={{display: 'grid', gap: '1rem'}}>
                    {getRecommendedProducts().map(product => (
                      <div key={product.id} style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{fontWeight: '600', marginBottom: '0.5rem'}}>
                          {getTypeIcon(product.type)} {product.name}
                        </div>
                        <div style={{fontSize: '0.875rem', color: '#64748b'}}>
                          Expected Return: {product.annual_return}% • Min: {formatCurrency(product.min_investment)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Transaction History</h2>
              {transactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ fontSize: '2rem' }}>📋</p>
                  <p>No transaction history yet</p>
                </div>
              ) : (
                <div style={{maxHeight: '600px', overflowY: 'auto'}}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={{
                      padding: '1rem',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      marginBottom: '0.75rem',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
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

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div style={styles.receiptModal} onClick={() => setShowReceipt(false)}>
          <div style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={styles.receiptTitle}>Investment Confirmed</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Oakline Bank Investment Services</div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Reference</span>
              <span style={styles.receiptValue}>{receiptData.reference}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>{receiptData.date}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Product</span>
              <span style={styles.receiptValue}>{receiptData.productName}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Type</span>
              <span style={styles.receiptValue}>{getTypeIcon(receiptData.productType)} {receiptData.productType?.replace('_', ' ')}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Risk Level</span>
              <span style={styles.receiptValue}>{getRiskLabel(receiptData.riskLevel)}</span>
            </div>
            {receiptData.expectedReturn && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Expected Annual Return</span>
                <span style={styles.receiptValue}>{receiptData.expectedReturn}%</span>
              </div>
            )}
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Amount Invested</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.amount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Investment Period</span>
              <span style={styles.receiptValue}>{receiptData.investmentPeriod?.replace('_', ' ')}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>From Account</span>
              <span style={styles.receiptValue}>{receiptData.account.type?.toUpperCase()} - {receiptData.account.number}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>New Account Balance</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.account.balance)}</span>
            </div>

            <div style={styles.receiptButtons}>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#10b981',
                  color: 'white'
                }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#0f172a',
                  color: 'white'
                }}
                onClick={() => setShowReceipt(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
