import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [setupMessage, setSetupMessage] = useState('');
  const [setupMessageType, setSetupMessageType] = useState('success');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
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

  const [setupForm, setSetupForm] = useState({
    oakline_tag: '',
    display_name: '',
    bio: ''
  });

  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    oakline_tag: ''
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

  const showMsg = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSetupProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSetupMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSetupMessage('Please sign in to continue');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      // Check if tag already exists
      if (oaklineProfile?.oakline_tag) {
        setSetupMessage('You already have an Oakline tag set up');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      // Basic validation - minimal checks
      const tag = setupForm.oakline_tag.toLowerCase().trim();
      if (!tag || tag.length < 3) {
        setSetupMessage('Tag must be at least 3 characters');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      if (tag.length > 20) {
        setSetupMessage('Tag must be 20 characters or less');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      if (!setupForm.display_name || setupForm.display_name.trim().length === 0) {
        setSetupMessage('Display name is required');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/oakline-pay-setup-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...setupForm,
          oakline_tag: tag
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setSetupMessage(data.error || 'Failed to create your tag');
        setSetupMessageType('error');
        setLoading(false);
        return;
      }

      setSuccessMessage('Your Oakline tag has been created successfully!');
      setShowSuccessModal(true);
      setShowSetupModal(false);
      setSetupForm({ oakline_tag: '', display_name: '', bio: '' });
      setTimeout(() => {
        setShowSuccessModal(false);
        checkUserAndLoadData();
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setSetupMessage('An error occurred. Please try again.');
      setSetupMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showMsg('Please sign in to continue', 'error');
        setLoading(false);
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
        showMsg(data.error || 'Transfer failed', 'error');
        setLoading(false);
        return;
      }

      setPendingTransaction({
        ...data,
        amount: data.amount || sendForm.amount
      });
      setShowVerifyModal(true);
    } catch (error) {
      console.error('Error sending money:', error);
      showMsg('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);

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
        showMsg(data.error || 'Verification failed', 'error');
        setLoading(false);
        return;
      }

      showMsg(`✅ Success! $${data.amount.toFixed(2)} sent`, 'success');
      setShowVerifyModal(false);
      setPendingTransaction(null);
      setVerifyForm({ code: '' });
      setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error verifying:', error);
      showMsg('Verification failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('oakline_pay_requests')
        .insert({
          requester_id: user.id,
          requester_account_id: requestForm.from_account,
          recipient_contact: requestForm.recipient_contact,
          recipient_type: requestForm.recipient_type,
          amount: requestForm.amount,
          memo: requestForm.memo || null
        });

      if (error) throw error;

      showMsg('✅ Payment request sent!', 'success');
      setShowRequestModal(false);
      setRequestForm({ from_account: '', recipient_contact: '', recipient_type: 'oakline_tag', amount: '', memo: '' });
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error:', error);
      showMsg('Failed to send payment request', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('oakline_pay_contacts')
        .insert({
          user_id: user.id,
          contact_name: contactForm.name,
          contact_email: contactForm.email || null,
          contact_phone: contactForm.phone || null,
          contact_oakline_tag: contactForm.oakline_tag || null
        });

      if (error) throw error;

      showMsg('✅ Contact added successfully', 'success');
      setShowAddContactModal(false);
      setContactForm({ name: '', email: '', phone: '', oakline_tag: '' });
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error:', error);
      showMsg('Failed to add contact', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Remove this contact?')) return;

    try {
      const { error } = await supabase
        .from('oakline_pay_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      showMsg('✅ Contact removed', 'success');
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error:', error);
      showMsg('Failed to remove contact', 'error');
    }
  };

  const handleToggleFavorite = async (contactId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('oakline_pay_contacts')
        .update({ is_favorite: !currentStatus })
        .eq('id', contactId);

      if (error) throw error;

      showMsg(currentStatus ? '✅ Removed from favorites' : '✅ Added to favorites', 'success');
      await checkUserAndLoadData();
    } catch (error) {
      console.error('Error:', error);
      showMsg('Failed to update', 'error');
    }
  };

  const generateQRCode = async () => {
    if (!oaklineProfile?.oakline_tag) {
      showMsg('Please set up your Oakline tag first', 'error');
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
      showMsg('Failed to generate QR code', 'error');
    }
  };

  if (loading && !user) {
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
        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}</style>
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
            {oaklineProfile?.oakline_tag && (
              <div style={styles.tagBadge}>
                ✓ Your Oakline Tag: <strong>@{oaklineProfile.oakline_tag}</strong>
              </div>
            )}
            {!oaklineProfile?.oakline_tag && (
              <div style={styles.warningBadge}>
                ⚠️ Set up your Oakline tag to get started
              </div>
            )}
          </div>

          {/* Message Alert */}
          {message && (
            <div style={{
              ...styles.messageAlert,
              backgroundColor: messageType === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
              borderColor: messageType === 'success' ? '#059669' : '#dc2626',
              color: messageType === 'success' ? '#047857' : '#991b1b'
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
                <h2 style={styles.sectionTitle}>💸 Send Money</h2>
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
                        <option value="">Select account</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.account_type?.replace('_', ' ')?.toUpperCase()} - ${parseFloat(acc.balance || 0).toFixed(2)}
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
                        <option value="phone">Phone</option>
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

                  <button type="submit" style={styles.primaryButton} disabled={loading}>
                    {loading ? 'Processing...' : '💸 Send Money'}
                  </button>
                </form>

                <div style={styles.actionButtons}>
                  <button onClick={generateQRCode} style={styles.secondaryButton} disabled={loading || !oaklineProfile?.oakline_tag}>
                    📱 Show QR Code
                  </button>
                  <button onClick={() => setShowRequestModal(true)} style={styles.secondaryButton} disabled={loading}>
                    📋 Request Money
                  </button>
                </div>
              </div>
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                <h2 style={styles.sectionTitle}>📋 Payment Requests</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                      <p style={{ color: '#64748b' }}>No pending payment requests</p>
                    </div>
                  ) : (
                    paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').map(request => (
                      <div key={request.id} style={styles.requestCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#059669' }}>
                              ${parseFloat(request.amount).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Requested by</div>
                          </div>
                          <span style={{ backgroundColor: '#fbbf24', color: '#92400e', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
                            Pending
                          </span>
                        </div>
                        {request.memo && (
                          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem', fontStyle: 'italic' }}>
                            "{request.memo}"
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button style={{ ...styles.secondaryButton, flex: 1 }} onClick={() => showMsg('Accept request flow to be implemented')}>
                            ✓ Accept
                          </button>
                          <button style={{ ...styles.secondaryButton, flex: 1, backgroundColor: '#ef4444' }} onClick={() => showMsg('Decline recorded')}>
                            ✗ Decline
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={styles.sectionTitle}>👥 Saved Contacts</h2>
                  <button onClick={() => setShowAddContactModal(true)} style={styles.primaryButton}>
                    + Add Contact
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {contacts.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
                      <p style={{ color: '#64748b' }}>No saved contacts yet</p>
                    </div>
                  ) : (
                    contacts.map(contact => (
                      <div key={contact.id} style={styles.contactCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                          <div>
                            <h3 style={{ margin: 0, color: '#1a365d', fontWeight: '700', fontSize: '1.1rem' }}>
                              {contact.contact_name}
                            </h3>
                            {contact.contact_oakline_tag && (
                              <p style={{ margin: '0.25rem 0', color: '#059669', fontSize: '0.85rem', fontWeight: '600' }}>
                                @{contact.contact_oakline_tag}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleToggleFavorite(contact.id, contact.is_favorite)}
                            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                          >
                            {contact.is_favorite ? '⭐' : '☆'}
                          </button>
                        </div>
                        {contact.contact_email && (
                          <p style={{ margin: '0.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                            📧 {contact.contact_email}
                          </p>
                        )}
                        {contact.contact_phone && (
                          <p style={{ margin: '0.5rem 0', color: '#64748b', fontSize: '0.85rem' }}>
                            📱 {contact.contact_phone}
                          </p>
                        )}
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          style={{ marginTop: '1rem', width: '100%', padding: '0.6rem', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                        >
                          Remove Contact
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div>
                <h2 style={styles.sectionTitle}>📊 Transaction History</h2>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {transactions.length === 0 ? (
                    <div style={styles.emptyState}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
                      <p style={{ color: '#64748b' }}>No transactions yet</p>
                    </div>
                  ) : (
                    transactions.map(txn => (
                      <div key={txn.id} style={styles.transactionCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: 0, color: '#1a365d', fontWeight: '600' }}>
                              {txn.sender_id === user?.id ? '📤 Sent' : '📥 Received'}
                            </h3>
                            <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                              {new Date(txn.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: '700', color: txn.sender_id === user?.id ? '#ef4444' : '#059669' }}>
                              {txn.sender_id === user?.id ? '-' : '+'} ${parseFloat(txn.amount).toFixed(2)}
                            </div>
                            <span style={{ backgroundColor: txn.status === 'completed' ? '#d1fae5' : '#fef3c7', color: txn.status === 'completed' ? '#047857' : '#92400e', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {txn.status?.toUpperCase() || 'PENDING'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 style={styles.sectionTitle}>⚙️ Settings</h2>
                <div style={styles.settingsCard}>
                  {!oaklineProfile?.oakline_tag ? (
                    <div>
                      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</div>
                        <h3 style={{ color: '#1a365d', marginBottom: '0.5rem' }}>Set Up Your Oakline Tag</h3>
                        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                          Create a unique identifier to receive money instantly
                        </p>
                        <button
                          onClick={() => setShowSetupModal(true)}
                          style={styles.primaryButton}
                        >
                          🏷️ Create Oakline Tag
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                      <div style={styles.settingItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ color: '#1a365d', fontWeight: '600', marginBottom: '0.5rem' }}>
                              Oakline Tag
                            </h3>
                            <p style={{ color: '#059669', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
                              @{oaklineProfile.oakline_tag}
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              setSetupForm({ oakline_tag: oaklineProfile.oakline_tag, display_name: oaklineProfile.display_name, bio: oaklineProfile.bio });
                              setShowEditTagModal(true);
                            }}
                            style={{ ...styles.secondaryButton, whiteSpace: 'nowrap', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
                          >
                            ✎ Edit
                          </button>
                        </div>
                      </div>
                      <div style={styles.settingItem}>
                        <h3 style={{ color: '#1a365d', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Display Name
                        </h3>
                        <p style={{ color: '#64748b', margin: 0 }}>
                          {oaklineProfile.display_name || 'Not set'}
                        </p>
                      </div>
                      <div style={styles.settingItem}>
                        <h3 style={{ color: '#1a365d', fontWeight: '600', marginBottom: '0.5rem' }}>
                          Bio
                        </h3>
                        <p style={{ color: '#64748b', margin: 0 }}>
                          {oaklineProfile.bio || 'No bio set'}
                        </p>
                      </div>
                      <div style={{ backgroundColor: '#eff6ff', border: '2px solid #bfdbfe', borderRadius: '12px', padding: '1rem' }}>
                        <p style={{ color: '#1e40af', margin: 0, fontSize: '0.9rem' }}>
                          <strong>💡 Tip:</strong> Share your Oakline tag with friends to receive money instantly. Generate your QR code in the Send tab!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Setup Oakline Tag Modal */}
      {showSetupModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSetupModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '2px solid #f0f4f8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏷️</div>
              <h2 style={{ margin: 0, color: '#0f2027', fontSize: '1.6rem', fontWeight: '700', marginBottom: '0.5rem' }}>Create Your Oakline Tag</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Your unique handle to receive money instantly</p>
            </div>

            {/* Message Alert */}
            {setupMessage && (
              <div style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                backgroundColor: setupMessageType === 'success' ? '#ecfdf5' : '#f8f4f1',
                borderLeft: `4px solid ${setupMessageType === 'success' ? '#10b981' : '#f97316'}`,
                color: setupMessageType === 'success' ? '#065f46' : '#7c2d12',
                fontWeight: '500',
                fontSize: '0.9rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{setupMessageType === 'success' ? '✓' : 'ℹ'}</span>
                <span>{setupMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSetupProfile} style={{ marginTop: '1.5rem' }}>
              {/* Tag Input */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ color: '#1a365d', fontWeight: '700', fontSize: '0.95rem' }}>Oakline Tag *</label>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '500' }}>3-20 characters</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#059669', fontWeight: '700', fontSize: '1rem' }}>@</span>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      paddingLeft: '2.5rem',
                      paddingRight: '1rem',
                      paddingTop: '0.75rem',
                      paddingBottom: '0.75rem',
                      border: '2px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.3s',
                      outline: 'none'
                    }}
                    value={setupForm.oakline_tag}
                    onChange={(e) => setSetupForm({ ...setupForm, oakline_tag: e.target.value.toLowerCase() })}
                    placeholder="john_doe"
                    maxLength="20"
                  />
                </div>
                <div style={{ marginTop: '0.75rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                  <p style={{ margin: '0 0 0.5rem', fontWeight: '600' }}>✓ Valid examples:</p>
                  <p style={{ margin: '0 0 0.5rem', color: '#059669' }}><strong>john_doe</strong> • <strong>jane-smith</strong> • <strong>user123</strong></p>
                  <p style={{ margin: 0, fontWeight: '600' }}>✗ Not allowed: Spaces, special characters (except - and _)</p>
                </div>
              </div>

              {/* Display Name */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', color: '#1a365d', fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Display Name *</label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.3s',
                    outline: 'none'
                  }}
                  value={setupForm.display_name}
                  onChange={(e) => setSetupForm({ ...setupForm, display_name: e.target.value })}
                  placeholder="John Doe"
                  maxLength="50"
                />
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  This is how people will see your name
                </p>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', color: '#1a365d', fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Bio (Optional)</label>
                <textarea
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: '60px',
                    outline: 'none'
                  }}
                  value={setupForm.bio}
                  onChange={(e) => setSetupForm({ ...setupForm, bio: e.target.value })}
                  placeholder="Software Engineer • San Francisco"
                  maxLength="150"
                />
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {setupForm.bio.length}/150 characters
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="submit" 
                  style={{
                    flex: 1,
                    padding: '0.9rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                    opacity: (loading || !setupForm.oakline_tag || !setupForm.display_name) ? 0.5 : 1
                  }} 
                  disabled={loading || !setupForm.oakline_tag || !setupForm.display_name}
                >
                  {loading ? 'Creating...' : '✓ Create Tag'}
                </button>
                <button 
                  type="button" 
                  style={{
                    flex: 1,
                    padding: '0.9rem',
                    backgroundColor: '#e0e7ff',
                    color: '#1e40af',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }} 
                  onClick={() => { setShowSetupModal(false); setSetupMessage(''); }} 
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Money Modal */}
      {showRequestModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRequestModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📋 Request Money</h2>
            <form onSubmit={handleRequestMoney} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={styles.label}>From Account *</label>
                <select style={styles.select} value={requestForm.from_account} onChange={(e) => setRequestForm({ ...requestForm, from_account: e.target.value })} required>
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.replace('_', ' ')?.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>Recipient Type</label>
                <select style={styles.select} value={requestForm.recipient_type} onChange={(e) => setRequestForm({ ...requestForm, recipient_type: e.target.value })}>
                  <option value="oakline_tag">Oakline Tag</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              <div>
                <label style={styles.label}>
                  {requestForm.recipient_type === 'oakline_tag' && 'Oakline Tag *'}
                  {requestForm.recipient_type === 'email' && 'Email Address *'}
                  {requestForm.recipient_type === 'phone' && 'Phone Number *'}
                </label>
                <input type="text" style={styles.input} value={requestForm.recipient_contact} onChange={(e) => setRequestForm({ ...requestForm, recipient_contact: e.target.value })} required />
              </div>

              <div>
                <label style={styles.label}>Amount ($) *</label>
                <input type="number" step="0.01" min="0.01" style={styles.input} value={requestForm.amount} onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })} placeholder="0.00" required />
              </div>

              <div>
                <label style={styles.label}>Memo (Optional)</label>
                <input type="text" style={styles.input} value={requestForm.memo} onChange={(e) => setRequestForm({ ...requestForm, memo: e.target.value })} placeholder="What's this for?" maxLength={100} />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ ...styles.primaryButton, flex: 1 }} disabled={loading}>
                  {loading ? 'Sending...' : '✓ Send Request'}
                </button>
                <button type="button" style={{ ...styles.secondaryButton, flex: 1 }} onClick={() => setShowRequestModal(false)} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddContactModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>👥 Add Contact</h2>
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={styles.label}>Contact Name *</label>
                <input type="text" style={styles.input} value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="John Doe" required />
              </div>

              <div>
                <label style={styles.label}>Oakline Tag (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: '#059669', marginRight: '0.5rem' }}>@</span>
                  <input type="text" style={{ ...styles.input, flex: 1 }} value={contactForm.oakline_tag} onChange={(e) => setContactForm({ ...contactForm, oakline_tag: e.target.value })} placeholder="johndoe" />
                </div>
              </div>

              <div>
                <label style={styles.label}>Email (Optional)</label>
                <input type="email" style={styles.input} value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="john@example.com" />
              </div>

              <div>
                <label style={styles.label}>Phone (Optional)</label>
                <input type="tel" style={styles.input} value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="+1234567890" />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ ...styles.primaryButton, flex: 1 }} disabled={loading}>
                  {loading ? 'Adding...' : '✓ Add Contact'}
                </button>
                <button type="button" style={{ ...styles.secondaryButton, flex: 1 }} onClick={() => setShowAddContactModal(false)} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerifyModal && pendingTransaction && (
        <div style={styles.modalOverlay} onClick={() => setShowVerifyModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '2px solid #f0f4f8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
              <h2 style={{ margin: 0, color: '#0f2027', fontSize: '1.6rem', fontWeight: '700', marginBottom: '0.5rem' }}>Verify Your Transfer</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>A verification code has been sent</p>
            </div>

            <form onSubmit={handleVerifyTransfer} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Email Info */}
              <div style={{ backgroundColor: '#ecfdf5', padding: '1rem 1.25rem', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Code Sent To:
                </p>
                <p style={{ margin: 0, color: '#047857', fontWeight: '600', fontSize: '1rem' }}>
                  {pendingTransaction.sender_email || 'your email'}
                </p>
              </div>

              {/* Transfer Details */}
              <div style={{ backgroundColor: '#f0fdf4', padding: '1.25rem', borderRadius: '10px', border: '2px solid #d1fae5' }}>
                <h3 style={{ color: '#1a365d', fontWeight: '700', margin: '0 0 0.75rem 0', fontSize: '0.95rem' }}>Transfer Amount</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Sending:</span>
                  <span style={{ color: '#059669', fontWeight: '700', fontSize: '1.4rem' }}>
                    ${parseFloat(pendingTransaction.amount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Verification Code Input */}
              <div>
                <label style={{ ...styles.label, marginBottom: '0.75rem' }}>Enter Verification Code *</label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    fontSize: '1.8rem',
                    letterSpacing: '0.8rem',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    border: '2px solid #e2e8f0',
                    borderRadius: '10px',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  value={verifyForm.code}
                  onChange={(e) => setVerifyForm({ code: e.target.value.toUpperCase() })}
                  placeholder="000000"
                  maxLength="6"
                  required
                  autoFocus
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Code expires in 10 minutes</p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  style={{
                    ...styles.primaryButton,
                    flex: 1,
                    padding: '0.9rem',
                    opacity: loading ? 0.6 : 1
                  }} 
                  disabled={loading || verifyForm.code.length !== 6}
                >
                  {loading ? 'Verifying...' : '✓ Confirm'}
                </button>
                <button 
                  type="button" 
                  style={{
                    ...styles.secondaryButton,
                    flex: 1,
                    padding: '0.9rem'
                  }} 
                  onClick={() => setShowVerifyModal(false)} 
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>

              {/* Help Text */}
              <div style={{ backgroundColor: '#eff6ff', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#1e40af', textAlign: 'center' }}>
                <p style={{ margin: 0 }}>💡 Check your email (including spam folder) for the 6-digit code</p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>📱 Share Your QR Code</h2>
            <p style={styles.modalSubtitle}>People can scan this to send you money</p>
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
  warningBadge: {
    display: 'inline-block',
    marginTop: '1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#dc2626',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
    fontWeight: '500',
    border: '1px solid #fca5a5'
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
  inlineAlert: {
    padding: '1rem 1.25rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid',
    fontWeight: '600',
    fontSize: '0.9rem',
    textAlign: 'center'
  },
  alertSuccess: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    borderColor: '#10b981',
    color: '#047857'
  },
  alertError: {
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderColor: '#ef4444',
    color: '#991b1b'
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
  requestCard: {
    backgroundColor: '#fffbeb',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '2px solid #fbbf24'
  },
  contactCard: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '2px solid #d1fae5'
  },
  transactionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '1rem',
    border: '2px solid #e2e8f0'
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
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    textAlign: 'center'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  modalSubtitle: {
    color: '#64748b',
    marginBottom: '1.5rem',
    fontSize: '0.95rem'
  },
  qrImage: {
    maxWidth: '100%',
    height: 'auto',
    marginBottom: '1.5rem',
    borderRadius: '12px'
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
