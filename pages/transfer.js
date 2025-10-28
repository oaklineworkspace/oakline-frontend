
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

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
  const isMobile = useMediaQuery('(max-width: 768px)');

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
      
      // Refresh accounts
      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const getAccountTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'checking': return '🏦';
      case 'savings': return '💰';
      case 'investment': return '📈';
      case 'business': return '🏢';
      default: return '💳';
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1e40af',
      color: 'white',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textDecoration: 'none',
      color: 'white'
    },
    logo: {
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
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
      padding: isMobile ? '1.5rem 1rem' : '2.5rem 2rem'
    },
    welcomeSection: {
      marginBottom: '2rem'
    },
    welcomeTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '0.95rem' : '1.1rem',
      color: '#64748b'
    },
    transferOptions: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    transferCard: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent',
      textDecoration: 'none',
      color: 'inherit'
    },
    transferCardIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    transferCardTitle: {
      fontSize: isMobile ? '1.2rem' : '1.4rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    transferCardDesc: {
      fontSize: '0.95rem',
      color: '#64748b',
      lineHeight: '1.6'
    },
    contentSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #f1f5f9'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '1.5rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '1rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s'
    },
    input: {
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '1rem',
      transition: 'border-color 0.3s'
    },
    accountInfo: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0'
    },
    accountInfoLabel: {
      fontSize: '0.85rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    accountInfoValue: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    submitButton: {
      width: '100%',
      padding: '1.125rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1.1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '2px solid #fca5a5'
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
      borderRadius: '16px',
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
      color: '#1e40af',
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
      backgroundColor: '#1e40af',
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
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
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
      backgroundColor: '#1e40af',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '1rem'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏦</div>
          <h1 style={styles.emptyTitle}>No Accounts Found</h1>
          <p style={styles.emptyDesc}>You need at least one active account to make transfers.</p>
          <Link href="/apply" style={styles.emptyButton}>Open an Account</Link>
        </div>
      </div>
    );
  }

  if (accounts.length < 2) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
        <main style={styles.main}>
          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Transfer Funds</h1>
            <p style={styles.welcomeSubtitle}>Move money between accounts or send to others</p>
          </div>

          <div style={styles.transferOptions}>
            <Link 
              href="/internal-transfer" 
              style={{
                ...styles.transferCard,
                ':hover': { borderColor: '#1e40af', transform: 'translateY(-4px)' }
              }}
            >
              <div style={styles.transferCardIcon}>👤</div>
              <h2 style={styles.transferCardTitle}>Send to Oakline User</h2>
              <p style={styles.transferCardDesc}>
                Transfer money to another Oakline Bank customer using their account number
              </p>
            </Link>

            <Link 
              href="/wire-transfer" 
              style={{
                ...styles.transferCard,
                ':hover': { borderColor: '#1e40af', transform: 'translateY(-4px)' }
              }}
            >
              <div style={styles.transferCardIcon}>🌐</div>
              <h2 style={styles.transferCardTitle}>Wire Transfer</h2>
              <p style={styles.transferCardDesc}>
                Send money domestically or internationally to external banks
              </p>
            </Link>
          </div>

          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🏦</div>
            <h2 style={styles.emptyTitle}>Need Multiple Accounts?</h2>
            <p style={styles.emptyDesc}>
              You need at least two active accounts to transfer between your own accounts.
            </p>
            <Link href="/apply" style={styles.emptyButton}>Open Another Account</Link>
          </div>
        </main>
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
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <main style={styles.main}>
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

          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Transfer Between Your Accounts</h1>
            <p style={styles.welcomeSubtitle}>Move money instantly between your Oakline accounts</p>
          </div>

          <div style={styles.transferOptions}>
            <Link 
              href="/internal-transfer" 
              style={styles.transferCard}
            >
              <div style={styles.transferCardIcon}>👤</div>
              <h2 style={styles.transferCardTitle}>Send to Oakline User</h2>
              <p style={styles.transferCardDesc}>
                Transfer money to another Oakline Bank customer using their account number
              </p>
            </Link>

            <Link 
              href="/wire-transfer" 
              style={styles.transferCard}
            >
              <div style={styles.transferCardIcon}>🌐</div>
              <h2 style={styles.transferCardTitle}>Wire Transfer</h2>
              <p style={styles.transferCardDesc}>
                Send money domestically or internationally to external banks
              </p>
            </Link>
          </div>

          {message && (
            <div style={styles.errorMessage}>{message}</div>
          )}

          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Transfer Between My Accounts</h2>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
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
                        {getAccountTypeIcon(account.account_type)} {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance || 0)}
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
                          {getAccountTypeIcon(account.account_type)} {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance || 0)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
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
              </div>

              {fromAccount && (
                <div style={styles.accountInfo}>
                  <div style={styles.accountInfoLabel}>Available Balance</div>
                  <div style={styles.accountInfoValue}>
                    {formatCurrency(accounts.find(a => a.id === fromAccount)?.balance || 0)}
                  </div>
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
                {loading ? '🔄 Processing...' : `💸 Transfer ${formatCurrency(parseFloat(amount) || 0)}`}
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
