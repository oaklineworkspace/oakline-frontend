import { useState, useEffect, useRef } from 'react';
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
  const [investmentGoal, setInvestmentGoal] = useState('growth');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountInputRef = useRef(null);

  const handleProductSelect = (productId) => {
    setSelectedProduct(productId);
    setTimeout(() => {
      if (amountInputRef.current) {
        amountInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        amountInputRef.current.focus();
      }
    }, 100);
  };

  const [marketData] = useState({
    sp500: { value: 5248.49, change: 0.83, name: 'S&P 500' },
    nasdaq: { value: 16736.03, change: 1.12, name: 'NASDAQ' },
    dow: { value: 39069.59, change: 0.56, name: 'DOW' },
    treasury: { value: 4.28, change: -0.02, name: '10Y Treasury' }
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
        supabase.from('accounts').select('*').eq('user_id', session.user.id).eq('status', 'active').order('created_at', { ascending: true }),
        supabase.from('investment_products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('investments').select(`*, product:product_id (name, type, risk_level, annual_return, description, expense_ratio, dividend_yield), account:account_id (account_type, account_number)`).eq('user_id', session.user.id).order('invested_at', { ascending: false }),
        supabase.from('investment_transactions').select(`*, investment:investment_id (product:product_id (name, type))`).order('created_at', { ascending: false }).limit(100)
      ]);

      if (accountsRes.data?.length > 0) {
        setAccounts(accountsRes.data);
        setSelectedAccount(accountsRes.data[0].id);
      }

      if (productsRes.data) {
        setProducts(productsRes.data);
        if (productsRes.data.length > 0) setSelectedProduct(productsRes.data[0].id);
      }

      if (portfolioRes.data) setPortfolio(portfolioRes.data);

      if (transactionsRes.data) {
        const userInvestmentIds = portfolioRes.data?.map(inv => inv.id) || [];
        setTransactions(transactionsRes.data.filter(tx => userInvestmentIds.includes(tx.investment_id)));
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
    setIsSubmitting(true);
    setMessage('');

    try {
      const investmentAmount = parseFloat(amount.replace(/,/g, ''));
      if (isNaN(investmentAmount) || investmentAmount <= 0) throw new Error('Please enter a valid amount');

      const product = products.find(p => p.id === selectedProduct);
      if (!product) throw new Error('Please select an investment product');

      if (investmentAmount < parseFloat(product.min_investment || 100)) {
        throw new Error(`Minimum investment amount is ${formatCurrency(product.min_investment || 100)}`);
      }

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) throw new Error('Please select an account');
      if (parseFloat(account.balance) < investmentAmount) throw new Error('Insufficient funds in selected account');

      const newBalance = parseFloat(account.balance) - investmentAmount;

      const { data: investment, error: investmentError } = await supabase
        .from('investments')
        .insert([{ user_id: user.id, account_id: selectedAccount, product_id: selectedProduct, amount_invested: investmentAmount, current_value: investmentAmount, status: 'active' }])
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

      await supabase.from('transactions').insert([{
        user_id: user.id, account_id: selectedAccount, type: 'debit', amount: investmentAmount,
        description: `Investment in ${product.name} - ${product.type}`, status: 'completed',
        reference, balance_before: parseFloat(account.balance), balance_after: newBalance
      }]);

      await supabase.from('investment_transactions').insert([{ investment_id: investment.id, type: 'buy', amount: investmentAmount }]);

      // Send email notification (fire-and-forget)
      try {
        fetch('/api/investments/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            productName: product.name,
            productType: product.type,
            amount: investmentAmount,
            reference,
            accountNumber: account.account_number,
            accountType: account.account_type,
            newBalance
          })
        }).catch(err => console.error('Email notification error:', err));
      } catch (emailErr) {
        console.error('Email notification error:', emailErr);
      }

      setReceiptData({
        reference, date: new Date().toLocaleString(), productName: product.name, productType: product.type,
        riskLevel: product.risk_level, expectedReturn: product.annual_return, amount: investmentAmount,
        account: { type: account.account_type, number: account.account_number, balance: newBalance },
        investmentPeriod, riskTolerance, investmentGoal
      });
      setShowReceipt(true);
      setAmount('');
      await checkUserAndFetchData();
    } catch (error) {
      setMessage(error.message || 'Investment failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  const formatPercent = (value) => `${(value || 0).toFixed(2)}%`;

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    setAmount(value);
  };

  const getTypeIcon = (type) => {
    const icons = { stock: '📈', mutual_fund: '💼', bond: '📊', crypto: '₿', etf: '📉', reit: '🏢', commodity: '🌾', index_fund: '📑', money_market: '💵', other: '💰' };
    return icons[type] || '💰';
  };

  const getRiskColor = (risk) => {
    const colors = { low: '#22c55e', moderate: '#f59e0b', medium: '#f59e0b', high: '#ef4444', very_high: '#dc2626' };
    return colors[risk] || '#6b7280';
  };

  const getRiskLabel = (risk) => {
    const labels = { low: 'Low Risk', moderate: 'Moderate', medium: 'Medium', high: 'High Risk', very_high: 'Very High' };
    return labels[risk] || risk;
  };

  const calculatePortfolioTotal = () => portfolio.reduce((sum, inv) => sum + parseFloat(inv.current_value || 0), 0);
  const calculateTotalInvested = () => portfolio.reduce((sum, inv) => sum + parseFloat(inv.amount_invested || 0), 0);
  const calculateTotalGain = () => calculatePortfolioTotal() - calculateTotalInvested();
  const calculateGainPercentage = () => {
    const invested = calculateTotalInvested();
    return invested === 0 ? 0 : ((calculateTotalGain() / invested) * 100).toFixed(2);
  };

  const getAssetAllocation = () => {
    const allocation = {};
    portfolio.forEach(inv => {
      const type = inv.product?.type || 'other';
      allocation[type] = (allocation[type] || 0) + parseFloat(inv.current_value || 0);
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
    const riskMapping = { conservative: ['low', 'moderate'], moderate: ['moderate', 'medium'], aggressive: ['medium', 'high', 'very_high'] };
    return products.filter(p => (riskMapping[riskTolerance] || ['moderate']).includes(p.risk_level)).slice(0, 3);
  };

  const totalValue = calculatePortfolioTotal();
  const totalInvested = calculateTotalInvested();
  const totalGain = calculateTotalGain();
  const gainPercentage = calculateGainPercentage();
  const allocation = getAssetAllocation();
  const riskDistribution = getRiskDistribution();

  if (pageLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a365d', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>Loading Investment Center...</p>
        </div>
        <style jsx>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Investment Center | Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        {/* Full-screen Loading Overlay */}
        {isSubmitting && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26, 54, 93, 0.95)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <div style={{ width: '64px', height: '64px', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', marginTop: '1.5rem' }}>Processing Your Investment...</p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Please wait while we complete your transaction</p>
          </div>
        )}

        {/* Header - Matches Oakline Pay Style */}
        <header style={{ backgroundColor: '#1a365d', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderBottom: '3px solid #059669' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'white' }}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={{ height: '40px', width: 'auto' }} />
              <span style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', fontWeight: '700' }}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', textDecoration: 'none', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid rgba(255,255,255,0.3)', transition: 'all 0.3s ease', cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
              ← Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Market Ticker */}
        <div style={{ background: '#1a365d', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '0.75rem 0' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'center', gap: isMobile ? '1.5rem' : '3rem', flexWrap: 'wrap' }}>
            {Object.entries(marketData).map(([key, data]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: '600' }}>{data.name}</span>
                <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: '700' }}>{key === 'treasury' ? `${data.value}%` : data.value.toLocaleString()}</span>
                <span style={{ color: data.change >= 0 ? '#22c55e' : '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>
                  {data.change >= 0 ? '▲' : '▼'} {Math.abs(data.change)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Section */}
        <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2d4a7c 50%, #1a365d 100%)', padding: isMobile ? '2rem 1rem' : '3rem 2rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
            <h1 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', fontWeight: '800', color: 'white', marginBottom: '0.75rem' }}>
              Invest in Your Future
            </h1>
            <p style={{ fontSize: isMobile ? '0.95rem' : '1.1rem', color: 'rgba(255,255,255,0.85)', maxWidth: '700px', margin: '0 auto 2rem' }}>
              Build wealth with our diversified investment products. From stocks to bonds, we offer solutions for every investor.
            </p>

            {/* Portfolio Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portfolio Value</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '800', color: 'white' }}>{formatCurrency(totalValue)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Invested</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '800', color: 'white' }}>{formatCurrency(totalInvested)}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Return</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '800', color: totalGain >= 0 ? '#22c55e' : '#ef4444' }}>
                  {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Return Rate</div>
                <div style={{ fontSize: isMobile ? '1.25rem' : '1.75rem', fontWeight: '800', color: gainPercentage >= 0 ? '#22c55e' : '#ef4444' }}>
                  {gainPercentage >= 0 ? '+' : ''}{gainPercentage}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main style={{ maxWidth: '1400px', margin: '0 auto', padding: isMobile ? '1.5rem 1rem' : '2rem' }}>
          {message && (
            <div style={{ padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', backgroundColor: messageType === 'error' ? '#fef2f2' : '#f0fdf4', border: `2px solid ${messageType === 'error' ? '#fecaca' : '#bbf7d0'}`, color: messageType === 'error' ? '#dc2626' : '#16a34a' }}>
              {message}
            </div>
          )}

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', background: 'white', padding: '0.5rem', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'invest', label: 'Invest', icon: '💰' },
              { id: 'portfolio', label: 'Portfolio', icon: '💼' },
              { id: 'goals', label: 'Goals', icon: '🎯' },
              { id: 'history', label: 'History', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: isMobile ? '1 0 auto' : 1,
                  padding: '0.875rem 1rem',
                  backgroundColor: activeTab === tab.id ? '#1a365d' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#1a365d',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📊</span> Asset Allocation
                </h2>
                {Object.keys(allocation).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💼</p>
                    <p>No investments yet. Start investing to see your allocation.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(allocation).map(([type, value]) => {
                      const percentage = ((value / totalValue) * 100).toFixed(1);
                      const colors = { stock: '#3b82f6', mutual_fund: '#8b5cf6', bond: '#22c55e', crypto: '#f59e0b', etf: '#06b6d4', reit: '#ec4899', commodity: '#14b8a6', index_fund: '#1a365d', money_market: '#84cc16', other: '#64748b' };
                      return (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ minWidth: '100px', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>
                            {getTypeIcon(type)} {type.replace('_', ' ').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, height: '32px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors[type] || '#64748b', borderRadius: '8px', display: 'flex', alignItems: 'center', paddingLeft: '0.75rem', color: 'white', fontSize: '0.75rem', fontWeight: '700', minWidth: '50px' }}>
                              {percentage}%
                            </div>
                          </div>
                          <div style={{ minWidth: '90px', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#1a365d' }}>{formatCurrency(value)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚖️</span> Risk Distribution
                </h2>
                {portfolio.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📈</p>
                    <p>No investments yet. Start investing to see your risk profile.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {Object.entries(riskDistribution).filter(([_, v]) => v > 0).map(([risk, value]) => {
                      const percentage = ((value / totalValue) * 100).toFixed(1);
                      return (
                        <div key={risk} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ minWidth: '100px', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>{getRiskLabel(risk)}</div>
                          <div style={{ flex: 1, height: '32px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percentage}%`, backgroundColor: getRiskColor(risk), borderRadius: '8px', display: 'flex', alignItems: 'center', paddingLeft: '0.75rem', color: 'white', fontSize: '0.75rem', fontWeight: '700', minWidth: '50px' }}>
                              {percentage}%
                            </div>
                          </div>
                          <div style={{ minWidth: '90px', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#1a365d' }}>{formatCurrency(value)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', gridColumn: isMobile ? '1' : '1 / -1' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💡</span> Recommended For You
                </h2>
                {getRecommendedProducts().length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No recommendations available based on your risk profile.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem' }}>
                    {getRecommendedProducts().map(product => (
                      <div key={product.id} style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '2px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => { handleProductSelect(product.id); setActiveTab('invest'); }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1a365d' }}>{getTypeIcon(product.type)} {product.name}</span>
                          <span style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '600', backgroundColor: getRiskColor(product.risk_level), color: 'white' }}>{getRiskLabel(product.risk_level)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                          <span>Return: <strong style={{ color: '#22c55e' }}>{product.annual_return}%</strong></span>
                          <span>Min: {formatCurrency(product.min_investment)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invest Tab */}
          {activeTab === 'invest' && (
            <>
              <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>💡</span>
                  <div>
                    <strong>Investment Tips:</strong> Diversify your portfolio across different asset classes. Consider your timeline and risk tolerance when selecting products.
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '1.5rem' : '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Available Products</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#64748b' }}>{products.length} Products</span>
                </h2>

                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💼</p>
                    <h3 style={{ fontSize: '1.25rem', color: '#1a365d', marginBottom: '0.5rem' }}>No Products Available</h3>
                    <p>Investment products will appear here when available.</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                      {products.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product.id)}
                          style={{
                            padding: '1.5rem',
                            background: selectedProduct === product.id ? '#f0fdf4' : '#f8fafc',
                            borderRadius: '12px',
                            border: `2px solid ${selectedProduct === product.id ? '#22c55e' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: selectedProduct === product.id ? '0 4px 12px rgba(34, 197, 94, 0.2)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div>
                              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#1a365d', marginBottom: '0.25rem' }}>{getTypeIcon(product.type)} {product.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.type?.replace('_', ' ')}</div>
                            </div>
                            <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: getRiskColor(product.risk_level), color: 'white' }}>{getRiskLabel(product.risk_level)}</span>
                          </div>
                          {product.description && <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.5', marginBottom: '1rem' }}>{product.description}</p>}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>Expected Return</div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#22c55e' }}>{product.annual_return ? `${product.annual_return}%` : 'Variable'}</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.25rem' }}>Min. Investment</div>
                              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1a365d' }}>{formatCurrency(product.min_investment || 100)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {accounts.length === 0 ? (
                      <div style={{ background: '#fef3c7', border: '2px solid #fcd34d', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                        <strong>⚠️ No Active Accounts:</strong> You need an active account to invest.
                      </div>
                    ) : (
                      <form onSubmit={handleInvest}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0' }}>
                          <span style={{ fontSize: '1.5rem' }}>📋</span>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1a365d', margin: 0 }}>Investment Details</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.25rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>From Account *</label>
                            <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} required style={{ width: '100%', padding: '0.875rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' }}>
                              {accounts.map(account => (
                                <option key={account.id} value={account.id}>{account.account_type?.toUpperCase()} - ****{account.account_number?.slice(-4)} ({formatCurrency(account.balance)})</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Investment Amount ($) *</label>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: '600', fontSize: '1rem' }}>$</span>
                              <input ref={amountInputRef} type="text" inputMode="decimal" value={amount} onChange={handleAmountChange} placeholder="0.00" required style={{ width: '100%', padding: '0.875rem', paddingLeft: '2rem', border: '2px solid #22c55e', borderRadius: '10px', fontSize: '1rem', fontWeight: '600', boxSizing: 'border-box', boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.1)' }} />
                            </div>
                            {selectedProduct && <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>Minimum: {formatCurrency(products.find(p => p.id === selectedProduct)?.min_investment || 100)}</small>}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Investment Period</label>
                            <select value={investmentPeriod} onChange={(e) => setInvestmentPeriod(e.target.value)} style={{ width: '100%', padding: '0.875rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' }}>
                              <option value="short_term">Short Term (Under 1 year)</option>
                              <option value="medium_term">Medium Term (1-5 years)</option>
                              <option value="long_term">Long Term (5+ years)</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Risk Tolerance</label>
                            <select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value)} style={{ width: '100%', padding: '0.875rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' }}>
                              <option value="conservative">Conservative</option>
                              <option value="moderate">Moderate</option>
                              <option value="aggressive">Aggressive</option>
                            </select>
                          </div>
                        </div>

                        {selectedAccount && (
                          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginTop: '1.5rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Available Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a365d' }}>{formatCurrency(accounts.find(a => a.id === selectedAccount)?.balance || 0)}</div>
                              </div>
                              {amount && parseFloat(amount) > 0 && (
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>After Investment</div>
                                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#22c55e' }}>{formatCurrency(parseFloat(accounts.find(a => a.id === selectedAccount)?.balance || 0) - parseFloat(amount.replace(/,/g, '') || 0))}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '1rem', backgroundColor: isSubmitting ? '#94a3b8' : '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer', marginTop: '1.5rem', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          {isSubmitting && <span style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }}></span>}
                          {isSubmitting ? 'Processing Investment...' : `Invest ${formatCurrency(parseFloat(amount?.replace(/,/g, '') || 0) || 0)}`}
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
            <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '1.5rem' : '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>My Holdings</span>
                <Link href="/investment-details" style={{ fontSize: '0.85rem', fontWeight: '500', color: '#22c55e', textDecoration: 'none' }}>View Details →</Link>
              </h2>

              {portfolio.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</p>
                  <h3 style={{ fontSize: '1.25rem', color: '#1a365d', marginBottom: '0.5rem' }}>No Holdings Yet</h3>
                  <p>Start building your portfolio by investing in available products.</p>
                  <button onClick={() => setActiveTab('invest')} style={{ marginTop: '1rem', padding: '0.75rem 1.5rem', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}>Start Investing</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {portfolio.map(investment => {
                    const gain = parseFloat(investment.current_value) - parseFloat(investment.amount_invested);
                    const gainPercent = ((gain / parseFloat(investment.amount_invested)) * 100).toFixed(2);
                    return (
                      <div key={investment.id} style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d' }}>{getTypeIcon(investment.product?.type)} {investment.product?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>Invested: {new Date(investment.invested_at).toLocaleDateString()} • {investment.product?.type?.replace('_', ' ').toUpperCase()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d' }}>{formatCurrency(investment.current_value)}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Cost: {formatCurrency(investment.amount_invested)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', backgroundColor: getRiskColor(investment.product?.risk_level), color: 'white' }}>{getRiskLabel(investment.product?.risk_level)}</span>
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: gain >= 0 ? '#22c55e' : '#ef4444' }}>{gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gain >= 0 ? '+' : ''}{gainPercent}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🎯</span> Set Your Goal
                </h2>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Investment Goal</label>
                  <select value={investmentGoal} onChange={(e) => setInvestmentGoal(e.target.value)} style={{ width: '100%', padding: '0.875rem', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.875rem', backgroundColor: 'white' }}>
                    <option value="retirement">Retirement</option>
                    <option value="growth">Wealth Growth</option>
                    <option value="income">Passive Income</option>
                    <option value="education">Education Fund</option>
                    <option value="home">Home Purchase</option>
                    <option value="emergency">Emergency Fund</option>
                  </select>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Recommended Strategy</div>
                  <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1a365d' }}>
                    {investmentGoal === 'retirement' && 'Long-term diversified portfolio with mix of stocks and bonds'}
                    {investmentGoal === 'growth' && 'Aggressive growth with higher equity allocation'}
                    {investmentGoal === 'income' && 'Dividend-focused stocks and bond funds'}
                    {investmentGoal === 'education' && 'Age-based allocation with decreasing risk'}
                    {investmentGoal === 'home' && 'Conservative growth with capital preservation'}
                    {investmentGoal === 'emergency' && 'Money market and short-term bonds for liquidity'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>📈</span> Performance Metrics
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Return</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: gainPercentage >= 0 ? '#22c55e' : '#ef4444' }}>{gainPercentage >= 0 ? '+' : ''}{gainPercentage}%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Gain/Loss</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: totalGain >= 0 ? '#22c55e' : '#ef4444' }}>{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>Diversity</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d' }}>{Object.keys(allocation).length} Assets</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.25rem' }}>Risk Level</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d' }}>
                      {portfolio.some(p => p.product?.risk_level === 'high' || p.product?.risk_level === 'very_high') ? 'High' : portfolio.some(p => p.product?.risk_level === 'medium' || p.product?.risk_level === 'moderate') ? 'Moderate' : 'Low'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', gridColumn: isMobile ? '1' : '1 / -1' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💰</span> Retirement Planning
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '1rem', lineHeight: '1.6' }}>
                  Start planning for your retirement today. Our investment advisors can help you create a personalized retirement strategy based on your age, income, and goals.
                </p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '10px', flex: 1, minWidth: '150px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>IRA Options</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>Traditional & Roth</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '10px', flex: 1, minWidth: '150px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>401(k) Rollover</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>Available</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '10px', flex: 1, minWidth: '150px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Advisory Fee</div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', color: '#22c55e' }}>0.25%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div style={{ background: 'white', borderRadius: '16px', padding: isMobile ? '1.5rem' : '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '2px solid #22c55e' }}>Transaction History</h2>
              {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <p style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</p>
                  <p>No transaction history yet</p>
                </div>
              ) : (
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {transactions.map(tx => (
                    <div key={tx.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1a365d' }}>{tx.type?.toUpperCase()} - {tx.investment?.product?.name || 'Investment'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{new Date(tx.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: tx.type === 'buy' ? '#ef4444' : '#22c55e' }}>{tx.type === 'buy' ? '-' : '+'}{formatCurrency(tx.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{ background: '#1a365d', padding: '2rem 1rem', marginTop: '3rem' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={{ height: '40px', marginBottom: '1rem' }} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Investment products are not FDIC insured, have no bank guarantee, and may lose value.</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>© {new Date().getFullYear()} Oakline Bank. All rights reserved. NMLS #574160</p>
          </div>
        </footer>
      </div>

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26, 54, 93, 0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a365d 0%, #22c55e 100%)', padding: '2rem', borderRadius: '20px 20px 0 0', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', backgroundColor: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>✓</div>
              <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Investment Successful</h2>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>Your investment has been processed</p>
            </div>
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Reference</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{receiptData.reference}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Date</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{receiptData.date}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Product</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{receiptData.productName}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Type</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{receiptData.productType?.replace('_', ' ').toUpperCase()}</div></div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1.5rem', border: '2px solid #22c55e' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Amount Invested</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#22c55e' }}>{formatCurrency(receiptData.amount)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Risk Level</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{getRiskLabel(receiptData.riskLevel)}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Expected Return</div><div style={{ fontWeight: '600', color: '#22c55e', fontSize: '0.85rem' }}>{receiptData.expectedReturn}%</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Account</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{receiptData.account?.type?.toUpperCase()} ****{receiptData.account?.number?.slice(-4)}</div></div>
                <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>New Balance</div><div style={{ fontWeight: '600', color: '#1a365d', fontSize: '0.85rem' }}>{formatCurrency(receiptData.account?.balance)}</div></div>
              </div>
              <button onClick={() => setShowReceipt(false)} style={{ width: '100%', padding: '1rem', backgroundColor: '#1a365d', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
