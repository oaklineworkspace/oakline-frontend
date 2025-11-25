import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import QRCode from 'qrcode';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function OaklinePayPage() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [oaklineProfile, setOaklineProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('send');
  const [showTabMenu, setShowTabMenu] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const router = useRouter();

  const [sendForm, setSendForm] = useState({
    from_account: '',
    recipient_contact: '',
    recipient_type: 'oakline_tag',
    amount: '',
    memo: ''
  });

  const [verifyForm, setVerifyForm] = useState({
    code: ''
  });

  const [requestForm, setRequestForm] = useState({
    from_account: '',
    recipient_contact: '',
    recipient_type: 'oakline_tag',
    amount: '',
    memo: ''
  });

  const [splitForm, setSplitForm] = useState({
    from_account: '',
    recipients: [{ contact: '', amount: '' }],
    total_amount: '',
    memo: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    oakline_tag: '',
    nickname: ''
  });

  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupForm, setSetupForm] = useState({
    oakline_tag: '',
    display_name: '',
    bio: ''
  });

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

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      // Check if user requires verification
      if (profile?.requires_verification) {
        router.push('/verify-identity');
        return;
      }
      
      setUserProfile(profile);

      // Load Oakline Pay profile
      const { data: oaklinePay } = await supabase
        .from('oakline_pay_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      setOaklineProfile(oaklinePay);

      // Load accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setSendForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      // Load settings
      const { data: paySettings } = await supabase
        .from('oakline_pay_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      setSettings(paySettings);

      // Load contacts
      const { data: payContacts } = await supabase
        .from('oakline_pay_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_favorite', { ascending: false })
        .order('contact_name');
      setContacts(payContacts || []);

      // Load transactions
      const { data: payTxns } = await supabase
        .from('oakline_pay_transactions')
        .select('*')
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);
      setTransactions(payTxns || []);

      // Load payment requests
      const { data: requests } = await supabase
        .from('oakline_pay_requests')
        .select('*')
        .or(`requester_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false });
      setPaymentRequests(requests || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Please sign in to continue');
        return;
      }

      const response = await fetch('/api/oakline-pay-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sender_account_id: sendForm.from_account,
          recipient_contact: sendForm.recipient_contact,
          recipient_type: sendForm.recipient_type,
          amount: sendForm.amount,
          memo: sendForm.memo,
          step: 'initiate'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Transfer failed');
        return;
      }

      setPendingTransaction(data);
      setShowVerifyModal(true);
      setMessage('Verification code sent to your email');
    } catch (error) {
      console.error('Error sending money:', error);
      setMessage('An error occurred. Please try again.');
    }
  };

  const handleVerifyTransfer = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/oakline-pay-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          transaction_id: pendingTransaction.transaction_id,
          verification_code: verifyForm.code,
          step: 'verify'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Verification failed');
        return;
      }

      setMessage(`✅ Success! $${data.amount.toFixed(2)} sent. New balance: $${data.new_balance.toFixed(2)}`);
      setShowVerifyModal(false);
      setPendingTransaction(null);
      setVerifyForm({ code: '' });
      setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error verifying:', error);
      setMessage('Verification failed. Please try again.');
    }
  };

  const generateQRCode = async () => {
    if (!oaklineProfile?.oakline_tag) {
      setMessage('Please set up your Oakline tag first');
      return;
    }

    try {
      const qrData = JSON.stringify({
        type: 'oakline_pay',
        tag: oaklineProfile.oakline_tag,
        name: oaklineProfile.display_name || userProfile?.full_name || 'User'
      });

      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1A3E6F',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataUrl(dataUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error('QR generation error:', error);
      setMessage('Failed to generate QR code');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={{ color: '#64748b', marginTop: '1rem' }}>Loading Oakline Pay...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'send', label: '📤 Send', count: 0 },
    { id: 'requests', label: '📋 Requests', count: paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length },
    { id: 'contacts', label: '👥 Contacts', count: contacts.length },
    { id: 'history', label: '📊 History', count: 0 },
    { id: 'settings', label: '⚙️ Settings', count: 0 }
  ];

  return (
    <>
      <Head>
        <title>Oakline Pay - Instant Transfers</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        {/* Professional Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <main style={styles.main}>
          {/* Welcome Section */}
          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>💸 Oakline Pay</h1>
            <p style={styles.welcomeSubtitle}>Send money instantly to other Oakline Bank customers</p>
            {oaklineProfile && (
              <div style={styles.tagBadge}>
                Your Oakline Tag: <strong>@{oaklineProfile.oakline_tag}</strong>
              </div>
            )}
          </div>

          {/* Message Alert */}
          {message && (
            <div style={{
              ...styles.messageAlert,
              backgroundColor: message.toLowerCase().includes('success') || message.toLowerCase().includes('✅') ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              borderColor: message.toLowerCase().includes('success') || message.toLowerCase().includes('✅') ? '#059669' : '#dc2626',
              color: message.toLowerCase().includes('success') || message.toLowerCase().includes('✅') ? '#047857' : '#991b1b'
            }}>
              {message}
            </div>
          )}

          {/* Tab Navigation - Responsive */}
          <div style={styles.tabsContainer}>
            {!isMobile ? (
              <div style={styles.tabsGrid}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    style={{
                      ...styles.tab,
                      ...(activeTab === tab.id ? styles.tabActive : {})
                    }}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                    {tab.count > 0 && <span style={styles.tabBadge}>{tab.count}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div style={styles.mobileTabsWrapper}>
                <div style={styles.mobileTabsScroll}>
                  {tabs.slice(0, 4).map(tab => (
                    <button
                      key={tab.id}
                      style={{
                        ...styles.mobileTab,
                        ...(activeTab === tab.id ? styles.mobileTabActive : {})
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                      {tab.count > 0 && <span style={styles.tabBadge}>{tab.count}</span>}
                    </button>
                  ))}
                </div>
                {/* Settings Dropdown Menu for Mobile */}
                <div style={styles.settingsMenuContainer}>
                  <button
                    style={{
                      ...styles.mobileTab,
                      ...(activeTab === 'settings' ? styles.mobileTabActive : {}),
                      minWidth: '60px'
                    }}
                    onClick={() => setShowTabMenu(!showTabMenu)}
                  >
                    ⚙️
                  </button>
                  {showTabMenu && (
                    <div style={styles.settingsDropdown}>
                      <button
                        style={styles.settingsOption}
                        onClick={() => {
                          setActiveTab('settings');
                          setShowTabMenu(false);
                        }}
                      >
                        ⚙️ Settings
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div style={styles.contentSection}>
            {/* Send Money Tab */}
            {activeTab === 'send' && (
              <div>
                <h2 style={styles.sectionTitle}>Send Money</h2>
                <form onSubmit={handleSendMoney} style={styles.form}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>From Account *</label>
                      <select
                        style={styles.select}
                        value={sendForm.from_account}
                        onChange={(e) => setSendForm({ ...sendForm, from_account: e.target.value })}
                        required
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_type} - ${parseFloat(acc.balance || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Recipient Type</label>
                      <select
                        style={styles.select}
                        value={sendForm.recipient_type}
                        onChange={(e) => setSendForm({ ...sendForm, recipient_type: e.target.value, recipient_contact: '' })}
                      >
                        <option value="oakline_tag">Oakline Tag</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone Number</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      {sendForm.recipient_type === 'oakline_tag' && 'Oakline Tag (e.g., @johndoe) *'}
                      {sendForm.recipient_type === 'email' && 'Email Address *'}
                      {sendForm.recipient_type === 'phone' && 'Phone Number *'}
                    </label>
                    <input
                      type={sendForm.recipient_type === 'email' ? 'email' : 'text'}
                      style={styles.input}
                      value={sendForm.recipient_contact}
                      onChange={(e) => setSendForm({ ...sendForm, recipient_contact: e.target.value })}
                      placeholder={
                        sendForm.recipient_type === 'oakline_tag' ? '@username' :
                        sendForm.recipient_type === 'email' ? 'email@example.com' :
                        '+1234567890'
                      }
                      required
                    />
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Amount ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        style={styles.input}
                        value={sendForm.amount}
                        onChange={(e) => setSendForm({ ...sendForm, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Memo (Optional)</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={sendForm.memo}
                        onChange={(e) => setSendForm({ ...sendForm, memo: e.target.value })}
                        placeholder="What's this for?"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <button type="submit" style={styles.primaryButton}>
                    💸 Send Money
                  </button>
                </form>

                <div style={styles.actionButtons}>
                  <button onClick={generateQRCode} style={styles.secondaryButton}>
                    📱 Show QR Code
                  </button>
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                <h2 style={styles.sectionTitle}>Payment Requests</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  {paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length} pending requests
                </p>
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                  <p>No pending payment requests</p>
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div>
                <h2 style={styles.sectionTitle}>Saved Contacts</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                </p>
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                  <p>No saved contacts yet</p>
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 style={styles.sectionTitle}>Transaction History</h2>
                <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                  {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                </p>
                <div style={styles.emptyState}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                  <p>No transactions yet</p>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 style={styles.sectionTitle}>⚙️ Settings</h2>
                <div style={styles.settingsCard}>
                  <div style={styles.settingItem}>
                    <h3 style={{ color: '#1a365d', fontWeight: '600', marginBottom: '0.5rem' }}>Oakline Tag</h3>
                    <p style={{ color: '#64748b' }}>
                      {oaklineProfile?.oakline_tag ? `@${oaklineProfile.oakline_tag}` : 'Not set up yet'}
                    </p>
                  </div>
                  <div style={styles.settingItem}>
                    <h3 style={{ color: '#1a365d', fontWeight: '600', marginBottom: '0.5rem' }}>Display Name</h3>
                    <p style={{ color: '#64748b' }}>
                      {oaklineProfile?.display_name || 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Share Your QR Code</h2>
            <p style={styles.modalText}>People can scan this to send you money</p>
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" style={styles.qrImage} />
            )}
            <button onClick={() => setShowQRModal(false)} style={styles.primaryButton}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a1f44',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflowX: 'hidden'
  },
  header: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderBottom: '3px solid #059669'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'white'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  logoText: {
    fontSize: 'clamp(1rem, 4vw, 1.4rem)',
    fontWeight: '700'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(1rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 2rem)'
  },
  welcomeSection: {
    marginBottom: '2.5rem',
    textAlign: 'center'
  },
  welcomeTitle: {
    fontSize: 'clamp(1.5rem, 5vw, 2rem)',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '0.5rem'
  },
  welcomeSubtitle: {
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    color: '#cbd5e1'
  },
  tagBadge: {
    display: 'inline-block',
    marginTop: '1rem',
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    color: '#10b981',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
    fontWeight: '500',
    border: '1px solid #6ee7b7'
  },
  messageAlert: {
    padding: '1.25rem 1.5rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid',
    fontWeight: '600',
    fontSize: '0.95rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  tabsContainer: {
    marginBottom: '2rem'
  },
  tabsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem'
  },
  tab: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  tabActive: {
    backgroundColor: '#059669',
    color: 'white',
    borderColor: '#059669',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
  },
  tabBadge: {
    display: 'inline-block',
    backgroundColor: '#ff6b6b',
    color: 'white',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  mobileTabsWrapper: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    position: 'relative'
  },
  mobileTabsScroll: {
    display: 'flex',
    gap: '0.75rem',
    overflowX: 'auto',
    flex: 1,
    paddingBottom: '0.5rem',
    scrollBehavior: 'smooth'
  },
  mobileTab: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    whiteSpace: 'nowrap',
    minWidth: 'max-content'
  },
  mobileTabActive: {
    backgroundColor: '#059669',
    color: 'white',
    borderColor: '#059669'
  },
  settingsMenuContainer: {
    position: 'relative'
  },
  settingsDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    zIndex: 100,
    minWidth: '150px'
  },
  settingsOption: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1.5rem',
    border: 'none',
    backgroundColor: 'white',
    color: '#1a365d',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    borderRadius: '10px',
    transition: 'all 0.3s',
    textAlign: 'left'
  },
  contentSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    padding: 'clamp(1rem, 3vw, 2rem)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    border: '1px solid #059669'
  },
  sectionTitle: {
    fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #059669'
  },
  form: {
    marginBottom: '2rem'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  input: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    transition: 'border-color 0.3s'
  },
  select: {
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    transition: 'border-color 0.3s',
    cursor: 'pointer'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap'
  },
  settingsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e2e8f0'
  },
  settingItem: {
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
    padding: '1rem'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  modalText: {
    color: '#64748b',
    marginBottom: '1.5rem',
    fontSize: '0.95rem'
  },
  qrImage: {
    maxWidth: '100%',
    height: 'auto',
    marginBottom: '1.5rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }
};
