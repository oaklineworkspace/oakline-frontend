
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ApplyCard() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bankDetails, setBankDetails] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      await fetchUserAccounts(session.user);
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchUserAccounts = async (user) => {
    try {
      // Try multiple approaches to find user accounts
      let accountsData = [];
      
      // Method 1: Direct user_id match
      const { data: directAccounts, error: directError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (directAccounts && directAccounts.length > 0) {
        accountsData = directAccounts;
      } else {
        // Method 2: Through profile/application
        const { data: profile } = await supabase
          .from('profiles')
          .select('application_id')
          .eq('id', user.id)
          .single();

        if (profile?.application_id) {
          const { data: applicationAccounts } = await supabase
            .from('accounts')
            .select('*')
            .eq('application_id', profile.application_id)
            .eq('status', 'active')
            .order('created_at', { ascending: true });

          if (applicationAccounts) {
            accountsData = applicationAccounts;
          }
        }
      }

      setAccounts(accountsData || []);
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError('Please select an account');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/apply-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          accountId: selectedAccount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push('/cards');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Error submitting application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading accounts...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 Apply for {bankDetails?.name || 'Oakline Bank'} Debit Card</h1>
        <button 
          onClick={() => router.push('/cards')}
          style={styles.backButton}
        >
          ← Back to Cards
        </button>
      </div>

      <div style={styles.formContainer}>
        <div style={styles.formCard}>
          <div style={styles.cardHeader}>
            <h2>Debit Card Application</h2>
            <p style={styles.subtitle}>
              Apply for a debit card linked to one of your active accounts
            </p>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          {accounts.length === 0 ? (
            <div style={styles.noAccounts}>
              <h3>No Active Accounts Found</h3>
              <p>You need an active account to apply for a debit card.</p>
              <button 
                onClick={() => router.push('/dashboard')}
                style={styles.primaryButton}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Select Account for Card</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Choose an account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_type.replace(/_/g, ' ').toUpperCase()} - 
                      ****{account.account_number.slice(-4)} - 
                      Balance: ${parseFloat(account.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAccount && (
                <div style={styles.selectedAccountInfo}>
                  <h4>Selected Account Details:</h4>
                  {(() => {
                    const account = accounts.find(acc => acc.id === selectedAccount);
                    return account ? (
                      <div style={styles.accountDetails}>
                        <div style={styles.detailRow}>
                          <span>Account Type:</span>
                          <span>{account.account_type.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Account Number:</span>
                          <span>****{account.account_number.slice(-4)}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Current Balance:</span>
                          <span>${parseFloat(account.balance).toFixed(2)}</span>
                        </div>
                        <div style={styles.detailRow}>
                          <span>Routing Number:</span>
                          <span>{account.routing_number}</span>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div style={styles.cardFeatures}>
                <h4>Your {bankDetails?.name || 'Oakline Bank'} Debit Card Will Include:</h4>
                <ul style={styles.featuresList}>
                  <li>🛡️ Secure chip technology</li>
                  <li>💰 Daily spending limit: $2,000</li>
                  <li>📅 Monthly spending limit: $10,000</li>
                  <li>🔒 Instant lock/unlock via app</li>
                  <li>📱 Real-time transaction notifications</li>
                  <li>🌍 Worldwide acceptance</li>
                  <li>💳 EMV chip and PIN protection</li>
                </ul>
              </div>

              <div style={styles.terms}>
                <p style={styles.termsText}>
                  By submitting this application, you agree to our debit card terms and conditions. 
                  Your card will be linked to the selected account and transactions will be deducted 
                  from the account balance.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedAccount}
                style={{
                  ...styles.submitButton,
                  opacity: (submitting || !selectedAccount) ? 0.6 : 1,
                  cursor: (submitting || !selectedAccount) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? '⏳ Submitting Application...' : '📝 Submit Card Application'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  backButton: {
    background: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  formContainer: {
    display: 'flex',
    justifyContent: 'center'
  },
  formCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '600px'
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  subtitle: {
    color: '#666',
    fontSize: '16px',
    margin: '10px 0 0 0'
  },
  error: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  success: {
    color: '#155724',
    background: '#d4edda',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  noAccounts: {
    textAlign: 'center',
    padding: '40px'
  },
  primaryButton: {
    background: '#007bff',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '15px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  select: {
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.3s'
  },
  selectedAccountInfo: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #dee2e6'
  },
  accountDetails: {
    marginTop: '10px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #eee',
    fontSize: '14px'
  },
  cardFeatures: {
    background: '#e7f3ff',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #bee5eb'
  },
  featuresList: {
    margin: '10px 0',
    paddingLeft: '20px'
  },
  terms: {
    background: '#fff3cd',
    padding: '15px',
    borderRadius: '8px',
    border: '1px solid #ffeaa7'
  },
  termsText: {
    fontSize: '14px',
    color: '#856404',
    margin: 0,
    lineHeight: '1.5'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s'
  }
};
