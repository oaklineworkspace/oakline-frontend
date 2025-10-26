import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function ApproveApplicationsPage() {
  const router = useRouter();
  const { isAdmin, role, loading: authLoading, error: authError, user } = useAdminAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchApplications();
    }
  }, [isAdmin]);

  const fetchApplications = async () => {
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
        throw new Error(result.error || 'Failed to fetch applications');
      }

      const pendingApps = (result.applications || []).filter(
        app => app.application_status === 'pending'
      );
      
      setApplications(pendingApps);
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to load applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    if (!confirm('Are you sure you want to approve this application? This will create the user account and send the welcome email.')) {
      return;
    }

    setActionLoading({ ...actionLoading, [applicationId]: true });
    setError('');
    setSuccessMessage('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please sign in again.');
        return;
      }

      const response = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          application_id: applicationId
        })
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ Application approved! Welcome email sent to ${result.data.email}`);
        await fetchApplications();
      } else {
        setError(`❌ Failed: ${result.error}`);
      }
    } catch (error) {
      setError(`❌ Error: ${error.message}`);
    } finally {
      setActionLoading({ ...actionLoading, [applicationId]: false });
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
          <h1 style={styles.title}>✅ Approve Applications</h1>
          <p style={styles.subtitle}>Review and approve pending applications</p>
          <p style={styles.roleInfo}>Logged in as: {user?.email} ({role})</p>
        </div>
        <div style={styles.headerActions}>
          <Link href="/admin/manage-all-users" style={styles.navButton}>
            👥 Manage Users
          </Link>
          <button onClick={fetchApplications} style={styles.refreshButton}>
            🔄 Refresh
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}
      {successMessage && <div style={styles.successBanner}>{successMessage}</div>}

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>✨ No pending applications at the moment</p>
        </div>
      ) : (
        <div style={styles.applicationsGrid}>
          {applications.map(app => (
            <div key={app.id} style={styles.applicationCard}>
              <div style={styles.applicationHeader}>
                <div>
                  <h3 style={styles.applicantName}>
                    {app.first_name} {app.middle_name ? app.middle_name + ' ' : ''}{app.last_name}
                  </h3>
                  <p style={styles.applicantEmail}>{app.email}</p>
                </div>
                <span style={styles.statusBadge}>
                  {app.application_status}
                </span>
              </div>

              <div style={styles.applicationInfo}>
                <p><strong>Phone:</strong> {app.phone || 'N/A'}</p>
                <p><strong>DOB:</strong> {app.date_of_birth || 'N/A'}</p>
                <p><strong>Country:</strong> {app.country || 'N/A'}</p>
                <p><strong>SSN:</strong> {app.ssn ? '***-**-' + app.ssn.slice(-4) : 'N/A'}</p>
                <p><strong>Applied:</strong> {new Date(app.created_at).toLocaleDateString()}</p>
              </div>

              <div style={styles.applicationActions}>
                <button 
                  onClick={() => handleApprove(app.id)}
                  style={styles.approveButton}
                  disabled={actionLoading[app.id]}
                >
                  {actionLoading[app.id] ? '⏳ Approving...' : '✅ Approve Application'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '2rem'
  },
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  unauthorizedContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  unauthorizedCard: {
    backgroundColor: '#1e293b',
    padding: '3rem',
    borderRadius: '12px',
    maxWidth: '500px',
    textAlign: 'center'
  },
  header: {
    backgroundColor: '#1e293b',
    padding: '2rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    color: '#3b82f6'
  },
  subtitle: {
    color: '#94a3b8',
    marginBottom: '0.5rem'
  },
  roleInfo: {
    color: '#22c55e',
    fontSize: '0.9rem',
    marginTop: '0.5rem'
  },
  headerActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  navButton: {
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    textDecoration: 'none',
    display: 'inline-block'
  },
  refreshButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  homeButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    textDecoration: 'none',
    display: 'inline-block'
  },
  errorBanner: {
    backgroundColor: '#991b1b',
    color: '#fecaca',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  successBanner: {
    backgroundColor: '#065f46',
    color: '#a7f3d0',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  loading: {
    textAlign: 'center',
    padding: '3rem'
  },
  spinner: {
    border: '4px solid #1e293b',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: '1.1rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: '#1e293b',
    borderRadius: '12px'
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: '1.2rem'
  },
  applicationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  applicationCard: {
    backgroundColor: '#1e293b',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  applicationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #334155'
  },
  applicantName: {
    fontSize: '1.2rem',
    color: '#fff',
    marginBottom: '0.25rem'
  },
  applicantEmail: {
    color: '#94a3b8',
    fontSize: '0.9rem'
  },
  statusBadge: {
    backgroundColor: '#f59e0b',
    color: '#000',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  applicationInfo: {
    marginBottom: '1rem',
    color: '#cbd5e0',
    fontSize: '0.95rem',
    lineHeight: '1.8'
  },
  applicationActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.75rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold'
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    justifyContent: 'center'
  },
  errorText: {
    color: '#fca5a5',
    marginTop: '1rem',
    marginBottom: '1rem'
  }
};
