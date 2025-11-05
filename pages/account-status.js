
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function AccountStatus() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      setUser(session.user);

      // Fetch bank details
      const bankResponse = await fetch('/api/bank-details');
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        setBankDetails(bankData.bankDetails);
      }

      // Fetch user accounts
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && accountsData) {
        setAccounts(accountsData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pending_application: {
        label: 'Application Pending',
        color: '#f59e0b',
        bg: '#fef3c7',
        icon: '⏳',
        message: 'Your application is under review by our team.'
      },
      approved: {
        label: 'Approved - Awaiting Funding',
        color: '#3b82f6',
        bg: '#dbeafe',
        icon: '✓',
        message: 'Your application has been approved! Please fund your account to activate it.'
      },
      pending_funding: {
        label: 'Pending Funding',
        color: '#f59e0b',
        bg: '#fef3c7',
        icon: '💰',
        message: 'Minimum deposit required to activate your account.'
      },
      active: {
        label: 'Active',
        color: '#10b981',
        bg: '#d1fae5',
        icon: '✅',
        message: 'Your account is fully active and ready to use!'
      },
      rejected: {
        label: 'Application Rejected',
        color: '#ef4444',
        bg: '#fee2e2',
        icon: '❌',
        message: 'Unfortunately, your application was not approved.'
      }
    };
    return statusMap[status] || statusMap.pending_application;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading account status...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account Status - {bankDetails?.name || 'Oakline Bank'}</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
            <h1 style={styles.headerTitle}>Account Status</h1>
            <div style={{ width: '120px' }}></div>
          </div>
        </header>

        <main style={styles.main}>
          {accounts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📋</div>
              <h2 style={styles.emptyTitle}>No Accounts Found</h2>
              <p style={styles.emptyText}>You haven't applied for any accounts yet.</p>
              <Link href="/apply" style={styles.applyButton}>
                Apply for Account
              </Link>
            </div>
          ) : (
            <div style={styles.accountsList}>
              {accounts.map(account => {
                const statusInfo = getStatusInfo(account.status);
                const minDeposit = parseFloat(account.min_deposit) || 0;
                const balance = parseFloat(account.balance) || 0;
                const remaining = Math.max(0, minDeposit - balance);

                return (
                  <div key={account.id} style={styles.accountCard}>
                    <div style={styles.accountHeader}>
                      <div>
                        <h3 style={styles.accountType}>
                          {account.account_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        <p style={styles.accountNumber}>
                          Account: ****{account.account_number.slice(-4)}
                        </p>
                      </div>
                      <div
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.color
                        }}
                      >
                        <span style={{ marginRight: '6px' }}>{statusInfo.icon}</span>
                        {statusInfo.label}
                      </div>
                    </div>

                    <p style={styles.statusMessage}>{statusInfo.message}</p>

                    {minDeposit > 0 && account.status !== 'active' && (
                      <div style={styles.depositInfo}>
                        <h4 style={styles.depositTitle}>Funding Requirements</h4>
                        <div style={styles.depositDetails}>
                          <div style={styles.depositRow}>
                            <span>Minimum Required:</span>
                            <strong>${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div style={styles.depositRow}>
                            <span>Current Balance:</span>
                            <strong>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          {remaining > 0 && (
                            <div style={{ ...styles.depositRow, ...styles.remainingRow }}>
                              <span>Remaining Needed:</span>
                              <strong>${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                            </div>
                          )}
                        </div>

                        {account.status === 'approved' || account.status === 'pending_funding' ? (
                          <Link
                            href={`/deposit-crypto?account_id=${account.id}&min_deposit=${minDeposit}`}
                            style={styles.depositButton}
                          >
                            💰 Fund Account via Crypto
                          </Link>
                        ) : null}
                      </div>
                    )}

                    {account.status === 'active' && (
                      <div style={styles.activeInfo}>
                        <p style={{ margin: 0, color: '#059669' }}>
                          ✓ Account is fully funded and active
                        </p>
                        <Link href="/dashboard" style={styles.viewButton}>
                          View Dashboard
                        </Link>
                      </div>
                    )}

                    {account.approved_at && (
                      <div style={styles.timestamp}>
                        Approved: {new Date(account.approved_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1.5rem'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    fontSize: '0.9rem'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  accountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  accountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  accountType: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.3rem',
    color: '#1e293b'
  },
  accountNumber: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.9rem'
  },
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
  statusMessage: {
    color: '#475569',
    fontSize: '0.95rem',
    marginBottom: '1.5rem'
  },
  depositInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    padding: '1.5rem',
    marginTop: '1rem'
  },
  depositTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#1e293b'
  },
  depositDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.95rem',
    color: '#475569'
  },
  remainingRow: {
    color: '#dc2626',
    fontSize: '1rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid #e2e8f0'
  },
  depositButton: {
    display: 'inline-block',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    marginTop: '1rem',
    textAlign: 'center'
  },
  activeInfo: {
    backgroundColor: '#d1fae5',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  viewButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '600'
  },
  timestamp: {
    marginTop: '1rem',
    fontSize: '0.85rem',
    color: '#94a3b8'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    margin: '0 0 0.5rem 0',
    color: '#1e293b'
  },
  emptyText: {
    color: '#64748b',
    marginBottom: '2rem'
  },
  applyButton: {
    display: 'inline-block',
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
