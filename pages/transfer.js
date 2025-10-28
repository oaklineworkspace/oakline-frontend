
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Transfer() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
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

  const generateReferenceNumber = () => {
    return `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const transferAmount = parseFloat(amount);
      const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);
      const selectedToAccount = accounts.find(acc => acc.id === toAccount);

      if (!selectedToAccount) {
        setMessage('Please select a destination account');
        setLoading(false);
        return;
      }

      if (fromAccount === toAccount) {
        setMessage('Cannot transfer to the same account');
        setLoading(false);
        return;
      }

      if (transferAmount <= 0) {
        setMessage('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (transferAmount > parseFloat(selectedFromAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setLoading(false);
        return;
      }

      const referenceNumber = generateReferenceNumber();

      // Deduct from source account
      const newFromBalance = parseFloat(selectedFromAccount.balance) - transferAmount;
      await supabase
        .from('accounts')
        .update({ balance: newFromBalance, updated_at: new Date().toISOString() })
        .eq('id', fromAccount);

      // Add to destination account
      const newToBalance = parseFloat(selectedToAccount.balance) + transferAmount;
      await supabase
        .from('accounts')
        .update({ balance: newToBalance, updated_at: new Date().toISOString() })
        .eq('id', toAccount);

      // Create debit transaction
      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: fromAccount,
        type: 'transfer_out',
        amount: transferAmount,
        description: `Transfer to ****${selectedToAccount.account_number?.slice(-4)} - ${memo || 'Internal Transfer'}`,
        status: 'completed',
        reference: referenceNumber
      }]);

      // Create credit transaction
      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: toAccount,
        type: 'transfer_in',
        amount: transferAmount,
        description: `Transfer from ****${selectedFromAccount.account_number?.slice(-4)} - ${memo || 'Internal Transfer'}`,
        status: 'completed',
        reference: referenceNumber
      }]);

      // Generate receipt data
      const receipt = {
        referenceNumber,
        date: new Date().toLocaleString(),
        fromAccount: {
          type: selectedFromAccount.account_type,
          number: selectedFromAccount.account_number,
          balance: newFromBalance
        },
        toAccount: {
          type: selectedToAccount.account_type,
          number: selectedToAccount.account_number,
          balance: newToBalance
        },
        amount: transferAmount,
        memo: memo || 'Internal Transfer'
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setAmount('');
      setMemo('');

    } catch (error) {
      setMessage(error.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  if (pageLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  if (accounts.length < 2) {
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
          <h1 style={styles.emptyTitle}>Need Multiple Accounts</h1>
          <p style={styles.emptyDesc}>You need at least two active accounts to make internal transfers.</p>
          <Link href="/apply" style={styles.emptyButton}>Open Another Account</Link>
        </div>
      </div>
    );
  }

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
          {showReceipt && receiptData && (
            <div style={styles.receiptModal}>
              <div style={styles.receipt}>
                <div style={styles.receiptHeader}>
                  <h2>🏦 Transfer Receipt</h2>
                  <p style={styles.receiptRef}>Reference: {receiptData.referenceNumber}</p>
                  <p style={styles.receiptDate}>{receiptData.date}</p>
                </div>

                <div style={styles.receiptBody}>
                  <div style={styles.receiptSection}>
                    <h3>From Account</h3>
                    <p><strong>Type:</strong> {receiptData.fromAccount.type?.toUpperCase()}</p>
                    <p><strong>Account:</strong> ****{receiptData.fromAccount.number?.slice(-4)}</p>
                    <p><strong>New Balance:</strong> {formatCurrency(receiptData.fromAccount.balance)}</p>
                  </div>

                  <div style={styles.receiptArrow}>↓</div>

                  <div style={styles.receiptSection}>
                    <h3>To Account</h3>
                    <p><strong>Type:</strong> {receiptData.toAccount.type?.toUpperCase()}</p>
                    <p><strong>Account:</strong> ****{receiptData.toAccount.number?.slice(-4)}</p>
                    <p><strong>New Balance:</strong> {formatCurrency(receiptData.toAccount.balance)}</p>
                  </div>

                  <div style={styles.receiptTotal}>
                    <h3>Transfer Amount</h3>
                    <p style={styles.receiptAmount}>{formatCurrency(receiptData.amount)}</p>
                  </div>

                  {receiptData.memo && (
                    <div style={styles.receiptMemo}>
                      <p><strong>Memo:</strong> {receiptData.memo}</p>
                    </div>
                  )}
                </div>

                <div style={styles.receiptFooter}>
                  <p>✅ Transfer Completed Successfully</p>
                  <p style={styles.receiptDisclaimer}>This is an official transaction receipt from Oakline Bank</p>
                </div>

                <div style={styles.receiptButtons}>
                  <button onClick={printReceipt} style={styles.printButton}>🖨️ Print</button>
                  <button onClick={() => setShowReceipt(false)} style={styles.closeButton}>Close</button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.titleSection}>
            <h1 style={styles.title}>💸 Transfer Money</h1>
            <p style={styles.subtitle}>Move funds between your accounts or send via wire</p>
          </div>

          {/* Wire Transfer Button */}
          <Link href="/wire-transfer" style={styles.wireTransferBanner}>
            <div style={styles.wireBannerIcon}>🌐</div>
            <div style={styles.wireBannerContent}>
              <h3 style={styles.wireBannerTitle}>Need to send a Wire Transfer?</h3>
              <p style={styles.wireBannerText}>Send money domestically or internationally</p>
            </div>
            <div style={styles.wireBannerArrow}>→</div>
          </Link>

          {message && (
            <div style={styles.errorMessage}>{message}</div>
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
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>To Account *</label>
              <select
                style={styles.select}
                value={toAccount}
                onChange={(e) => setToAccount(e.target.value)}
                required
              >
                <option value="">Select destination account</option>
                {accounts
                  .filter(acc => acc.id !== fromAccount)
                  .map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type?.replace('_', ' ')?.toUpperCase()} -
                      ****{account.account_number?.slice(-4)} -
                      {formatCurrency(account.balance || 0)}
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
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
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

          {/* Info Section */}
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Transfer Information</h4>
            <ul style={styles.infoList}>
              <li>Internal transfers between your accounts are instant and free</li>
              <li>Funds are available immediately</li>
              <li>All transfers are encrypted and secure</li>
              <li>You'll receive a receipt for every transfer</li>
              <li>Transfer history available in your transactions</li>
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
    fontSize: '0.9rem'
  },
  content: {
    padding: '1.5rem',
    maxWidth: '700px',
    margin: '0 auto'
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
  wireTransferBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#0a1a2f',
    color: 'white',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    textDecoration: 'none',
    transition: 'transform 0.3s',
    cursor: 'pointer'
  },
  wireBannerIcon: {
    fontSize: '2.5rem'
  },
  wireBannerContent: {
    flex: 1
  },
  wireBannerTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: 0,
    marginBottom: '0.25rem'
  },
  wireBannerText: {
    fontSize: '0.9rem',
    margin: 0,
    opacity: 0.9
  },
  wireBannerArrow: {
    fontSize: '1.5rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid #fca5a5'
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
    backgroundColor: 'white'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box'
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
  receiptModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  receipt: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  receiptHeader: {
    textAlign: 'center',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '1rem',
    marginBottom: '1.5rem'
  },
  receiptRef: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontFamily: 'monospace'
  },
  receiptDate: {
    fontSize: '0.85rem',
    color: '#94a3b8'
  },
  receiptBody: {
    marginBottom: '1.5rem'
  },
  receiptSection: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  receiptArrow: {
    textAlign: 'center',
    fontSize: '2rem',
    color: '#1A3E6F',
    margin: '0.5rem 0'
  },
  receiptTotal: {
    backgroundColor: '#d1fae5',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    marginTop: '1rem'
  },
  receiptAmount: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#059669',
    margin: '0.5rem 0'
  },
  receiptMemo: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fef3c7',
    borderRadius: '6px'
  },
  receiptFooter: {
    textAlign: 'center',
    borderTop: '2px solid #e2e8f0',
    paddingTop: '1rem',
    marginTop: '1.5rem'
  },
  receiptDisclaimer: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.5rem'
  },
  receiptButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  printButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600'
  },
  closeButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#e2e8f0',
    color: '#1e293b',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600'
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
