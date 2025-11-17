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
  const [sendingCode, setSendingCode] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  const [wireForm, setWireForm] = useState({
    from_account_id: '',
    transfer_type: 'domestic',
    recipient_first_name: '',
    recipient_middle_name: '',
    recipient_last_name: '',
    recipient_account: '',
    recipient_bank: '',
    recipient_bank_address: '',
    recipient_bank_city: '',
    recipient_bank_state: '',
    recipient_bank_zip: '',
    recipient_bank_country: 'United States',
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

    if (!wireForm.recipient_first_name || !wireForm.recipient_last_name) {
      setMessage('Please enter recipient first and last name');
      return;
    }

    if (!wireForm.recipient_account || !wireForm.recipient_bank) {
      setMessage('Please fill in all recipient bank details');
      return;
    }

    if (!wireForm.recipient_bank_address || !wireForm.recipient_bank_city) {
      setMessage('Please enter complete bank address');
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
    setSendingCode(true);
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
    } finally {
      setSendingCode(false);
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

      const recipientFullName = `${wireForm.recipient_first_name} ${wireForm.recipient_middle_name ? wireForm.recipient_middle_name + ' ' : ''}${wireForm.recipient_last_name}`;

      const transferData = {
        user_id: user.id,
        from_account_id: wireForm.from_account_id,
        transfer_type: wireForm.transfer_type,
        recipient_name: recipientFullName,
        recipient_account: wireForm.recipient_account,
        recipient_bank: wireForm.recipient_bank,
        recipient_bank_address: `${wireForm.recipient_bank_address}, ${wireForm.recipient_bank_city}, ${wireForm.recipient_bank_state} ${wireForm.recipient_bank_zip}, ${wireForm.recipient_bank_country}`,
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
        description: `Wire transfer to ${recipientFullName} at ${wireForm.recipient_bank} - ${wireForm.transfer_type}`,
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
    professionalHeader: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      borderBottom: '3px solid #059669',
      boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1.5rem 1rem' : '2rem 2rem',
    },
    headerTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem'
    },
    logoSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    bankLogo: {
      height: isMobile ? '50px' : '60px',
      width: 'auto'
    },
    bankInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    },
    bankName: {
      fontSize: isMobile ? '1.4rem' : '1.8rem',
      fontWeight: '700',
      color: '#1a365d',
      letterSpacing: '-0.5px'
    },
    bankTagline: {
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      color: '#64748b',
      fontWeight: '500'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.7rem 1.3rem' : '0.85rem 1.6rem',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.9rem' : '1rem',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(26, 62, 111, 0.3)',
      transition: 'all 0.3s ease',
      border: 'none'
    },
    headerDescription: {
      background: 'rgba(5, 150, 105, 0.05)',
      borderLeft: '4px solid #059669',
      padding: isMobile ? '1rem' : '1.25rem 1.5rem',
      borderRadius: '8px'
    },
    descriptionTitle: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    descriptionText: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#475569',
      lineHeight: '1.6',
      margin: 0
    },
    main: {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: isMobile ? '2rem 1rem' : '3rem 2rem'
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
      width: isMobile ? '50px' : '55px',
      height: isMobile ? '50px' : '55px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.2rem' : '1.3rem',
      fontWeight: '700',
      marginBottom: '0.75rem',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    stepLabel: {
      fontSize: isMobile ? '0.8rem' : '0.95rem',
      fontWeight: '600',
      textAlign: 'center',
      color: '#64748b'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '20px',
      padding: isMobile ? '2rem 1.5rem' : '3rem 2.5rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.2)'
    },
    cardTitle: {
      fontSize: isMobile ? '1.5rem' : '1.8rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    cardSubtitle: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      color: '#64748b',
      marginBottom: '2rem',
      lineHeight: '1.5'
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
    sectionTitle: {
      fontSize: isMobile ? '1.1rem' : '1.2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    formGrid2: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
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
      padding: '0.95rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: '1rem',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      backgroundColor: '#ffffff'
    },
    select: {
      width: '100%',
      padding: '0.95rem',
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
      padding: '1.2rem',
      backgroundColor: '#f8fafc',
      borderRadius: '10px',
      border: '2px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '1rem'
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
      marginTop: '2.5rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    button: {
      flex: 1,
      padding: '1.1rem 2rem',
      borderRadius: '12px',
      fontSize: '1.05rem',
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
      padding: isMobile ? '1.5rem' : '2rem',
      marginBottom: '2rem'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem 0',
      borderBottom: '1px solid #e5e7eb',
      flexWrap: 'wrap',
      gap: '0.5rem'
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
      fontSize: '1.2rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    totalValue: {
      fontSize: '1.4rem',
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
    loadingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    },
    loadingCard: {
      backgroundColor: 'white',
      padding: '2rem 3rem',
      borderRadius: '20px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    spinner: {
      fontSize: '3rem',
      marginBottom: '1rem',
      animation: 'spin 1s linear infinite'
    },
    loadingText: {
      fontSize: '1.2rem',
      fontWeight: '600',
      color: '#1a365d'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingOverlay}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}>💸</div>
          <p style={styles.loadingText}>Loading Wire Transfer...</p>
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
          <div style={styles.professionalHeader}>
            <div style={styles.headerContent}>
              <div style={styles.headerTop}>
                <div style={styles.logoSection}>
                  <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.bankLogo} />
                  <div style={styles.bankInfo}>
                    <div style={styles.bankName}>Oakline Bank</div>
                    <div style={styles.bankTagline}>Trusted Banking Since 1995</div>
                  </div>
                </div>
                <Link href="/dashboard" style={styles.backButton}>
                  ← Dashboard
                </Link>
              </div>
            </div>
          </div>
          <div style={styles.main}>
            <div style={styles.card}>
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏦</div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1a365d', marginBottom: '1rem' }}>
                  No Active Accounts
                </h2>
                <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '2rem' }}>
                  You need an active account to initiate wire transfers.
                </p>
                <Link href="/apply" style={styles.backButton}>
                  Open an Account
                </Link>
              </div>
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

      {processing && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.spinner}>🔄</div>
            <p style={styles.loadingText}>Processing your wire transfer...</p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
              Please do not close this window
            </p>
          </div>
        </div>
      )}

      <div style={styles.pageContainer}>
        <div style={styles.professionalHeader}>
          <div style={styles.headerContent}>
            <div style={styles.headerTop}>
              <div style={styles.logoSection}>
                <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.bankLogo} />
                <div style={styles.bankInfo}>
                  <div style={styles.bankName}>Oakline Bank</div>
                  <div style={styles.bankTagline}>Trusted Banking Since 1995</div>
                </div>
              </div>
              <Link href="/dashboard" style={styles.backButton}>
                ← Dashboard
              </Link>
            </div>

            <div style={styles.headerDescription}>
              <div style={styles.descriptionTitle}>
                <span>🌐</span>
                Secure Wire Transfer Services
              </div>
              <p style={styles.descriptionText}>
                Send money securely to any bank account domestically within the United States or internationally worldwide. 
                Our wire transfer service provides fast, reliable, and secure money transfers with competitive rates. 
                All transfers are reviewed by our banking team for your security and peace of mind.
                <br/><br/>
                <strong>Domestic Transfers:</strong> Same-day or next business day delivery within the US ($15 fee)
                <br/>
                <strong>International Transfers:</strong> 1-5 business days worldwide delivery ($25 fee)
              </p>
            </div>
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
                <span>💰</span>
                Wire Transfer Details
              </h2>
              <p style={styles.cardSubtitle}>
                Please provide complete and accurate information for your wire transfer
              </p>

              <div style={styles.infoBox}>
                <span style={styles.infoIcon}>ℹ️</span>
                <div style={styles.infoText}>
                  <strong>Important Security Information:</strong> All wire transfers are reviewed by our banking compliance team. 
                  Domestic transfers typically process within 1-3 business days, while international transfers may take 3-5 business days. 
                  Funds will be deducted from your account immediately upon submission.
                </div>
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
                  <option value="domestic">🇺🇸 Domestic Transfer (Within United States)</option>
                  <option value="international">🌍 International Transfer (Worldwide)</option>
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
                      {account.account_type?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance)} Available
                    </option>
                  ))}
                </select>
              </div>

              <h3 style={styles.sectionTitle}>
                <span>👤</span>
                Recipient Information
              </h3>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    First Name<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_first_name}
                    onChange={(e) => handleInputChange('recipient_first_name', e.target.value)}
                    placeholder="John"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Middle Name
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_middle_name}
                    onChange={(e) => handleInputChange('recipient_middle_name', e.target.value)}
                    placeholder="Michael (Optional)"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Last Name<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_last_name}
                    onChange={(e) => handleInputChange('recipient_last_name', e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <h3 style={styles.sectionTitle}>
                <span>🏦</span>
                Bank Account Details
              </h3>

              <div style={styles.formGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Account Number<span style={styles.required}>*</span>
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
                    Bank Name<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank}
                    onChange={(e) => handleInputChange('recipient_bank', e.target.value)}
                    placeholder="e.g., Chase Bank"
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
                      placeholder="e.g., CHASUS33XXX"
                      maxLength="11"
                    />
                  </div>
                )}

                {wireForm.transfer_type === 'domestic' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Routing Number (ABA)<span style={styles.required}>*</span>
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
              </div>

              <h3 style={styles.sectionTitle}>
                <span>📍</span>
                Bank Address Information
              </h3>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  Street Address<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.recipient_bank_address}
                  onChange={(e) => handleInputChange('recipient_bank_address', e.target.value)}
                  placeholder="e.g., 123 Main Street"
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    City<span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank_city}
                    onChange={(e) => handleInputChange('recipient_bank_city', e.target.value)}
                    placeholder="e.g., New York"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    State/Province
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank_state}
                    onChange={(e) => handleInputChange('recipient_bank_state', e.target.value)}
                    placeholder="e.g., NY"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank_zip}
                    onChange={(e) => handleInputChange('recipient_bank_zip', e.target.value)}
                    placeholder="e.g., 10001"
                  />
                </div>
              </div>

              <div style={styles.formGroupFull}>
                <label style={styles.label}>
                  Country<span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.recipient_bank_country}
                  onChange={(e) => handleInputChange('recipient_bank_country', e.target.value)}
                  placeholder="e.g., United States"
                />
              </div>

              <h3 style={styles.sectionTitle}>
                <span>💵</span>
                Transfer Amount & Details
              </h3>

              <div style={styles.formGrid2}>
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

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Reference/Purpose
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="e.g., Invoice payment (Optional)"
                  />
                </div>
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
                  ⚡ Expedited Processing (+$10.00 fee for urgent same-day transfer)
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
              <p style={styles.cardSubtitle}>
                Please carefully review all information before proceeding
              </p>

              <div style={styles.reviewSection}>
                <h3 style={{ ...styles.sectionTitle, marginTop: 0 }}>Transfer Information</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Transfer Type:</span>
                  <span style={styles.reviewValue}>
                    {wireForm.transfer_type === 'domestic' ? '🇺🇸 Domestic (United States)' : '🌍 International'}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account:</span>
                  <span style={styles.reviewValue}>
                    {accounts.find(a => a.id === wireForm.from_account_id)?.account_type?.toUpperCase()} - 
                    ****{accounts.find(a => a.id === wireForm.from_account_id)?.account_number?.slice(-4)}
                  </span>
                </div>

                <h3 style={styles.sectionTitle}>Recipient Details</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Recipient Name:</span>
                  <span style={styles.reviewValue}>
                    {wireForm.recipient_first_name} {wireForm.recipient_middle_name} {wireForm.recipient_last_name}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Account Number:</span>
                  <span style={styles.reviewValue}>{wireForm.recipient_account}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Bank Name:</span>
                  <span style={styles.reviewValue}>{wireForm.recipient_bank}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Bank Address:</span>
                  <span style={styles.reviewValue}>
                    {wireForm.recipient_bank_address}, {wireForm.recipient_bank_city}, {wireForm.recipient_bank_state} {wireForm.recipient_bank_zip}, {wireForm.recipient_bank_country}
                  </span>
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

                <h3 style={styles.sectionTitle}>Amount Breakdown</h3>
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
                    <span style={styles.reviewLabel}>Expedited Processing Fee:</span>
                    <span style={styles.reviewValue}>{formatCurrency(wireForm.urgent_fee)}</span>
                  </div>
                )}
                <div style={{ ...styles.reviewRow, ...styles.totalRow }}>
                  <span style={styles.totalLabel}>Total Amount to Deduct:</span>
                  <span style={styles.totalValue}>{formatCurrency(wireForm.total_amount)}</span>
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  style={{ ...styles.button, ...styles.secondaryButton }}
                  onClick={() => setStep(1)}
                >
                  ← Edit Details
                </button>
                <button
                  style={{ ...styles.button, ...styles.primaryButton }}
                  onClick={() => {
                    setStep(3);
                    sendVerificationCode();
                  }}
                  disabled={sendingCode}
                >
                  {sendingCode ? 'Sending Code...' : 'Proceed to Verification →'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>
                <span>🔒</span>
                Security Verification
              </h2>
              <p style={styles.cardSubtitle}>
                Enter the verification code to complete your wire transfer
              </p>

              <div style={styles.infoBox}>
                <span style={styles.infoIcon}>📧</span>
                <div style={styles.infoText}>
                  We've sent a 6-digit security verification code to <strong>{user.email}</strong>. 
                  Please enter it below to authorize this wire transfer. The code is valid for 10 minutes.
                </div>
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
                    fontSize: '1.8rem',
                    letterSpacing: '0.8rem',
                    fontWeight: '700',
                    padding: '1.5rem'
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
                  disabled={processing}
                >
                  ← Back to Review
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
                  {processing ? '🔄 Processing Transfer...' : '✓ Submit Wire Transfer'}
                </button>
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <button
                  onClick={sendVerificationCode}
                  disabled={sendingCode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: sendingCode ? '#9ca3af' : '#059669',
                    textDecoration: 'underline',
                    cursor: sendingCode ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    padding: '0.5rem 1rem'
                  }}
                >
                  {sendingCode ? 'Sending...' : 'Resend Verification Code'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        input:focus, select:focus {
          outline: none;
          border-color: #059669 !important;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}