import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleSettings() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [limits, setLimits] = useState({
    daily_limit: 2500,
    monthly_limit: 20000,
    daily_used: 0,
    monthly_used: 0
  });
  const [activeTab, setActiveTab] = useState('contacts');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/login');
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

      // Fetch Zelle contacts
      await fetchContacts(session.user.id);

      // Fetch spending limits
      await fetchSpendingLimits(session.user.id);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchSpendingLimits = async (userId) => {
    try {
      // Calculate current month and day spending
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data: daySpending } = await supabase
        .from('zelle_transactions')
        .select('amount')
        .eq('sender_id', userId)
        .eq('transaction_type', 'send')
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString());

      const { data: monthSpending } = await supabase
        .from('zelle_transactions')
        .select('amount')
        .eq('sender_id', userId)
        .eq('transaction_type', 'send')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const dailyUsed = daySpending?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
      const monthlyUsed = monthSpending?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      setLimits(prev => ({
        ...prev,
        daily_used: dailyUsed,
        monthly_used: monthlyUsed
      }));
    } catch (error) {
      console.error('Error fetching spending limits:', error);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!contactForm.name || (!contactForm.email && !contactForm.phone)) {
        setMessage('Please provide a name and either email or phone number');
        setLoading(false);
        return;
      }

      // Validate email and phone formats
      if (contactForm.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactForm.email)) {
          setMessage('Please enter a valid email address');
          setLoading(false);
          return;
        }
      }

      if (contactForm.phone) {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(contactForm.phone)) {
          setMessage('Please enter a valid phone number');
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from('zelle_contacts')
        .insert([{
          user_id: user.id,
          name: contactForm.name,
          email: contactForm.email || null,
          phone: contactForm.phone || null,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setMessage('✅ Contact added successfully!');
      setContactForm({ name: '', email: '', phone: '' });
      await fetchContacts(user.id);

    } catch (error) {
      console.error('Error adding contact:', error);
      setMessage('Error adding contact. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const { error } = await supabase
        .from('zelle_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      setMessage('✅ Contact deleted successfully!');
      await fetchContacts(user.id);
    } catch (error) {
      console.error('Error deleting contact:', error);
      setMessage('Error deleting contact. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading Zelle Settings...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.loginPrompt}>
          <h1 style={styles.loginTitle}>Please Log In</h1>
          <p style={styles.loginMessage}>You need to be logged in to access Zelle settings</p>
          <Link href="/login" style={styles.loginButton}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Zelle Settings - Oakline Bank</title>
        <meta name="description" content="Manage your Zelle contacts and settings" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <div style={styles.headerInfo}>
            <Link href="/zelle" style={styles.backButton}>← Zelle</Link>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Zelle® Settings</h1>
                <p style={styles.subtitle}>Manage contacts & preferences</p>
              </div>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              color: message.includes('✅') ? '#155724' : '#721c24',
              borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
            }}>
              {message}
            </div>
          )}

          <div style={styles.tabContainer}>
            <div style={styles.tabs}>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'contacts' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('contacts')}
              >
                👥 Contacts
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'limits' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('limits')}
              >
                💳 Limits
              </button>
              <button
                style={{
                  ...styles.tab,
                  ...(activeTab === 'security' ? styles.activeTab : {})
                }}
                onClick={() => setActiveTab('security')}
              >
                🔒 Security
              </button>
            </div>
          </div>

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Add New Contact</div>
              <form onSubmit={handleAddContact} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Contact Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactForm.name}
                    onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={contactForm.email}
                    onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={contactForm.phone}
                    onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: loading ? 0.7 : 1
                  }}
                  disabled={loading}
                >
                  {loading ? '🔄 Adding...' : '+ Add Contact'}
                </button>
              </form>

              <div style={styles.contactsList}>
                <div style={styles.sectionTitle}>Your Contacts ({contacts.length})</div>
                {contacts.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>👥</div>
                    <p>No contacts added yet</p>
                    <p style={styles.emptyText}>Add contacts to send money faster</p>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} style={styles.contactItem}>
                      <div style={styles.contactInfo}>
                        <div style={styles.contactName}>{contact.name}</div>
                        {contact.email && (
                          <div style={styles.contactDetail}>📧 {contact.email}</div>
                        )}
                        {contact.phone && (
                          <div style={styles.contactDetail}>📱 {contact.phone}</div>
                        )}
                      </div>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Limits Tab */}
          {activeTab === 'limits' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Spending Limits</div>

              <div style={styles.limitCard}>
                <div style={styles.limitHeader}>
                  <div style={styles.limitTitle}>Daily Limit</div>
                  <div style={styles.limitAmount}>{formatCurrency(limits.daily_limit)}</div>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min((limits.daily_used / limits.daily_limit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div style={styles.limitText}>
                  Used: {formatCurrency(limits.daily_used)} of {formatCurrency(limits.daily_limit)}
                </div>
              </div>

              <div style={styles.limitCard}>
                <div style={styles.limitHeader}>
                  <div style={styles.limitTitle}>Monthly Limit</div>
                  <div style={styles.limitAmount}>{formatCurrency(limits.monthly_limit)}</div>
                </div>
                <div style={styles.progressBar}>
                  <div 
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min((limits.monthly_used / limits.monthly_limit) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <div style={styles.limitText}>
                  Used: {formatCurrency(limits.monthly_used)} of {formatCurrency(limits.monthly_limit)}
                </div>
              </div>

              <div style={styles.infoBox}>
                <h4>About Zelle Limits</h4>
                <ul>
                  <li>Daily limit resets at midnight Eastern Time</li>
                  <li>Monthly limit resets on the 1st of each month</li>
                  <li>Limits apply to outgoing payments only</li>
                  <li>Contact us to request limit increases</li>
                </ul>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div style={styles.tabContent}>
              <div style={styles.sectionTitle}>Security Settings</div>

              <div style={styles.securityCard}>
                <div style={styles.securityHeader}>
                  <div style={styles.securityIcon}>🔐</div>
                  <div>
                    <div style={styles.securityTitle}>Two-Factor Authentication</div>
                    <div style={styles.securityDesc}>Enabled for all Zelle transactions</div>
                  </div>
                  <div style={styles.statusBadge}>Active</div>
                </div>
              </div>

              <div style={styles.securityCard}>
                <div style={styles.securityHeader}>
                  <div style={styles.securityIcon}>📱</div>
                  <div>
                    <div style={styles.securityTitle}>SMS Notifications</div>
                    <div style={styles.securityDesc}>Get alerts for all transactions</div>
                  </div>
                  <div style={styles.statusBadge}>Active</div>
                </div>
              </div>

              <div style={styles.securityCard}>
                <div style={styles.securityHeader}>
                  <div style={styles.securityIcon}>📧</div>
                  <div>
                    <div style={styles.securityTitle}>Email Confirmations</div>
                    <div style={styles.securityDesc}>Receive email receipts</div>
                  </div>
                  <div style={styles.statusBadge}>Active</div>
                </div>
              </div>

              <div style={styles.infoBox}>
                <h4>Security Tips</h4>
                <ul>
                  <li>Only send money to people you know and trust</li>
                  <li>Verify recipient information before sending</li>
                  <li>Never send money to someone you haven't met</li>
                  <li>Report suspicious activity immediately</li>
                  <li>Keep your contact information up to date</li>
                </ul>
              </div>
            </div>
          )}
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
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)',
    borderBottom: '3px solid #059669'
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
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  content: {
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto'
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
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
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
  tabContainer: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '0.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem'
  },
  tab: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#64748b'
  },
  activeTab: {
    backgroundColor: '#1A3E6F',
    color: 'white'
  },
  tabContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '2rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  contactsList: {
    marginTop: '2rem'
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '0.75rem'
  },
  contactInfo: {
    flex: 1
  },
  contactName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  contactDetail: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '0.125rem'
  },
  deleteButton: {
    padding: '0.5rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  limitCard: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem'
  },
  limitHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  limitTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  limitAmount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#6B46C1'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1A3E6F',
    transition: 'width 0.3s ease'
  },
  limitText: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  securityCard: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem'
  },
  securityHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  securityIcon: {
    fontSize: '1.5rem'
  },
  securityTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  securityDesc: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  statusBadge: {
    marginLeft: 'auto',
    padding: '0.25rem 0.75rem',
    backgroundColor: '#059669',
    color: 'white',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  infoBox: {
    padding: '1.5rem',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginTop: '1.5rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  emptyText: {
    fontSize: '0.9rem',
    margin: 0
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};