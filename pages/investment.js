import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  const [activeTab, setActiveTab] = useState('products');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

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
          .order('created_at', { ascending: false }),
        supabase
          .from('investments')
          .select(`
            *,
            product:product_id (
              name,
              type,
              risk_level,
              annual_return
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
          .limit(50)
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

      if (investmentAmount < 100) {
        throw new Error('Minimum investment amount is $100');
      }

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        throw new Error('Please select an account');
      }

      if (account.balance < investmentAmount) {
        throw new Error('Insufficient funds in selected account');
      }

      const product = products.find(p => p.id === selectedProduct);
      if (!product) {
        throw new Error('Please select an investment product');
      }

      const newBalance = parseFloat(account.balance) - investmentAmount;

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

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: selectedAccount,
          type: 'investment',
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

      const { error: invTransactionError } = await supabase
        .from('investment_transactions')
        .insert([{
          investment_id: investment.id,
          type: 'buy',
          amount: investmentAmount
        }]);

      if (invTransactionError) {
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(account.balance), updated_at: new Date().toISOString() })
          .eq('id', selectedAccount)
          .eq('user_id', user.id);
        await supabase.from('transactions').delete().eq('reference', reference);
        await supabase.from('investments').delete().eq('id', investment.id);
        throw new Error('Failed to record investment transaction. Investment cancelled.');
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
        }
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setAmount('');

      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Investment failed. Please try again.');
      setMessageType('error');
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

  const getRiskColor = (risk) => {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444'
    };
    return colors[risk] || '#6b7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981',
      closed: '#6b7280',
      pending: '#f59e0b',
      failed: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const calculatePortfolioTotal = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
  };

  const calculateTotalInvested = () => {
    return portfolio.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
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
    backButton: {
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
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
    portfolioSummary: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
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
      color: '#1a365d'
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
    productsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    productCard: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      transition: 'all 0.3s',
      cursor: 'pointer'
    },
    productCardSelected: {
      border: '2px solid #059669',
      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
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
      marginBottom: '1rem'
    },
    productDetails: {
      fontSize: '0.875rem',
      color: '#374151',
      marginTop: '0.5rem'
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
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    investmentsList: {
      display: 'grid',
      gap: '1rem'
    },
    investmentItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
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
      color: '#059669'
    },
    investmentDetails: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginTop: '0.5rem'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      color: 'white',
      marginTop: '0.5rem'
    },
    transactionsList: {
      maxHeight: '600px',
      overflowY: 'auto'
    },
    transactionItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '0.5rem'
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
      border: '2px solid #059669'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '3px solid #059669',
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
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
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
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
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading investments...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Investments - Oakline Bank</title>
        <meta name="description" content="Manage your investment portfolio" />
      </Head>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <a href="/dashboard" style={styles.logo}>🏦 Oakline Bank</a>
          <a href="/dashboard" style={styles.backButton}>← Back to Dashboard</a>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>📈 Investment Portfolio</h1>

          <div style={styles.portfolioSummary}>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Invested</div>
              <div style={styles.summaryValue}>{formatCurrency(calculateTotalInvested())}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Current Value</div>
              <div style={styles.summaryValue}>{formatCurrency(calculatePortfolioTotal())}</div>
            </div>
            <div style={styles.summaryItem}>
              <div style={styles.summaryLabel}>Total Gain/Loss</div>
              <div style={{
                ...styles.summaryValue,
                color: calculatePortfolioTotal() - calculateTotalInvested() >= 0 ? '#10b981' : '#ef4444'
              }}>
                {formatCurrency(calculatePortfolioTotal() - calculateTotalInvested())}
              </div>
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

          <div style={styles.tabs}>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'products' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('products')}
            >
              💼 Available Products
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'portfolio' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('portfolio')}
            >
              📊 My Portfolio
            </button>
            <button
              style={{
                ...styles.tab,
                ...(activeTab === 'history' ? styles.activeTab : {})
              }}
              onClick={() => setActiveTab('history')}
            >
              📋 Transaction History
            </button>
          </div>

          {activeTab === 'products' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Investment Products</h2>
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
                        <div style={styles.productName}>
                          {getTypeIcon(product.type)} {product.name}
                        </div>
                        <div style={styles.productType}>
                          {product.type?.replace('_', ' ').toUpperCase()}
                        </div>
                        {product.description && (
                          <div style={styles.productDetails}>{product.description}</div>
                        )}
                        <div style={styles.productDetails}>
                          <strong>Expected Return:</strong> {product.annual_return ? `${product.annual_return}% annually` : 'Variable'}
                        </div>
                        <div style={{
                          ...styles.riskBadge,
                          backgroundColor: getRiskColor(product.risk_level)
                        }}>
                          {product.risk_level?.toUpperCase()} RISK
                        </div>
                      </div>
                    ))}
                  </div>

                  {accounts.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>You need an active account to invest. Please contact support.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleInvest}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1a365d', marginBottom: '1rem', marginTop: '2rem' }}>
                        Make an Investment
                      </h3>
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
                        <label style={styles.label}>Amount ($) *</label>
                        <input
                          type="number"
                          style={styles.input}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Minimum $100"
                          step="0.01"
                          min="100"
                          required
                        />
                        <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                          Minimum investment: $100.00
                        </small>
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
                        {loading ? '🔄 Processing...' : `📈 Invest ${formatCurrency(parseFloat(amount) || 0)}`}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>My Investment Portfolio</h2>
              {portfolio.length === 0 ? (
                <div style={styles.emptyState}>
                  <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</p>
                  <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Investments Yet</h3>
                  <p>Start building your portfolio by investing in available products.</p>
                </div>
              ) : (
                <div style={styles.investmentsList}>
                  {portfolio.map(investment => (
                    <div key={investment.id} style={styles.investmentItem}>
                      <div style={styles.investmentHeader}>
                        <div>
                          <div style={styles.investmentName}>
                            {getTypeIcon(investment.product?.type)} {investment.product?.name}
                          </div>
                          <div style={styles.investmentDetails}>
                            Invested: {new Date(investment.invested_at).toLocaleDateString()}
                          </div>
                          <div style={styles.investmentDetails}>
                            From: {investment.account?.account_type?.toUpperCase()} - {investment.account?.account_number}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={styles.investmentValue}>
                            {formatCurrency(investment.current_value)}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                            Invested: {formatCurrency(investment.amount_invested)}
                          </div>
                          <div style={{
                            ...styles.statusBadge,
                            backgroundColor: getStatusColor(investment.status)
                          }}>
                            {investment.status?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      {investment.product?.risk_level && (
                        <div style={styles.investmentDetails}>
                          Risk Level: <span style={{
                            color: getRiskColor(investment.product.risk_level),
                            fontWeight: '600'
                          }}>
                            {investment.product.risk_level?.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Transaction History</h2>
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
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#059669' }}>
                        {formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showReceipt && receiptData && (
        <div style={styles.receiptModal} onClick={() => setShowReceipt(false)}>
          <div style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={styles.receiptTitle}>Investment Confirmed</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Oakline Bank</div>
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
              <span style={styles.receiptValue}>{receiptData.riskLevel?.toUpperCase()}</span>
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
                  backgroundColor: '#059669',
                  color: 'white'
                }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#1a365d',
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
