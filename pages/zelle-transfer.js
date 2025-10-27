
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleTransfer() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [zelleEmail, setZelleEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    from_account: '',
    to_contact: '',
    amount: '',
    memo: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setUserProfile(profile);
      setZelleEmail(profile?.email || session.user.email);
      setEmailVerified(session.user.email_confirmed_at !== null);

      // Fetch accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      // Fetch Zelle contacts
      const { data: zelleContacts } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      setContacts(zelleContacts || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setVerifyingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: zelleEmail
      });

      if (error) throw error;
      setMessage('✅ Verification email sent! Please check your inbox.');
    } catch (error) {
      setMessage('Error sending verification email. Please try again.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!emailVerified) {
      setMessage('Please verify your email before sending money with Zelle');
      return;
    }

    setSending(true);
    setMessage('');

    try {
      const amount = parseFloat(form.amount);
      if (amount <= 0 || amount > 2500) {
        setMessage('Amount must be between $0.01 and $2,500');
        setSending(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

      if (!emailRegex.test(form.to_contact) && !phoneRegex.test(form.to_contact)) {
        setMessage('Please enter a valid email address or phone number');
        setSending(false);
        return;
      }

      const selectedAccount = accounts.find(acc => acc.id === form.from_account);
      if (amount > parseFloat(selectedAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setSending(false);
        return;
      }

      const response = await fetch('/api/zelle-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: form.from_account,
          recipient_contact: form.to_contact,
          amount: amount,
          memo: form.memo || 'Zelle Transfer',
          transaction_type: 'send'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      setShowSuccess(true);
      setForm({ from_account: form.from_account, to_contact: '', amount: '', memo: '' });

      setTimeout(() => {
        setShowSuccess(false);
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error sending money:', error);
      setMessage(error.message || 'Error sending money. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Zelle® - Send Money - Oakline Bank</title>
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
          {showSuccess && (
            <div style={styles.successModal}>
              <div style={styles.successCheck}>✓</div>
              <h2 style={styles.successTitle}>Money Sent Successfully!</h2>
              <p style={styles.successMessage}>Your Zelle® payment has been processed</p>
            </div>
          )}

          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Send Money with Zelle®</h1>
                <p style={styles.subtitle}>Fast, safe, and easy - typically within minutes</p>
              </div>
            </div>
          </div>

          {/* Email Verification Alert */}
          {!emailVerified && (
            <div style={styles.verificationAlert}>
              <div style={styles.alertIcon}>⚠️</div>
              <div style={styles.alertContent}>
                <h3 style={styles.alertTitle}>Verify Your Email for Zelle®</h3>
                <p style={styles.alertText}>
                  To use Zelle®, please verify your email address: <strong>{zelleEmail}</strong>
                </p>
                <button 
                  onClick={handleVerifyEmail}
                  style={styles.verifyButton}
                  disabled={verifyingEmail}
                >
                  {verifyingEmail ? '🔄 Sending...' : '📧 Send Verification Email'}
                </button>
              </div>
            </div>
          )}

          {/* Zelle Email Display */}
          {emailVerified && (
            <div style={styles.zelleEmailCard}>
              <div style={styles.zelleEmailIcon}>✅</div>
              <div>
                <div style={styles.zelleEmailLabel}>Your Zelle® Email</div>
                <div style={styles.zelleEmailValue}>{zelleEmail}</div>
              </div>
            </div>
          )}

          {message && (
            <div style={styles.errorMessage}>{message}</div>
          )}

          {/* Recent Contacts */}
          {contacts.length > 0 && (
            <div style={styles.contactsSection}>
              <h3 style={styles.contactsTitle}>Recent Contacts</h3>
              <div style={styles.contactsGrid}>
                {contacts.slice(0, 4).map((contact) => (
                  <button
                    key={contact.id}
                    style={styles.contactCard}
                    onClick={() => setForm(prev => ({ ...prev, to_contact: contact.email || contact.phone }))}
                  >
                    <div style={styles.contactAvatar}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.contactName}>{contact.name}</div>
                    <div style={styles.contactInfo}>
                      {contact.email || contact.phone}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transfer Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>From Account *</label>
              <select
                style={styles.select}
                value={form.from_account}
                onChange={(e) => setForm(prev => ({ ...prev, from_account: e.target.value }))}
                required
              >
                <option value="">Select account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type?.replace('_', ' ')?.toUpperCase()} - 
                    ****{account.account_number?.slice(-4)} - 
                    {formatCurrency(account.balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>To (Email or Mobile Number) *</label>
              <input
                type="text"
                style={styles.input}
                value={form.to_contact}
                onChange={(e) => setForm(prev => ({ ...prev, to_contact: e.target.value }))}
                placeholder="email@example.com or (555) 123-4567"
                required
              />
              <small style={styles.helperText}>
                Enter recipient's email or U.S. mobile number
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                style={styles.input}
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max="2500"
                required
              />
              <small style={styles.helperText}>Daily limit: $2,500</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>What's this for? (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={form.memo}
                onChange={(e) => setForm(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="Dinner, rent, gift, etc."
                maxLength="100"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: sending || !emailVerified ? 0.7 : 1,
                cursor: sending || !emailVerified ? 'not-allowed' : 'pointer'
              }}
              disabled={sending || !emailVerified}
            >
              {sending ? '🔄 Sending...' : `💸 Send ${formatCurrency(parseFloat(form.amount) || 0)} with Zelle®`}
            </button>
          </form>

          {/* Safety Tips */}
          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Zelle® Safety Tips</h4>
            <ul style={styles.infoList}>
              <li>Only send money to people you know and trust</li>
              <li>Payments are typically delivered in minutes</li>
              <li>Payments can't be canceled once sent if the recipient is enrolled</li>
              <li>Verify recipient information before sending</li>
              <li>Never send money to someone claiming to be from Oakline Bank</li>
              <li>Report suspicious requests immediately</li>
            </ul>
          </div>

          {/* Zelle Info */}
          <div style={styles.zelleInfoCard}>
            <h4 style={styles.zelleInfoTitle}>What is Zelle®?</h4>
            <p style={styles.zelleInfoText}>
              Zelle® is a fast, safe and easy way to send and receive money with friends, family and others you trust. 
              Send money directly from your Oakline Bank account to almost anyone with a bank account in the U.S., 
              typically within minutes.
            </p>
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
  content: {
    padding: '1.5rem',
    maxWidth: '700px',
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
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(107, 33, 168, 0.3)'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  verificationAlert: {
    backgroundColor: '#fff3cd',
    border: '2px solid #fbbf24',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  alertIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  alertContent: {
    flex: 1
  },
  alertTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '0.5rem',
    margin: 0
  },
  alertText: {
    fontSize: '0.9rem',
    color: '#78350f',
    marginBottom: '1rem'
  },
  verifyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6B21A8',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  zelleEmailCard: {
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  zelleEmailIcon: {
    fontSize: '2rem'
  },
  zelleEmailLabel: {
    fontSize: '0.8rem',
    color: '#065f46',
    fontWeight: '500',
    marginBottom: '0.25rem'
  },
  zelleEmailValue: {
    fontSize: '1rem',
    color: '#047857',
    fontWeight: '600'
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
  contactsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  contactsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  contactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '1rem'
  },
  contactCard: {
    background: '#f8fafc',
    border: '2px solid #e2e8f0',
    padding: '1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'center'
  },
  contactAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 0.75rem',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  contactName: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: '0.25rem'
  },
  contactInfo: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white',
    transition: 'all 0.2s'
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
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block'
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
    marginTop: '1rem',
    boxShadow: '0 6px 20px rgba(107, 33, 168, 0.3)'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    marginBottom: '1.5rem'
  },
  infoTitle: {
    color: '#6B21A8',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.8',
    fontSize: '0.9rem'
  },
  zelleInfoCard: {
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem'
  },
  zelleInfoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.75rem'
  },
  zelleInfoText: {
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: '1.6',
    margin: 0
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
