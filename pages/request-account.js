
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RequestAccount() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState([]);
  const [existingAccounts, setExistingAccounts] = useState([]);
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);
      await fetchAccountTypes();
      await fetchExistingAccounts(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setAccountTypes(data || []);
    } catch (error) {
      console.error('Error fetching account types:', error);
      setError('Failed to load account types');
    }
  };

  const fetchExistingAccounts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('account_type')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      setExistingAccounts(data || []);
    } catch (error) {
      console.error('Error fetching existing accounts:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const selectedType = accountTypes.find(at => at.id === parseInt(selectedAccountType));
      
      if (!selectedType) {
        throw new Error('Please select a valid account type');
      }

      // Check if user already has this account type
      const hasAccountType = existingAccounts.some(
        acc => acc.account_type === selectedType.name.toLowerCase().replace(/\s+/g, '_')
      );

      if (hasAccountType) {
        throw new Error('You already have this account type. Please choose a different one.');
      }

      // Create account request
      const { data, error } = await supabase
        .from('account_requests')
        .insert({
          user_id: user.id,
          account_type_id: selectedType.id,
          account_type_name: selectedType.name,
          status: 'pending',
          request_date: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for user
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'account_request',
        title: 'Account Request Submitted',
        message: `Your request for a ${selectedType.name} has been submitted and is pending admin approval.`,
        read: false
      });

      setMessage(`Account request submitted successfully! Your ${selectedType.name} request is pending admin approval.`);
      setSelectedAccountType('');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error.message || 'Failed to submit account request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Request Additional Account - Oakline Bank</title>
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Request Additional Account</h1>
          <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
            ← Back to Dashboard
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.infoSection}>
            <h2 style={styles.subtitle}>Open a New Account</h2>
            <p style={styles.description}>
              As an existing customer, you can request additional account types. 
              Once approved by our admin team, your new account and debit card will be automatically created.
            </p>
          </div>

          {existingAccounts.length > 0 && (
            <div style={styles.existingAccountsSection}>
              <h3 style={styles.sectionTitle}>Your Current Accounts</h3>
              <div style={styles.accountsList}>
                {existingAccounts.map((acc, index) => (
                  <div key={index} style={styles.accountBadge}>
                    {acc.account_type.replace(/_/g, ' ').toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={styles.error}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {message && (
            <div style={styles.success}>
              <strong>Success:</strong> {message}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Account Type *</label>
              <select
                value={selectedAccountType}
                onChange={(e) => setSelectedAccountType(e.target.value)}
                style={styles.select}
                required
                disabled={submitting}
              >
                <option value="">-- Choose an account type --</option>
                {accountTypes.map((type) => {
                  const hasType = existingAccounts.some(
                    acc => acc.account_type === type.name.toLowerCase().replace(/\s+/g, '_')
                  );
                  return (
                    <option 
                      key={type.id} 
                      value={type.id}
                      disabled={hasType}
                    >
                      {type.name} {type.rate ? `- ${type.rate}` : ''} {hasType ? '(Already have)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {selectedAccountType && (
              <div style={styles.accountDetails}>
                {(() => {
                  const selected = accountTypes.find(at => at.id === parseInt(selectedAccountType));
                  return selected ? (
                    <>
                      <h4 style={styles.detailsTitle}>{selected.icon} {selected.name}</h4>
                      <p style={styles.detailsDescription}>{selected.description}</p>
                      <div style={styles.detailsInfo}>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Rate:</span>
                          <span style={styles.detailValue}>{selected.rate}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Category:</span>
                          <span style={styles.detailValue}>{selected.category}</span>
                        </div>
                        <div style={styles.detailItem}>
                          <span style={styles.detailLabel}>Min Deposit:</span>
                          <span style={styles.detailValue}>
                            ${parseFloat(selected.min_deposit || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null;
                })()}
              </div>
            )}

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: submitting ? 0.6 : 1,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting Request...' : 'Submit Account Request'}
            </button>
          </form>

          <div style={styles.noticeSection}>
            <h4 style={styles.noticeTitle}>📋 What Happens Next?</h4>
            <ul style={styles.noticeList}>
              <li>Your request will be reviewed by our admin team</li>
              <li>You'll receive a notification once your request is processed</li>
              <li>Upon approval, your account and debit card will be created automatically</li>
              <li>You'll be able to access your new account immediately after approval</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#64748b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2.5rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  infoSection: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #e2e8f0'
  },
  subtitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  description: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.6'
  },
  existingAccountsSection: {
    marginBottom: '2rem',
    padding: '1.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  accountsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  accountBadge: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  error: {
    padding: '1rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #fecaca'
  },
  success: {
    padding: '1rem',
    backgroundColor: '#dcfce7',
    color: '#059669',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #bbf7d0'
  },
  form: {
    marginBottom: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  accountDetails: {
    marginTop: '1.5rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  detailsTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  detailsDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '1rem',
    lineHeight: '1.6'
  },
  detailsInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  detailLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '1rem',
    color: '#1e293b',
    fontWeight: '700'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '1.5rem'
  },
  noticeSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#dbeafe',
    borderRadius: '12px',
    border: '1px solid #93c5fd'
  },
  noticeTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '1rem'
  },
  noticeList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#1e40af'
  },
  loading: {
    textAlign: 'center',
    padding: '4rem',
    fontSize: '1.2rem',
    color: '#64748b'
  }
};
