
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
    fee: 25.00,
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
    const baseFee = wireForm.transfer_type === 'international' ? 45 : 25;
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

    // Validation
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
      console.log('Code sent:', code);

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
    console.log('Verify button clicked');
    console.log('Code sent:', sentCode);
    console.log('Code entered:', verificationCode);

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

      // Deduct total amount from account
      const account = accounts.find(a => a.id === wireForm.from_account_id);
      const newBalance = parseFloat(account.balance) - wireForm.total_amount;

      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', wireForm.from_account_id);

      if (balanceError) throw balanceError;

      // Create transaction record
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
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a1f44',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1a365d',
      color: 'white',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
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
    logo: {
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700',
      color: 'white',
      textDecoration: 'none'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    main: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: isMobile ? '1rem' : '2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    cardTitle: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      position: 'relative'
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      position: 'relative'
    },
    stepCircle: {
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      fontWeight: '700',
      marginBottom: '0.5rem',
      zIndex: 2
    },
    stepLabel: {
      fontSize: '0.85rem',
      fontWeight: '600',
      textAlign: 'center'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '1rem',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '1rem',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e5e7eb'
    },
    reviewLabel: {
      color: '#6b7280',
      fontSize: '0.95rem'
    },
    reviewValue: {
      fontWeight: '600',
      color: '#1f2937',
      fontSize: '0.95rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontSize: '0.95rem'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fca5a5'
    },
    successMessage: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '1px solid #6ee7b7'
    },
    infoBox: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1.5rem'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.main, textAlign: 'center', paddingTop: '3rem' }}>
          <p style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoText}>Oakline Bank</Link>
            <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          </div>
        </div>
        <div style={styles.main}>
          <div style={styles.card}>
            <h2 style={{ textAlign: 'center', color: '#1a365d' }}>No Active Accounts</h2>
            <p style={{ textAlign: 'center', color: '#64748b' }}>
              You need an active account to initiate wire transfers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Wire Transfer - Oakline Bank</title>
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoText}>
              💸 Wire Transfer
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <main style={styles.main}>
          <div style={styles.card}>
            <div style={styles.progressSteps}>
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 1 ? '#1e40af' : '#e5e7eb',
                  color: step >= 1 ? 'white' : '#9ca3af'
                }}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span style={styles.stepLabel}>Transfer Details</span>
              </div>
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 2 ? '#1e40af' : '#e5e7eb',
                  color: step >= 2 ? 'white' : '#9ca3af'
                }}>
                  2
                </div>
                <span style={styles.stepLabel}>Review</span>
              </div>
              <div style={styles.step}>
                <div style={{
                  ...styles.stepCircle,
                  backgroundColor: step >= 3 ? '#1e40af' : '#e5e7eb',
                  color: step >= 3 ? 'white' : '#9ca3af'
                }}>
                  3
                </div>
                <span style={styles.stepLabel}>Verify & Submit</span>
              </div>
            </div>

            {message && (
              <div style={{
                ...styles.message,
                ...(message.includes('success') || message.includes('sent') 
                  ? styles.successMessage 
                  : styles.errorMessage)
              }}>
                {message}
              </div>
            )}

            {step === 1 && (
              <>
                <h2 style={styles.cardTitle}>🌐 Wire Transfer Details</h2>

                <div style={styles.infoBox}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
                    <strong>Important:</strong> Wire transfers are reviewed by our banking team for security. 
                    Processing typically takes 1-3 business days for domestic transfers and 3-5 business days for international transfers.
                  </p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Transfer Type *</label>
                  <select
                    style={styles.select}
                    value={wireForm.transfer_type}
                    onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                  >
                    <option value="domestic">Domestic (US)</option>
                    <option value="international">International</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>From Account *</label>
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

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recipient Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_name}
                    onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                    placeholder="Full name of recipient"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recipient Account Number *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_account}
                    onChange={(e) => handleInputChange('recipient_account', e.target.value)}
                    placeholder="Account number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recipient Bank Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.recipient_bank}
                    onChange={(e) => handleInputChange('recipient_bank', e.target.value)}
                    placeholder="Bank name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Recipient Bank Address</label>
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
                    <label style={styles.label}>SWIFT/BIC Code *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.swift_code}
                      onChange={(e) => handleInputChange('swift_code', e.target.value)}
                      placeholder="e.g., ABCDUS33XXX"
                    />
                  </div>
                )}

                {wireForm.transfer_type === 'domestic' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Routing Number *</label>
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
                  <label style={styles.label}>Amount (USD) *</label>
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
                  <label style={styles.label}>Description/Reference</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Payment purpose (optional)"
                  />
                </div>

                <div style={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={wireForm.urgent_transfer}
                    onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                  />
                  <label>Urgent transfer (+$10.00 fee)</label>
                </div>

                <button
                  style={{
                    ...styles.submitButton,
                    opacity: processing ? 0.7 : 1,
                    cursor: processing ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleNext}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Continue to Review →'}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={styles.cardTitle}>📋 Review Transfer Details</h2>

                <div style={{ marginBottom: '2rem' }}>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Transfer Type:</span>
                    <span style={styles.reviewValue}>{wireForm.transfer_type === 'domestic' ? 'Domestic (US)' : 'International'}</span>
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
                    <span style={styles.reviewLabel}>Amount:</span>
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
                  <div style={{
                    ...styles.reviewRow,
                    borderTop: '2px solid #1e40af',
                    marginTop: '0.5rem',
                    paddingTop: '1rem'
                  }}>
                    <span style={{ ...styles.reviewLabel, fontWeight: 'bold', fontSize: '1.1rem' }}>Total Deduction:</span>
                    <span style={{ ...styles.reviewValue, fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626' }}>
                      {formatCurrency(wireForm.total_amount)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    style={{
                      ...styles.submitButton,
                      backgroundColor: '#6b7280',
                      flex: 1
                    }}
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </button>
                  <button
                    style={{
                      ...styles.submitButton,
                      flex: 1
                    }}
                    onClick={() => {
                      setStep(3);
                      sendVerificationCode();
                    }}
                  >
                    Proceed to Verification →
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 style={styles.cardTitle}>🔒 Verify Your Transfer</h2>

                <div style={styles.infoBox}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e40af' }}>
                    📧 We've sent a 6-digit verification code to <strong>{user.email}</strong>
                  </p>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Enter Verification Code *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={verificationCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setVerificationCode(value);
                      console.log('Code entered:', value);
                    }}
                    placeholder="6-digit code"
                    maxLength="6"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    style={{
                      ...styles.submitButton,
                      backgroundColor: '#6b7280',
                      flex: 1
                    }}
                    onClick={() => setStep(2)}
                  >
                    ← Back
                  </button>
                  <button
                    style={{
                      ...styles.submitButton,
                      flex: 1,
                      opacity: processing || verificationCode.length !== 6 ? 0.7 : 1,
                      cursor: processing || verificationCode.length !== 6 ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => {
                      console.log('Submit button clicked!');
                      handleVerifyAndSubmit();
                    }}
                    disabled={processing || verificationCode.length !== 6}
                  >
                    {processing ? '🔄 Processing...' : '✓ Submit Transfer'}
                  </button>
                </div>

                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={sendVerificationCode}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1e40af',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Resend Code
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
