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
      const transferGroupId = crypto.randomUUID();

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

      // Create both debit and credit transactions with transfer_group_id
      await supabase.from('transactions').insert([
        {
          user_id: user.id,
          account_id: fromAccount,
          type: 'transfer_out',
          amount: transferAmount,
          description: `Transfer to ${selectedToAccount.account_type?.toUpperCase()} - ${memo || 'Internal Transfer'}`,
          status: 'completed',
          reference: referenceNumber,
          transfer_group_id: transferGroupId,
          transfer_type: 'internal'
        },
        {
          user_id: user.id,
          account_id: toAccount,
          type: 'transfer_in',
          amount: transferAmount,
          description: `Transfer from ${selectedFromAccount.account_type?.toUpperCase()} - ${memo || 'Internal Transfer'}`,
          status: 'completed',
          reference: referenceNumber,
          transfer_group_id: transferGroupId,
          transfer_type: 'internal'
        }
      ]);

      // Generate receipt data
      const receipt = {
        referenceNumber,
        date: new Date().toLocaleString(),
        senderName: user?.email?.split('@')[0] || 'Account Holder',
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

      // Refresh accounts and transfers
      await checkUserAndFetchData();
      await fetchRecentTransfers();

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
      backgroundColor: '#0a1f44',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1a365d',
      color: 'white',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderBottom: '3px solid #059669'
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
      padding: isMobile ? '1rem 0.75rem' : '2.5rem 2rem'
    },
    welcomeSection: {
      marginBottom: '2rem',
      textAlign: 'center'
    },
    welcomeTitle: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#cbd5e1'
    },
    transferOptions: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    transferCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid #059669',
      textDecoration: 'none',
      color: 'inherit'
    },
    transferCardIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    transferCardTitle: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    transferCardDesc: {
      fontSize: isMobile ? '0.8rem' : '0.85rem',
      color: '#64748b',
      lineHeight: '1.6'
    },
    contentSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s'
    },
    input: {
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
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
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    accountInfoValue: {
      fontSize: '0.95rem',
      fontWeight: '700',
      color: '#1e293b'
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
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
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
      padding: '1.25rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    receiptArrow: {
      textAlign: 'center',
      fontSize: '2.5rem',
      color: '#059669',
      margin: '1rem 0',
      fontWeight: 'bold'
    },
    receiptTotal: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: '1.5rem',
      borderRadius: '12px',
      textAlign: 'center',
      marginTop: '1.5rem',
      border: '2px solid #059669'
    },
    receiptAmount: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#047857',
      margin: '0.5rem 0',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
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
      marginTop: '2rem'
    },
    printButton: {
      flex: 1,
      padding: '1rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
    },
    closeButton: {
      flex: 1,
      padding: '1rem',
      backgroundColor: '#1a365d',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)'
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
    },
    sectionHeaderRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    historyButton: {
      padding: '0.6rem 1.2rem',
      backgroundColor: '#f1f5f9',
      color: '#1e40af',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.9rem',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    historySection: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    historyTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    historyList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    historyItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem',
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    historyInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      flex: 1
    },
    historyDesc: {
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#1e293b'
    },
    historyDate: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    historyAmount: {
      fontSize: '1rem',
      fontWeight: '700'
    },
    quickAmounts: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.75rem',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    quickAmountsLabel: {
      fontSize: '0.85rem',
      color: '#64748b',
      fontWeight: '500'
    },
    quickAmountButton: {
      padding: '0.4rem 0.8rem',
      backgroundColor: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    balanceAfter: {
      marginTop: '0.75rem',
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: '500'
    },
    recentTransfersSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      marginBottom: '2rem'
    },
    transfersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    transferItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      transition: 'all 0.2s'
    },
    transferLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flex: 1
    },
    transferIcon: {
      fontSize: '1.5rem'
    },
    transferInfo: {
      flex: 1
    },
    transferDescription: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    transferDate: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    transferRef: {
      fontSize: '0.7rem',
      color: '#94a3b8',
      fontFamily: 'monospace',
      marginTop: '0.25rem'
    },
    transferRight: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.25rem'
    },
    transferAmount: {
      fontSize: '1rem',
      fontWeight: '700'
    },
    transferStatus: {
      fontSize: '0.7rem',
      padding: '0.25rem 0.5rem',
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderRadius: '8px',
      textTransform: 'capitalize',
      fontWeight: '600'
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

  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecentTransfers();
    }
  }, [user]);

  const fetchRecentTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id);

      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map(acc => acc.id);
        const { data: transfers } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', accountIds)
          .in('type', ['transfer_out', 'transfer_in'])
          .eq('transfer_type', 'internal')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentTransfers(transfers || []);
      }
    } catch (error) {
      console.error('Error fetching recent transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

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
              <div style={styles.receipt} className="receipt-print">
                <div style={styles.receiptHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={{ height: '50px', marginRight: '1rem' }} />
                    <div style={{ textAlign: 'left' }}>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Oakline Bank</h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Transfer Receipt</p>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Reference:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace' }}>{receiptData.referenceNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Date & Time:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{receiptData.date}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(5, 150, 105, 0.3)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>✓ Transfer Successful</span>
                  </div>
                </div>

                <div style={styles.receiptBody}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px dashed #e2e8f0' }}>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>Authorized by</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e40af', margin: 0 }}>{receiptData.senderName}</p>
                    </div>

                    <div style={styles.receiptSection}>
                      <h3 style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                        📤 From Account
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Type:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{receiptData.fromAccount.type?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Number:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', fontSize: '0.9rem' }}>••••{receiptData.fromAccount.number?.slice(-4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>New Balance:</span>
                        <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>{formatCurrency(receiptData.fromAccount.balance)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '2rem', color: '#059669' }}>⬇</div>

                    <div style={styles.receiptSection}>
                      <h3 style={{ fontSize: '0.9rem', color: '#059669', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                        📥 To Account
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Type:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{receiptData.toAccount.type?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Number:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', fontSize: '0.9rem' }}>••••{receiptData.toAccount.number?.slice(-4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>New Balance:</span>
                        <span style={{ fontWeight: '700', color: '#059669', fontSize: '0.95rem' }}>{formatCurrency(receiptData.toAccount.balance)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '2px solid #059669', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#047857', margin: '0 0 0.75rem 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfer Amount</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#047857', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{formatCurrency(receiptData.amount)}</p>
                  </div>

                  {receiptData.memo && (
                    <div style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: '600' }}>
                        <span style={{ fontSize: '1.1rem', marginRight: '0.5rem' }}>📝</span>
                        Memo: {receiptData.memo}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, textAlign: 'center', fontWeight: '500' }}>
                      This is an official receipt from Oakline Bank. For support, contact us at support@theoaklinebank.com
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      © {new Date().getFullYear()} Oakline Bank. All rights reserved. | Member FDIC
                    </p>
                  </div>
                </div>

                <div style={styles.receiptButtons}>
                  <button onClick={printReceipt} style={styles.printButton}>🖨️ Print Receipt</button>
                  <button onClick={() => setShowReceipt(false)} style={styles.closeButton}>Done</button>
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

          {recentTransfers.length > 0 && (
            <div style={styles.recentTransfersSection}>
              <h2 style={styles.sectionTitle}>Recent Transfers</h2>
              <div style={styles.transfersList}>
                {recentTransfers.map(transfer => (
                  <div key={transfer.id} style={styles.transferItem}>
                    <div style={styles.transferLeft}>
                      <span style={styles.transferIcon}>
                        {transfer.type === 'transfer_out' ? '📤' : '📥'}
                      </span>
                      <div style={styles.transferInfo}>
                        <div style={styles.transferDescription}>
                          {transfer.description}
                        </div>
                        <div style={styles.transferDate}>
                          {formatDate(transfer.created_at)}
                        </div>
                        {transfer.reference && (
                          <div style={styles.transferRef}>
                            Ref: {transfer.reference}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={styles.transferRight}>
                      <div style={{
                        ...styles.transferAmount,
                        color: transfer.type === 'transfer_in' ? '#059669' : '#dc2626'
                      }}>
                        {transfer.type === 'transfer_in' ? '+' : '-'}
                        {formatCurrency(transfer.amount)}
                      </div>
                      <div style={styles.transferStatus}>
                        {transfer.status || 'completed'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.contentSection}>
            <div style={styles.sectionHeaderRow}>
              <h2 style={styles.sectionTitle}>Transfer Between My Accounts</h2>
              <Link href="/transactions" style={styles.historyButton}>View Transaction History</Link>
            </div>
            
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
                  <div style={styles.quickAmounts}>
                    <span style={styles.quickAmountsLabel}>Quick amounts:</span>
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        style={styles.quickAmountButton}
                        onClick={() => setAmount(val.toString())}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  {fromAccount && (
                    <div style={styles.balanceAfter}>
                      Balance after: {formatCurrency(parseFloat(accounts.find(a => a.id === fromAccount)?.balance || 0) - parseFloat(amount || 0))}
                    </div>
                  )}
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