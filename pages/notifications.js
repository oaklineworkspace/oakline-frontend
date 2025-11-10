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
  const [bankDetails, setBankDetails] = useState(null);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    checkUserAndFetchData();
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        return;
      }

      const response = await fetch('/api/bank-details', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.bankDetails) {
          setBankDetails(data.bankDetails);
        }
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    }
  };

  const checkUserAndFetchData = async () => {
    try {
      setLoading(true);

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
      console.log('Fetching notifications for user:', user.id);

      const { data: dbNotifications, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notifError) {
        console.error('Error fetching notifications:', notifError);
      }

      let realNotifications = [];

      if (dbNotifications && dbNotifications.length > 0) {
        console.log('Found database notifications:', dbNotifications.length);
        realNotifications = dbNotifications.map(notif => ({
          id: notif.id,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          timestamp: notif.created_at,
          read: notif.read,
          icon: notif.icon || getIconForType(notif.type),
          priority: notif.priority || 'normal'
        }));
      } else {
        console.log('No database notifications found, creating welcome notification');
        const userName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Valued Customer';

        const { data: welcomeNotif, error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: 'Welcome to Oakline Bank',
            message: `Hello ${userName}! Welcome to your secure banking dashboard. All your notifications will appear here.`,
            type: 'system',
            icon: '🎉',
            priority: 'high',
            read: false
          })
          .select()
          .single();

        if (!insertError && welcomeNotif) {
          realNotifications.push({
            id: welcomeNotif.id,
            title: welcomeNotif.title,
            message: welcomeNotif.message,
            type: welcomeNotif.type,
            timestamp: welcomeNotif.created_at,
            read: welcomeNotif.read,
            icon: welcomeNotif.icon,
            priority: welcomeNotif.priority
          });
        }
      }

      setNotifications(realNotifications);

    } catch (error) {
      console.error('Error in fetchNotifications:', error);

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

  const getIconForType = (type) => {
    const icons = {
      transaction: '💳',
      security: '🔐',
      system: '📱',
      account: '🏦',
      alert: '⚠️'
    };
    return icons[type] || '📌';
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (error) {
      console.error('Error in handleMarkAsRead:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Error in handleMarkAllAsRead:', error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return;
      }

      setNotifications(notifications.filter(notif => notif.id !== notificationId));
    } catch (error) {
      console.error('Error in handleDeleteNotification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    await handleMarkAsRead(notification.id);
    
    // Check if it's a crypto deposit notification
    if (notification.title?.includes('Crypto') || notification.title?.includes('Deposit')) {
      try {
        // Try to fetch from account_opening_crypto_deposits
        const { data: openingDeposit } = await supabase
          .from('account_opening_crypto_deposits')
          .select(`
            *,
            accounts:account_id (
              account_number,
              account_type
            ),
            crypto_assets:crypto_asset_id (
              crypto_type,
              symbol,
              network_type
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (openingDeposit) {
          setSelectedDeposit(openingDeposit);
          setShowReceiptModal(true);
          return;
        }

        // Try to fetch from crypto_deposits
        const { data: cryptoDeposit } = await supabase
          .from('crypto_deposits')
          .select(`
            *,
            accounts:account_id (
              account_number,
              account_type
            ),
            crypto_assets:crypto_asset_id (
              crypto_type,
              symbol,
              network_type
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (cryptoDeposit) {
          setSelectedDeposit(cryptoDeposit);
          setShowReceiptModal(true);
        }
      } catch (error) {
        console.error('Error fetching deposit details:', error);
      }
    }
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedDeposit(null);
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
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} – ${timeStr}`;
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

  const userName = userProfile 
    ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email?.split('@')[0] || 'Valued Customer'
    : user.email?.split('@')[0] || 'Valued Customer';

  return (
    <>
      <Head>
        <title>Notifications - {bankDetails?.name || 'Oakline Bank'}</title>
        <meta name="description" content="View and manage your banking notifications" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <Header />

        <main style={styles.main}>
          {/* Professional Header Section */}
          <div style={styles.pageHeader}>
            <div style={styles.headerContent}>
              <div style={styles.headerLeft}>
                <div style={styles.iconWrapper}>
                  <span style={styles.headerIcon}>🔔</span>
                  {unreadCount > 0 && (
                    <span style={styles.headerBadge}>{unreadCount}</span>
                  )}
                </div>
                <div style={styles.headerText}>
                  <h1 style={styles.pageTitle}>Notifications Center</h1>
                  <p style={styles.pageSubtitle}>
                    Welcome back, {userName} • {bankDetails?.name || 'Oakline Bank'}
                  </p>
                </div>
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead} style={styles.markAllButton}>
                  <span style={styles.buttonIcon}>✓</span>
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Bank Info Banner */}
          {bankDetails && (
            <div style={styles.bankInfoBanner}>
              <div style={styles.bankInfoItem}>
                <span style={styles.bankInfoIcon}>📞</span>
                <span style={styles.bankInfoText}>Support: {bankDetails.phone}</span>
              </div>
              <div style={styles.bankInfoItem}>
                <span style={styles.bankInfoIcon}>✉️</span>
                <span style={styles.bankInfoText}>{bankDetails.email_contact}</span>
              </div>
              <div style={styles.bankInfoItem}>
                <span style={styles.bankInfoIcon}>🕒</span>
                <span style={styles.bankInfoText}>Mon-Fri 9AM-5PM, Sat 9AM-1PM</span>
          </div>
            </div>
          )}

          {/* Filter Section */}
          <div style={styles.filterSection}>
            <div style={styles.filterScroll}>
              {[
                { key: 'all', label: 'All', count: notifications.length, icon: '📋' },
                { key: 'unread', label: 'Unread', count: unreadCount, icon: '🔴' },
                { key: 'transaction', label: 'Transactions', count: notifications.filter(n => n.type === 'transaction').length, icon: '💳' },
                { key: 'security', label: 'Security', count: notifications.filter(n => n.type === 'security').length, icon: '🔐' },
                { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length, icon: '📱' }
              ].map(option => (
                <button
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  style={{
                    ...styles.filterButton,
                    ...(filter === option.key ? styles.activeFilter : {})
                  }}
                >
                  <span style={styles.filterIcon}>{option.icon}</span>
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div style={styles.notificationsList}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  style={{
                    ...styles.notificationItem,
                    ...(notification.read ? {} : styles.unreadNotification)
                  }}
                  onClick={() => handleNotificationClick(notification)}
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
                            title="Mark as read"
                          >
                            ✓
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteNotification(notification.id)}
                          style={styles.deleteButton}
                          title="Delete notification"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <p style={styles.notificationMessage}>{notification.message}</p>
                    <div style={styles.notificationMeta}>
                      <span style={styles.timestamp}>
                        {new Date(notification.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                <div style={styles.emptyIcon}>📭</div>
                <h3 style={styles.emptyTitle}>All Caught Up!</h3>
                <p style={styles.emptyMessage}>
                  You have no {filter === 'all' ? '' : filter} notifications.
                </p>
                <p style={styles.emptyHint}>
                  We'll notify you when there's important account activity.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Crypto Deposit Receipt Modal */}
        {showReceiptModal && selectedDeposit && (
          <div 
            style={{
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
              padding: '2rem'
            }} 
            onClick={closeReceiptModal}
          >
            <div 
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '2rem',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative'
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0.25rem 0.5rem'
                }} 
                onClick={closeReceiptModal}
              >
                ×
              </button>
              
              <div style={{
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '0.5rem'
                }}>
                  Transaction Receipt
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {selectedDeposit.accounts?.account_type?.replace(/_/g, ' ').toUpperCase() || 'Account'}
                </p>
              </div>

              <div style={{
                backgroundColor: '#f0f9ff',
                padding: '1.5rem',
                borderRadius: '12px',
                margin: '1.5rem 0',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  Amount
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#059669'
                }}>
                  +{formatCurrency(parseFloat(selectedDeposit.net_amount || selectedDeposit.amount) || 0)}
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Transaction Type
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                  CRYPTOCURRENCY DEPOSIT
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Status
                </span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  textAlign: 'right',
                  color: selectedDeposit.status === 'completed' || selectedDeposit.status === 'approved' ? '#065f46' : '#92400e',
                  backgroundColor: selectedDeposit.status === 'completed' || selectedDeposit.status === 'approved' ? '#d1fae5' : '#fef3c7',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px'
                }}>
                  {(selectedDeposit.status || 'Pending').replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Date & Time
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                  {formatDate(selectedDeposit.created_at)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Reference Number
                </span>
                <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right' }}>
                  {selectedDeposit.id?.slice(0, 8).toUpperCase() || 'N/A'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Account Number
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right' }}>
                  {selectedDeposit.accounts?.account_number || 'N/A'}
                </span>
              </div>

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

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Cryptocurrency
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                  {selectedDeposit.crypto_assets?.symbol || 'BTC'} - {selectedDeposit.crypto_assets?.crypto_type || 'Bitcoin'}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Network
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                  {selectedDeposit.crypto_assets?.network_type || 'N/A'}
                </span>
              </div>

              {selectedDeposit.tx_hash && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                    Transaction Hash
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    color: '#1e293b', 
                    fontWeight: '600', 
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    textAlign: 'right',
                    maxWidth: '60%'
                  }}>
                    {selectedDeposit.tx_hash}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Confirmations
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                  {selectedDeposit.confirmations || 0} / {selectedDeposit.required_confirmations || 3}
                </span>
              </div>

              {selectedDeposit.fee && parseFloat(selectedDeposit.fee) > 0 && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Network Fee
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: '600', textAlign: 'right' }}>
                      -{formatCurrency(parseFloat(selectedDeposit.fee))}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Gross Amount
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                      {formatCurrency(parseFloat(selectedDeposit.amount) || 0)}
                    </span>
                  </div>
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
    padding: '0',
    maxWidth: '100%',
    margin: '0 auto'
  },
  pageHeader: {
    background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
    padding: '2rem 1.5rem',
    borderBottom: '4px solid #1e3a8a',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1
  },
  iconWrapper: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '1rem',
    backdropFilter: 'blur(10px)'
  },
  headerIcon: {
    fontSize: '2.5rem',
    display: 'block'
  },
  headerBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#dc2626',
    color: 'white',
    borderRadius: '12px',
    padding: '0.25rem 0.5rem',
    fontSize: '0.7rem',
    fontWeight: '700',
    minWidth: '20px',
    textAlign: 'center',
    border: '2px solid white'
  },
  headerText: {
    color: 'white'
  },
  pageTitle: {
    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
    fontWeight: '700',
    margin: '0 0 0.25rem 0',
    color: 'white'
  },
  pageSubtitle: {
    fontSize: 'clamp(0.85rem, 3vw, 1rem)',
    margin: 0,
    opacity: 0.95,
    fontWeight: '400'
  },
  markAllButton: {
    background: 'white',
    color: '#1e40af',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  buttonIcon: {
    fontSize: '1.1rem'
  },
  bankInfoBanner: {
    backgroundColor: '#f1f5f9',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: '2rem'
  },
  bankInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#475569'
  },
  bankInfoIcon: {
    fontSize: '1.2rem'
  },
  bankInfoText: {
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  filterSection: {
    padding: '1.5rem 1.5rem 0.5rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  filterScroll: {
    display: 'flex',
    gap: '0.75rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem'
  },
  filterButton: {
    padding: '0.75rem 1.25rem',
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    transition: 'all 0.2s',
    color: '#475569'
  },
  filterIcon: {
    fontSize: '1.1rem'
  },
  activeFilter: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)'
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  notificationItem: {
    backgroundColor: 'white',
    padding: '1.25rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    gap: '1rem',
    transition: 'all 0.2s'
  },
  unreadNotification: {
    borderLeft: '4px solid #dc2626',
    backgroundColor: '#fffbeb',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)'
  },
  notificationIcon: {
    fontSize: '1.75rem',
    flexShrink: 0,
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px'
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
    gap: '0.75rem'
  },
  notificationTitle: {
    margin: 0,
    color: '#1e293b',
    fontSize: '1.05rem',
    fontWeight: '600',
    lineHeight: '1.4',
    flex: 1
  },
  notificationActions: {
    display: 'flex',
    gap: '0.5rem',
    flexShrink: 0
  },
  markReadButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '0.4rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  deleteButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.4rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    lineHeight: 1,
    transition: 'all 0.2s'
  },
  notificationMessage: {
    margin: '0 0 0.75rem 0',
    color: '#374151',
    lineHeight: '1.5',
    fontSize: '0.95rem'
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
    fontSize: '0.85rem',
    fontWeight: '500'
  },
  notificationType: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '0.3rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 1.5rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    opacity: 0.6
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyMessage: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.05rem'
  },
  emptyHint: {
    margin: 0,
    fontSize: '0.9rem',
    fontStyle: 'italic',
    opacity: 0.8
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
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1.5rem',
    color: '#64748b',
    fontSize: '1.05rem',
    fontWeight: '500'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    margin: '3rem auto',
    maxWidth: '500px'
  },
  loginTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 2rem 0',
    fontSize: '1.1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '1rem 2rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '1.05rem',
    transition: 'all 0.2s'
  }
};