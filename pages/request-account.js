
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  // Helper function to normalize account type names for comparison
  const normalizeAccountType = (name) => {
    // Convert to lowercase, replace any non-alphanumeric character with underscore, then collapse multiple underscores
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')  // Replace any sequence of non-alphanumeric chars with a single underscore
      .replace(/^_+|_+$/g, '');      // Trim leading/trailing underscores
  };

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
        .select('account_type, status')
        .eq('user_id', userId);

      if (error) throw error;
      
      // Filter to only show accounts that are not closed or rejected
      const activeAccounts = (data || []).filter(acc => 
        acc.status !== 'closed' && acc.status !== 'rejected'
      );
      
      setExistingAccounts(activeAccounts);
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
      const normalizedSelectedType = normalizeAccountType(selectedType.name);
      const hasAccountType = existingAccounts.some(acc => {
        const normalizedExistingType = normalizeAccountType(acc.account_type);
        return normalizedExistingType === normalizedSelectedType;
      });

      if (hasAccountType) {
        throw new Error(`You already have an active ${selectedType.name}. Please choose a different account type.`);
      }

      // Show processing state
      setIsProcessing(true);

      // Simulate processing delay for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));

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

      // Get user profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      // Send email confirmation
      try {
        await fetch('/api/send-account-request-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: profile?.email || user.email,
            firstName: profile?.first_name || 'Valued',
            lastName: profile?.last_name || 'Customer',
            accountType: selectedType.name,
            accountDescription: selectedType.description,
            minDeposit: selectedType.min_deposit
          })
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      // Hide processing and show success modal
      setIsProcessing(false);
      setShowSuccessModal(true);
      setSelectedAccountType('');
      
      // Redirect after 5 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 5000);

    } catch (error) {
      console.error('Error submitting request:', error);
      setError(error.message || 'Failed to submit account request');
      setIsProcessing(false);
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
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </Head>

      <div style={styles.container}>
        {/* Processing Overlay */}
        {isProcessing && (
          <div style={styles.processingOverlay}>
            <div style={styles.processingCard}>
              <div style={styles.spinner}></div>
              <h2 style={styles.processingTitle}>Processing Your Request...</h2>
              <p style={styles.processingText}>Please wait while we submit your account request</p>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div style={styles.successOverlay} onClick={() => setShowSuccessModal(false)}>
            <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.successIcon}>✅</div>
              <h2 style={styles.successTitle}>Request Submitted Successfully!</h2>
              <p style={styles.successMessage}>
                Your account request has been received and is now under review by our admin team.
              </p>
              <div style={styles.successInfoBox}>
                <div style={styles.infoIcon}>📧</div>
                <p style={styles.infoText}>
                  <strong>Email Confirmation Sent</strong><br/>
                  A confirmation email has been sent to your registered email address with details about your request.
                </p>
              </div>
              <div style={styles.successSteps}>
                <h3 style={styles.stepsTitle}>What's Next?</h3>
                <ul style={styles.stepsList}>
                  <li>Our admin team will review your request</li>
                  <li>You'll receive an email notification once approved</li>
                  <li>Your new account will be created automatically</li>
                  <li>Access your account from the dashboard</li>
                </ul>
              </div>
              <div style={styles.successButtons}>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  style={styles.dashboardButton}
                  onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'}
                  onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'}
                >
                  Go to Dashboard
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  style={styles.closeButton}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  Close
                </button>
              </div>
              <p style={styles.autoRedirect}>Redirecting to dashboard in 5 seconds...</p>
            </div>
          </div>
        )}

        {/* Professional Header with Gradient */}
        <div style={styles.pageHeader}>
          <div style={styles.headerContent}>
            <div style={styles.headerLeft}>
              <div style={styles.headerIcon}>🏦</div>
              <div>
                <h1 style={styles.pageTitle}>Request Additional Account</h1>
                <p style={styles.pageSubtitle}>Expand your banking options with Oakline Bank</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
              ← Dashboard
            </button>
          </div>
        </div>

        {/* Benefits Section */}
        <div style={styles.benefitsContainer}>
          <h2 style={styles.benefitsTitle}>Why Open Additional Accounts?</h2>
          <div style={styles.benefitsGrid}>
            <div style={styles.benefitCard}>
              <div style={styles.benefitIcon}>💰</div>
              <h3 style={styles.benefitTitle}>Better Organization</h3>
              <p style={styles.benefitDescription}>Separate your funds for different purposes - savings, investments, or daily expenses</p>
            </div>
            <div style={styles.benefitCard}>
              <div style={styles.benefitIcon}>📊</div>
              <h3 style={styles.benefitTitle}>Maximize Returns</h3>
              <p style={styles.benefitDescription}>Take advantage of different interest rates and account benefits</p>
            </div>
            <div style={styles.benefitCard}>
              <div style={styles.benefitIcon}>🔒</div>
              <h3 style={styles.benefitTitle}>Enhanced Security</h3>
              <p style={styles.benefitDescription}>Keep your funds secure across multiple account types with individual protection</p>
            </div>
            <div style={styles.benefitCard}>
              <div style={styles.benefitIcon}>⚡</div>
              <h3 style={styles.benefitTitle}>Quick Approval</h3>
              <p style={styles.benefitDescription}>Fast processing with our admin team - get your new account ready in no time</p>
            </div>
          </div>
        </div>

        {/* Prominent Call-to-Action Section */}
        <div style={styles.ctaSection}>
          <div style={styles.ctaIcon}>✨</div>
          <h2 style={styles.ctaTitle}>Ready to Get Started?</h2>
          <p style={styles.ctaDescription}>
            Choose from our available account types below and submit your request. Our team will review and approve it quickly!
          </p>
          <button 
            onClick={() => {
              const formSection = document.getElementById('account-request-form');
              if (formSection) {
                formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            style={styles.ctaButton}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 10px 25px rgba(30, 64, 175, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 6px 16px rgba(30, 64, 175, 0.4)';
            }}
          >
            📝 Submit Account Request
          </button>
        </div>

        <div style={styles.card} id="account-request-form">
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
                {accountTypes
                  .filter((type) => {
                    // Only show account types the user doesn't have
                    const normalizedTypeName = normalizeAccountType(type.name);
                    const hasType = existingAccounts.some(acc => {
                      const normalizedExistingType = normalizeAccountType(acc.account_type);
                      return normalizedExistingType === normalizedTypeName;
                    });
                    return !hasType; // Filter out accounts user already has
                  })
                  .map((type) => (
                    <option 
                      key={type.id} 
                      value={type.id}
                    >
                      {type.name} {type.rate ? `- ${type.rate}` : ''}
                    </option>
                  ))
                }
              </select>
              {accountTypes.filter((type) => {
                const normalizedTypeName = normalizeAccountType(type.name);
                const hasType = existingAccounts.some(acc => {
                  const normalizedExistingType = normalizeAccountType(acc.account_type);
                  return normalizedExistingType === normalizedTypeName;
                });
                return !hasType;
              }).length === 0 && (
                <p style={styles.noAccountsMessage}>
                  🎉 You already have all available account types!
                </p>
              )}
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
    paddingBottom: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  pageHeader: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)',
    padding: '2.5rem 2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(30, 64, 175, 0.2)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1.5rem'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flex: 1
  },
  headerIcon: {
    fontSize: '3.5rem',
    animation: 'pulse 2s infinite'
  },
  pageTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: 'white',
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  pageSubtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    margin: '0.5rem 0 0 0'
  },
  benefitsContainer: {
    maxWidth: '1200px',
    margin: '0 auto 2rem',
    padding: '0 2rem'
  },
  benefitsTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  benefitsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  benefitCard: {
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.3s ease',
    cursor: 'default'
  },
  benefitIcon: {
    fontSize: '2.5rem',
    marginBottom: '1rem'
  },
  benefitTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  benefitDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    lineHeight: '1.6'
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
  ctaSection: {
    maxWidth: '800px',
    margin: '0 auto 2rem',
    padding: '3rem 2rem',
    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f97316 100%)',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(220, 38, 38, 0.3)',
    color: 'white'
  },
  ctaIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    animation: 'bounce 2s infinite'
  },
  ctaTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    color: 'white'
  },
  ctaDescription: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: '1.6',
    maxWidth: '600px',
    margin: '0 auto 2rem'
  },
  ctaButton: {
    padding: '1.25rem 3rem',
    backgroundColor: 'white',
    color: '#dc2626',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 6px 16px rgba(30, 64, 175, 0.4)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '600',
    backdropFilter: 'blur(10px)'
  },
  noAccountsMessage: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#dcfce7',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    border: '2px solid #86efac',
    textAlign: 'center'
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
  },
  processingOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)'
  },
  processingCard: {
    backgroundColor: 'white',
    padding: '3rem 4rem',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '400px'
  },
  spinner: {
    width: '60px',
    height: '60px',
    margin: '0 auto 2rem',
    border: '6px solid #e2e8f0',
    borderTop: '6px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  processingTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  processingText: {
    fontSize: '1rem',
    color: '#64748b'
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
    padding: '1rem'
  },
  successModal: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out'
  },
  successIcon: {
    fontSize: '4rem',
    textAlign: 'center',
    marginBottom: '1rem'
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: '1rem'
  },
  successMessage: {
    fontSize: '1.1rem',
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: '1.6',
    marginBottom: '2rem'
  },
  successInfoBox: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  infoIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  infoText: {
    fontSize: '0.95rem',
    color: '#065f46',
    lineHeight: '1.6',
    margin: 0
  },
  successSteps: {
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem'
  },
  stepsTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  stepsList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#4a5568',
    fontSize: '0.95rem',
    lineHeight: '2'
  },
  successButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '1rem'
  },
  dashboardButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  closeButton: {
    padding: '1rem 2rem',
    backgroundColor: '#f3f4f6',
    color: '#4a5568',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  autoRedirect: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#9ca3af',
    fontStyle: 'italic'
  }
};
