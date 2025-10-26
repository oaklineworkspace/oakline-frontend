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
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
      }
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
      case 'transfer_in': return '💸';
      case 'transfer_out': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
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
      border: '1px solid #e2e8f0'
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
    transactionAmount: {
      fontSize: isMobile ? '0.95rem' : '1.05rem',
      fontWeight: '700'
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
        </div>

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
                  {account.status && (
                    <span style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: '600',
                      backgroundColor: account.status === 'active' ? '#d1fae5' : 
                                     account.status === 'pending' ? '#fef3c7' : 
                                     account.status === 'closed' ? '#fee2e2' : '#f3f4f6',
                      color: account.status === 'active' ? '#065f46' : 
                             account.status === 'pending' ? '#92400e' : 
                             account.status === 'closed' ? '#991b1b' : '#4b5563'
                    }}>
                      {account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                    </span>
                  )}
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
                           selectedAccount.status === 'pending' ? '#f59e0b' : 
                           selectedAccount.status === 'closed' ? '#ef4444' : '#64748b'
                  }}>
                    {selectedAccount.status ? selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1) : 'Unknown'}
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
                    const txType = tx.transaction_type?.toLowerCase() || '';
                    const amount = parseFloat(tx.amount) || 0;
                    
                    // Determine if it's a credit (money in) or debit (money out)
                    let isCredit = false;
                    if (txType.includes('deposit') || txType.includes('credit') || txType.includes('transfer_in') || txType.includes('interest')) {
                      isCredit = true;
                    } else if (txType.includes('debit') || txType.includes('withdrawal') || txType.includes('purchase') || txType.includes('transfer_out') || txType.includes('bill_payment') || txType.includes('fee')) {
                      isCredit = false;
                    } else {
                      // Fallback: check if amount is positive or negative
                      isCredit = amount >= 0;
                    }
                    
                    return (
                      <div key={tx.id} style={styles.transactionItem}>
                        <div style={styles.transactionLeft}>
                          <span style={styles.transactionIcon}>
                            {getTransactionIcon(tx.transaction_type)}
                          </span>
                          <div style={styles.transactionInfo}>
                            <div style={styles.transactionDescription}>
                              {tx.description || tx.transaction_type?.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div style={styles.transactionDate}>
                              {formatDate(tx.created_at)}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          ...styles.transactionAmount,
                          color: isCredit ? '#059669' : '#dc2626'
                        }}>
                          {isCredit ? '+' : '-'}
                          {formatCurrency(Math.abs(amount))}
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
    </div>
  );
}
