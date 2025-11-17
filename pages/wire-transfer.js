
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function WireTransfer() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  const [wireForm, setWireForm] = useState({
    from_account_id: '',
    transfer_type: 'domestic',
    recipient_name: '',
    recipient_account: '',
    recipient_bank: '',
    recipient_bank_address: '',
    swift_code: '',
    routing_number: '',
    amount: '',
    description: '',
    urgent_transfer: false,
    fee: 15.00,
    urgent_fee: 10.00,
    total_amount: 0
  });

  useEffect(() => {
    checkUser();
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const checkMobile = () => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  };

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: userAccounts, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (userAccounts && userAccounts.length > 0) {
        setAccounts(userAccounts);
        setWireForm(prev => ({ ...prev, from_account_id: userAccounts[0].id }));
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading accounts. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const amount = parseFloat(wireForm.amount) || 0;
    const baseFee = wireForm.transfer_type === 'international' ? 25 : 15;
    const urgentFee = wireForm.urgent_transfer ? 10 : 0;
    const totalFee = baseFee + urgentFee;
    const total = amount + totalFee;

    setWireForm(prev => ({
      ...prev,
      fee: baseFee,
      urgent_fee: urgentFee,
      total_amount: total
    }));
  };

  useEffect(() => {
    calculateTotal();
  }, [wireForm.amount, wireForm.transfer_type, wireForm.urgent_transfer]);

  const handleInputChange = (field, value) => {
    setWireForm(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const handleNext = async () => {
    setMessage('');

    if (!wireForm.from_account_id) {
      setMessage('Please select a source account');
      return;
    }

    if (!wireForm.recipient_name || !wireForm.recipient_account || !wireForm.recipient_bank) {
      setMessage('Please fill in all recipient details');
      return;
    }

    if (wireForm.transfer_type === 'international' && !wireForm.swift_code) {
      setMessage('SWIFT code is required for international transfers');
      return;
    }

    if (wireForm.transfer_type === 'domestic' && !wireForm.routing_number) {
      setMessage('Routing number is required for domestic transfers');
      return;
    }

    const amount = parseFloat(wireForm.amount);
    if (!amount || amount <= 0) {
      setMessage('Please enter a valid amount');
      return;
    }

    const account = accounts.find(a => a.id === wireForm.from_account_id);
    if (parseFloat(account.balance) < wireForm.total_amount) {
      setMessage('Insufficient funds (including fees)');
      return;
    }

    setStep(2);
  };

  const sendVerificationCode = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const { data: { session } } = await supabase.auth.getSession();
      
      await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer'
        })
      });

      setMessage('Verification code sent to your email');
    } catch (error) {
      console.error('Error sending code:', error);
      setMessage('Failed to send verification code');
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (verificationCode !== sentCode) {
      setMessage('Invalid verification code');
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const transferData = {
        user_id: user.id,
        from_account_id: wireForm.from_account_id,
        transfer_type: wireForm.transfer_type,
        recipient_name: wireForm.recipient_name,
        recipient_account: wireForm.recipient_account,
        recipient_bank: wireForm.recipient_bank,
        recipient_bank_address: wireForm.recipient_bank_address || null,
        swift_code: wireForm.swift_code || null,
        routing_number: wireForm.routing_number || null,
        amount: parseFloat(wireForm.amount),
        fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
        total_amount: wireForm.total_amount,
        urgent_transfer: wireForm.urgent_transfer,
        description: wireForm.description || null,
        status: 'pending',
        reference: `WIRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        verification_code: verificationCode,
        verified_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('wire_transfers')
        .insert([transferData])
        .select()
        .single();

      if (error) throw error;

      const account = accounts.find(a => a.id === wireForm.from_account_id);
      const newBalance = parseFloat(account.balance) - wireForm.total_amount;

      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', wireForm.from_account_id);

      if (balanceError) throw balanceError;

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account_id,
        type: 'wire_transfer',
        amount: wireForm.total_amount,
        description: `Wire transfer to ${wireForm.recipient_name} at ${wireForm.recipient_bank} - ${wireForm.transfer_type}`,
        status: 'pending',
        reference: transferData.reference
      }]);

      setMessage('Wire transfer submitted successfully! It will be reviewed by our team.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Wire transfer error:', error);
      setMessage(error.message || 'Transfer failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const styles = {
    pageContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1f44 0%, #1a365d 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderBottom: '3px solid #059669',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    logoIcon: {
      fontSize: isMobile ? '2rem' : '2.5rem'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.6rem 1.2rem' : '0.75rem 1.5rem',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
      transition: 'all 0.3s ease'
    },
    main: {
      maxWidth: '1000px',
      margin: '0 auto',
      padding: isMobile ? '1.5rem 1rem' : '3rem 2rem'
    },
    progressContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      marginBottom: '2rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
      marginBottom: '2rem'
    },
    progressLine: {
      position: 'absolute',
      top: '25px',
      left: '10%',
      right: '10%',
      height: '3px',
      backgroundColor: '#e5e7eb',
      zIndex: 0
    },
    progressLineActive: {
      position: 'absolute',
      top: '25px',
      left: '10%',
      height: '3px',
      backgroundColor: '#059669',
      zIndex: 1,
      transition: 'width 0.3s ease'
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      position: 'relative',
      zIndex: 2
    },
    stepCircle: {
      width: isMobile ? '45px' : '50px',
      height: isMobile ? '45px' : '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      marginBottom: '0.75rem',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    stepLabel: {
      fontSize: isMobile ? '0.75rem' : '0.9rem',
      fontWeight: '600',
      textAlign: 'center',
      color: '#64748b'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    },
    cardTitle: {
      fontSize: isMobile ? '1.3rem' : '1.6rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    infoBox: {
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: '2rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem'
    },
    infoIcon: {
      fontSize: '1.5rem',
      flexShrink: 0
    },
    infoText: {
      margin: 0,
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#1e40af',
      lineHeight: '1.6'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    formGroupFull: {
      gridColumn: isMobile ? '1' : '1 / -1',
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.95rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    required: {
      color: '#dc2626',
      marginLeft: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '1rem',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      backgroundColor: '#ffffff'
    },
    select: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '1rem',
      backgroundColor: '#ffffff',
      boxSizing: 'border-box',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '10px',
      border: '2px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    },
    checkbox: {
      width: '20px',
      height: '20px',
      cursor: 'pointer'
    },
    checkboxLabel: {
      fontSize: '0.95rem',
      fontWeight: '500',
      color: '#1e293b',
      cursor: 'pointer'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    button: {
      flex: 1,
      padding: '1rem 2rem',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      color: 'white'
    },
    secondaryButton: {
      background: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
      color: 'white'
    },
    reviewSection: {
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.5rem',
      marginBottom: '2rem'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem 0',
      borderBottom: '1px solid #e5e7eb'
    },
    reviewLabel: {
      color: '#64748b',
      fontSize: '0.95rem',
      fontWeight: '500'
    },
    reviewValue: {
      fontWeight: '700',
      color: '#1e293b',
      fontSize: '0.95rem',
      textAlign: 'right'
    },
    totalRow: {
      borderTop: '3px solid #059669',
      marginTop: '1rem',
      paddingTop: '1.5rem',
      borderBottom: 'none'
    },
    totalLabel: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    totalValue: {
      fontSize: '1.3rem',
      fontWeight: '700',
      color: '#dc2626'
    },
    message: {
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      fontSize: '0.95rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    errorMessage: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      color: '#991b1b',
      border: '2px solid #dc2626'
    },
    successMessage: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#065f46',
      border: '2px solid #10b981'
    },
    emptyState: {
      textAlign: 'center',
      padding: isMobile ? '2rem 1rem' : '3rem 2rem',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
    },
    emptyIcon: {
      fontSize: '4rem',
      marginBottom: '1rem'
    },
    emptyTitle: {
      fontSize: isMobile ? '1.3rem' : '1.6rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '0.75rem'
    },
    emptyText: {
      fontSize: '1rem',
      color: '#64748b',
      marginBottom: '2rem'
    }
  };

  if (loading) {
    return (
      <div style={styles.pageContainer}>
        <div style={{ ...styles.main, textAlign: 'center', paddingTop: '5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💸</div>
          <p style={{ color: 'white', fontSize: '1.3rem', fontWeight: '600' }}>Loading Wire Transfer...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <>
        <Head>
          <title>Wire Transfer - Oakline Bank</title>
        </Head>
        <div style={styles.pageContainer}>
          <div style={styles.header}>
            <div style={styles.headerContent}>
              <div style={styles.logoSection}>
                <span style={styles.logoIcon}>💸</span>
                <span style={styles.logoText}>Wire Transfer</span>
              </div>
              <Link href="/dashboard" style={styles.backButton}>
                ← Back to Dashboard
              </Link>
            </div>
          </div>
          <div style={styles.main}>
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🏦</div>
              <h2 style={styles.emptyTitle}>No Active Accounts</h2>
              <p style={styles.emptyText}>
                You need an active account to initiate wire transfers.
              </p>
              <Link href="/apply" style={styles.backButton}>
                Open an Account
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Wire Transfer - Oakline Bank</title>
      </Head>

      <div style={styles.pageContainer}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logoSection}>
              <span style={styles.logoIcon}>💸</span>
              <span style={styles.logoText}>International Wire Transfer</span>
            </div>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <main style={styles.main}>
          <div style={styles.progressContainer}>
            <div style={styles.progressSteps}>
              <div style={styles.progressLine}></div>
              <div style={{
                ...styles.progressLineActive,
                width: step === 1 ? '0%' : step === 2 ? '50%' : '100%'
              }}></div>
              
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 1 ? '#059669' : '#e5e7eb',
                  color: step >= 1 ? 'white' : '#9ca3af'
                }}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span style={styles.stepLabel}>Transfer Details</span>
              </div>
              
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 2 ? '#059669' : '#e5e7eb',
                  color: step >= 2 ? 'white' : '#9ca3af'
                }}>
                  {step > 2 ? '✓' : '2'}
                </div>
                <span style={styles.stepLabel}>Review & Confirm</span>
              </div>
              
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 3 ? '#059669' : '#e5e7eb',
                  color: step >= 3 ? 'white' : '#9ca3af'
                }}>
                  3
                </div>
                <span style={styles.stepLabel}>Verify & Submit</span>
              </div>
            </div>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              ...(message.includes('success') || message.includes('sent') 
                ? styles.successMessage 
                : styles.errorMessage)
            }}>
              <span>{message.includes('success') || message.includes('sent') ? '✓' : '⚠'}</span>
              {message}
            </div>
          )}

          {step === 1 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span>🌐</span>
                Wire Transfer Information
              </h2>

              <div style={styles.infoBox}>
                <span style={styles.infoIcon}>ℹ️</span>
                <p style={styles.infoText}>
                  <strong>Important:</strong> Wire transfers are reviewed by our banking team for security. 
                  Processing typically takes 1-3 business days for domestic transfers and 3-5 business days for international transfers. 
                  Funds will be deducted from your account immediately upon submission.
                </p>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  Transfer Type<span style={styles.required}>*</span>
                </label>
                <select
                  style={styles.select}
                  value={wireForm.transfer_type}
                  onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                >
                  <option value="domestic">🇺🇸 Domestic (United States)</option>
                  <option value="international">🌍 International</option>
                </select>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  From Account<span style={styles.required}>*</span>
                </label>
                <select
                  style={styles.select}
                  value={wireForm.from_account_id}
                  onChange={(e) => handleInputChange('from_account_id', e.target.value)}
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Recipient Name<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_name}
                    onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                    placeholder="Full legal name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Recipient Account Number<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_account}
                    onChange={(e) => handleInputChange('recipient_account', e.target.value)}
                    placeholder="Account number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Recipient Bank Name<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank}
                    onChange={(e) => handleInputChange('recipient_bank', e.target.value)}
                    placeholder="Bank name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Recipient Bank Address
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank_address}
                    onChange={(e) => handleInputChange('recipient_bank_address', e.target.value)}
                    placeholder="Bank address (optional)"
                  />
                </div>

                {wireForm.transfer_type === 'international' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      SWIFT/BIC Code<span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.swift_code}
                      onChange={(e) => handleInputChange('swift_code', e.target.value.toUpperCase())}
                      placeholder="e.g., ABCDUS33XXX"
                      maxLength="11"
                    />
                  </div>
                )}

                {wireForm.transfer_type === 'domestic' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Routing Number<span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.routing_number}
                      onChange={(e) => handleInputChange('routing_number', e.target.value)}
                      placeholder="9-digit routing number"
                      maxLength="9"
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Amount (USD)<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    style={styles.input}
                    value={wireForm.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                  />
                </div>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  Description/Reference
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Purpose of transfer (optional)"
                />
              </div>

              <div 
                style={styles.checkboxContainer}
                onClick={() => handleInputChange('urgent_transfer', !wireForm.urgent_transfer)}
              >
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={wireForm.urgent_transfer}
                  onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                />
                <label style={styles.checkboxLabel}>
                  ⚡ Urgent Transfer (+$10.00 expedited processing fee)
                </label>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    opacity: processing ? 0.7 : 1,
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleNext}
                  disabled={processing}
                >
                  Continue to Review →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span>📋</span>
                Review Transfer Details
              </h2>

              <div style={styles.reviewSection}>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Transfer Type:</span>
                  <span style={styles.reviewValue}>
                    {wireForm.transfer_type === 'domestic' ? '🇺🇸 Domestic (US)' : '🌍 International'}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account:</span>
                  <span style={styles.reviewValue}>
                    {accounts.find(a => a.id === wireForm.from_account_id)?.account_type?.toUpperCase()} - 
                    ****{accounts.find(a => a.id === wireForm.from_account_id)?.account_number?.slice(-4)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Recipient Name:</span>
                  <span style={styles.reviewValue}>{wireForm.recipient_name}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Recipient Account:</span>
                  <span style={styles.reviewValue}>{wireForm.recipient_account}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Recipient Bank:</span>
                  <span style={styles.reviewValue}>{wireForm.recipient_bank}</span>
                </div>
                {wireForm.swift_code && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>SWIFT Code:</span>
                    <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                  </div>
                )}
                {wireForm.routing_number && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Routing Number:</span>
                    <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                  </div>
                )}
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Transfer Amount:</span>
                  <span style={styles.reviewValue}>{formatCurrency(wireForm.amount)}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Wire Transfer Fee:</span>
                  <span style={styles.reviewValue}>{formatCurrency(wireForm.fee)}</span>
                </div>
                {wireForm.urgent_transfer && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Urgent Processing Fee:</span>
                    <span style={styles.reviewValue}>{formatCurrency(wireForm.urgent_fee)}</span>
                  </div>
                )}
                <div style={{ ...styles.reviewRow, ...styles.totalRow }}>
                  <span style={styles.totalLabel}>Total Deduction:</span>
                  <span style={styles.totalValue}>{formatCurrency(wireForm.total_amount)}</span>
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
                <button
                  style={{ ...styles.button, ...styles.primaryButton }}
                  onClick={() => {
                    setStep(3);
                    sendVerificationCode();
                  }}
                >
                  Proceed to Verification →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span>🔒</span>
                Verify Your Transfer
              </h2>

              <div style={styles.infoBox}>
                <span style={styles.infoIcon}>📧</span>
                <p style={styles.infoText}>
                  We've sent a 6-digit verification code to <strong>{user.email}</strong>. 
                  Please enter it below to complete your wire transfer.
                </p>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  Verification Code<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    letterSpacing: '0.5rem',
                    fontWeight: '700'
                  }}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  placeholder="000000"
                  maxLength="6"
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={() => setStep(2)}
                >
                  ← Back
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    opacity: processing || verificationCode.length !== 6 ? 0.7 : 1,
                    cursor: processing || verificationCode.length !== 6 ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleVerifyAndSubmit}
                  disabled={processing || verificationCode.length !== 6}
                >
                  {processing ? '🔄 Processing...' : '✓ Submit Transfer'}
                </button>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <button
                  onClick={sendVerificationCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#059669',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600'
                  }}
                >
                  Resend Verification Code
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
