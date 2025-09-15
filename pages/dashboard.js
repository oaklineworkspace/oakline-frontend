import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import DebitCard from '../components/DebitCard';
import LiveChat from '../components/LiveChat';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function DashboardContent() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [cardApplicationStatus, setCardApplicationStatus] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData(user.id);
    }
  }, [user]);

  const loadUserData = async (userId) => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('applications')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profile) {
        setUserProfile(profile);
      }

      // Fetch accounts with better error handling
      let accountsData = [];

      try {
        // First try to get user's application to find linked accounts
        const { data: userApplication } = await supabase
          .from('applications')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userApplication) {
          // Try to find accounts linked to the application
          const { data: accountsByAppId } = await supabase
            .from('accounts')
            .select('*')
            .eq('application_id', userApplication.id)
            .order('created_at', { ascending: true });

          if (accountsByAppId && accountsByAppId.length > 0) {
            accountsData = accountsByAppId;
          }
        }

        // If no accounts found by application, try other methods
        if (accountsData.length === 0) {
          const { data: accountsByUserId } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

          if (accountsByUserId && accountsByUserId.length > 0) {
            accountsData = accountsByUserId;
          } else {
            // Try by email
            const { data: accountsByEmail } = await supabase
              .from('accounts')
              .select('*')
              .or(`user_email.eq.${user.email},email.eq.${user.email}`)
              .order('created_at', { ascending: true });

            accountsData = accountsByEmail || [];
          }
        }
      } catch (accountError) {
        console.error('Error fetching accounts:', accountError);
        accountsData = [];
      }

      setAccounts(accountsData || []);

      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      setTransactions(transactionsData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyForCard = async () => {
    setCardApplicationStatus('');

    if (accounts.length === 0) {
      setCardApplicationStatus('error: You need to have an account first to apply for a card.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCardApplicationStatus('error: Please log in to apply for a card');
        return;
      }

      const response = await fetch('/api/apply-card', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accounts[0].id // Apply for card linked to first account
        })
      });

      const data = await response.json();

      if (data.success) {
        setCardApplicationStatus('Card application submitted successfully! You will receive confirmation once approved.');
      } else {
        setCardApplicationStatus('error: ' + (data.error || 'Failed to submit application'));
      }
    } catch (error) {
      console.error('Error applying for card:', error);
      setCardApplicationStatus('error: Error submitting application');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount || 0));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, acc) => total + (parseFloat(acc.balance) || 0), 0);
  };

  const getUserDisplayName = () => {
    if (userProfile) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const toggleDropdown = (menu) => {
    setDropdownOpen(prev => ({
      ...Object.keys(prev).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
      [menu]: !prev[menu]
    }));
  };

  const closeAllDropdowns = () => {
    setDropdownOpen({});
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your dashboard...</div>
      </div>
    );
  }

  // Add hover effects for dropdown items
  if (typeof document !== 'undefined') {
    const existingStyle = document.querySelector('#dropdown-styles');
    if (!existingStyle) {
      const dropdownStyles = document.createElement('style');
      dropdownStyles.id = 'dropdown-styles';
      dropdownStyles.textContent = `
      .dropdown-link:hover {
        background-color: #f3f4f6 !important;
        color: #1a365d !important;
        transform: translateX(4px);
      }

      .nav-button:hover {
        background-color: rgba(255, 255, 255, 0.2) !important;
        transform: translateY(-2px);
      }
    `;
      document.head.appendChild(dropdownStyles);
    }
  }


  return (
    <div style={styles.container} onClick={closeAllDropdowns}>
      {/* Professional Banking Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <span style={styles.brandTagline}>Your Financial Partner</span>
              </div>
            </Link>
          </div>

          <nav style={styles.mainNav}>
            <div style={styles.navItem}>
              <button style={styles.navButton} onClick={(e) => { e.stopPropagation(); toggleDropdown('main'); }}>
                <span style={styles.navIcon}>☰</span>
                Banking Menu
                <span style={styles.navArrow}>▼</span>
              </button>
              {dropdownOpen.main && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>🏦 My Banking</h4>
                    <Link href="/" style={styles.dropdownLink}>🏠 Home</Link>
                    <Link href="/main-menu" style={styles.dropdownLink}>📋 Main Menu</Link>
                    <Link href="/account-details" style={styles.dropdownLink}>🏦 Account Details</Link>
                    <Link href="/transfer" style={styles.dropdownLink}>💸 Transfer Money</Link>
                    <Link href="/cards" style={styles.dropdownLink}>💳 My Cards</Link>
                    <Link href="/transactions" style={styles.dropdownLink}>📜 Transaction History</Link>
                    <Link href="/bill-pay" style={styles.dropdownLink}>🧾 Pay Bills</Link>
                    <Link href="/deposit-real" style={styles.dropdownLink}>📱 Mobile Deposit</Link>
                    <Link href="/zelle" style={styles.dropdownLink}>💰 Zelle</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>🛡️ Security & Settings</h4>
                    <Link href="/security" style={styles.dropdownLink}>🔒 Security Settings</Link>
                    <Link href="/notifications" style={styles.dropdownLink}>🔔 Notifications</Link>
                    <Link href="/privacy" style={styles.dropdownLink}>🛡️ Privacy Settings</Link>
                    <Link href="/profile" style={styles.dropdownLink}>👤 Edit Profile</Link>
                    <Link href="/messages" style={styles.dropdownLink}>📧 Messages</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <h4 style={styles.dropdownSectionTitle}>❓ Help & Support</h4>
                    <Link href="/support" style={styles.dropdownLink}>🎧 Customer Support</Link>
                    <Link href="/faq" style={styles.dropdownLink}>❓ FAQ</Link>
                    <Link href="/financial-education" style={styles.dropdownLink}>📚 Financial Education</Link>
                    <Link href="/calculators" style={styles.dropdownLink}>🧮 Financial Calculators</Link>
                    <Link href="/branch-locator" style={styles.dropdownLink}>📍 Find Branch/ATM</Link>
                  </div>
                  <div style={styles.dropdownDivider}></div>
                  <div style={styles.dropdownSection}>
                    <button onClick={handleSignOut} style={styles.logoutDropdownButton}>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div style={styles.headerRight}>
            <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <span style={styles.welcomeText}>Welcome back</span>
              <span style={styles.userName}>{getUserDisplayName()}</span>
            </div>
            <div style={styles.userActions}>
              <Link href="/notifications" style={styles.actionButton}>
                <span style={styles.actionIcon}>🔔</span>
                Alerts
              </Link>
              <Link href="/messages" style={styles.actionButton}>
                <span style={styles.actionIcon}>💬</span>
                Messages
              </Link>
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main style={styles.main}>
        {/* Account Summary Section */}
        <section style={styles.summarySection}>
          <div style={styles.summaryHeader}>
            <h2 style={styles.sectionTitle}>Account Summary</h2>
            <span style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</span>
          </div>

          <div style={styles.summaryCards}>
            <div style={styles.summaryCard}>
              <div style={styles.cardIcon}>💰</div>
              <div style={styles.cardContent}>
                <h3 style={styles.cardLabel}>Total Balance</h3>
                <div style={styles.cardValue}>{formatCurrency(getTotalBalance())}</div>
                <span style={styles.cardSubtext}>Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={{...styles.cardIcon, backgroundColor: '#f3e5f5'}}>📈</div>
              <div style={styles.cardContent}>
                <h3 style={styles.cardLabel}>Monthly Growth</h3>
                <div style={styles.cardValue}>+2.4%</div>
                <span style={styles.cardSubtext}>vs last month</span>
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={{...styles.cardIcon, backgroundColor: '#e8f5e8'}}>💳</div>
              <div style={styles.cardContent}>
                <h3 style={styles.cardLabel}>Available Credit</h3>
                <div style={styles.cardValue}>$15,000</div>
                <span style={styles.cardSubtext}>85% available</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.quickActionsSection}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.quickActions}>
            <Link href="/transfer" style={styles.quickAction}>
              <span style={styles.quickActionIcon}>💸</span>
              <span style={styles.quickActionText}>Transfer Money</span>
            </Link>
            <Link href="/deposit-real" style={styles.quickAction}>
              <span style={styles.quickActionIcon}>📥</span>
              <span style={styles.quickActionText}>Mobile Deposit</span>
            </Link>
            <Link href="/bill-pay" style={styles.quickAction}>
              <span style={styles.quickActionIcon}>🧾</span>
              <span style={styles.quickActionText}>Pay Bills</span>
            </Link>
            <button onClick={applyForCard} style={{...styles.quickAction, background: 'none', border: 'none'}}>
              <span style={styles.quickActionIcon}>💳</span>
              <span style={styles.quickActionText}>Apply for Card</span>
            </button>
          </div>

          {cardApplicationStatus && (
            <div style={{
              ...styles.statusMessage,
              backgroundColor: cardApplicationStatus.startsWith('error') ? '#ffebee' : '#e8f5e8',
              color: cardApplicationStatus.startsWith('error') ? '#c62828' : '#2e7d32'
            }}>
              {cardApplicationStatus.startsWith('error') 
                ? cardApplicationStatus.replace('error: ', '❌ ') 
                : '✅ Card application submitted successfully!'}
            </div>
          )}
        </section>

        {/* Accounts Overview */}
        <section style={styles.accountsSection}>
          <div style={styles.sectionHeaderWithAction}>
            <h3 style={styles.sectionTitle}>My Accounts</h3>
            <Link href="/account-details" style={styles.viewAllLink}>View All Details →</Link>
          </div>

          <div style={styles.accountsList}>
            {accounts.map(account => (
              <div key={account.id} style={styles.accountItem}>
                <div style={styles.accountInfo}>
                  <div style={styles.accountTypeIcon}>
                    {account.account_type === 'checking' ? '🏦' : 
                     account.account_type === 'savings' ? '💰' : '📊'}
                  </div>
                  <div style={styles.accountDetails}>
                    <h4 style={styles.accountName}>
                      {account.account_type ? account.account_type.replace('_', ' ').toUpperCase() : 'Account'}
                    </h4>
                    <span style={styles.accountNumber}>****{account.account_number?.slice(-4)}</span>
                  </div>
                </div>
                <div style={styles.accountBalance}>
                  {formatCurrency(account.balance || 0)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Transactions */}
        <section style={styles.transactionsSection}>
          <div style={styles.sectionHeaderWithAction}>
            <h3 style={styles.sectionTitle}>Recent Transactions</h3>
            <Link href="/transactions" style={styles.viewAllLink}>View All →</Link>
          </div>

          <div style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <div key={transaction.id} style={styles.transactionItem}>
                  <div style={styles.transactionIcon}>
                    {(transaction.amount || 0) >= 0 ? '📥' : '📤'}
                  </div>
                  <div style={styles.transactionDetails}>
                    <span style={styles.transactionDescription}>
                      {transaction.description || 'Transaction'}
                    </span>
                    <span style={styles.transactionDate}>
                      {formatDate(transaction.created_at)}
                    </span>
                  </div>
                  <div style={{
                    ...styles.transactionAmount,
                    color: (transaction.amount || 0) >= 0 ? '#2e7d32' : '#d32f2f'
                  }}>
                    {(transaction.amount || 0) >= 0 ? '+' : ''}{formatCurrency(transaction.amount || 0)}
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <h4 style={styles.emptyTitle}>No recent transactions</h4>
                <p style={styles.emptyDesc}>Your transaction history will appear here.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <LiveChat />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    width: '100%',
    overflowX: 'hidden'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 50%, #059669 100%)',
    color: 'white',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #059669',
    borderRight: '4px solid #d97706',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
    marginBottom: '2rem',
    boxShadow: '0 0 20px rgba(5, 150, 105, 0.3)'
  },
  loadingText: {
    fontSize: '1.2rem',
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.95
  },
  header: {
    backgroundColor: '#1a365d',
    borderBottom: '3px solid #059669',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)'
  },
  headerContainer: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '70px',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'white',
    gap: '1rem'
  },
  logo: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: 'white'
  },
  brandTagline: {
    fontSize: '0.8rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  mainNav: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'center'
  },
  navItem: {
    position: 'relative'
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    minWidth: 'auto'
  },
  navIcon: {
    fontSize: '1rem'
  },
  navArrow: {
    fontSize: '0.7rem',
    transition: 'transform 0.2s'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
    padding: '1rem',
    minWidth: '280px',
    maxHeight: '70vh',
    overflowY: 'auto',
    zIndex: 1000,
    marginTop: '0.5rem',
    border: '1px solid #e2e8f0'
  },
  dropdownSection: {
    marginBottom: '0.5rem'
  },
  dropdownSectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    margin: '0 0 0.5rem 0',
    padding: '0 0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  dropdownDivider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '0.75rem 0',
    width: '100%'
  },
  logoutDropdownButton: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left'
  },
  dropdownLink: {
    display: 'block',
    padding: '0.75rem 1rem',
    color: '#374151',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    '@media (max-width: 768px)': {
      alignItems: 'center'
    }
  },
  welcomeText: {
    fontSize: '0.8rem',
    color: '#bfdbfe'
  },
  userName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white'
  },
  userActions: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.6rem',
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  logoutButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  actionIcon: {
    fontSize: '0.9rem'
  },
  routingInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  routingLabel: {
    fontSize: '0.7rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  routingNumber: {
    fontSize: '0.8rem',
    color: '#059669',
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: '1px'
  },
  phoneInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#059669'
  },
  phoneIcon: {
    fontSize: '1rem'
  },

  // Mobile Styles
  '@media (max-width: 768px)': {
    headerContainer: {
      flexDirection: 'column',
      padding: '0.75rem',
      minHeight: 'auto',
      gap: '0.75rem'
    },
    mainNav: {
      width: '100%',
      justifyContent: 'space-around',
      order: 2
    },
    navButton: {
      padding: '0.4rem 0.5rem',
      fontSize: '0.7rem',
      gap: '0.2rem'
    },
    userSection: {
      order: 1,
      width: '100%',
      justifyContent: 'space-between'
    },
    userActions: {
      gap: '0.25rem'
    },
    actionButton: {
      padding: '0.3rem 0.5rem',
      fontSize: '0.7rem'
    },
    main: {
      padding: '0.75rem 0.5rem'
    },
    summaryCards: {
      gridTemplateColumns: '1fr',
      gap: '0.75rem'
    },
    summaryCard: {
      padding: '1rem'
    },
    quickActions: {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '0.5rem'
    },
    quickAction: {
      padding: '1rem 0.5rem'
    },
    sectionTitle: {
      fontSize: '1.1rem'
    }
  },
  '@media (max-width: 480px)': {
    navButton: {
      fontSize: '0.65rem',
      padding: '0.3rem 0.4rem'
    },
    actionButton: {
      fontSize: '0.65rem',
      padding: '0.25rem 0.4rem'
    },
    main: {
      padding: '0.5rem 0.25rem'
    },
    quickActions: {
      gridTemplateColumns: '1fr'
    }
  },
  main: {
    maxWidth: '100%',
    margin: '0',
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    width: '100%',
    boxSizing: 'border-box'
  },
  summarySection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  lastUpdated: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem'
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0'
  },
  cardIcon: {
    fontSize: '2rem',
    padding: '1rem',
    borderRadius: '10px',
    backgroundColor: '#e3f2fd'
  },
  cardContent: {
    flex: 1
  },
  cardLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: '0 0 0.5rem 0',
    fontWeight: '600'
  },
  cardValue: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  cardSubtext: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  quickActionsSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  quickActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
    marginTop: '1rem'
  },
  quickAction: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.5rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    color: '#374151',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  quickActionIcon: {
    fontSize: '1.5rem'
  },
  quickActionText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    textAlign: 'center'
  },
  statusMessage: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  accountsSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  sectionHeaderWithAction: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  accountItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  accountInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  accountTypeIcon: {
    fontSize: '1.5rem',
    padding: '0.5rem',
    backgroundColor: '#eff6ff',
    borderRadius: '8px'
  },
  accountDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  accountName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  accountNumber: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontFamily: 'monospace'
  },
  accountBalance: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1e40af'
  },
  transactionsSection: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  transactionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
  },
  transactionIcon: {
    fontSize: '1.2rem',
    padding: '0.5rem',
    backgroundColor: '#eff6ff',
    borderRadius: '6px'
  },
  transactionDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  transactionDescription: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  transactionDate: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  transactionAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    textAlign: 'right'
  },
  emptyState: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    display: 'block'
  },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyDesc: {
    fontSize: '0.9rem',
    margin: 0
  },
  dashboardDropdownLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};