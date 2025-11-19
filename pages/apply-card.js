
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
  const [hasActiveCard, setHasActiveCard] = useState(false);
  const [activeCards, setActiveCards] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState('');
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
      setLoadingMessage('Loading your accounts and cards...');
      
      // Check if user already has active cards (for informational purposes)
      const { data: existingCards, error: cardsError } = await supabase
        .from('cards')
        .select('*, accounts:account_id (account_number, account_type)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (existingCards && existingCards.length > 0) {
        setHasActiveCard(true);
        setActiveCards(existingCards);
      }

      // Always load accounts regardless of existing cards (user might need replacement)
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
      setLoadingMessage('');
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
    setLoadingMessage('Verifying your account eligibility...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setLoadingMessage('Submitting your card application...');
      
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
        setLoadingMessage('Processing application...');
        setTimeout(() => {
          setSuccess(data.message);
          setLoadingMessage('');
          setTimeout(() => {
            router.push('/cards');
          }, 3000);
        }, 500);
      } else {
        setError(data.error || 'Failed to submit application');
        setLoadingMessage('');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Error submitting application. Please try again.');
      setLoadingMessage('');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>{loadingMessage || 'Loading...'}</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {submitting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingContent}>
            <div style={styles.spinner}></div>
            <h2 style={styles.loadingTitle}>{loadingMessage || 'Processing...'}</h2>
            <p style={styles.loadingSubtitle}>Please wait while we process your application</p>
          </div>
        </div>
      )}

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

            {success && (
              <div style={styles.successBanner}>
                <div style={styles.successIcon}>✓</div>
                <div>
                  <h3 style={styles.successTitle}>Application Submitted Successfully!</h3>
                  <p style={styles.successMessage}>{success}</p>
                  <p style={styles.successSubtext}>Redirecting you to your cards page...</p>
                </div>
              </div>
            )}

            {error && <div style={styles.error}>{error}</div>}

            {hasActiveCard && (
              <div style={styles.activeCardNotice}>
                <div style={styles.noticeHeader}>
                  <span style={styles.noticeIcon}>ℹ️</span>
                  <h3 style={styles.noticeTitle}>You Have {activeCards.length} Active Card{activeCards.length > 1 ? 's' : ''}</h3>
                </div>
                <div style={styles.activeCardsList}>
                  {activeCards.map((card, index) => (
                    <div key={card.id} style={styles.activeCardItem}>
                      <span style={styles.cardBadge}>Card {index + 1}</span>
                      <span style={styles.cardNumber}>****{card.card_number?.slice(-4) || 'XXXX'}</span>
                      <span style={styles.cardAccount}>
                        {card.accounts?.account_type?.replace(/_/g, ' ')?.toUpperCase() || 'Account'} - ****{card.accounts?.account_number?.slice(-4) || 'XXXX'}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={styles.noticeText}>
                  If you need a replacement card (lost, stolen, or damaged), you can submit a new application below. 
                  Note that submitting a new application may be subject to review.
                </p>
              </div>
            )}

            {accounts.length === 0 ? (
              <div style={styles.noAccounts}>
                <div style={styles.noAccountsIcon}>📭</div>
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

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
    </>
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
    textDecoration: 'none',
    transition: 'background 0.3s'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #e0e0e0',
    borderTop: '5px solid #1e3c72',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '18px',
    color: '#666',
    fontWeight: '500'
  },
  loadingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(5px)'
  },
  loadingContent: {
    background: 'white',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    animation: 'fadeIn 0.3s ease'
  },
  loadingTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e3c72',
    marginTop: '20px',
    marginBottom: '10px'
  },
  loadingSubtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },
  successBanner: {
    background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '15px',
    animation: 'fadeIn 0.5s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
  },
  successIcon: {
    width: '50px',
    height: '50px',
    background: '#10b981',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    flexShrink: 0
  },
  successTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#065f46',
    margin: '0 0 8px 0'
  },
  successMessage: {
    fontSize: '15px',
    color: '#047857',
    margin: '0 0 5px 0',
    lineHeight: '1.5'
  },
  successSubtext: {
    fontSize: '13px',
    color: '#059669',
    margin: 0,
    fontStyle: 'italic'
  },
  activeCardNotice: {
    background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    border: '2px solid #f97316',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.15)'
  },
  noticeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '15px'
  },
  noticeIcon: {
    fontSize: '28px'
  },
  noticeTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#9a3412',
    margin: 0
  },
  noticeText: {
    fontSize: '14px',
    color: '#9a3412',
    marginTop: '15px',
    marginBottom: 0,
    lineHeight: '1.6'
  },
  activeCardsList: {
    background: '#f8f9fa',
    border: '2px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px'
  },
  activeCardItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    marginBottom: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    gap: '10px',
    flexWrap: 'wrap'
  },
  cardBadge: {
    background: '#1e3c72',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  cardNumber: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace'
  },
  cardAccount: {
    fontSize: '13px',
    color: '#666',
    flex: 1,
    textAlign: 'right'
  },
  activeCardNote: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '25px',
    fontStyle: 'italic'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  noAccountsIcon: {
    fontSize: '60px',
    marginBottom: '20px'
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
    background: 'linear-gradient(135deg, #1e3c72 0%, #2563eb 100%)',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '15px',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 60, 114, 0.3)'
  },
  secondaryButton: {
    background: 'white',
    color: '#1e3c72',
    border: '2px solid #1e3c72',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '15px',
    transition: 'all 0.3s'
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
