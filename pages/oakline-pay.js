import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import QRCode from 'qrcode';

export default function OaklinePayPage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [oaklineProfile, setOaklineProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('send');
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

      setMessage(`Success! $${data.amount.toFixed(2)} sent. New balance: $${data.new_balance.toFixed(2)}`);
      setShowVerifyModal(false);
      setPendingTransaction(null);
      setVerifyForm({ code: '' });
      setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
      checkUserAndLoadData(); // Reload data
    } catch (error) {
      console.error('Error verifying:', error);
      setMessage('Verification failed. Please try again.');
    }
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase
        .from('oakline_pay_requests')
        .insert({
          requester_id: user.id,
          requester_account_id: requestForm.from_account,
          recipient_contact: requestForm.recipient_contact,
          amount: requestForm.amount,
          memo: requestForm.memo || null
        });

      if (error) throw error;

      setMessage('Payment request sent successfully!');
      setShowRequestModal(false);
      setRequestForm({ from_account: '', recipient_contact: '', recipient_type: 'oakline_tag', amount: '', memo: '' });
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error requesting money:', error);
      setMessage('Failed to send payment request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    if (!confirm('Accept this payment request?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const request = paymentRequests.find(r => r.id === requestId);

      // Update request status
      await supabase
        .from('oakline_pay_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      // Initiate payment
      const response = await fetch('/api/oakline-pay-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sender_account_id: accounts[0]?.id,
          recipient_contact: request.requester_id,
          recipient_type: 'user_id',
          amount: request.amount,
          memo: `Payment for request: ${request.memo || 'No memo'}`,
          step: 'initiate'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Payment failed');
        return;
      }

      setPendingTransaction(data);
      setShowVerifyModal(true);
      setMessage('Request accepted. Complete verification to send payment.');
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error accepting request:', error);
      setMessage('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    if (!confirm('Decline this payment request?')) return;

    try {
      await supabase
        .from('oakline_pay_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);

      setMessage('Request declined');
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error declining request:', error);
      setMessage('Failed to decline request');
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const { error } = await supabase
        .from('oakline_pay_contacts')
        .insert({
          user_id: user.id,
          contact_name: contactForm.name,
          contact_email: contactForm.email || null,
          contact_phone: contactForm.phone || null,
          contact_oakline_tag: contactForm.oakline_tag || null,
          nickname: contactForm.nickname || null
        });

      if (error) throw error;

      setMessage('Contact added successfully');
      setContactForm({ name: '', email: '', phone: '', oakline_tag: '', nickname: '' });
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error adding contact:', error);
      setMessage('Failed to add contact');
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

      setMessage('Contact removed');
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
      setMessage('Failed to remove contact');
    }
  };

  const handleToggleFavorite = async (contactId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('oakline_pay_contacts')
        .update({ is_favorite: !currentStatus })
        .eq('id', contactId);

      if (error) throw error;

      setMessage(currentStatus ? 'Removed from favorites' : 'Added to favorites');
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setMessage('Failed to update favorite status');
    }
  };

  const handleSetupProfile = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/oakline-pay-setup-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(setupForm)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to setup profile');
        return;
      }

      setMessage('Oakline tag created successfully!');
      setShowSetupModal(false);
      setSetupForm({ oakline_tag: '', display_name: '', bio: '' });
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error setting up profile:', error);
      setMessage('Failed to setup profile');
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
        <p>Loading Oakline Pay...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Oakline Pay - Instant Transfers</title>
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
          <h1 style={styles.title}>Oakline Pay</h1>
          <p style={styles.subtitle}>Send money instantly to other Oakline Bank customers</p>
          {oaklineProfile && (
            <div style={styles.tagBadge}>
              Your tag: <strong>{oaklineProfile.oakline_tag}</strong>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.toLowerCase().includes('success') || message.toLowerCase().includes('sent') ? '#d4edda' : '#f8d7da',
            color: message.toLowerCase().includes('success') || message.toLowerCase().includes('sent') ? '#155724' : '#721c24'
          }}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={activeTab === 'send' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('send')}
          >
            Send Money
          </button>
          <button
            style={activeTab === 'requests' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('requests')}
          >
            Requests {paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length > 0 && `(${paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length})`}
          </button>
          <button
            style={activeTab === 'contacts' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
          <button
            style={activeTab === 'history' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button
            style={activeTab === 'settings' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Send Money Tab */}
        {activeTab === 'send' && (
          <div style={styles.tabContent}>
            <form onSubmit={handleSendMoney} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account</label>
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
                  <option value="oakline_tag">Oakline Tag (@username)</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone Number</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  {sendForm.recipient_type === 'oakline_tag' && 'Oakline Tag (e.g., @johndoe)'}
                  {sendForm.recipient_type === 'email' && 'Email Address'}
                  {sendForm.recipient_type === 'phone' && 'Phone Number'}
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount ($)</label>
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

              <button type="submit" style={styles.primaryButton}>
                Continue →
              </button>
            </form>

            <div style={styles.qrSection}>
              <button onClick={generateQRCode} style={styles.secondaryButton}>
                Show My QR Code
              </button>
              <p style={styles.helpText}>Share your QR code to receive money</p>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button onClick={() => setShowRequestModal(true)} style={styles.secondaryButton}>
                💸 Request Money
              </button>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Payment Requests</h3>
            
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1A3E6F', marginBottom: '1rem' }}>
                Received Requests ({paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length})
              </h4>
              {paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').length === 0 ? (
                <p style={styles.emptyState}>No pending requests</p>
              ) : (
                paymentRequests.filter(r => r.recipient_id === user?.id && r.status === 'pending').map(request => (
                  <div key={request.id} style={{ ...styles.contactCard, backgroundColor: '#fffbeb', border: '2px solid #fbbf24' }}>
                    <div>
                      <h4 style={styles.contactName}>
                        ${parseFloat(request.amount).toFixed(2)}
                      </h4>
                      <p style={styles.contactDetail}>From: {request.recipient_contact}</p>
                      {request.memo && <p style={styles.contactDetail}>"{request.memo}"</p>}
                      <p style={styles.contactDetail}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        style={{ ...styles.deleteButton, backgroundColor: '#059669' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(request.id)}
                        style={styles.deleteButton}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1A3E6F', marginBottom: '1rem' }}>
                Sent Requests
              </h4>
              {paymentRequests.filter(r => r.requester_id === user?.id).length === 0 ? (
                <p style={styles.emptyState}>No sent requests</p>
              ) : (
                paymentRequests.filter(r => r.requester_id === user?.id).map(request => (
                  <div key={request.id} style={styles.contactCard}>
                    <div>
                      <h4 style={styles.contactName}>
                        ${parseFloat(request.amount).toFixed(2)}
                      </h4>
                      <p style={styles.contactDetail}>To: {request.recipient_contact}</p>
                      {request.memo && <p style={styles.contactDetail}>"{request.memo}"</p>}
                      <p style={styles.contactDetail}>
                        Status: <span style={{ 
                          color: request.status === 'accepted' ? '#059669' : 
                                 request.status === 'declined' ? '#dc3545' : '#64748b',
                          fontWeight: '600'
                        }}>{request.status}</span>
                      </p>
                      <p style={styles.contactDetail}>
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div style={styles.tabContent}>
            <form onSubmit={handleAddContact} style={styles.form}>
              <h3 style={styles.sectionTitle}>Add Contact</h3>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
              </div>
              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Oakline Tag</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactForm.oakline_tag}
                    onChange={(e) => setContactForm({ ...contactForm, oakline_tag: e.target.value })}
                    placeholder="@username"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nickname</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={contactForm.nickname}
                    onChange={(e) => setContactForm({ ...contactForm, nickname: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <button type="submit" style={styles.primaryButton}>
                Add Contact
              </button>
            </form>

            <div style={styles.contactsList}>
              <h3 style={styles.sectionTitle}>My Contacts ({contacts.length})</h3>
              {contacts.length === 0 ? (
                <p style={styles.emptyState}>No contacts yet. Add your first contact above!</p>
              ) : (
                contacts.map(contact => (
                  <div key={contact.id} style={styles.contactCard}>
                    <div>
                      <h4 style={styles.contactName}>
                        {contact.nickname || contact.contact_name}
                        {contact.is_favorite && <span style={styles.favoriteStar}>★</span>}
                      </h4>
                      {contact.contact_oakline_tag && (
                        <p style={styles.contactDetail}>{contact.contact_oakline_tag}</p>
                      )}
                      {contact.contact_email && (
                        <p style={styles.contactDetail}>{contact.contact_email}</p>
                      )}
                      {contact.contact_phone && (
                        <p style={styles.contactDetail}>{contact.contact_phone}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleToggleFavorite(contact.id, contact.is_favorite)}
                        style={{ 
                          ...styles.deleteButton, 
                          backgroundColor: contact.is_favorite ? '#fbbf24' : '#6b7280' 
                        }}
                      >
                        {contact.is_favorite ? '★' : '☆'}
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        style={styles.deleteButton}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Transaction History</h3>
            {transactions.length === 0 ? (
              <p style={styles.emptyState}>No transactions yet</p>
            ) : (
              transactions.map(tx => (
                <div key={tx.id} style={styles.transactionCard}>
                  <div style={styles.transactionHeader}>
                    <div>
                      <span style={tx.sender_id === user.id ? styles.sentBadge : styles.receivedBadge}>
                        {tx.sender_id === user.id ? 'Sent' : 'Received'}
                      </span>
                      <span style={styles.statusBadge}>{tx.status}</span>
                    </div>
                    <div style={styles.transactionAmount}>
                      {tx.sender_id === user.id ? '-' : '+'}${parseFloat(tx.amount).toFixed(2)}
                    </div>
                  </div>
                  <p style={styles.transactionDetail}>
                    {tx.sender_id === user.id ? 'To: ' : 'From: '}
                    {tx.recipient_contact}
                  </p>
                  {tx.memo && <p style={styles.transactionMemo}>"{tx.memo}"</p>}
                  <p style={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                  <p style={styles.transactionRef}>Ref: {tx.reference_number}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>Oakline Pay Settings</h3>
            <div style={styles.settingsCard}>
              <div style={styles.settingItem}>
                <strong>Daily Limit:</strong> ${settings?.daily_limit || 5000}
              </div>
              <div style={styles.settingItem}>
                <strong>Monthly Limit:</strong> ${settings?.monthly_limit || 25000}
              </div>
              <div style={styles.settingItem}>
                <strong>Per Transaction:</strong> ${settings?.per_transaction_limit || 2500}
              </div>
              <div style={styles.settingItem}>
                <strong>Email Notifications:</strong> {settings?.email_notifications ? 'Enabled' : 'Disabled'}
              </div>
              <div style={styles.settingItem}>
                <strong>SMS Notifications:</strong> {settings?.sms_notifications ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            {!oaklineProfile && (
              <div style={styles.alertBox}>
                <p><strong>Set up your Oakline Tag</strong></p>
                <p>Create a unique @username to make it easier for people to send you money!</p>
                <button onClick={() => setShowSetupModal(true)} style={styles.primaryButton}>
                  Create Oakline Tag
                </button>
              </div>
            )}
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>My Oakline Pay QR Code</h2>
              <p style={styles.modalText}>{oaklineProfile?.oakline_tag}</p>
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" style={styles.qrImage} />
              )}
              <p style={styles.modalText}>Share this QR code to receive money</p>
              <button onClick={() => setShowQRModal(false)} style={styles.primaryButton}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Setup Profile Modal */}
        {showSetupModal && (
          <div style={styles.modalOverlay} onClick={() => setShowSetupModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Create Your Oakline Tag</h2>
              <p style={styles.modalText}>
                Choose a unique @username that others can use to send you money
              </p>
              <form onSubmit={handleSetupProfile}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Oakline Tag *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={setupForm.oakline_tag}
                    onChange={(e) => setSetupForm({ ...setupForm, oakline_tag: e.target.value })}
                    placeholder="@johndoe"
                    required
                    pattern="@[a-zA-Z0-9_]{3,20}"
                    title="Must start with @ and be 3-20 characters (letters, numbers, underscores)"
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    3-20 characters, letters, numbers, and underscores only
                  </small>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Display Name (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={setupForm.display_name}
                    onChange={(e) => setSetupForm({ ...setupForm, display_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bio (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={setupForm.bio}
                    onChange={(e) => setSetupForm({ ...setupForm, bio: e.target.value })}
                    placeholder="A short description"
                    maxLength={100}
                  />
                </div>
                <div style={styles.modalButtons}>
                  <button type="button" onClick={() => setShowSetupModal(false)} style={styles.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton}>
                    Create Tag
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
              <h2 style={styles.modalTitle}>Request Money</h2>
              <p style={styles.modalText}>
                Send a payment request to another Oakline Pay user
              </p>
              <form onSubmit={handleRequestMoney}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Request To (Account to receive)</label>
                  <select
                    style={styles.select}
                    value={requestForm.from_account}
                    onChange={(e) => setRequestForm({ ...requestForm, from_account: e.target.value })}
                    required
                  >
                    <option value="">Choose account</option>
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
                    value={requestForm.recipient_type}
                    onChange={(e) => setRequestForm({ ...requestForm, recipient_type: e.target.value })}
                  >
                    <option value="oakline_tag">Oakline Tag</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recipient Contact</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={requestForm.recipient_contact}
                    onChange={(e) => setRequestForm({ ...requestForm, recipient_contact: e.target.value })}
                    placeholder="@username, email, or phone"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    style={styles.input}
                    value={requestForm.amount}
                    onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Memo (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={requestForm.memo}
                    onChange={(e) => setRequestForm({ ...requestForm, memo: e.target.value })}
                    placeholder="What's this for?"
                    maxLength={100}
                  />
                </div>

                <div style={styles.modalButtons}>
                  <button type="button" onClick={() => setShowRequestModal(false)} style={styles.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton}>
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Verification Modal */}
        {showVerifyModal && (
          <div style={styles.modalOverlay} onClick={() => setShowVerifyModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Verify Transfer</h2>
              <p style={styles.modalText}>
                Enter the verification code sent to your email
              </p>
              {pendingTransaction && (
                <div style={styles.transferSummary}>
                  <p><strong>Amount:</strong> ${sendForm.amount}</p>
                  <p><strong>To:</strong> {pendingTransaction.recipient_name}</p>
                  {pendingTransaction.recipient_tag && (
                    <p><strong>Tag:</strong> {pendingTransaction.recipient_tag}</p>
                  )}
                  <p><strong>Ref:</strong> {pendingTransaction.reference_number}</p>
                </div>
              )}
              <form onSubmit={handleVerifyTransfer}>
                <input
                  type="text"
                  style={styles.input}
                  value={verifyForm.code}
                  onChange={(e) => setVerifyForm({ code: e.target.value })}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  autoFocus
                />
                <div style={styles.modalButtons}>
                  <button type="button" onClick={() => setShowVerifyModal(false)} style={styles.secondaryButton}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryButton}>
                    Verify & Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
    padding: '30px 20px',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%)',
    borderRadius: '12px',
    color: 'white'
  },
  backButton: {
    display: 'inline-block',
    color: 'white',
    textDecoration: 'none',
    marginBottom: '15px',
    fontSize: '14px'
  },
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    margin: '10px 0'
  },
  subtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: '10px 0'
  },
  tagBadge: {
    display: 'inline-block',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '8px 16px',
    borderRadius: '20px',
    marginTop: '15px',
    fontSize: '14px'
  },
  message: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontWeight: '500'
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    backgroundColor: 'white',
    padding: '10px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'transparent',
    color: '#666',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  tabActive: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: '#1A3E6F',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '500'
  },
  tabContent: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  form: {
    marginBottom: '30px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontWeight: '500',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  secondaryButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'transparent',
    color: '#1A3E6F',
    border: '2px solid #1A3E6F',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  qrSection: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  helpText: {
    marginTop: '10px',
    color: '#666',
    fontSize: '14px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '20px'
  },
  contactsList: {
    marginTop: '30px'
  },
  contactCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  contactName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '5px'
  },
  contactDetail: {
    fontSize: '14px',
    color: '#666',
    margin: '3px 0'
  },
  favoriteStar: {
    color: '#FFD700',
    marginLeft: '5px'
  },
  deleteButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  transactionCard: {
    padding: '15px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '10px'
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  transactionAmount: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1A3E6F'
  },
  sentBadge: {
    backgroundColor: '#ffc107',
    color: '#000',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    marginRight: '8px'
  },
  receivedBadge: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    marginRight: '8px'
  },
  statusBadge: {
    backgroundColor: '#6c757d',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px'
  },
  transactionDetail: {
    fontSize: '14px',
    color: '#666',
    margin: '5px 0'
  },
  transactionMemo: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#999',
    margin: '5px 0'
  },
  transactionDate: {
    fontSize: '12px',
    color: '#999',
    margin: '5px 0'
  },
  transactionRef: {
    fontSize: '11px',
    color: '#bbb',
    fontFamily: 'monospace'
  },
  settingsCard: {
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px'
  },
  settingItem: {
    padding: '12px 0',
    borderBottom: '1px solid #e0e0e0',
    fontSize: '15px'
  },
  alertBox: {
    marginTop: '20px',
    padding: '20px',
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
    borderRadius: '8px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '16px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '15px',
    textAlign: 'center'
  },
  modalText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: '15px'
  },
  qrImage: {
    display: 'block',
    margin: '20px auto',
    maxWidth: '300px'
  },
  transferSummary: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  modalButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginTop: '20px'
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
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #1A3E6F',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  }
};
