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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [transferStep, setTransferStep] = useState(null); // null, 'review', or 'pin'
  const [transferStatus, setTransferStatus] = useState('');
  const [transferStatusType, setTransferStatusType] = useState('success');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [selectedOaklineTransaction, setSelectedOaklineTransaction] = useState(null);
  const [showOaklineReceiptModal, setShowOaklineReceiptModal] = useState(false);
  const router = useRouter();

  const [sendForm, setSendForm] = useState({
    from_account: '',
    recipient_contact: '',
    recipient_type: 'oakline_tag',
    recipient_name: '',
    amount: '',
    memo: ''
  });

  const [tagNotFoundError, setTagNotFoundError] = useState(false);

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
        setLoading(false);
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
        setLoading(false);
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

      // Load completed transactions (only show completed, not pending)
      const { data: payTxns, error: txnError } = await supabase
        .from('oakline_pay_transactions')
        .select('*')
        .or(`sender_id.eq.${session.user.id},recipient_id.eq.${session.user.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (txnError) {
        console.error('Error loading transactions:', txnError);
      }

      // Load pending claims sent by user
      let pendingClaims = [];
      try {
        const { data: sentClaims, error: claimsError } = await supabase
          .from('oakline_pay_pending_claims')
          .select('*')
          .eq('sender_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (claimsError) {
          console.error('Error loading pending claims:', claimsError);
        } else {
          pendingClaims = sentClaims || [];
        }
      } catch (claimsException) {
        console.error('Exception loading pending claims:', claimsException);
      }

      // Merge and format pending claims as transaction-like objects
      const formattedClaims = (pendingClaims || []).map(claim => ({
        id: claim.id,
        sender_id: claim.sender_id,
        sender_name: claim.sender_name,
        recipient_email: claim.recipient_email,
        amount: claim.amount,
        memo: claim.memo,
        status: claim.status,
        created_at: claim.created_at,
        is_pending_claim: true
      }));

      // Combine transactions and pending claims, sort by date
      const allTransactions = [...(payTxns || []), ...formattedClaims].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      setTransactions(allTransactions);

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
    setIsSubmitting(true);
    setTagNotFoundError(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showMsg('Please sign in to continue', 'error');
        setIsSubmitting(false);
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
          recipient_name: sendForm.recipient_name || sendForm.recipient_contact,
          amount: sendForm.amount,
          memo: sendForm.memo,
          step: 'initiate'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showMsg(data.error || 'Transfer failed', 'error');
        setIsSubmitting(false);
        return;
      }

      // Check if tag search failed
      if (sendForm.recipient_type === 'oakline_tag' && !data.is_oakline_user) {
        setTagNotFoundError(true);
        setIsSubmitting(false);
        return;
      }

      setPendingTransaction({
        ...data,
        amount: data.amount || sendForm.amount,
        sender_name: oaklineProfile?.display_name || userProfile?.full_name || userProfile?.first_name || 'You',
        recipient_name: data.recipient_name,
        recipient_contact: sendForm.recipient_contact,
        recipient_type: sendForm.recipient_type,
        is_oakline_user: data.is_oakline_user,
        transaction_id: data.transaction_id
      });
      setTransferStep('review');
      setTransferStatus('');
      setActiveTab('send');
    } catch (error) {
      console.error('Error sending money:', error);
      showMsg('An error occurred. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTransfer = async (e) => {
    if (e.preventDefault) e.preventDefault();
    setVerifyingPin(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // For non-Oakline users, confirm the payment with PIN (this deducts the balance)
      if (!pendingTransaction.is_oakline_user) {
        setTransferStatus('Processing payment...');
        setTransferStatusType('info');
        try {
          const confirmResponse = await fetch('/api/oakline-pay-send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              step: 'confirm',
              sender_account_id: pendingTransaction.sender_account_id,
              recipient_contact: pendingTransaction.recipient_contact,
              recipient_type: pendingTransaction.recipient_type,
              amount: pendingTransaction.amount,
              memo: pendingTransaction.memo,
              pin: verifyForm.code
            })
          });

          const confirmData = await confirmResponse.json();

          if (!confirmResponse.ok) {
            setTransferStatus(confirmData.error || 'Payment failed');
            setTransferStatusType('error');
            setVerifyingPin(false);
            return;
          }

          // Show professional receipt modal for non-member transfers
          setReceiptData({
            amount: confirmData.amount || pendingTransaction.amount,
            recipient_name: pendingTransaction.recipient_contact,
            reference_number: confirmData.reference_number,
            memo: pendingTransaction.memo || '',
            completed_at: confirmData.completed_at || new Date().toISOString(),
            status: confirmData.status || 'waiting'
          });
          setShowReceiptModal(true);
          setTransferStatus('');
          setTransferStep(null);
          setPendingTransaction(null);
          setVerifyForm({ code: '' });
          setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
        } catch (error) {
          console.error('Error confirming payment:', error);
          setTransferStatus('An error occurred. Please try again.');
          setTransferStatusType('error');
        } finally {
          setVerifyingPin(false);
        }
        return;
      }

      // For Oakline users, verify PIN
      const response = await fetch('/api/verify-transaction-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pin: verifyForm.code,
          type: 'oakline_pay',
          transaction_id: pendingTransaction.transaction_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setTransferStatus(data.error || 'Verification failed');
        setTransferStatusType('error');
        setVerifyingPin(false);
        return;
      }

      // Show receipt with success - wait for user to close
      setTransferStatus('');
      setTransferStatusType('success');
      setReceiptData({
        ...data,
        ...pendingTransaction,
        recipient_name: pendingTransaction.recipient_name,
        sender_name: pendingTransaction.sender_name,
        reference_number: data.reference_number,
        amount: pendingTransaction.amount,
        memo: pendingTransaction.memo,
        completed_at: new Date().toISOString(),
        status: 'completed'
      });
      setShowReceiptModal(true);
      setTransferStep(null); // Reset transfer step to close PIN modal
      setPendingTransaction(null); // Clear pending transaction
      checkUserAndLoadData();
    } catch (error) {
      console.error('Error verifying:', error);
      setTransferStatus('Transaction failed. Please try again.');
      setTransferStatusType('error');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleRequestMoney = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/oakline-pay-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          requester_account_id: requestForm.from_account,
          recipient_contact: requestForm.recipient_contact,
          recipient_type: requestForm.recipient_type,
          amount: requestForm.amount,
          memo: requestForm.memo || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showMsg(data.error || 'Failed to send payment request', 'error');
        setLoading(false);
        return;
      }

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
        email: userProfile?.email || user?.email || '',
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

          {/* Tab Navigation - Show Send, Requests, Contacts, Settings */}
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
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div style={styles.contentSection}>
            {/* Send Money Tab */}
            {activeTab === 'send' && transferStep !== 'pin' && (
              <div>
                {/* Step-based transfer flow */}
                {transferStep === null && (
                  <>
                    <h2 style={styles.sectionTitle}>💸 Send Money</h2>


                    {!loading && sendForm.from_account && accounts.find(acc => acc.id === sendForm.from_account) && 
                     parseFloat(accounts.find(acc => acc.id === sendForm.from_account)?.balance || 0) < parseFloat(sendForm.amount || 0) && sendForm.amount && (
                      <div style={{
                        backgroundColor: 'rgba(220, 38, 38, 0.15)',
                        border: '2px solid #dc2626',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: '#dc2626',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '1.5rem'
                        }}>
                          ⚠️
                        </div>
                        <div style={{ color: '#991b1b', fontSize: '1rem', fontWeight: '600' }}>
                          Insufficient funds in selected account
                        </div>
                      </div>
                    )}

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
                        onChange={(e) => {
                          setSendForm({ ...sendForm, recipient_type: e.target.value, recipient_contact: '' });
                          setTagNotFoundError(false);
                        }}
                      >
                        <option value="oakline_tag">Oakline Tag</option>
                        <option value="email">Email</option>
                      </select>
                    </div>

                    {tagNotFoundError && (
                      <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '2px solid #ef4444',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: '#ef4444',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '1.5rem'
                        }}>
                          ❌
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#991b1b', fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                            Tag "{sendForm.recipient_contact}" not found
                          </div>
                          <div style={{ color: '#991b1b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            The Oakline tag you entered doesn't exist. Would you like to send via email instead?
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSendForm({ ...sendForm, recipient_type: 'email', recipient_contact: '' });
                              setTagNotFoundError(false);
                            }}
                            style={{
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '0.625rem 1.25rem',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                          >
                            ✉️ Send via Email Instead
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      {sendForm.recipient_type === 'oakline_tag' && 'Oakline Tag (e.g., @johndoe) *'}
                      {sendForm.recipient_type === 'email' && 'Email Address *'}
                    </label>
                    <input
                      type={sendForm.recipient_type === 'email' ? 'email' : 'text'}
                      style={styles.input}
                      value={sendForm.recipient_contact}
                      onChange={(e) => setSendForm({ ...sendForm, recipient_contact: e.target.value })}
                      placeholder={
                        sendForm.recipient_type === 'oakline_tag' ? '@username' : 'email@example.com'
                      }
                      required
                    />
                  </div>

                  {sendForm.recipient_type === 'email' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Recipient Name (Optional)</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={sendForm.recipient_name}
                        onChange={(e) => setSendForm({ ...sendForm, recipient_name: e.target.value })}
                        placeholder="What's their name?"
                        maxLength={100}
                      />
                    </div>
                  )}

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

                  {transferStatus && (
                    <div style={{
                      backgroundColor: 'rgba(5, 150, 105, 0.15)',
                      border: '2px solid #059669',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#059669',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        animation: 'spin 1s linear infinite'
                      }}>
                        <div style={{
                          fontSize: '1.5rem'
                        }}>⏳</div>
                      </div>
                      <div style={{ color: '#047857', fontSize: '1rem', fontWeight: '600' }}>
                        Processing your transfer...
                      </div>
                    </div>
                  )}

                  <button type="submit" style={{
                    ...styles.primaryButton,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer'
                  }} disabled={isSubmitting || (sendForm.from_account && accounts.find(acc => acc.id === sendForm.from_account) && 
                    parseFloat(accounts.find(acc => acc.id === sendForm.from_account)?.balance || 0) < parseFloat(sendForm.amount || 0) && sendForm.amount)}>
                    {isSubmitting ? '⏳ Processing...' : '💸 Send Money'}
                  </button>
                    </form>

                    <div style={{ ...styles.actionButtons, display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button onClick={generateQRCode} style={styles.secondaryButton} disabled={loading || !oaklineProfile?.oakline_tag}>
                        📱 Show QR Code
                      </button>
                      <button onClick={() => setActiveTab('history')} style={styles.secondaryButton} disabled={loading}>
                        📊 History
                      </button>
                    </div>
                  </>
                )}

                {/* STEP 1: REVIEW TRANSFER */}
                {transferStep === 'review' && pendingTransaction && (
                  <div>
                    <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-block', padding: '1rem 1.5rem', backgroundColor: 'rgba(5, 150, 105, 0.1)', borderLeft: '4px solid #059669', borderRadius: '8px' }}>
                        <p style={{ margin: 0, color: '#047857', fontSize: '0.9rem', fontWeight: '600' }}>Step 1 of {pendingTransaction.is_oakline_user ? '2' : '1'}: Review Transfer</p>
                      </div>
                    </div>

                    {transferStatus && (
                      <div style={{
                        backgroundColor: transferStatusType === 'success' ? 'rgba(5, 150, 105, 0.15)' : 'rgba(220, 38, 38, 0.15)',
                        border: transferStatusType === 'success' ? '2px solid #059669' : '2px solid #dc2626',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: transferStatusType === 'success' ? '#059669' : '#dc2626',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '1.5rem'
                        }}>
                          {transferStatusType === 'success' ? '✓' : '⚠️'}
                        </div>
                        <div style={{ color: transferStatusType === 'success' ? '#047857' : '#991b1b', fontSize: '1rem', fontWeight: '600' }}>
                          {transferStatus}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                      <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>From</p>
                        <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#0f2027' }}>
                          {pendingTransaction.sender_name}
                        </p>
                      </div>

                      <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#059669' }}>↓</div>

                      <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '10px', border: '2px solid #d1fae5' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>To</p>
                        {pendingTransaction.is_oakline_user ? (
                          <>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#047857' }}>
                              {pendingTransaction.recipient_name || 'Recipient'}
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#059669', fontFamily: 'monospace' }}>
                              {pendingTransaction.recipient_type === 'oakline_tag' ? `@${pendingTransaction.recipient_contact}` : pendingTransaction.recipient_contact}
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>✓ Oakline User</p>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#047857' }}>
                              {pendingTransaction.recipient_contact}
                            </p>
                            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600' }}>ℹ Not yet a member</p>
                          </>
                        )}
                      </div>

                      <div style={{ backgroundColor: '#fff7ed', padding: '1.25rem', borderRadius: '10px', border: '2px solid #fed7aa', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Amount</p>
                        <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>
                          ${parseFloat(pendingTransaction.amount).toFixed(2)}
                        </p>
                      </div>

                      {sendForm.memo && (
                        <div style={{ backgroundColor: '#f3e8ff', padding: '1rem', borderRadius: '10px', border: '2px solid #e9d5ff' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#6b21a8', textTransform: 'uppercase' }}>Memo</p>
                          <p style={{ margin: 0, fontSize: '0.95rem', color: '#7c3aed', fontStyle: 'italic' }}>
                            "{sendForm.memo}"
                          </p>
                        </div>
                      )}

                      {!pendingTransaction.is_oakline_user && (
                        <div style={{ backgroundColor: '#fef08a', padding: '1rem', borderRadius: '10px', border: '2px solid #fcd34d', textAlign: 'center' }}>
                          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>⏳ Pending Transfer</p>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#b45309' }}>
                            Recipient will be notified to create an account and claim within <strong>14 days</strong>
                          </p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button 
                        onClick={() => {
                          setTransferStep(null);
                          setPendingTransaction(null);
                          setTransferStatus('');
                        }}
                        style={{
                          flex: 1,
                          padding: '0.875rem 1.5rem',
                          backgroundColor: '#1e40af',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: loading ? 0.6 : 1
                        }}
                        disabled={loading}
                      >
                        ← Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setTransferStep('pin');
                        }}
                        style={{
                          ...styles.primaryButton,
                          flex: 1,
                          opacity: loading ? 0.6 : 1
                        }}
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : '✓ Verify with PIN'}
                      </button>
                    </div>
                  </div>
                )}
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

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                  {/* Request Form */}
                  <div>
                    <h2 style={styles.sectionTitle}>📋 New Request</h2>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.95rem' }}>Ask someone to send you funds</p>
                      <form onSubmit={handleRequestMoney} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Select Account *</label>
                          <select style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.from_account} onChange={(e) => setRequestForm({ ...requestForm, from_account: e.target.value })} required>
                            <option value="">Choose account</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.account_type?.replace('_', ' ')?.toUpperCase()}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Request From *</label>
                          <select style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.recipient_type} onChange={(e) => setRequestForm({ ...requestForm, recipient_type: e.target.value })}>
                            <option value="oakline_tag">Oakline Tag (@username)</option>
                            <option value="email">Email Address</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                            {requestForm.recipient_type === 'oakline_tag' ? 'Oakline Tag *' : 'Email Address *'}
                          </label>
                          <div style={{ position: 'relative', display: requestForm.recipient_type === 'oakline_tag' ? 'flex' : 'block' }}>
                            {requestForm.recipient_type === 'oakline_tag' && (
                              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#059669', fontWeight: '700' }}>@</span>
                            )}
                            <input 
                              type="text" 
                              style={{ ...styles.input, padding: requestForm.recipient_type === 'oakline_tag' ? '0.875rem 0.875rem 0.875rem 2.5rem' : '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }} 
                              value={requestForm.recipient_contact} 
                              onChange={(e) => setRequestForm({ ...requestForm, recipient_contact: e.target.value })} 
                              placeholder={requestForm.recipient_type === 'oakline_tag' ? 'username' : 'example@email.com'}
                              required 
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Amount ($) *</label>
                          <input type="number" step="0.01" min="0.01" style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.amount} onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })} placeholder="0.00" required />
                        </div>

                        <div>
                          <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Memo (Optional)</label>
                          <input type="text" style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.memo} onChange={(e) => setRequestForm({ ...requestForm, memo: e.target.value })} placeholder="What's this for?" maxLength={100} />
                        </div>

                        <button type="submit" style={{ ...styles.primaryButton, padding: '0.9rem' }} disabled={loading}>
                          {loading ? 'Sending...' : '✓ Send Request'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Request History */}
                  <div>
                    <h2 style={styles.sectionTitle}>📊 Request History</h2>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxHeight: '500px', overflowY: 'auto' }}>
                      {paymentRequests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b' }}>
                          <p style={{ fontSize: '0.95rem' }}>No requests yet</p>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {paymentRequests.map(req => (
                            <div key={req.id} style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #059669' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <div>
                                  <p style={{ margin: 0, fontWeight: '600', color: '#1a365d' }}>
                                    {req.requester_id ? '➙ Sent to' : '📥 Received from'} {req.recipient_contact}
                                  </p>
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                                    {new Date(req.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <span style={{ backgroundColor: req.status === 'accepted' ? '#d1fae5' : req.status === 'rejected' ? '#fee2e2' : '#fef3c7', color: req.status === 'accepted' ? '#047857' : req.status === 'rejected' ? '#991b1b' : '#92400e', padding: '0.25rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                  {(req.status || 'pending').toUpperCase()}
                                </span>
                              </div>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', fontWeight: '700', color: '#059669' }}>
                                ${parseFloat(req.amount).toFixed(2)}
                              </p>
                              {req.memo && (
                                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                  "{req.memo}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
                      <div 
                        key={txn.id} 
                        style={{ ...styles.transactionCard, cursor: 'pointer', transition: 'all 0.3s ease', opacity: txn.status === 'expired' ? 0.6 : 1 }}
                        onClick={() => {
                          setSelectedOaklineTransaction(txn);
                          setShowOaklineReceiptModal(true);
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 16px rgba(26, 56, 93, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '0.75rem' : '0' }}>
                          <div style={{ width: '100%' }}>
                            <h3 style={{ margin: 0, color: '#1a365d', fontWeight: '600', fontSize: isMobile ? '0.9rem' : '1rem', wordBreak: 'break-word' }}>
                              {txn.is_pending_claim ? (
                                txn.sender_id === user?.id 
                                  ? `📤 Pending - Sent to ${txn.recipient_email}`
                                  : `📥 Pending - From ${txn.sender_name || 'User'}`
                              ) : (
                                txn.sender_id === user?.id ? ' Sent to' : ' Received from'
                              )} {!txn.is_pending_claim && (txn.sender_id === user?.id ? (txn.recipient_name || txn.recipient_tag || 'User') : (txn.sender_name || txn.sender_tag || 'User'))}
                            </h3>
                            <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                              {new Date(txn.created_at).toLocaleDateString()} • {new Date(txn.created_at).toLocaleTimeString([],{hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                          <div style={{ textAlign: isMobile ? 'left' : 'right', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <div style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: '700', color: txn.sender_id === user?.id ? '#ef4444' : '#059669' }}>
                              {txn.sender_id === user?.id ? '-' : '+'} ${parseFloat(txn.amount).toFixed(2)}
                            </div>
                            <span style={{ backgroundColor: txn.status === 'completed' ? '#d1fae5' : txn.status === 'expired' ? '#fee2e2' : '#fef3c7', color: txn.status === 'completed' ? '#047857' : txn.status === 'expired' ? '#991b1b' : '#92400e', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600' }}>
                              {(txn.status || 'PENDING').toUpperCase()}
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

      {/* PIN VERIFICATION FULL PAGE - Render at top level */}
      {transferStep === 'pin' && pendingTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#f0f4f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: 'clamp(1.5rem, 5vw, 3rem)',
            maxWidth: '550px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{ display: 'inline-block', padding: '1rem 1.5rem', backgroundColor: 'rgba(5, 150, 105, 0.1)', borderLeft: '4px solid #059669', borderRadius: '8px' }}>
                <p style={{ margin: 0, color: '#047857', fontSize: '0.9rem', fontWeight: '600' }}>🔐 Step 2 of 2: Confirm with PIN</p>
              </div>
            </div>

            {verifyingPin && (
              <div style={{
                backgroundColor: 'rgba(5, 150, 105, 0.15)',
                border: '2px solid #059669',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                justifyContent: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#059669',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  animation: 'spin 1s linear infinite'
                }}>
                  <div style={{ fontSize: '1.5rem' }}>⏳</div>
                </div>
                <div style={{ color: '#047857', fontSize: '1rem', fontWeight: '600' }}>
                  Verifying PIN and completing transfer...
                </div>
              </div>
            )}

            {transferStatus && transferStatusType === 'error' && (
              <div style={{
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                border: '2px solid #dc2626',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '1.5rem'
                }}>
                  ⚠️
                </div>
                <div style={{ color: '#991b1b', fontSize: '1rem', fontWeight: '600' }}>
                  {transferStatus}
                </div>
              </div>
            )}

            {!verifyingPin && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>From</p>
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#0f2027' }}>{pendingTransaction.sender_name}</p>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '1.5rem', color: '#059669' }}>↓</div>
                  <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '10px', border: '2px solid #d1fae5' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>To</p>
                    <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#047857' }}>
                      {pendingTransaction.recipient_type === 'oakline_tag' ? `@${pendingTransaction.recipient_contact}` : pendingTransaction.recipient_contact}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#fff7ed', padding: '1.25rem', borderRadius: '10px', border: '2px solid #fed7aa', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#92400e', textTransform: 'uppercase' }}>Amount</p>
                    <p style={{ margin: 0, fontSize: '2rem', fontWeight: '700', color: '#d97706' }}>${parseFloat(pendingTransaction.amount).toFixed(2)}</p>
                  </div>
                </div>

                <form onSubmit={handleVerifyTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ backgroundColor: '#ecfdf5', padding: '1rem 1.25rem', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>Transfer Protection:</p>
                    <p style={{ margin: 0, color: '#047857', fontWeight: '600', fontSize: '0.9rem' }}>✓ Only you can complete this with your PIN</p>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#1a365d', fontWeight: '700', marginBottom: '0.75rem' }}>Enter Your Transaction PIN *</label>
                    <input type="password" style={{ width: '100%', padding: '1.25rem', fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center', fontFamily: 'monospace', border: '2px solid #e2e8f0', borderRadius: '10px', boxSizing: 'border-box', outline: 'none', transition: 'all 0.3s', backgroundColor: verifyingPin ? '#f8fafc' : '#ffffff' }} value={verifyForm.code} onChange={(e) => setVerifyForm({ code: e.target.value.replace(/[^0-9]/g, '') })} placeholder="••••" maxLength="6" required autoFocus disabled={verifyingPin} />
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Your PIN from Security Settings (4-6 digits)</p>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="button" style={{ flex: 1, padding: '0.875rem 1.5rem', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }} onClick={() => { setTransferStep('review'); setVerifyForm({ code: '' }); setTransferStatus(''); }} disabled={verifyingPin}>← Back</button>
                    <button type="submit" style={{ flex: 1, padding: '0.875rem 1.5rem', backgroundColor: verifyingPin || verifyForm.code.length < 4 ? '#cbd5e1' : '#059669', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: verifyingPin ? 'not-allowed' : 'pointer', opacity: verifyingPin || verifyForm.code.length < 4 ? 0.6 : 1 }} disabled={verifyingPin || verifyForm.code.length < 4}>{verifyingPin ? '🔄 Authorizing...' : '✓ Authorize Transfer'}</button>
                  </div>

                  <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', fontSize: '0.85rem', color: '#1e40af', textAlign: 'center', borderLeft: '3px solid #0284c7' }}>
                    <p style={{ margin: 0 }}>🔒 Your PIN is encrypted and never shared with us</p>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Receipt Modal - Professional Style */}
      {showReceiptModal && receiptData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '1rem'
        }} onClick={() => {
          setShowReceiptModal(false);
          setTransferStep(null);
          setPendingTransaction(null);
          setVerifyForm({ code: '' });
          setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Success Icon */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontSize: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                animation: 'bounce 0.6s'
              }}>✓</div>
              <h2 style={{ margin: '0 0 0.5rem 0', color: '#1a365d', fontSize: '1.75rem', fontWeight: '700' }}>Payment Sent Successfully!</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Your transfer has been completed instantly</p>
            </div>

            {/* Receipt Container */}
            <div style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '2rem',
              marginBottom: '2rem',
              border: '2px solid #e2e8f0'
            }}>
              <div style={{
                marginBottom: '1.5rem',
                paddingBottom: '1rem',
                borderBottom: '2px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a365d', marginBottom: '0.5rem', margin: 0 }}>Transaction Receipt</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>Oakline Pay • Instant Transfer</p>
              </div>

              {/* Amount Display */}
              <div style={{
                backgroundColor: '#ecfdf5',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Amount Sent</div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', marginBottom: '0.5rem' }}>
                  ${parseFloat(receiptData.amount).toFixed(2)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857' }}>✓ Transfer Completed</div>
              </div>

              {/* Transaction Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>To</span>
                  <span style={{ fontSize: '0.875rem', color: '#1a365d', fontWeight: '700', textAlign: 'right' }}>{receiptData.recipient_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>Reference #</span>
                  <span style={{ fontSize: '0.75rem', color: '#1a365d', fontWeight: '700', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{receiptData.reference_number?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>Date & Time</span>
                  <span style={{ fontSize: '0.875rem', color: '#1a365d', fontWeight: '700' }}>
                    {new Date(receiptData.completed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>Status</span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>COMPLETED</span>
                </div>
              </div>

              {receiptData.memo && (
                <div style={{
                  backgroundColor: '#f3e8ff',
                  padding: '1rem',
                  borderRadius: '10px',
                  marginTop: '1rem',
                  borderLeft: '4px solid #a855f7'
                }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#6b21a8', fontSize: '0.85rem', fontWeight: '700' }}>Message</p>
                  <p style={{ margin: 0, color: '#7c3aed', fontStyle: 'italic', fontSize: '0.9rem' }}>"{receiptData.memo}"</p>
                </div>
              )}

              {/* Info Box */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '1.5rem'
              }}>
                <p style={{ margin: 0, color: '#1e40af', fontSize: '0.85rem', lineHeight: '1.5' }}>
                  ✓ Your payment was sent instantly and the recipient has been notified.
                </p>
              </div>

              {/* Footer */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#64748b' }}>Thank you for using Oakline Pay</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Safe. Secure. Instant.</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  setTransferStep(null);
                  setPendingTransaction(null);
                  setVerifyForm({ code: '' });
                  setSendForm({ ...sendForm, recipient_contact: '', amount: '', memo: '' });
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
              >
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}

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
                  maxLength={150}
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
            <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '2px solid #f0f4f8', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <h2 style={{ margin: 0, color: '#0f2027', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Request Money</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Ask someone to send you funds</p>
            </div>
            <form onSubmit={handleRequestMoney} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>From Account *</label>
                <select style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.from_account} onChange={(e) => setRequestForm({ ...requestForm, from_account: e.target.value })} required>
                  <option value="">Select account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.replace('_', ' ')?.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Request From *</label>
                <select style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.recipient_type} onChange={(e) => setRequestForm({ ...requestForm, recipient_type: e.target.value })}>
                  <option value="oakline_tag">Oakline Tag (@username)</option>
                  <option value="email">Email Address</option>
                </select>
              </div>

              <div>
                <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>
                  {requestForm.recipient_type === 'oakline_tag' && 'Oakline Tag *'}
                  {requestForm.recipient_type === 'email' && 'Email Address *'}
                </label>
                <div style={{ position: 'relative', display: requestForm.recipient_type === 'oakline_tag' ? 'flex' : 'block' }}>
                  {requestForm.recipient_type === 'oakline_tag' && (
                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#059669', fontWeight: '700' }}>@</span>
                  )}
                  <input 
                    type="text" 
                    style={{ ...styles.input, padding: requestForm.recipient_type === 'oakline_tag' ? '0.875rem 0.875rem 0.875rem 2.5rem' : '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }} 
                    value={requestForm.recipient_contact} 
                    onChange={(e) => setRequestForm({ ...requestForm, recipient_contact: e.target.value })} 
                    placeholder={requestForm.recipient_type === 'oakline_tag' ? 'username' : 'example@email.com'}
                    required 
                  />
                </div>
              </div>

              <div>
                <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Amount ($) *</label>
                <input type="number" step="0.01" min="0.01" style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.amount} onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })} placeholder="0.00" required />
              </div>

              <div>
                <label style={{ ...styles.label, fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem', display: 'block' }}>Memo (Optional)</label>
                <input type="text" style={{ ...styles.input, padding: '0.875rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem' }} value={requestForm.memo} onChange={(e) => setRequestForm({ ...requestForm, memo: e.target.value })} placeholder="What's this for?" maxLength={100} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" style={{ ...styles.primaryButton, flex: 1, padding: '0.9rem' }} disabled={loading}>
                  {loading ? 'Sending...' : '✓ Send Request'}
                </button>
                <button type="button" style={{ ...styles.secondaryButton, flex: 1, padding: '0.9rem' }} onClick={() => setShowRequestModal(false)} disabled={loading}>
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

      {/* Success Modal - Oakline Tag Created */}
      {showSuccessModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
          <div style={{ ...styles.modal, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'bounce 1s' }}>🎉</div>
            <h2 style={{ ...styles.modalTitle, marginBottom: '0.5rem' }}>Success!</h2>
            <p style={{ ...styles.modalSubtitle, marginBottom: '2rem', color: '#047857', fontWeight: '600' }}>
              {successMessage}
            </p>
            <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: '700', color: '#065f46', textTransform: 'uppercase' }}>Next Steps:</p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#047857' }}>Share your Oakline tag with friends to receive instant payments!</p>
            </div>
            <button 
              onClick={() => setShowSuccessModal(false)}
              style={{ ...styles.primaryButton, width: '100%' }}
            >
              ✓ Got It!
            </button>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditTagModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEditTagModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', paddingBottom: '1.5rem', borderBottom: '2px solid #f0f4f8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✏️</div>
              <h2 style={{ margin: 0, color: '#0f2027', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Edit Your Profile</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Update your tag, name, or bio</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
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
                  showMsg(data.error || 'Failed to update profile', 'error');
                  return;
                }
                showMsg('✅ Profile updated successfully!', 'success');
                setShowEditTagModal(false);
                await checkUserAndLoadData();
              } catch (error) {
                showMsg('Failed to update profile', 'error');
              } finally {
                setLoading(false);
              }
            }} style={{ marginTop: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Oakline Tag</label>
                <input type="text" style={styles.input} value={setupForm.oakline_tag} onChange={(e) => setSetupForm({ ...setupForm, oakline_tag: e.target.value })} placeholder="your_tag" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Display Name</label>
                <input type="text" style={styles.input} value={setupForm.display_name} onChange={(e) => setSetupForm({ ...setupForm, display_name: e.target.value })} placeholder="Your Name" />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={styles.label}>Bio</label>
                <textarea style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }} value={setupForm.bio} onChange={(e) => setSetupForm({ ...setupForm, bio: e.target.value })} placeholder="Tell friends about yourself..." maxLength={150} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ ...styles.primaryButton, flex: 1 }} disabled={loading}>
                  {loading ? 'Saving...' : '✓ Save Changes'}
                </button>
                <button type="button" style={{ ...styles.secondaryButton, flex: 1 }} onClick={() => setShowEditTagModal(false)} disabled={loading}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* QR Code Modal */}
      {showQRModal && (
        <div style={styles.modalOverlay} onClick={() => setShowQRModal(false)}>
          <div style={{ ...styles.modal, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowQRModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '2rem',
                cursor: 'pointer',
                color: '#64748b',
                padding: 0,
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <h2 style={styles.modalTitle}>📱 Share Your QR Code</h2>
            <p style={styles.modalSubtitle}>People can scan this to send you money</p>
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" style={styles.qrImage} />
            )}
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem', fontWeight: '600' }}>
                🏷️ @{oaklineProfile?.oakline_tag}
              </p>
              <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                {userProfile?.email}
              </p>
            </div>
            <button onClick={() => setShowQRModal(false)} style={styles.primaryButton}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* Oakline Pay Receipt Modal */}
      {showOaklineReceiptModal && selectedOaklineTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          overflowY: 'auto'
        }} onClick={() => setShowOaklineReceiptModal(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '550px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'slideUp 0.3s ease-out',
            margin: '8rem auto 2rem auto'
          }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowOaklineReceiptModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.color = '#1e293b'}
              onMouseLeave={(e) => e.target.style.color = '#64748b'}
            >
              ×
            </button>

            <div style={{
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '0.5rem',
                margin: 0
              }}>
                Transaction Receipt
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Oakline Pay • {selectedOaklineTransaction.sender_id === user?.id ? 'Money Sent' : 'Money Received'}
              </p>
            </div>

            {/* Amount Display - Matching Dashboard Style */}
            <div style={{
              backgroundColor: selectedOaklineTransaction.sender_id === user?.id ? '#fee2e2' : '#dcfce7',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Amount
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: selectedOaklineTransaction.sender_id === user?.id ? '#dc2626' : '#059669',
                marginBottom: '0.5rem'
              }}>
                {selectedOaklineTransaction.sender_id === user?.id ? '-' : '+'} ${parseFloat(selectedOaklineTransaction.amount).toFixed(2)}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {selectedOaklineTransaction.is_pending_claim 
                  ? (selectedOaklineTransaction.status === 'claimed' ? '✅ Payment Claimed' : `⏳ Waiting to be claimed (14 days)`)
                  : selectedOaklineTransaction.status === 'completed' 
                    ? '✓ Transaction Completed' 
                    : `Status: ${selectedOaklineTransaction.status?.toUpperCase()}`}
              </div>
            </div>

            {/* Payment Details Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', color: '#1a365d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Details</h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Type</span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                  {selectedOaklineTransaction.sender_id === user?.id ? 'Sent' : 'Received'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                  {selectedOaklineTransaction.sender_id === user?.id ? 'Sent To' : 'Received From'}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '700' }}>
                    {selectedOaklineTransaction.is_pending_claim && selectedOaklineTransaction.sender_id === user?.id
                      ? selectedOaklineTransaction.recipient_email
                      : selectedOaklineTransaction.sender_id === user?.id 
                        ? (selectedOaklineTransaction.recipient_contact ? `@${selectedOaklineTransaction.recipient_contact}` : 'User')
                        : (selectedOaklineTransaction.sender_contact ? `@${selectedOaklineTransaction.sender_contact}` : 'Sender')}
                  </div>
                  {selectedOaklineTransaction.is_pending_claim && selectedOaklineTransaction.sender_id === user?.id && (
                    <div style={{ fontSize: '0.75rem', color: selectedOaklineTransaction.status === 'claimed' ? '#059669' : '#f59e0b', marginTop: '0.1rem', fontWeight: '500' }}>
                      {selectedOaklineTransaction.status === 'claimed' ? '✅ Claimed' : 'Not yet claimed'}
                    </div>
                  )}
                  {selectedOaklineTransaction.sender_id === user?.id && !selectedOaklineTransaction.is_pending_claim && selectedOaklineTransaction.recipient_name && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem', fontWeight: '500' }}>
                      {selectedOaklineTransaction.recipient_name}
                    </div>
                  )}
                  {selectedOaklineTransaction.sender_id !== user?.id && selectedOaklineTransaction.sender_name && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem', fontWeight: '500' }}>
                      {selectedOaklineTransaction.sender_name}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Status</span>
                <span style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: '600', 
                  backgroundColor: selectedOaklineTransaction.is_pending_claim
                    ? (selectedOaklineTransaction.status === 'claimed' ? '#dcfce7' : '#fef3c7')
                    : selectedOaklineTransaction.status === 'completed' ? '#dcfce7' : selectedOaklineTransaction.status === 'pending' ? '#fef3c7' : '#fee2e2',
                  color: selectedOaklineTransaction.is_pending_claim
                    ? (selectedOaklineTransaction.status === 'claimed' ? '#15803d' : '#92400e')
                    : selectedOaklineTransaction.status === 'completed' ? '#15803d' : selectedOaklineTransaction.status === 'pending' ? '#92400e' : '#b91c1c',
                  padding: '0.35rem 0.85rem', 
                  borderRadius: '16px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {selectedOaklineTransaction.is_pending_claim ? (selectedOaklineTransaction.status === 'claimed' ? 'CLAIMED' : 'WAITING') : (selectedOaklineTransaction.status || 'PENDING').toUpperCase()}
                </span>
              </div>

              {selectedOaklineTransaction.is_pending_claim && selectedOaklineTransaction.sender_id === user?.id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Expires In</span>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                    14 days
                  </span>
                </div>
              )}

              {selectedOaklineTransaction.memo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Description</span>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '500', textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>
                    {selectedOaklineTransaction.memo}
                  </span>
                </div>
              )}
            </div>

            {/* Transaction Details Section */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', color: '#1a365d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction Details</h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Reference #</span>
                <span style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  {selectedOaklineTransaction.reference_number?.toUpperCase() || selectedOaklineTransaction.id?.slice(0, 12).toUpperCase() || 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Date</span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                  {new Date(selectedOaklineTransaction.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Time</span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                  {new Date(selectedOaklineTransaction.created_at).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', second: '2-digit', hour12: true})}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e2e8f0', textAlign: 'center' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>✓ Transaction confirmed and secure</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Thank you for using Oakline Pay</p>
            </div>

            <button 
              onClick={() => setShowOaklineReceiptModal(false)}
              style={{ ...styles.primaryButton, width: '100%', marginTop: '1.5rem' }}
            >
              Close Receipt
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
    marginBottom: '2rem',
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  tabsGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
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
    gap: '0.5rem',
    overflowX: 'auto',
    flex: 1,
    paddingBottom: '0.5rem',
    scrollBehavior: 'smooth'
  },
  mobileTab: {
    padding: '0.5rem 0.65rem',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.7rem',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
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
    padding: 'clamp(0.75rem, 2vw, 1rem)',
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