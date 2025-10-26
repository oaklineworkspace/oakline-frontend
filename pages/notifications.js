
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Head from 'next/head';

export default function Notifications() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    transactionAlerts: true,
    securityAlerts: true,
    promotionalOffers: false
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        console.log('No active session found');
        setLoading(false);
        return;
      }

      console.log('User session found:', session.user.email);
      setUser(session.user);

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      } else if (profile) {
        console.log('Profile found:', profile.email);
        setUserProfile(profile);
        await fetchNotifications(session.user, profile);
      } else {
        console.log('No profile found, creating basic notifications');
        await fetchNotifications(session.user, null);
      }

    } catch (error) {
      console.error('Error in checkUserAndFetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (user, profile) => {
    try {
      let realNotifications = [];
      const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Valued Customer';

      // Always create welcome notification
      realNotifications.push({
        id: 'welcome',
        title: 'Welcome to Oakline Bank',
        message: `Hello ${userName}! Welcome to your secure banking dashboard. All your notifications will appear here.`,
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false,
        icon: '🎉',
        priority: 'high'
      });

      if (profile?.application_id) {
        // Get user accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('accounts')
          .select('*')
          .eq('application_id', profile.application_id)
          .eq('status', 'active');

        if (!accountsError && accounts && accounts.length > 0) {
          console.log('Found accounts:', accounts.length);

          // Add account notifications
          accounts.forEach((account) => {
            realNotifications.push({
              id: `account_${account.id}`,
              title: 'Account Active',
              message: `Your ${account.account_type.replace('_', ' ').toUpperCase()} account (****${account.account_number.slice(-4)}) is active with a balance of $${parseFloat(account.balance || 0).toFixed(2)}.`,
              type: 'account',
              timestamp: account.created_at,
              read: true,
              icon: '🏦',
              priority: 'normal'
            });
          });

          // Get recent transactions
          const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!transError && transactions && transactions.length > 0) {
            transactions.forEach((transaction, index) => {
              realNotifications.push({
                id: `trans_${transaction.id}`,
                title: `${transaction.type === 'credit' ? 'Deposit' : 'Transaction'} Alert`,
                message: `${transaction.type === 'credit' ? 'A deposit of' : 'A transaction of'} $${Math.abs(parseFloat(transaction.amount)).toFixed(2)} was processed on your account.`,
                type: 'transaction',
                timestamp: transaction.created_at,
                read: index > 2,
                icon: transaction.type === 'credit' ? '💰' : '💳',
                priority: 'normal'
              });
            });
          }
        }
      }

      // Security notification
      realNotifications.push({
        id: 'security',
        title: 'Security Reminder',
        message: 'Keep your account secure. Never share your login credentials and always log out from public computers.',
        type: 'security',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
        icon: '🔐',
        priority: 'high'
      });

      // Sort notifications by timestamp
      realNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotifications(realNotifications);

    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Fallback notification
      setNotifications([{
        id: 'fallback',
        title: 'Welcome to Oakline Bank',
        message: 'Your notifications will appear here. Thank you for banking with us!',
        type: 'system',
        timestamp: new Date().toISOString(),
        read: false,
        icon: '📱',
        priority: 'normal'
      }]);
    }
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
  };

  const handleDeleteNotification = (notificationId) => {
    setNotifications(notifications.filter(notif => notif.id !== notificationId));
  };

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.read;
    if (filter === 'all') return true;
    return notif.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading notifications...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.content}>
          <div style={styles.loginPrompt}>
            <h1 style={styles.loginTitle}>Please Log In</h1>
            <p style={styles.loginMessage}>You need to be logged in to view notifications</p>
            <a href="/login" style={styles.loginButton}>Go to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Notifications - Oakline Bank</title>
        <meta name="description" content="View and manage your banking notifications" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <Header />
        
        <main style={styles.main}>
          <div style={styles.header}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>Notifications</h1>
              {unreadCount > 0 && (
                <span style={styles.unreadBadge}>{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} style={styles.markAllButton}>
                Mark All Read
              </button>
            )}
          </div>

          <div style={styles.filterSection}>
            <div style={styles.filterScroll}>
              {[
                { key: 'all', label: 'All', count: notifications.length },
                { key: 'unread', label: 'Unread', count: unreadCount },
                { key: 'transaction', label: 'Transactions', count: notifications.filter(n => n.type === 'transaction').length },
                { key: 'security', label: 'Security', count: notifications.filter(n => n.type === 'security').length },
                { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  style={{
                    ...styles.filterButton,
                    ...(filter === option.key ? styles.activeFilter : {})
                  }}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          </div>

          <div style={styles.notificationsList}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  style={{
                    ...styles.notificationItem,
                    ...(notification.read ? {} : styles.unreadNotification)
                  }}
                >
                  <div style={styles.notificationIcon}>
                    {notification.icon}
                  </div>
                  <div style={styles.notificationContent}>
                    <div style={styles.notificationHeader}>
                      <h4 style={styles.notificationTitle}>{notification.title}</h4>
                      <div style={styles.notificationActions}>
                        {!notification.read && (
                          <button 
                            onClick={() => handleMarkAsRead(notification.id)}
                            style={styles.markReadButton}
                          >
                            ✓
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteNotification(notification.id)}
                          style={styles.deleteButton}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <div style={styles.notificationMeta}>
                      <span style={styles.timestamp}>
                        {new Date(notification.timestamp).toLocaleDateString()}
                      </span>
                      <span style={styles.notificationType}>
                        {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📱</div>
                <h3 style={styles.emptyTitle}>All Caught Up!</h3>
                <p style={styles.emptyMessage}>You have no {filter === 'all' ? '' : filter} notifications.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  main: {
    padding: '1rem',
    maxWidth: '100%',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 6vw, 2rem)',
    color: '#1e293b',
    margin: 0,
    fontWeight: '700'
  },
  unreadBadge: {
    backgroundColor: '#dc2626',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    minWidth: '20px',
    textAlign: 'center'
  },
  markAllButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500'
  },
  filterSection: {
    marginBottom: '1rem'
  },
  filterScroll: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem'
  },
  filterButton: {
    padding: '0.5rem 0.75rem',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  activeFilter: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  notificationItem: {
    backgroundColor: 'white',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    gap: '0.75rem'
  },
  unreadNotification: {
    borderLeft: '4px solid #dc2626',
    backgroundColor: '#fffbeb'
  },
  notificationIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '50%'
  },
  notificationContent: {
    flex: 1,
    minWidth: 0
  },
  notificationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
    gap: '0.5rem'
  },
  notificationTitle: {
    margin: 0,
    color: '#1e293b',
    fontSize: '1rem',
    fontWeight: '600',
    lineHeight: '1.3',
    flex: 1
  },
  notificationActions: {
    display: 'flex',
    gap: '0.25rem',
    flexShrink: 0
  },
  markReadButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.7rem'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '1.2rem',
    padding: '0.25rem',
    borderRadius: '4px'
  },
  notificationMessage: {
    margin: '0 0 0.75rem 0',
    color: '#374151',
    lineHeight: '1.4',
    fontSize: '0.9rem'
  },
  notificationMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  timestamp: {
    color: '#64748b',
    fontSize: '0.8rem'
  },
  notificationType: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: '500'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyMessage: {
    margin: 0,
    fontSize: '1rem'
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
    borderTop: '3px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
