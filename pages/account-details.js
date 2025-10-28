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
      backgroundColor: '#f7f9fc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '2rem'
    },
    header: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      borderBottom: '1px solid #e5e7eb'
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
      color: '#1f2937'
    },
    logo: {
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700',
      color: '#111827'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: '#e5e7eb',
      color: '#1f2937',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid #d1d5db',
      transition: 'all 0.3s ease',
      fontWeight: '600'
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
      fontSize: isMobile ? '1.75rem' : '2.5rem',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '0.75rem'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '1rem' : '1.15rem',
      color: '#6b7280'
    },
    balanceCard: {
      backgroundColor: '#ffffff',
      padding: isMobile ? '1.5rem' : '2rem',
      borderRadius: '16px',
      color: '#1f2937',
      marginBottom: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    balanceLabel: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      color: '#6b7280',
      fontWeight: '500'
    },
    balanceAmount: {
      fontSize: isMobile ? '2.25rem' : '3rem',
      fontWeight: '700',
      color: '#111827',
      letterSpacing: '-0.03em'
    },
    balanceAccounts: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      color: '#6b7280',
      fontWeight: '500'
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '380px 1fr',
      gap: isMobile ? '1.5rem' : '2.5rem'
    },
    accountsList: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      height: 'fit-content'
    },
    accountsTitle: {
      fontSize: isMobile ? '1.3rem' : '1.5rem',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #e5e7eb'
    },
    accountItem: {
      padding: '1rem 1.25rem',
      borderRadius: '12px',
      marginBottom: '0.75rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '1px solid transparent',
      backgroundColor: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    accountItemActive: {
      backgroundColor: '#eff6ff',
      borderColor: '#3b82f6',
      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.15)'
    },
    accountItemInactive: {
      backgroundColor: 'white',
      borderColor: '#e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    },
    accountItemHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.25rem'
    },
    accountIcon: {
      fontSize: '1.5rem',
      color: '#3b82f6'
    },
    accountName: {
      fontSize: isMobile ? '1rem' : '1.05rem',
      fontWeight: '600',
      color: '#111827',
      textTransform: 'capitalize'
    },
    accountNumber: {
      fontSize: '0.85rem',
      color: '#6b7280',
      fontWeight: '500',
      marginBottom: '0.25rem'
    },
    accountBalance: {
      fontSize: isMobile ? '1.2rem' : '1.3rem',
      fontWeight: '700',
      color: '#059669',
      marginTop: '0.25rem'
    },
    detailsSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    detailsHeader: {
      borderBottom: '2px solid #f1f5f9',
      paddingBottom: '1rem',
      marginBottom: '2rem'
    },
    detailsTitle: {
      fontSize: isMobile ? '1.5rem' : '1.8rem',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    detailsSubtitle: {
      fontSize: '1rem',
      color: '#6b7280'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2.5rem'
    },
    infoItem: {
      backgroundColor: '#f8fafc',
      padding: '1.25rem',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    infoLabel: {
      fontSize: '0.85rem',
      color: '#6b7280',
      fontWeight: '500'
    },
    infoValue: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '600',
      color: '#111827'
    },
    transactionsSection: {
      marginTop: '2.5rem'
    },
    transactionsTitle: {
      fontSize: isMobile ? '1.2rem' : '1.4rem',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '1.5rem'
    },
    transactionItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isMobile ? '1rem' : '1.25rem',
      backgroundColor: 'white',
      borderRadius: '12px',
      marginBottom: '0.5rem',
      border: '1px solid #e5e7eb',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
    },
    transactionLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      flex: 1
    },
    transactionIcon: {
      fontSize: '1.5rem',
      padding: '0.75rem',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '48px',
      height: '48px',
      flexShrink: 0,
      fontWeight: '600'
    },
    transactionInfo: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    },
    transactionDescription: {
      fontSize: isMobile ? '0.9rem' : '0.95rem',
      fontWeight: '600',
      color: '#111827',
      lineHeight: '1.4'
    },
    transactionDate: {
      fontSize: '0.8rem',
      color: '#6b7280',
      fontWeight: '500'
    },
    transactionAmount: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      letterSpacing: '-0.02em'
    },
    statusBadge: {
      padding: '0.3rem 0.75rem',
      borderRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      marginLeft: '1rem',
      flexShrink: 0
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#6b7280',
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      fontSize: '1.2rem',
      color: '#6b7280'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e5e7eb',
      borderTop: '4px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    }
  };

  // Define keyframes for spin animation (if not globally defined)
  const spinAnimation = `@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }`;

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{spinAnimation}</style> {/* Inject animation */}
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
        <div style={styles.main}>
          <div style={styles.emptyState}>
            <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: '700' }}>
              {error || 'No accounts found'}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {error ? 'An error occurred while fetching your accounts. Please try again.' : 'You do not have any accounts set up yet.'}
            </p>
            <Link href="/dashboard" style={{ ...styles.backButton, backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem' }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadgeStyle = (status) => {
    const baseStyle = styles.statusBadge;
    switch (status?.toLowerCase()) {
      case 'completed': return { ...baseStyle, backgroundColor: '#2ecc71', color: 'white' };
      case 'pending': return { ...baseStyle, backgroundColor: '#f1c40f', color: '#333' };
      case 'reversal': return { ...baseStyle, backgroundColor: '#3498db', color: 'white' };
      case 'cancelled': return { ...baseStyle, backgroundColor: '#7f8c8d', color: 'white' };
      case 'failed': return { ...baseStyle, backgroundColor: '#e74c3c', color: 'white' };
      default: return { ...baseStyle, backgroundColor: '#e5e7eb', color: '#374151' };
    }
  };

  const getTransactionIconStyle = (type, amount) => {
    const baseStyle = styles.transactionIcon;
    const isCredit = amount >= 0; // Simplified credit/debit check for icon coloring

    switch (type?.toLowerCase()) {
      case 'deposit':
      case 'transfer_in':
      case 'interest':
        return { ...baseStyle, backgroundColor: '#2ecc71', color: 'white' };
      case 'withdrawal':
      case 'transfer_out':
      case 'purchase':
      case 'bill_payment':
      case 'fee':
        return { ...baseStyle, backgroundColor: '#e74c3c', color: 'white' };
      default:
        return isCredit
          ? { ...baseStyle, backgroundColor: '#2ecc71', color: 'white' }
          : { ...baseStyle, backgroundColor: '#e74c3c', color: 'white' };
    }
  };

  return (
    <div style={styles.container}>
      <style>{spinAnimation}</style> {/* Inject animation */}
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
          <div style={styles.balanceLabel}>Total Balance</div>
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
                             account.status === 'closed' ? '#991b1b' : '#4b5563',
                      textTransform: 'uppercase'
                    }}>
                      {account.status}
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
                    const isCredit = amount >= 0; // Simplified check for display

                    // Determine colors based on type and status
                    let amountColor, iconBackgroundColor;

                    if (txType.includes('deposit') || txType.includes('credit') || txType.includes('transfer_in') || txType.includes('interest')) {
                      amountColor = '#2ECC71'; // Green for Credit
                      iconBackgroundColor = '#2ECC71';
                    } else {
                      amountColor = '#E74C3C'; // Red for Debit
                      iconBackgroundColor = '#E74C3C';
                    }

                    return (
                      <div key={tx.id} style={styles.transactionItem} onClick={() => { /* Add transaction detail modal or navigation */ }}>
                        <div style={styles.transactionLeft}>
                          <span style={{
                            ...styles.transactionIcon,
                            backgroundColor: iconBackgroundColor,
                            color: 'white'
                          }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            ...styles.transactionAmount,
                            color: amountColor
                          }}>
                            {isCredit ? '+' : '-'}
                            {formatCurrency(Math.abs(amount))}
                          </div>
                          <span style={getStatusBadgeStyle(tx.status)}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={styles.emptyState}>
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