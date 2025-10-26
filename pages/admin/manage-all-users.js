import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function ManageAllUsersPage() {
  const router = useRouter();
  const { isAdmin, role, loading: authLoading, error: authError, user } = useAdminAuth();
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsersData();
    }
  }, [isAdmin]);

  const fetchAllUsersData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }

      const response = await fetch('/api/applications', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setUsersData(result.applications || []);
    } catch (error) {
      console.error('Error fetching users data:', error);
      setError('Failed to load users data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async (userData) => {
    setActionLoading({ ...actionLoading, [`resend_${userData.id}`]: true });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please sign in again.');
        return;
      }

      const response = await fetch('/api/resend-enrollment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          applicationId: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          middleName: userData.middle_name,
          lastName: userData.last_name,
          country: userData.country
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Enrollment link sent to ${userData.email}`);
        await fetchAllUsersData();
      } else {
        alert(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [`resend_${userData.id}`]: false });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  if (authLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Verifying admin access...</p>
      </div>
    );
  }

  if (authError || !isAdmin) {
    return (
      <div style={styles.unauthorizedContainer}>
        <div style={styles.unauthorizedCard}>
          <h1 style={styles.title}>🚫 Access Denied</h1>
          <p style={styles.subtitle}>You do not have permission to access this page.</p>
          <p style={styles.errorText}>{authError || 'Admin privileges required'}</p>
          <div style={styles.actionButtons}>
            <Link href="/" style={styles.homeButton}>
              🏠 Go Home
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👥 Manage All Users</h1>
          <p style={styles.subtitle}>Complete user management with accounts, cards, and actions</p>
          <p style={styles.roleInfo}>Logged in as: {user?.email} ({role})</p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/admin/approve-applications" style={styles.navButton}>
            ✅ Approve Applications
          </Link>
          <button onClick={fetchAllUsersData} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading all users data...</p>
        </div>
      ) : usersData.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No users found</p>
        </div>
      ) : (
        <div style={styles.usersGrid}>
          {usersData.map(userData => (
            <div key={userData.id} style={styles.userCard}>
              <div style={styles.userHeader}>
                <div>
                  <h3 style={styles.userName}>
                    {userData.first_name} {userData.middle_name ? userData.middle_name + ' ' : ''}{userData.last_name}
                  </h3>
                  <p style={styles.userEmail}>{userData.email}</p>
                </div>
                <div style={styles.badges}>
                  {userData.enrollment_completed ? (
                    <span style={styles.badgeSuccess}>✓ Enrolled</span>
                  ) : (
                    <span style={styles.badgePending}>⏳ Pending</span>
                  )}
                  {userData.password_set && <span style={styles.badgeInfo}>🔑 Password Set</span>}
                </div>
              </div>

              <div style={styles.userInfo}>
                <p><strong>Phone:</strong> {userData.phone || 'N/A'}</p>
                <p><strong>DOB:</strong> {userData.date_of_birth || 'N/A'}</p>
                <p><strong>Country:</strong> {userData.country || 'N/A'}</p>
                <p><strong>Application Status:</strong> {userData.application_status}</p>
              </div>

              {userData.accounts && userData.accounts.length > 0 ? (
                <div style={styles.accountsSection}>
                  <h4 style={styles.sectionTitle}>💳 Accounts ({userData.accounts.length})</h4>
                  {userData.accounts.map(account => (
                    <div key={account.id} style={styles.accountCard}>
                      <div style={styles.accountHeader}>
                        <span style={styles.accountType}>
                          {account.account_type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: account.status === 'active' ? '#10b981' : '#6b7280'
                        }}>
                          {account.status}
                        </span>
                      </div>
                      <p style={styles.accountNumber}>Account: {account.account_number}</p>
                      <p style={styles.balance}>Balance: ${parseFloat(account.balance || 0).toFixed(2)}</p>

                      {account.cards && account.cards.length > 0 && (
                        <div style={styles.cardsSection}>
                          <h5 style={styles.cardsTitle}>🏦 Cards ({account.cards.length})</h5>
                          {account.cards.map(card => (
                            <div key={card.id} style={styles.cardInfo}>
                              <div style={styles.cardHeader}>
                                <span style={styles.cardType}>{card.card_type?.toUpperCase()}</span>
                                <span style={{
                                  ...styles.statusBadge,
                                  backgroundColor: card.status === 'active' ? '#10b981' : card.status === 'blocked' ? '#ef4444' : '#6b7280'
                                }}>
                                  {card.status}
                                </span>
                              </div>
                              <p style={styles.cardDetail}>**** **** **** {card.card_number?.slice(-4)}</p>
                              <p style={styles.cardDetail}>Expires: {card.expiry_date}</p>
                              {card.is_locked && <span style={styles.badgeWarning}>🔒 Locked</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={styles.noAccounts}>No accounts found</p>
              )}

              <div style={styles.userActions}>
                {!userData.enrollment_completed && (
                  <button 
                    onClick={() => handleResendEnrollment(userData)}
                    style={styles.actionButton}
                    disabled={actionLoading[`resend_${userData.id}`]}
                  >
                    {actionLoading[`resend_${userData.id}`] ? '⏳ Sending...' : '📧 Resend Enrollment'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '2rem' },
  loadingContainer: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  unauthorizedContainer: { minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  unauthorizedCard: { backgroundColor: '#1e293b', padding: '3rem', borderRadius: '12px', maxWidth: '500px', textAlign: 'center' },
  header: { backgroundColor: '#1e293b', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
  title: { fontSize: '2rem', marginBottom: '0.5rem', color: '#3b82f6' },
  subtitle: { color: '#94a3b8', marginBottom: '0.5rem' },
  roleInfo: { color: '#22c55e', fontSize: '0.9rem', marginTop: '0.5rem' },
  headerActions: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  navButton: { backgroundColor: '#6366f1', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem', textDecoration: 'none', display: 'inline-block' },
  refreshButton: { backgroundColor: '#10b981', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem' },
  logoutButton: { backgroundColor: '#ef4444', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '1rem' },
  homeButton: { backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' },
  errorMessage: { backgroundColor: '#991b1b', color: '#fecaca', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' },
  errorText: { color: '#fca5a5', marginTop: '1rem', marginBottom: '1rem' },
  loading: { textAlign: 'center', padding: '3rem' },
  spinner: { border: '4px solid #1e293b', borderTop: '4px solid #3b82f6', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' },
  loadingText: { color: '#94a3b8', fontSize: '1.1rem' },
  emptyState: { textAlign: 'center', padding: '3rem', backgroundColor: '#1e293b', borderRadius: '12px' },
  emptyText: { color: '#94a3b8', fontSize: '1.2rem' },
  usersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' },
  userCard: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '12px', border: '1px solid #334155' },
  userHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #334155' },
  userName: { fontSize: '1.2rem', color: '#fff', marginBottom: '0.25rem' },
  userEmail: { color: '#94a3b8', fontSize: '0.9rem' },
  badges: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  badgeSuccess: { backgroundColor: '#10b981', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  badgePending: { backgroundColor: '#f59e0b', color: '#000', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  badgeInfo: { backgroundColor: '#3b82f6', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' },
  badgeWarning: { backgroundColor: '#ef4444', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '0.5rem' },
  userInfo: { marginBottom: '1rem', color: '#cbd5e0', fontSize: '0.95rem', lineHeight: '1.8' },
  accountsSection: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155' },
  sectionTitle: { fontSize: '1rem', color: '#60a5fa', marginBottom: '0.75rem' },
  accountCard: { backgroundColor: '#0f172a', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', border: '1px solid #1e293b' },
  accountHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  accountType: { color: '#a5b4fc', fontSize: '0.9rem', fontWeight: 'bold' },
  statusBadge: { padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', color: '#fff', fontWeight: 'bold' },
  accountNumber: { color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' },
  balance: { color: '#22c55e', fontSize: '1.1rem', fontWeight: 'bold' },
  cardsSection: { marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' },
  cardsTitle: { fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' },
  cardInfo: { backgroundColor: '#1e293b', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' },
  cardType: { color: '#fbbf24', fontSize: '0.8rem', fontWeight: 'bold' },
  cardDetail: { color: '#cbd5e0', fontSize: '0.8rem', margin: '0.1rem 0' },
  noAccounts: { color: '#6b7280', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem', textAlign: 'center' },
  userActions: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  actionButton: { flex: 1, minWidth: '150px', backgroundColor: '#3b82f6', color: 'white', padding: '0.75rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
  actionButtons: { display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }
};
