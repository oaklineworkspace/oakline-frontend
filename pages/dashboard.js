import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import DebitCard from '../components/DebitCard';
import LiveChat from '../components/LiveChat';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { getCreditScoreTier, getCreditScoreMessage } from '../lib/creditScoreUtils';
import FundingNotice from '../components/FundingNotice';

function DashboardContent() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [cardApplicationStatus, setCardApplicationStatus] = useState(null);
  const [flippedCards, setFlippedCards] = useState({});
  const [showCardDetails, setShowCardDetails] = useState({});
  const [showBalance, setShowBalance] = useState(true);
  const [cryptoDeposits, setCryptoDeposits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
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
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profileError && profileData) {
        setUserProfile(profileData);
      } else {
        const { data: profiles } = await supabase
          .from('applications')
          .select('*')
          .eq('email', user.email)
          .order('created_at', { ascending: false });

        if (profiles && profiles.length > 0) {
          const approvedProfile = profiles.find(p => p.application_status === 'approved' || p.application_status === 'completed');
          setUserProfile(approvedProfile || profiles[0]);
        }
      }

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      setAccounts(accountsData || []);

      // Fetch transactions
      if (accountsData && accountsData.length > 0) {
        const accountIds = accountsData.map(acc => acc.id);
        const { data: txData } = await supabase
          .from('transactions')
          .select(`
            *,
            accounts:account_id (
              account_number,
              account_type
            )
          `)
          .in('account_id', accountIds)
          .order('created_at', { ascending: false })
          .limit(50);

        // Fetch crypto deposits
        const { data: cryptoTxData } = await supabase
          .from('crypto_deposits')
          .select(`
            *,
            accounts:account_id (
              account_number,
              account_type
            ),
            crypto_assets:crypto_asset_id (
              crypto_type,
              network_type,
              symbol
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: accountOpeningDeposits } = await supabase
          .from('account_opening_crypto_deposits')
          .select(`
            *,
            accounts:account_id (
              account_number,
              account_type
            ),
            crypto_assets:crypto_asset_id (
              crypto_type,
              network_type,
              symbol
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        let allTransactions = txData || [];

        if (cryptoTxData && cryptoTxData.length > 0) {
          const formattedCryptoDeposits = cryptoTxData.map(crypto => ({
            id: crypto.id,
            type: 'crypto_deposit',
            transaction_type: 'crypto_deposit',
            description: `${crypto.crypto_assets?.symbol || 'CRYPTO'} Deposit via ${crypto.crypto_assets?.network_type || 'Network'}`,
            amount: crypto.net_amount || crypto.amount || 0,
            status: crypto.status || 'pending',
            created_at: crypto.created_at,
            updated_at: crypto.updated_at,
            completed_at: crypto.completed_at,
            crypto_type: crypto.crypto_assets?.crypto_type || 'Cryptocurrency',
            crypto_symbol: crypto.crypto_assets?.symbol || 'CRYPTO',
            network_type: crypto.crypto_assets?.network_type || 'Network',
            wallet_address: crypto.wallet_address,
            transaction_hash: crypto.transaction_hash,
            fee: crypto.fee || 0,
            gross_amount: crypto.amount || 0,
            confirmations: crypto.confirmations || 0,
            required_confirmations: crypto.required_confirmations || 3,
            accounts: crypto.accounts,
            purpose: crypto.purpose
          }));
          allTransactions = [...allTransactions, ...formattedCryptoDeposits];
        }

        if (accountOpeningDeposits && accountOpeningDeposits.length > 0) {
          const formattedAccountOpeningDeposits = accountOpeningDeposits.map(deposit => ({
            id: deposit.id,
            type: 'account_opening_deposit',
            transaction_type: 'crypto_deposit',
            description: `${deposit.crypto_assets?.symbol || 'CRYPTO'} Account Opening Deposit`,
            amount: deposit.net_amount || deposit.amount || 0,
            status: deposit.status || 'pending',
            created_at: deposit.created_at,
            updated_at: deposit.updated_at,
            completed_at: deposit.completed_at,
            crypto_type: deposit.crypto_assets?.crypto_type || 'Cryptocurrency',
            crypto_symbol: deposit.crypto_assets?.symbol || 'CRYPTO',
            network_type: deposit.crypto_assets?.network_type || 'Network',
            transaction_hash: deposit.tx_hash,
            fee: deposit.fee || 0,
            gross_amount: deposit.amount || 0,
            confirmations: deposit.confirmations || 0,
            required_confirmations: deposit.required_confirmations || 3,
            accounts: deposit.accounts,
            purpose: 'account_activation'
          }));
          allTransactions = [...allTransactions, ...formattedAccountOpeningDeposits];
        }

        allTransactions = allTransactions
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10);

        setTransactions(allTransactions);
        setCryptoDeposits(cryptoTxData || []);
      }

      // Fetch cards
      const { data: cardsData } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      setCards(cardsData || []);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount || 0));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tx.transaction_type === filterType;
    const txDate = new Date(tx.created_at);
    const matchesDateRange = (!dateRange.start || txDate >= new Date(dateRange.start)) &&
                              (!dateRange.end || txDate <= new Date(dateRange.end));
    return matchesSearch && matchesType && matchesDateRange;
  });

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header Section */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>
            📊 Welcome Back, {getUserDisplayName()}
          </h1>
          <p style={styles.headerSubtitle}>
            Here's what's happening with your accounts today
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => loadUserData(user.id)} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <Link href="/main-menu" style={styles.menuButton}>
            ☰ Menu
          </Link>
          <button onClick={handleSignOut} style={styles.logoutButton}>
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Total Balance</h3>
          <p style={styles.statValue}>
            {showBalance ? formatCurrency(getTotalBalance()) : '••••••'}
          </p>
          <button onClick={() => setShowBalance(!showBalance)} style={styles.toggleButton}>
            {showBalance ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Active Accounts</h3>
          <p style={styles.statValue}>{accounts.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Recent Transactions</h3>
          <p style={styles.statValue}>{transactions.length}</p>
        </div>
        <div style={styles.statCard}>
          <h3 style={styles.statLabel}>Active Cards</h3>
          <p style={styles.statValue}>{cards.filter(c => !c.is_locked).length}</p>
        </div>
      </div>

      {/* Funding Notices */}
      <FundingNotice accounts={accounts} />

      {/* Tab Navigation */}
      <div style={styles.tabNavigation}>
        {['overview', 'accounts', 'transactions', 'cards'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab ? styles.tabButtonActive : {})
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      {activeTab === 'transactions' && (
        <>
          <div style={styles.searchFilter}>
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
              <option value="crypto_deposit">Crypto Deposits</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div style={styles.dateRangeFilter}>
            <div style={styles.dateRangeHeader}>
              📅 Date Range Filter
            </div>
            <div style={styles.dateRangeInputs}>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  style={styles.dateInput}
                />
              </div>
              <div style={styles.dateInputGroup}>
                <label style={styles.dateLabel}>To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  style={styles.dateInput}
                />
              </div>
              <button
                onClick={() => setDateRange({ start: '', end: '' })}
                style={styles.clearButton}
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content Area */}
      {activeTab === 'overview' && (
        <div style={styles.contentGrid}>
          {/* Quick Actions */}
          <div style={styles.quickActionsCard}>
            <h2 style={styles.sectionTitle}>Quick Actions</h2>
            <div style={styles.quickActionsGrid}>
              <Link href="/transfer" style={styles.quickActionButton}>
                <span style={styles.quickActionIcon}>💸</span>
                <span>Transfer</span>
              </Link>
              <Link href="/deposit-crypto" style={styles.quickActionButton}>
                <span style={styles.quickActionIcon}>₿</span>
                <span>Deposit</span>
              </Link>
              <Link href="/bill-pay" style={styles.quickActionButton}>
                <span style={styles.quickActionIcon}>🧾</span>
                <span>Pay Bills</span>
              </Link>
              <Link href="/cards" style={styles.quickActionButton}>
                <span style={styles.quickActionIcon}>💳</span>
                <span>Cards</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={styles.recentActivityCard}>
            <div style={styles.cardHeader}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <Link href="/transactions" style={styles.viewAllLink}>
                View All →
              </Link>
            </div>
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} style={styles.activityItem}>
                <div style={styles.activityLeft}>
                  <span style={styles.activityIcon}>
                    {tx.transaction_type === 'crypto_deposit' ? '₿' : '💼'}
                  </span>
                  <div>
                    <div style={styles.activityDescription}>{tx.description}</div>
                    <div style={styles.activityDate}>{formatDate(tx.created_at)}</div>
                  </div>
                </div>
                <div style={styles.activityAmount}>
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div style={styles.contentGrid}>
          {accounts.map(account => (
            <div key={account.id} style={styles.accountCard}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>
                    {account.account_type?.toUpperCase() || 'ACCOUNT'}
                  </h3>
                  <p style={styles.cardSubtitle}>****{account.account_number?.slice(-4)}</p>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: account.status === 'active' ? '#d1fae5' : '#fef3c7',
                  color: account.status === 'active' ? '#065f46' : '#92400e'
                }}>
                  {account.status === 'active' ? '✅ Active' : '⏳ Pending'}
                </span>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Balance:</span>
                  <span style={styles.detailValue}>{formatCurrency(account.balance)}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Type:</span>
                  <span style={styles.detailValue}>{account.account_type}</span>
                </div>
              </div>
              <div style={styles.cardActions}>
                <Link href="/account-details" style={styles.actionButton}>
                  View Details
                </Link>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No accounts found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={styles.contentGrid}>
          {filteredTransactions.map(tx => {
            const txType = (tx.type || tx.transaction_type || '').toLowerCase();
            const description = (tx.description || '').toLowerCase();
            const amount = parseFloat(tx.amount) || 0;
            const isCredit = txType === 'deposit' || txType === 'credit' || description.includes('from');

            return (
              <div key={tx.id} style={styles.transactionCard}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.cardTitle}>{tx.description}</h3>
                    <p style={styles.cardSubtitle}>{formatDate(tx.created_at)}</p>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: tx.status === 'completed' ? '#d1fae5' : '#fef3c7',
                    color: tx.status === 'completed' ? '#065f46' : '#92400e'
                  }}>
                    {tx.status}
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Amount:</span>
                    <span style={{
                      ...styles.detailValue,
                      color: isCredit ? '#059669' : '#dc2626',
                      fontWeight: '700'
                    }}>
                      {isCredit ? '+' : '-'}{formatCurrency(amount)}
                    </span>
                  </div>
                  {tx.transaction_type === 'crypto_deposit' && tx.fee && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Fee:</span>
                      <span style={styles.detailValue}>{formatCurrency(tx.fee)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>📭</p>
              <p style={styles.emptyText}>No transactions found</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cards' && (
        <div style={styles.contentGrid}>
          {cards.map(card => (
            <div key={card.id} style={styles.cardCard}>
              <DebitCard card={card} userProfile={userProfile} user={user} />
              <div style={styles.cardActions}>
                <button
                  onClick={() => setShowCardDetails(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                  style={styles.actionButton}
                >
                  {showCardDetails[card.id] ? '👁️ Hide' : '👁️ Show'} Details
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>💳</p>
              <p style={styles.emptyText}>No cards found</p>
              <Link href="/apply-card" style={styles.actionButton}>
                Apply for Card
              </Link>
            </div>
          )}
        </div>
      )}

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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: 'clamp(1rem, 3vw, 20px)',
    paddingBottom: '100px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 50%, #059669 100%)',
    color: 'white'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #059669',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
    marginBottom: '2rem'
  },
  loadingText: {
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  header: {
    background: 'white',
    padding: 'clamp(1.5rem, 4vw, 24px)',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerTitle: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  headerSubtitle: {
    margin: 0,
    color: '#718096',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#4299e1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  menuButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.3s'
  },
  logoutButton: {
    padding: 'clamp(0.5rem, 2vw, 10px) clamp(1rem, 3vw, 20px)',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  statLabel: {
    margin: '0 0 8px 0',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#718096',
    fontWeight: '500'
  },
  statValue: {
    margin: 0,
    fontSize: 'clamp(1.5rem, 4vw, 28px)',
    color: '#1A3E6F',
    fontWeight: '700'
  },
  toggleButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(0,0,0,0.05)',
    border: 'none',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    fontSize: '1.2rem'
  },
  tabNavigation: {
    display: 'flex',
    background: 'white',
    borderRadius: '12px',
    padding: '5px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    gap: '5px',
    flexWrap: 'wrap'
  },
  tabButton: {
    flex: 1,
    minWidth: '100px',
    padding: '12px 20px',
    border: 'none',
    background: 'transparent',
    color: '#666',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  tabButtonActive: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white'
  },
  searchFilter: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none'
  },
  filterSelect: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    cursor: 'pointer',
    outline: 'none'
  },
  dateRangeFilter: {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  dateRangeHeader: {
    fontSize: 'clamp(0.9rem, 2.2vw, 16px)',
    fontWeight: '600',
    color: '#1A3E6F',
    marginBottom: '12px'
  },
  dateRangeInputs: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'flex-end'
  },
  dateInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateLabel: {
    fontSize: 'clamp(0.8rem, 2vw, 13px)',
    fontWeight: '500',
    color: '#4a5568'
  },
  dateInput: {
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    outline: 'none',
    minWidth: '150px'
  },
  clearButton: {
    padding: '10px 16px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  contentGrid: {
    display: 'grid',
    gap: 'clamp(1rem, 3vw, 20px)',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 400px), 1fr))'
  },
  quickActionsCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    gridColumn: '1 / -1'
  },
  sectionTitle: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600',
    marginBottom: '16px'
  },
  quickActionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px'
  },
  quickActionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.3s'
  },
  quickActionIcon: {
    fontSize: '1.5rem'
  },
  recentActivityCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    gridColumn: '1 / -1'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    gap: '12px'
  },
  viewAllLink: {
    color: '#1e40af',
    textDecoration: 'none',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f7fafc'
  },
  activityLeft: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  activityIcon: {
    fontSize: '1.2rem'
  },
  activityDescription: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    color: '#1e293b',
    fontWeight: '600'
  },
  activityDate: {
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    color: '#718096'
  },
  activityAmount: {
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '700',
    color: '#1A3E6F'
  },
  accountCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  transactionCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'all 0.2s'
  },
  cardCard: {
    background: 'white',
    padding: 'clamp(12px, 3vw, 20px)',
    borderRadius: 'clamp(6px, 1.5vw, 12px)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    margin: '0 0 4px 0',
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#1A3E6F',
    fontWeight: '600'
  },
  cardSubtitle: {
    margin: 0,
    fontSize: 'clamp(0.8rem, 2vw, 14px)',
    color: '#718096'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: 'clamp(0.75rem, 1.8vw, 12px)',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  cardBody: {
    marginBottom: '16px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #f7fafc',
    fontSize: 'clamp(0.85rem, 2vw, 14px)'
  },
  detailLabel: {
    color: '#4a5568',
    fontWeight: '600'
  },
  detailValue: {
    color: '#2d3748',
    textAlign: 'right'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    flex: 1,
    padding: '10px',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(0.85rem, 2vw, 14px)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.3s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    gridColumn: '1 / -1'
  },
  emptyIcon: {
    fontSize: 'clamp(2.5rem, 6vw, 64px)',
    marginBottom: '16px'
  },
  emptyText: {
    fontSize: 'clamp(1rem, 3vw, 18px)',
    color: '#718096',
    fontWeight: '600',
    marginBottom: '20px'
  }
};

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .quickActionButton:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
    }

    .accountCard:hover, .transactionCard:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .refreshButton:hover, .menuButton:hover, .logoutButton:hover, .actionButton:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
  `;
  document.head.appendChild(styleSheet);
}