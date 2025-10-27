import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Transfer() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('internal');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

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

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (userAccounts && userAccounts.length > 0) {
        setAccounts(userAccounts);
        setFromAccount(userAccounts[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading data. Please refresh.');
    } finally {
      setPageLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const transferAmount = parseFloat(amount);
      const selectedAccount = accounts.find(acc => acc.id === fromAccount);

      if (transferAmount <= 0) {
        setMessage('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (transferAmount > parseFloat(selectedAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/internal-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          from_account_id: fromAccount,
          to_account_number: toAccountNumber,
          amount: transferAmount,
          memo: memo || 'Transfer'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }

      setShowSuccess(true);
      setAmount('');
      setToAccountNumber('');
      setMemo('');

      setTimeout(() => {
        router.push('/dashboard');
      }, 2500);

    } catch (error) {
      setMessage(error.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏦</div>
          <h1 style={styles.emptyTitle}>No Active Accounts</h1>
          <p style={styles.emptyDesc}>You need at least one active account to make transfers.</p>
          <Link href="/apply" style={styles.emptyButton}>Open an Account</Link>
        </div>
      </div>
    );
  }

  const selectedAccount = accounts.find(acc => acc.id === fromAccount);

  return (
    <>
      <Head>
        <title>Transfer Funds - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
        </div>

        <div style={styles.content}>
          {showSuccess && (
            <div style={styles.successModal}>
              <div style={styles.successCheck}>✓</div>
              <h2 style={styles.successTitle}>Transfer Successful!</h2>
              <p style={styles.successMessage}>Your funds have been transferred</p>
            </div>
          )}

          <div style={styles.titleSection}>
            <h1 style={styles.title}>💸 Transfer Money</h1>
            <p style={styles.subtitle}>Send funds securely between accounts</p>
          </div>

          {message && (
            <div style={styles.errorMessage}>{message}</div>
          )}

          {/* Account Balance Overview */}
          {accounts.length > 1 && (
            <div style={styles.accountsOverview}>
              <h3 style={styles.overviewTitle}>Your Accounts</h3>
              <div style={styles.accountsGrid}>
                {accounts.map(account => (
                  <div key={account.id} style={styles.accountCard}>
                    <div style={styles.accountType}>
                      {account.account_type?.replace('_', ' ')?.toUpperCase()}
                    </div>
                    <div style={styles.accountNumber}>
                      ****{account.account_number?.slice(-4)}
                    </div>
                    <div style={styles.accountBalance}>
                      {formatCurrency(account.balance || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfer Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>From Account *</label>
              <select
                style={styles.select}
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                required
              >
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                    ****{account.account_number?.slice(-4)} -
                    {formatCurrency(account.balance || 0)}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <small style={styles.helperText}>
                  Available Balance: {formatCurrency(selectedAccount.balance || 0)}
                </small>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>To Account Number *</label>
              <input
                type="text"
                style={styles.input}
                value={toAccountNumber}
                onChange={(e) => setToAccountNumber(e.target.value)}
                placeholder="Enter recipient account number"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                style={styles.input}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max={selectedAccount ? parseFloat(selectedAccount.balance || 0) : 25000}
                required
              />
              <small style={styles.helperText}>
                Maximum: {formatCurrency(selectedAccount?.balance || 0)}
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Memo (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="What's this transfer for?"
                maxLength="100"
              />
            </div>

            <div style={styles.transferSummary}>
              <div style={styles.summaryRow}>
                <span>Transfer Amount:</span>
                <span style={styles.summaryValue}>{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Fee:</span>
                <span style={styles.summaryValue}>$0.00</span>
              </div>
              <div style={{...styles.summaryRow, ...styles.summaryTotal}}>
                <span>Total:</span>
                <span style={styles.summaryValue}>{formatCurrency(parseFloat(amount) || 0)}</span>
              </div>
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              disabled={loading}
            >
              {loading ? '🔄 Processing...' : `💸 Transfer ${formatCurrency(parseFloat(amount) || 0)}`}
            </button>
          </form>

          {/* Quick Links */}
          <div style={styles.quickLinks}>
            <Link href="/zelle-transfer" style={styles.quickLink}>
              <span style={styles.quickLinkIcon}>⚡</span>
              <div>
                <div style={styles.quickLinkTitle}>Zelle Transfer</div>
                <div style={styles.quickLinkDesc}>Send with email or phone</div>
              </div>
            </Link>
            <Link href="/transactions" style={styles.quickLink}>
              <span style={styles.quickLinkIcon}>📋</span>
              <div>
                <div style={styles.quickLinkTitle}>Transaction History</div>
                <div style={styles.quickLinkDesc}>View all transfers</div>
              </div>
            </Link>
          </div>

          {/* Info Section */}
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Transfer Information</h4>
            <ul style={styles.infoList}>
              <li>Internal transfers are instant and free</li>
              <li>Funds are available immediately</li>
              <li>All transfers are encrypted and secure</li>
              <li>Daily transfer limit: $25,000</li>
              <li>Transfer history available in your dashboard</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  content: {
    padding: '1.5rem',
    maxWidth: '700px',
    margin: '0 auto'
  },
  successModal: {
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '2rem',
    animation: 'slideDown 0.3s ease'
  },
  successCheck: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontWeight: 'bold'
  },
  successTitle: {
    color: '#065f46',
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  successMessage: {
    color: '#047857',
    fontSize: '1rem'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid #fca5a5',
    fontSize: '0.95rem'
  },
  accountsOverview: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  overviewTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem'
  },
  accountCard: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    textAlign: 'center',
    transition: 'all 0.3s'
  },
  accountType: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1A3E6F',
    marginBottom: '0.5rem'
  },
  accountNumber: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem',
    fontFamily: 'monospace'
  },
  accountBalance: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#059669'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    transition: 'all 0.2s'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block'
  },
  transferSummary: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    fontSize: '0.95rem',
    color: '#64748b'
  },
  summaryTotal: {
    borderTop: '2px solid #e2e8f0',
    marginTop: '0.5rem',
    paddingTop: '0.75rem',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  summaryValue: {
    fontWeight: '600',
    color: '#1e293b'
  },
  submitButton: {
    width: '100%',
    padding: '1.125rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
  },
  quickLinks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  quickLink: {
    backgroundColor: 'white',
    padding: '1.25rem',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  quickLinkIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  quickLinkTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  quickLinkDesc: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1A3E6F',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.8',
    fontSize: '0.9rem'
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
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    maxWidth: '500px',
    margin: '0 auto'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  emptyDesc: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  emptyButton: {
    display: 'inline-block',
    padding: '0.875rem 2rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '1rem'
  }
};