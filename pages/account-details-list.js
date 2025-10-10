import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function AccountDetailsListContent() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from('applications')
        .select('*')
        .eq('email', user.email)
        .single();

      setUserProfile(profile);

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setAccounts(accountsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
      month: 'long',
      day: 'numeric'
    });
  };

  const getAccountIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'checking': return '🏦';
      case 'savings': return '💰';
      case 'business': return '💼';
      case 'investment': return '📈';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading accounts...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .account-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />
      
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/dashboard" style={styles.backLink}>← Dashboard</Link>
          <h1 style={styles.headerTitle}>Account Details</h1>
          <div style={styles.routingInfo}>Routing: 075915826</div>
        </div>
      </header>

      <main style={styles.main}>
        {userProfile && (
          <section style={styles.profileSection}>
            <div style={styles.profileCard}>
              <div style={styles.profileIcon}>👤</div>
              <div style={styles.profileInfo}>
                <h2 style={styles.profileName}>
                  {userProfile.first_name} {userProfile.last_name}
                </h2>
                <p style={styles.profileEmail}>{user.email}</p>
                <p style={styles.profileDetail}>Member since: {formatDate(userProfile.created_at)}</p>
              </div>
            </div>
          </section>
        )}

        <section style={styles.accountsSection}>
          <h2 style={styles.sectionTitle}>Your Accounts</h2>
          <div style={styles.accountsGrid} className="account-grid">
            {accounts.map((account) => (
              <div key={account.id} style={styles.accountCard}>
                <div style={styles.accountHeader}>
                  <div style={styles.accountIconLarge}>
                    {getAccountIcon(account.account_type)}
                  </div>
                  <div style={styles.accountHeaderInfo}>
                    <h3 style={styles.accountName}>
                      {(account.account_type || 'Account').replace('_', ' ').toUpperCase()}
                    </h3>
                    <p style={styles.accountNumber}>••••••{account.account_number?.slice(-4)}</p>
                  </div>
                </div>

                <div style={styles.accountBalance}>
                  <div style={styles.balanceLabel}>Available Balance</div>
                  <div style={styles.balanceValue}>{formatCurrency(account.balance)}</div>
                </div>

                <div style={styles.accountDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Account Number:</span>
                    <span style={styles.detailValue}>{account.account_number}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Routing Number:</span>
                    <span style={styles.detailValue}>075915826</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Account Type:</span>
                    <span style={styles.detailValue}>
                      {(account.account_type || '').replace('_', ' ')}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={{...styles.detailValue, color: '#059669', fontWeight: 'bold'}}>
                      Active
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Opened:</span>
                    <span style={styles.detailValue}>{formatDate(account.created_at)}</span>
                  </div>
                </div>

                <div style={styles.accountActions}>
                  <Link 
                    href={`/account-transactions?id=${account.id}`}
                    style={styles.actionButton}
                  >
                    View Transactions
                  </Link>
                  <Link 
                    href={`/transfer?from=${account.id}`}
                    style={styles.actionButtonSecondary}
                  >
                    Transfer
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {accounts.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🏦</div>
              <h3>No accounts found</h3>
              <p>Open an account to get started with Oakline Bank</p>
              <Link href="/apply" style={styles.applyButton}>
                Open an Account
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AccountDetailsList() {
  return (
    <ProtectedRoute>
      <AccountDetailsListContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1a365d',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  header: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '1.5rem 1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  backLink: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.9rem',
    display: 'inline-flex',
    alignItems: 'center'
  },
  headerTitle: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  routingInfo: {
    fontSize: '0.9rem',
    opacity: 0.9
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  profileSection: {
    marginBottom: '2rem'
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  profileIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    flexShrink: 0
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  profileEmail: {
    margin: '0 0 0.25rem 0',
    color: '#64748b',
    fontSize: '0.95rem'
  },
  profileDetail: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '0.85rem'
  },
  accountsSection: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1.5rem'
  },
  accountsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  accountHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  accountIconLarge: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    flexShrink: 0
  },
  accountHeaderInfo: {
    flex: 1
  },
  accountName: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  accountNumber: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#64748b',
    fontFamily: 'Courier, monospace'
  },
  accountBalance: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '1.5rem'
  },
  balanceLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  balanceValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  accountDetails: {
    marginBottom: '1.5rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  detailLabel: {
    fontSize: '0.85rem',
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '0.85rem',
    color: '#1a365d',
    fontWeight: '600',
    textAlign: 'right'
  },
  accountActions: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem'
  },
  actionButton: {
    padding: '0.75rem',
    backgroundColor: '#1a365d',
    color: 'white',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  actionButtonSecondary: {
    padding: '0.75rem',
    backgroundColor: '#f8fafc',
    color: '#1a365d',
    textDecoration: 'none',
    textAlign: 'center',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    border: '2px solid #e2e8f0'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  applyButton: {
    display: 'inline-block',
    marginTop: '1.5rem',
    padding: '0.75rem 2rem',
    backgroundColor: '#1a365d',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
