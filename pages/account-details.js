import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import FundingNotice from '../components/FundingNotice';

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

export default function AccountDetails() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    checkUserAndFetchAccounts();
  }, []);

  useEffect(() => {
    if (id && accounts.length > 0) {
      const account = accounts.find(acc => acc.id === id || acc.account_number === id);
      if (account) {
        setSelectedAccount(account);
        fetchTransactions(account.id);
      }
    } else if (accounts.length > 0 && !id) {
      setSelectedAccount(accounts[0]);
      fetchTransactions(accounts[0].id);
    }
  }, [id, accounts]);

  const checkUserAndFetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);
      await fetchAllAccounts(user);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Authentication error. Please try logging in again.');
      router.push('/sign-in');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAccounts = async (user) => {
    try {
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Accounts fetch error:', accountsError);
        setError('Error loading accounts.');
        return;
      }

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Error loading account details. Please try again.');
    }
  };

  const fetchTransactions = async (accountId) => {
    try {
      // Fetch regular transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
      }

      // Fetch account opening crypto deposits
      const { data: openingDeposits, error: depositsError } = await supabase
        .from('account_opening_crypto_deposits')
        .select(`
          *,
          crypto_assets:crypto_asset_id (
            crypto_type,
            symbol,
            network_type
          )
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false });

      if (depositsError) {
        console.error('Error fetching opening deposits:', depositsError);
      }

      // Combine and format transactions
      const regularTx = transactionsData || [];
      const depositTx = (openingDeposits || []).map(deposit => ({
        id: deposit.id,
        account_id: deposit.account_id,
        type: 'account_opening_deposit',
        transaction_type: 'crypto_deposit',
        description: `${deposit.crypto_assets?.symbol || 'CRYPTO'} Account Opening Deposit via ${deposit.crypto_assets?.network_type || 'Network'}`,
        amount: deposit.net_amount || deposit.amount,
        created_at: deposit.created_at,
        status: deposit.status,
        confirmations: deposit.confirmations || 0,
        required_confirmations: deposit.required_confirmations || 3,
        fee: deposit.fee || 0,
        transaction_hash: deposit.tx_hash,
        crypto_type: deposit.crypto_assets?.crypto_type,
        crypto_symbol: deposit.crypto_assets?.symbol,
        network_type: deposit.crypto_assets?.network_type,
        gross_amount: deposit.amount
      }));

      // Merge and sort by date
      const allTransactions = [...regularTx, ...depositTx].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    }
  };

  const handleAccountSelect = (account) => {
    setSelectedAccount(account);
    fetchTransactions(account.id);
    router.push(`/account-details?id=${account.id}`, undefined, { shallow: true });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'credit': return '💸';
      case 'debit': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      case 'purchase': return '🛒';
      case 'refund': return '↩️';
      case 'interest': return '💎';
      case 'zelle_send': return 'Z';
      case 'zelle_receive': return 'Z';
      case 'crypto_deposit': return '₿';
      default: return '💼';
    }
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

  const getTotalBalance = () => {
    return accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
  };

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedTransaction(null);
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
    balanceCard: {
      backgroundColor: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      padding: isMobile ? '1.5rem' : '2rem',
      borderRadius: '16px',
      color: 'white',
      marginBottom: '2rem',
      boxShadow: '0 8px 24px rgba(30, 64, 175, 0.3)'
    },
    balanceLabel: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      opacity: 0.9,
      marginBottom: '0.5rem'
    },
    balanceAmount: {
      fontSize: isMobile ? '2rem' : '2.5rem',
      fontWeight: '700',
      marginBottom: '0.5rem'
    },
    balanceAccounts: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      opacity: 0.8
    },
    requestAccountButton: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: '1.5rem',
      padding: isMobile ? '0.875rem 1.75rem' : '1rem 2.5rem',
      backgroundColor: '#22c55e',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.95rem' : '1.05rem',
      fontWeight: '700',
      border: 'none',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      boxShadow: '0 4px 16px rgba(22, 163, 74, 0.3)',
      letterSpacing: '0.3px'
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '350px 1fr',
      gap: isMobile ? '1.5rem' : '2rem'
    },
    accountsList: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      height: 'fit-content'
    },
    accountsTitle: {
      fontSize: isMobile ? '1.1rem' : '1.3rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1.5rem'
    },
    accountItem: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid transparent'
    },
    accountItemActive: {
      backgroundColor: '#f0f9ff',
      borderColor: '#3b82f6'
    },
    accountItemInactive: {
      backgroundColor: '#f8fafc',
      borderColor: 'transparent'
    },
    accountItemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.5rem'
    },
    accountIcon: {
      fontSize: '1.5rem'
    },
    accountName: {
      fontSize: isMobile ? '0.95rem' : '1rem',
      fontWeight: '600',
      color: '#1e293b',
      textTransform: 'capitalize'
    },
    accountNumber: {
      fontSize: '0.85rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    accountBalance: {
      fontSize: isMobile ? '1.1rem' : '1.2rem',
      fontWeight: '700',
      color: '#059669'
    },
    detailsSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    detailsHeader: {
      borderBottom: '2px solid #f1f5f9',
      paddingBottom: '1rem',
      marginBottom: '1.5rem'
    },
    detailsTitle: {
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    detailsSubtitle: {
      fontSize: '0.95rem',
      color: '#64748b'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    infoItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    },
    infoLabel: {
      fontSize: '0.85rem',
      color: '#64748b',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    infoValue: {
      fontSize: isMobile ? '0.95rem' : '1.05rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    transactionsSection: {
      marginTop: '2rem'
    },
    transactionsTitle: {
      fontSize: isMobile ? '1.1rem' : '1.2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    transactionItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    transactionItemHover: {
      backgroundColor: '#f1f5f9',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    transactionLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flex: 1
    },
    transactionIcon: {
      fontSize: '1.5rem'
    },
    transactionInfo: {
      flex: 1
    },
    transactionDescription: {
      fontSize: isMobile ? '0.9rem' : '0.95rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    transactionDate: {
      fontSize: '0.8rem',
      color: '#64748b'
    },
    transactionRight: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.5rem'
    },
    transactionAmount: {
      fontSize: isMobile ? '0.95rem' : '1.05rem',
      fontWeight: '700',
      marginBottom: '0.25rem'
    },
    statusBadge: {
      fontSize: '0.75rem',
      fontWeight: '600',
      padding: '0.25rem 0.75rem',
      borderRadius: '12px',
      textTransform: 'capitalize'
    },
    receiptModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '1rem' : '2rem'
    },
    receiptContainer: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      position: 'relative'
    },
    receiptHeader: {
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: '1rem',
      marginBottom: '1.5rem',
      textAlign: 'center'
    },
    receiptTitle: {
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    receiptClose: {
      position: 'absolute',
      top: '1rem',
      right: '1rem',
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#64748b',
      padding: '0.25rem 0.5rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #f1f5f9'
    },
    receiptLabel: {
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      fontSize: '0.9rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right',
      maxWidth: '60%',
      wordBreak: 'break-word'
    },
    receiptAmountSection: {
      backgroundColor: '#f0f9ff',
      padding: '1.5rem',
      borderRadius: '12px',
      margin: '1.5rem 0',
      textAlign: 'center'
    },
    receiptAmountLabel: {
      fontSize: '0.9rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    receiptAmountValue: {
      fontSize: isMobile ? '1.8rem' : '2rem',
      fontWeight: '700',
      color: '#1e40af'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      fontSize: '1.2rem',
      color: '#64748b'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
          </div>
        </div>
        <div style={styles.emptyState}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>
            {error || 'No accounts found'}
          </h2>
          <Link href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 style={styles.welcomeTitle}>Account Overview</h1>
          <p style={styles.welcomeSubtitle}>Manage and view all your accounts in one place</p>
        </div>

        <div style={styles.balanceCard}>
          <div style={styles.balanceLabel}>Total Balance Across All Accounts</div>
          <div style={styles.balanceAmount}>{formatCurrency(getTotalBalance())}</div>
          <div style={styles.balanceAccounts}>{accounts.length} Account{accounts.length !== 1 ? 's' : ''}</div>
          <Link 
            href="/request-account" 
            style={styles.requestAccountButton}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#16a34a';
              e.target.style.transform = 'translateY(-3px)';
              e.target.style.boxShadow = '0 8px 24px rgba(22, 163, 74, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#22c55e';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 16px rgba(22, 163, 74, 0.3)';
            }}
          >
            <span style={{ fontSize: '1.15rem', marginRight: '0.6rem' }}>➕</span>
            Open Additional Account
          </Link>
        </div>

        {/* Funding Notices for Pending Funding Accounts */}
        {accounts.filter(account => account.status === 'pending_funding').map(account => (
          <FundingNotice key={account.id} accounts={[account]} />
        ))}

        <div style={styles.contentGrid}>
          <div style={styles.accountsList}>
            <h2 style={styles.accountsTitle}>Your Accounts</h2>
            {accounts.map(account => (
              <div
                key={account.id}
                onClick={() => handleAccountSelect(account)}
                style={{
                  ...styles.accountItem,
                  ...(selectedAccount?.id === account.id ? styles.accountItemActive : styles.accountItemInactive)
                }}
              >
                <div style={styles.accountItemHeader}>
                  <span style={styles.accountIcon}>{getAccountTypeIcon(account.account_type)}</span>
                  <div>
                    <div style={styles.accountName}>
                      {account.account_type?.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
                <div style={styles.accountNumber}>
                  Account •••• {account.account_number?.slice(-4)}
                </div>
                <div style={styles.accountBalance}>
                  {formatCurrency(account.balance)}
                </div>
              </div>
            ))}
          </div>

          {selectedAccount && (
            <div style={styles.detailsSection}>
              <div style={styles.detailsHeader}>
                <h2 style={styles.detailsTitle}>
                  {selectedAccount.account_type?.replace(/_/g, ' ').toUpperCase()} Account
                </h2>
                <p style={styles.detailsSubtitle}>
                  Account Number: {selectedAccount.account_number}
                </p>
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Account Type</div>
                  <div style={styles.infoValue}>
                    {selectedAccount.account_type?.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Current Balance</div>
                  <div style={styles.infoValue}>{formatCurrency(selectedAccount.balance)}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Account Number</div>
                  <div style={styles.infoValue}>{selectedAccount.account_number}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Routing Number</div>
                  <div style={styles.infoValue}>{selectedAccount.routing_number || '021000021'}</div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Account Status</div>
                  <div style={{
                    ...styles.infoValue,
                    color: selectedAccount.status === 'active' ? '#059669' : 
                           selectedAccount.status === 'suspended' ? '#ef4444' :
                           selectedAccount.status === 'closed' ? '#6b7280' : '#f59e0b',
                    textTransform: 'capitalize'
                  }}>
                    {selectedAccount.status || 'Pending'}
                  </div>
                </div>
                <div style={styles.infoItem}>
                  <div style={styles.infoLabel}>Opened Date</div>
                  <div style={styles.infoValue}>
                    {new Date(selectedAccount.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              <div style={styles.transactionsSection}>
                <h3 style={styles.transactionsTitle}>Recent Transactions</h3>
                {transactions.length > 0 ? (
                  transactions.map(tx => {
                    const txType = (tx.type || tx.transaction_type || '').toLowerCase();
                    const description = (tx.description || '').toLowerCase();
                    const amount = parseFloat(tx.amount) || 0;
                    const txStatus = tx.status || 'completed';

                    // Determine if it's a credit (money in) or debit (money out)
                    let isCredit = false;

                    // Check transaction type first - Money coming IN (Credit)
                    if (txType === 'deposit' || 
                        txType === 'credit' || 
                        txType === 'interest' || 
                        txType === 'refund' ||
                        txType === 'bonus' || 
                        txType === 'reward' || 
                        txType === 'cashback' ||
                        txType === 'zelle_receive' ||
                        txType === 'crypto_deposit' ||
                        txType === 'account_opening_deposit' ||
                        description.includes('received from') ||
                        description.includes('transfer from')) {
                      isCredit = true;
                    } 
                    // Money going OUT (Debit)
                    else if (txType === 'withdrawal' || 
                             txType === 'debit' || 
                             txType === 'purchase' || 
                             txType === 'bill_payment' || 
                             txType === 'fee' ||
                             txType === 'payment' ||
                             txType === 'zelle_send' ||
                             description.includes('transfer to') ||
                             description.includes('sent to')) {
                      isCredit = false;
                    } 
                    else {
                      // Fallback
                      isCredit = amount >= 0;
                    }

                    // Get status color
                    const getStatusStyle = (status) => {
                      const statusLower = status.toLowerCase();
                      if (statusLower === 'completed' || statusLower === 'approved' || statusLower === 'confirmed') {
                        return { backgroundColor: '#d1fae5', color: '#065f46' };
                      } else if (statusLower === 'pending' || statusLower === 'awaiting_confirmations' || statusLower === 'processing') {
                        return { backgroundColor: '#fef3c7', color: '#92400e' };
                      } else if (statusLower === 'failed' || statusLower === 'rejected') {
                        return { backgroundColor: '#fee2e2', color: '#991b1b' };
                      }
                      return { backgroundColor: '#f3f4f6', color: '#4b5563' };
                    };

                    return (
                      <div key={tx.id} style={styles.transactionItem}
                        onClick={() => handleTransactionClick(tx)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={styles.transactionLeft}>
                          <span style={styles.transactionIcon}>
                            {getTransactionIcon(tx.type || tx.transaction_type)}
                          </span>
                          <div style={styles.transactionInfo}>
                            <div style={styles.transactionDescription}>
                              {tx.description || (tx.type || tx.transaction_type)?.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div style={styles.transactionDate}>
                              {formatDate(tx.created_at)}
                            </div>
                            {(tx.type === 'account_opening_deposit' || tx.transaction_type === 'crypto_deposit') && tx.fee && parseFloat(tx.fee) > 0 && (
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                Fee: ${parseFloat(tx.fee).toFixed(2)} • Net: ${parseFloat(tx.amount).toFixed(2)}
                              </div>
                            )}
                            {(tx.type === 'account_opening_deposit' || tx.transaction_type === 'crypto_deposit') && tx.confirmations !== undefined && tx.confirmations !== null && (
                              <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                                Confirmations: {tx.confirmations}/{tx.required_confirmations || 3}
                              </div>
                            )}
                            {(tx.type === 'account_opening_deposit' || tx.transaction_type === 'crypto_deposit') && tx.transaction_hash && (
                              <div style={{ 
                                fontSize: '0.65rem', 
                                color: '#1e40af', 
                                marginTop: '0.2rem',
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '200px'
                              }}>
                                Hash: {tx.transaction_hash.substring(0, 16)}...
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={styles.transactionRight}>
                          <div style={{
                            ...styles.transactionAmount,
                            color: txStatus.toLowerCase() === 'pending' ? '#f59e0b' : 
                                   (isCredit ? '#059669' : '#dc2626')
                          }}>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(Math.abs(amount))}
                          </div>
                          <span style={{
                            ...styles.statusBadge,
                            ...getStatusStyle(txStatus)
                          }}>
                            {txStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No transactions found for this account
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Transaction Receipt Modal */}
      {showReceiptModal && selectedTransaction && (
        <div style={styles.receiptModal} onClick={closeReceiptModal}>
          <div style={styles.receiptContainer} onClick={(e) => e.stopPropagation()}>
            <button style={styles.receiptClose} onClick={closeReceiptModal}>×</button>

            <div style={styles.receiptHeader}>
              <h2 style={styles.receiptTitle}>Transaction Receipt</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {selectedAccount?.account_type?.replace(/_/g, ' ').toUpperCase()} Account
              </p>
            </div>

            <div style={styles.receiptAmountSection}>
              <div style={styles.receiptAmountLabel}>Amount</div>
              <div style={{
                ...styles.receiptAmountValue,
                color: (selectedTransaction.type || selectedTransaction.transaction_type || '').toLowerCase().includes('deposit') || 
                       (selectedTransaction.type || selectedTransaction.transaction_type || '').toLowerCase().includes('credit') ? 
                       '#059669' : '#dc2626'
              }}>
                {((selectedTransaction.type || selectedTransaction.transaction_type || '').toLowerCase().includes('deposit') || 
                  (selectedTransaction.type || selectedTransaction.transaction_type || '').toLowerCase().includes('credit')) ? '+' : '-'}
                {formatCurrency(Math.abs(parseFloat(selectedTransaction.amount) || 0))}
              </div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Transaction Type</span>
              <span style={styles.receiptValue}>
                {(selectedTransaction.type || selectedTransaction.transaction_type || 'Transaction')
                  .replace(/_/g, ' ')
                  .toUpperCase()}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Description</span>
              <span style={styles.receiptValue}>
                {selectedTransaction.description || 'N/A'}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Status</span>
              <span style={{
                ...styles.receiptValue,
                ...(() => {
                  const status = (selectedTransaction.status || 'completed').toLowerCase();
                  if (status === 'completed' || status === 'approved' || status === 'confirmed') {
                    return { color: '#065f46', backgroundColor: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  } else if (status === 'pending' || status === 'awaiting_confirmations' || status === 'processing') {
                    return { color: '#92400e', backgroundColor: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  } else if (status === 'failed' || status === 'rejected') {
                    return { color: '#991b1b', backgroundColor: '#fee2e2', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  }
                  return { color: '#4b5563' };
                })()
              }}>
                {(selectedTransaction.status || 'Completed').replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>
                {formatDate(selectedTransaction.created_at)}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Reference Number</span>
              <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                {selectedTransaction.id?.slice(0, 8).toUpperCase() || 'N/A'}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Account Number</span>
              <span style={{ ...styles.receiptValue, fontFamily: 'monospace' }}>
                {selectedAccount?.account_number || 'N/A'}
              </span>
            </div>

            {(selectedTransaction.type === 'account_opening_deposit' || selectedTransaction.transaction_type === 'crypto_deposit') && (
              <>
                <div style={{ 
                  marginTop: '1.5rem', 
                  paddingTop: '1.5rem', 
                  borderTop: '2px solid #e2e8f0' 
                }}>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '700', 
                    color: '#1e293b', 
                    marginBottom: '1rem' 
                  }}>
                    Cryptocurrency Details
                  </h3>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Cryptocurrency</span>
                  <span style={styles.receiptValue}>
                    {selectedTransaction.crypto_symbol || 'BTC'} - {selectedTransaction.crypto_type || 'Bitcoin'}
                  </span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Network</span>
                  <span style={styles.receiptValue}>
                    {selectedTransaction.network_type || 'N/A'}
                  </span>
                </div>
                {selectedTransaction.wallet_address && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Wallet Address</span>
                    <span style={{ 
                      ...styles.receiptValue,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all'
                    }}>
                      {selectedTransaction.wallet_address}
                    </span>
                  </div>
                )}
                {selectedTransaction.transaction_hash && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Transaction Hash</span>
                    <span style={{ 
                      ...styles.receiptValue,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      wordBreak: 'break-all'
                    }}>
                      {selectedTransaction.transaction_hash}
                    </span>
                  </div>
                )}
                {selectedTransaction.confirmations !== undefined && selectedTransaction.confirmations !== null && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Confirmations</span>
                    <span style={styles.receiptValue}>
                      {selectedTransaction.confirmations} / {selectedTransaction.required_confirmations || 3}
                    </span>
                  </div>
                )}
                {selectedTransaction.fee && parseFloat(selectedTransaction.fee) > 0 && (
                  <>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Network Fee</span>
                      <span style={{ ...styles.receiptValue, color: '#dc2626' }}>
                        -{formatCurrency(parseFloat(selectedTransaction.fee))}
                      </span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Gross Amount</span>
                      <span style={styles.receiptValue}>
                        {formatCurrency(parseFloat(selectedTransaction.gross_amount) || 0)}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#64748b', 
                margin: 0 
              }}>
                Thank you for banking with Oakline Bank
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}