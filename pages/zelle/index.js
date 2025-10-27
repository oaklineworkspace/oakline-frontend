
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleIndex() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [zelleSettings, setZelleSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const [enrollmentForm, setEnrollmentForm] = useState({
    email: '',
    phone: '',
    acceptTerms: false
  });

  useEffect(() => {
    checkUserAndZelleStatus();
  }, []);

  const checkUserAndZelleStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setLoading(false);
        return;
      }

      setUser(session.user);

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);
      setEnrollmentForm(prev => ({
        ...prev,
        email: profile?.email || session.user.email,
        phone: profile?.phone || ''
      }));

      // Check if user already has Zelle settings
      const { data: settings } = await supabase
        .from('zelle_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      setZelleSettings(settings);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollInZelle = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setMessage('Please sign in to enroll in Zelle®');
      return;
    }

    if (!enrollmentForm.acceptTerms) {
      setMessage('Please accept the Terms and Conditions');
      return;
    }

    setEnrolling(true);
    setMessage('');

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(enrollmentForm.email)) {
        setMessage('Please enter a valid email address');
        setEnrolling(false);
        return;
      }

      // Create or update Zelle settings
      const { data: existingSettings } = await supabase
        .from('zelle_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('zelle_settings')
          .update({
            email: enrollmentForm.email,
            phone: enrollmentForm.phone || null,
            is_enrolled: true,
            enrolled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Create new Zelle settings
        const { error: insertError } = await supabase
          .from('zelle_settings')
          .insert([{
            user_id: user.id,
            email: enrollmentForm.email,
            phone: enrollmentForm.phone || null,
            daily_limit: 2500,
            monthly_limit: 20000,
            is_enrolled: true,
            enrolled_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      // Update user profile with phone if provided
      if (enrollmentForm.phone) {
        await supabase
          .from('profiles')
          .update({ phone: enrollmentForm.phone })
          .eq('id', user.id);
      }

      // Create notification
      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'zelle',
        title: 'Welcome to Zelle®',
        message: `You're now enrolled in Zelle® with ${enrollmentForm.email}. Start sending money instantly!`
      }]);

      // Log enrollment
      await supabase.from('system_logs').insert([{
        level: 'info',
        type: 'zelle_enrollment',
        message: 'User enrolled in Zelle',
        details: { email: enrollmentForm.email },
        user_id: user.id
      }]);

      setShowSuccess(true);
      setTimeout(() => {
        router.push('/zelle-transfer');
      }, 2000);

    } catch (error) {
      console.error('Error enrolling in Zelle:', error);
      setMessage('Error enrolling in Zelle. Please try again.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle®...</p>
      </div>
    );
  }

  // If user is already enrolled, show dashboard
  if (user && zelleSettings?.is_enrolled) {
    return (
      <>
        <Head>
          <title>Zelle® - Oakline Bank</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>

        <div style={styles.container}>
          <div style={styles.header}>
            <Link href="/" style={styles.logoContainer}>
              <div style={styles.logoPlaceholder}>🏦</div>
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>

          <div style={styles.content}>
            <div style={styles.enrolledCard}>
              <div style={styles.enrolledIcon}>✅</div>
              <h1 style={styles.enrolledTitle}>You're Enrolled in Zelle®!</h1>
              <p style={styles.enrolledText}>
                Your Zelle® email: <strong>{zelleSettings.email}</strong>
              </p>
              {zelleSettings.phone && (
                <p style={styles.enrolledText}>
                  Your Zelle® phone: <strong>{zelleSettings.phone}</strong>
                </p>
              )}

              <div style={styles.actionGrid}>
                <Link href="/zelle-transfer" style={styles.actionCard}>
                  <div style={styles.actionIcon}>💸</div>
                  <div style={styles.actionTitle}>Send Money</div>
                  <div style={styles.actionDesc}>Send money to friends & family</div>
                </Link>

                <Link href="/zelle-settings" style={styles.actionCard}>
                  <div style={styles.actionIcon}>⚙️</div>
                  <div style={styles.actionTitle}>Settings</div>
                  <div style={styles.actionDesc}>Manage contacts & limits</div>
                </Link>

                <Link href="/transactions?filter=zelle" style={styles.actionCard}>
                  <div style={styles.actionIcon}>📊</div>
                  <div style={styles.actionTitle}>History</div>
                  <div style={styles.actionDesc}>View Zelle® transactions</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Enrollment page for non-enrolled users
  return (
    <>
      <Head>
        <title>Enroll in Zelle® - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          {user ? (
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          ) : (
            <Link href="/sign-in" style={styles.signInButton}>Sign In</Link>
          )}
        </div>

        <div style={styles.content}>
          {showSuccess && (
            <div style={styles.successModal}>
              <div style={styles.successCheck}>✓</div>
              <h2 style={styles.successTitle}>Successfully Enrolled!</h2>
              <p style={styles.successMessage}>Redirecting to Zelle® Transfer...</p>
            </div>
          )}

          {/* Hero Section */}
          <div style={styles.heroSection}>
            <div style={styles.zelleLogo}>Z</div>
            <h1 style={styles.heroTitle}>Send Money with Zelle®</h1>
            <p style={styles.heroSubtitle}>
              Fast, safe, and easy - Send money directly from your Oakline Bank account
            </p>
          </div>

          {/* Features Grid */}
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>Fast</h3>
              <p style={styles.featureText}>Money moves in minutes - typically within minutes!</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>Secure</h3>
              <p style={styles.featureText}>Trusted by thousands of banks and credit unions</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>✨</div>
              <h3 style={styles.featureTitle}>Easy</h3>
              <p style={styles.featureText}>Just an email or phone number needed</p>
            </div>

            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💰</div>
              <h3 style={styles.featureTitle}>Free</h3>
              <p style={styles.featureText}>No fees for standard transfers</p>
            </div>
          </div>

          {/* Enrollment Form */}
          {!user ? (
            <div style={styles.guestCard}>
              <h2 style={styles.guestTitle}>Get Started with Zelle®</h2>
              <p style={styles.guestText}>
                To use Zelle®, you need to have an Oakline Bank account. Sign in or create an account to get started.
              </p>
              <div style={styles.guestActions}>
                <Link href="/sign-in" style={styles.primaryButton}>Sign In</Link>
                <Link href="/apply" style={styles.secondaryButton}>Open Account</Link>
              </div>
            </div>
          ) : (
            <div style={styles.enrollmentCard}>
              <h2 style={styles.enrollmentTitle}>Enroll in Zelle®</h2>
              <p style={styles.enrollmentSubtitle}>
                Register your email address to start sending and receiving money
              </p>

              {message && (
                <div style={styles.errorMessage}>{message}</div>
              )}

              <form onSubmit={handleEnrollInZelle} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address *</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={enrollmentForm.email}
                    onChange={(e) => setEnrollmentForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="your.email@example.com"
                    required
                  />
                  <small style={styles.helperText}>
                    This email will be used to send and receive money with Zelle®
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Mobile Phone (Optional)</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={enrollmentForm.phone}
                    onChange={(e) => setEnrollmentForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                  <small style={styles.helperText}>
                    You can also receive money using your phone number
                  </small>
                </div>

                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={enrollmentForm.acceptTerms}
                    onChange={(e) => setEnrollmentForm(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                    style={styles.checkbox}
                  />
                  <label htmlFor="acceptTerms" style={styles.checkboxLabel}>
                    I agree to the Zelle® <a href="#" style={styles.link}>Terms of Service</a> and <a href="#" style={styles.link}>Privacy Policy</a>
                  </label>
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: enrolling ? 0.7 : 1,
                    cursor: enrolling ? 'not-allowed' : 'pointer'
                  }}
                  disabled={enrolling}
                >
                  {enrolling ? '🔄 Enrolling...' : '✅ Enroll in Zelle®'}
                </button>
              </form>
            </div>
          )}

          {/* How It Works */}
          <div style={styles.howItWorksCard}>
            <h3 style={styles.howItWorksTitle}>How Zelle® Works</h3>
            <div style={styles.stepsGrid}>
              <div style={styles.step}>
                <div style={styles.stepNumber}>1</div>
                <h4 style={styles.stepTitle}>Enroll</h4>
                <p style={styles.stepText}>Register your email or phone number</p>
              </div>

              <div style={styles.step}>
                <div style={styles.stepNumber}>2</div>
                <h4 style={styles.stepTitle}>Choose Recipient</h4>
                <p style={styles.stepText}>Enter their email or mobile number</p>
              </div>

              <div style={styles.step}>
                <div style={styles.stepNumber}>3</div>
                <h4 style={styles.stepTitle}>Send Money</h4>
                <p style={styles.stepText}>Money typically arrives in minutes</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div style={styles.faqCard}>
            <h3 style={styles.faqTitle}>Frequently Asked Questions</h3>
            
            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What is Zelle®?</h4>
              <p style={styles.faqAnswer}>
                Zelle® is a fast, safe, and easy way to send and receive money with friends, family, and others you trust.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>Is there a fee to use Zelle®?</h4>
              <p style={styles.faqAnswer}>
                Oakline Bank does not charge a fee to send or receive money with Zelle®.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>How long does it take?</h4>
              <p style={styles.faqAnswer}>
                Money sent with Zelle® is typically available to the recipient in minutes when they're enrolled.
              </p>
            </div>

            <div style={styles.faqItem}>
              <h4 style={styles.faqQuestion}>What are the limits?</h4>
              <p style={styles.faqAnswer}>
                You can send up to $2,500 per day and $20,000 per month with Zelle®.
              </p>
            </div>
          </div>

          {/* Safety Tips */}
          <div style={styles.safetyCard}>
            <h3 style={styles.safetyTitle}>🔒 Stay Safe with Zelle®</h3>
            <ul style={styles.safetyList}>
              <li>Only send money to people you know and trust</li>
              <li>Zelle® should only be used to send money to friends, family, and people you know and trust</li>
              <li>Neither Oakline Bank nor Zelle® offers a protection program for authorized payments</li>
              <li>Always verify the recipient's information before sending money</li>
              <li>Never send money to someone you haven't met in person</li>
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
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    transition: 'all 0.2s'
  },
  signInButton: {
    padding: '0.5rem 1.25rem',
    backgroundColor: '#10b981',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  content: {
    padding: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  successModal: {
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '2rem',
    animation: 'slideDown 0.3s ease'
  },
  successCheck: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontWeight: 'bold'
  },
  successTitle: {
    color: '#065f46',
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  successMessage: {
    color: '#047857',
    fontSize: '1rem'
  },
  heroSection: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '3rem 1.5rem',
    borderRadius: '16px',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    color: 'white',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: '0 auto 1.5rem',
    boxShadow: '0 8px 30px rgba(107, 33, 168, 0.3)'
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  heroSubtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    maxWidth: '600px',
    margin: '0 auto'
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  featureCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s'
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem'
  },
  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  featureText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.5'
  },
  guestCard: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  guestTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  guestText: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '2rem',
    lineHeight: '1.6'
  },
  guestActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '0.875rem 2rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '0.875rem 2rem',
    backgroundColor: 'transparent',
    color: '#1A3E6F',
    textDecoration: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    border: '2px solid #1A3E6F',
    transition: 'all 0.2s'
  },
  enrollmentCard: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  enrollmentTitle: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  enrollmentSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid #fca5a5',
    fontSize: '0.95rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'all 0.2s'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginTop: '0.25rem',
    cursor: 'pointer'
  },
  checkboxLabel: {
    fontSize: '0.9rem',
    color: '#374151',
    lineHeight: '1.5'
  },
  link: {
    color: '#6B21A8',
    textDecoration: 'underline'
  },
  submitButton: {
    width: '100%',
    padding: '1.125rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 6px 20px rgba(107, 33, 168, 0.3)'
  },
  enrolledCard: {
    backgroundColor: 'white',
    padding: '3rem 2rem',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  enrolledIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  enrolledTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: '1rem'
  },
  enrolledText: {
    fontSize: '1rem',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '2rem'
  },
  actionCard: {
    backgroundColor: '#f8fafc',
    padding: '2rem 1.5rem',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    textDecoration: 'none',
    textAlign: 'center',
    transition: 'all 0.3s',
    cursor: 'pointer'
  },
  actionIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem'
  },
  actionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  actionDesc: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  howItWorksCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem'
  },
  howItWorksTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem'
  },
  step: {
    textAlign: 'center'
  },
  stepNumber: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#6B21A8',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: '0 auto 1rem'
  },
  stepTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  stepText: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  faqCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '2rem'
  },
  faqTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '1.5rem'
  },
  faqItem: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  faqQuestion: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  faqAnswer: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.6'
  },
  safetyCard: {
    backgroundColor: '#eff6ff',
    padding: '2rem',
    borderRadius: '16px',
    border: '2px solid #bfdbfe'
  },
  safetyTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: '1rem'
  },
  safetyList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#1e40af',
    lineHeight: '1.8',
    fontSize: '0.9rem'
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
    borderTop: '3px solid #6B21A8',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  }
};
