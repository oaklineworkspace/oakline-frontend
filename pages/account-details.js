import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

export default function AccountDetails() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { id } = router.query;
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (id && id !== 'undefined') {
      checkUserAndFetchAccount();
    } else if (id === undefined) {
      // Still waiting for router to populate
      return;
    } else {
      setError('Invalid account ID');
      setLoading(false);
    }
  }, [id]);

  const checkUserAndFetchAccount = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const userPromise = supabase.auth.getUser();

      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);

      if (!user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);
      await fetchAccountDetails(user, id);
    } catch (error) {
      console.error('Error checking user:', error);
      if (error.message === 'Request timeout') {
        setError('Connection timeout. Please refresh the page.');
      } else {
        setError('Authentication error. Please try logging in again.');
        router.push('/sign-in');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountDetails = async (user, accountId) => {
    try {
      console.log('Fetching account details for:', { accountId, userId: user.id, userEmail: user.email });

      // First, try to get account by account_number if accountId looks like account number
      let { data: accountData, error: accountError } = null;

      if (accountId && accountId.length >= 8) {
        // Try by account_number first
        const result = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', accountId)
          .eq('user_id', user.id)
          .single();

        accountData = result.data;
        accountError = result.error;
      }

      // If that fails, try by ID and user_id
      if (accountError && accountError.code === 'PGRST116') {
        console.log('Trying by account ID...');
        const result = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single();

        accountData = result.data;
        accountError = result.error;
      }

      if (accountError || !accountData) {
        console.error('Account fetch error:', accountError);
        setError('Account not found or you do not have permission to view this account.');
        return;
      }

      console.log('Account found:', accountData);
      setAccount(accountData);

      // Fetch transactions for this account using account ID
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        // Don't fail completely if transactions fail
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error fetching account details:', error);
      setError('Error loading account details. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'transfer_in': return '💸';
      case 'transfer_out': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      default: return '💼';
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

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
        </div>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>⚠️ {error}</h2>
          <Link href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
        </div>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>Account Not Found</h2>
          <p style={styles.errorDesc}>The requested account could not be found.</p>
          <Link href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" style={styles.logoContainer}>
          <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
          <span style={styles.logoText}>Oakline Bank</span>
        </Link>
        <div style={styles.headerInfo}>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
          <Link href="/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <main style={styles.main}>
        {/* Account Overview */}
        <div style={styles.accountCard}>
          <div style={styles.accountHeader}>
            <div>
              <h1 style={styles.accountTitle}>
                {account.account_name || account.name || 'Account Details'}
              </h1>
              <div style={styles.accountType}>
                {(account.account_type || account.type || 'Account').replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <div style={styles.accountStatus}>
              {account.status || 'Active'}
            </div>
          </div>

          <div style={{
            ...styles.accountInfo,
            gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr'
          }}>
            <div style={styles.balanceSection}>
              <div style={styles.balanceLabel}>Current Balance</div>
              <div style={styles.balanceAmount}>
                {formatCurrency(account.balance || 0)}
              </div>
              <div style={styles.balanceNote}>
                Available Balance
              </div>
            </div>

            <div style={styles.accountDetails}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Account Number:</span>
                <span style={styles.detailValue}>****{account.account_number?.slice(-4) || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Full Account Number:</span>
                <span style={styles.detailValue}>{account.account_number || 'N/A'}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Routing Number:</span>
                <span style={styles.detailValue}>075915826</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Account Type:</span>
                <span style={styles.detailValue}>
                  {(account.account_type || account.type || 'Account').replace('_', ' ')}
                </span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Opened:</span>
                <span style={styles.detailValue}>
                  {account.created_at ? formatDate(account.created_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={styles.actionsCard}>
          <h2 style={styles.sectionTitle}>Quick Actions</h2>
          <div style={{
            ...styles.actionGrid,
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'
          }}>
            <Link href="/transfer" style={styles.actionButton}>
              <span style={styles.actionIcon}>💸</span>
              <span>Transfer Money</span>
            </Link>
            <Link href="/deposit-real" style={styles.actionButton}>
              <span style={styles.actionIcon}>📥</span>
              <span>Make Deposit</span>
            </Link>
            <Link href="/withdrawal" style={styles.actionButton}>
              <span style={styles.actionIcon}>📤</span>
              <span>Withdraw Funds</span>
            </Link>
            <Link href="/bill-pay" style={styles.actionButton}>
              <span style={styles.actionIcon}>🧾</span>
              <span>Pay Bills</span>
            </Link>
          </div>
        </div>

        {/* Transaction History */}
        <div style={styles.transactionsCard}>
          <h2 style={styles.sectionTitle}>Recent Transactions</h2>
          {transactions.length > 0 ? (
            <div style={styles.transactionsList}>
              {transactions.map(transaction => (
                <div key={transaction.id} style={styles.transactionItem}>
                  <div style={styles.transactionLeft}>
                    <span style={styles.transactionIcon}>
                      {getTransactionIcon(transaction.transaction_type)}
                    </span>
                    <div style={styles.transactionInfo}>
                      <div style={styles.transactionDesc}>
                        {transaction.description || transaction.transaction_type || 'Transaction'}
                      </div>
                      <div style={styles.transactionDate}>
                        {formatDate(transaction.created_at)}
                      </div>
                      <div style={styles.transactionStatus}>
                        Status: {transaction.status || 'Completed'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    ...styles.transactionAmount,
                    color: (transaction.amount || 0) >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {(transaction.amount || 0) >= 0 ? '+' : ''}{formatCurrency(transaction.amount || 0)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.noTransactions}>
              <div style={styles.noTransactionsIcon}>📊</div>
              <h3>No transactions found</h3>
              <p>This account has no transaction history yet.</p>
            </div>
          )}
        </div>
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
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    textAlign: 'center',
    color: '#64748b',
    padding: '2rem'
  },
  errorTitle: {
    color: '#ef4444',
    marginBottom: '1rem',
    fontSize: isMobile ? '1.2rem' : '1.5rem'
  },
  errorDesc: {
    marginBottom: '2rem',
    fontSize: isMobile ? '0.9rem' : '1.1rem'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: isMobile ? '0.5rem' : '1rem'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logo: {
    height: isMobile ? '30px' : '40px',
    width: 'auto'
  },
  logoText: {
    fontSize: isMobile ? '1.1rem' : '1.5rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '2rem',
    flexWrap: 'wrap'
  },
  routingInfo: {
    fontSize: isMobile ? '0.7rem' : '0.9rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: isMobile ? '0.3rem 0.6rem' : '0.5rem 1rem',
    borderRadius: '6px'
  },
  backButton: {
    padding: isMobile ? '0.3rem 0.6rem' : '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: isMobile ? '0.75rem' : '0.9rem',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '1rem' : '2rem'
  },
  accountCard: {
    backgroundColor: 'white',
    padding: isMobile ? '1rem' : '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isMobile ? '1rem' : '2rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  accountTitle: {
    fontSize: isMobile ? '1.3rem' : '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  accountType: {
    fontSize: isMobile ? '0.8rem' : '1rem',
    color: '#64748b',
    fontWeight: '500'
  },
  accountStatus: {
    padding: isMobile ? '0.3rem 0.6rem' : '0.5rem 1rem',
    backgroundColor: '#dcfce7',
    color: '#16a34a',
    borderRadius: '8px',
    fontSize: isMobile ? '0.75rem' : '0.9rem',
    fontWeight: '500'
  },
  accountInfo: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr',
    gap: isMobile ? '1rem' : '2rem',
    alignItems: 'start'
  },
  balanceSection: {
    textAlign: 'center',
    padding: isMobile ? '1rem' : '2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  balanceLabel: {
    fontSize: isMobile ? '0.8rem' : '1rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  balanceAmount: {
    fontSize: isMobile ? '1.5rem' : '2.5rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '0.5rem',
    wordBreak: 'break-all'
  },
  balanceNote: {
    fontSize: isMobile ? '0.75rem' : '0.9rem',
    color: '#64748b'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '0.5rem' : '1rem'
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: isMobile ? '0.5rem' : '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    gap: '0.5rem'
  },
  detailLabel: {
    fontWeight: '500',
    color: '#64748b',
    fontSize: isMobile ? '0.75rem' : '1rem'
  },
  detailValue: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: isMobile ? '0.75rem' : '1rem',
    textAlign: 'right'
  },
  actionsCard: {
    backgroundColor: 'white',
    padding: isMobile ? '1rem' : '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: isMobile ? '1.1rem' : '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: isMobile ? '1rem' : '1.5rem'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: isMobile ? '0.5rem' : '1rem'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: isMobile ? '0.75rem' : '1rem',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    textDecoration: 'none',
    color: '#374151',
    fontWeight: '500',
    transition: 'all 0.2s',
    fontSize: isMobile ? '0.85rem' : '1rem'
  },
  actionIcon: {
    fontSize: isMobile ? '1rem' : '1.25rem'
  },
  transactionsCard: {
    backgroundColor: 'white',
    padding: isMobile ? '1rem' : '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: isMobile ? '0.5rem' : '0.75rem'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '0.5rem' : '1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    gap: isMobile ? '0.3rem' : '0.5rem',
    flexWrap: isMobile ? 'nowrap' : 'nowrap'
  },
  transactionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: isMobile ? '0.5rem' : '1rem',
    flex: 1,
    minWidth: 0
  },
  transactionIcon: {
    fontSize: isMobile ? '1.2rem' : '1.5rem'
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0
  },
  transactionDesc: {
    fontSize: isMobile ? '0.8rem' : '1rem',
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: '0.25rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  transactionDate: {
    fontSize: isMobile ? '0.7rem' : '0.85rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  transactionStatus: {
    fontSize: isMobile ? '0.65rem' : '0.8rem',
    color: '#64748b'
  },
  transactionAmount: {
    fontSize: isMobile ? '0.85rem' : '1rem',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  noTransactions: {
    textAlign: 'center',
    padding: isMobile ? '2rem' : '3rem',
    color: '#64748b'
  },
  noTransactionsIcon: {
    fontSize: isMobile ? '2rem' : '3rem',
    marginBottom: '1rem'
  }
};
