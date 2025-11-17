import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Withdrawal() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const [withdrawalForm, setWithdrawalForm] = useState({
    from_account_id: '',
    withdrawal_method: 'internal_transfer',
    amount: '',
    recipient_name: '',
    recipient_account_number: '',
    recipient_bank: '',
    routing_number: '',
    swift_code: '',
    iban: '',
    recipient_address: '',
    purpose: '',
    fee: 0,
    total_amount: 0
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchWithdrawals();
    }
  }, [user]);

  useEffect(() => {
    calculateFees();
  }, [withdrawalForm.amount, withdrawalForm.withdrawal_method]);

  const fetchUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAccounts(data || []);
      if (data?.length > 0 && !withdrawalForm.from_account_id) {
        setWithdrawalForm(prev => ({ ...prev, from_account_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      showMessage('Unable to load accounts', 'error');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts!inner(account_number, account_type)
        `)
        .eq('user_id', currentUser.id)
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    }
  };

  const calculateFees = () => {
    const amount = parseFloat(withdrawalForm.amount) || 0;
    let fee = 0;

    switch (withdrawalForm.withdrawal_method) {
      case 'internal_transfer':
        fee = 0;
        break;
      case 'external_ach':
        fee = 3.00;
        break;
      case 'wire_domestic':
        fee = 25.00;
        break;
      case 'wire_international':
        fee = 45.00;
        break;
      case 'debit_card':
        fee = 2.00;
        break;
      default:
        fee = 0;
    }

    const total = amount + fee;
    setWithdrawalForm(prev => ({
      ...prev,
      fee: fee,
      total_amount: total
    }));
  };

  const validateStep1 = () => {
    if (!withdrawalForm.from_account_id) {
      showMessage('Please select an account', 'error');
      return false;
    }

    if (!withdrawalForm.withdrawal_method) {
      showMessage('Please select a withdrawal method', 'error');
      return false;
    }

    if (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return false;
    }

    const selectedAccount = accounts.find(acc => acc.id === withdrawalForm.from_account_id);
    if (!selectedAccount) {
      showMessage('Selected account not found', 'error');
      return false;
    }

    if (withdrawalForm.total_amount > parseFloat(selectedAccount.balance)) {
      showMessage(`Insufficient funds. Available balance: $${parseFloat(selectedAccount.balance).toFixed(2)}`, 'error');
      return false;
    }

    if (parseFloat(withdrawalForm.amount) > 10000) {
      showMessage('Single withdrawal limit is $10,000. Please contact support for higher amounts.', 'error');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const { withdrawal_method, recipient_name, recipient_account_number, routing_number, 
            swift_code, iban, recipient_bank, recipient_address } = withdrawalForm;

    switch (withdrawal_method) {
      case 'internal_transfer':
        if (!recipient_account_number) {
          showMessage('Please enter the recipient account number', 'error');
          return false;
        }
        if (recipient_account_number.length < 10) {
          showMessage('Please enter a valid account number', 'error');
          return false;
        }
        break;

      case 'external_ach':
        if (!recipient_name || !recipient_account_number || !routing_number || !recipient_bank) {
          showMessage('Please fill in all required ACH transfer details', 'error');
          return false;
        }
        if (routing_number.length !== 9) {
          showMessage('Routing number must be 9 digits', 'error');
          return false;
        }
        break;

      case 'wire_domestic':
        if (!recipient_name || !recipient_account_number || !routing_number || !recipient_bank || !recipient_address) {
          showMessage('Please fill in all required wire transfer details', 'error');
          return false;
        }
        if (routing_number.length !== 9) {
          showMessage('Routing number must be 9 digits', 'error');
          return false;
        }
        break;

      case 'wire_international':
        if (!recipient_name || !swift_code || !iban || !recipient_bank || !recipient_address) {
          showMessage('Please fill in all required international wire details', 'error');
          return false;
        }
        if (swift_code.length < 8 || swift_code.length > 11) {
          showMessage('SWIFT code must be 8-11 characters', 'error');
          return false;
        }
        break;

      case 'debit_card':
        if (!recipient_name || !recipient_account_number || !recipient_bank) {
          showMessage('Please fill in all required Debit Card details', 'error');
          return false;
        }
        // Add more debit card specific validations if needed
        break;

      default:
        showMessage('Invalid withdrawal method selected', 'error');
        return false;
    }

    return true;
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleNextStep = () => {
    setMessage('');
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    setMessage('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const sendVerificationCode = async () => {
    try {
      setSendingCode(true);
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);

      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Verification code:', code);
      setSentCode(true);
      showMessage('Verification code sent to your email', 'success');
    } catch (error) {
      console.error('Error sending code:', error);
      showMessage('Failed to send verification code', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = parseFloat(withdrawalForm.amount);
    if (amount >= 5000) {
      if (!verificationCode || verificationCode.length !== 6) {
        showMessage('Please enter the 6-digit verification code', 'error');
        return;
      }
      if (verificationCode !== generatedCode) {
        showMessage('Invalid verification code. Please try again.', 'error');
        return;
      }
    }

    setLoading(true);
    setMessage('');

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('No user found');

      const selectedAccount = accounts.find(acc => acc.id === withdrawalForm.from_account_id);
      const amount = parseFloat(withdrawalForm.amount);
      const fee = withdrawalForm.fee;
      const totalAmount = withdrawalForm.total_amount;

      if (totalAmount > parseFloat(selectedAccount.balance)) {
        throw new Error('Insufficient funds including fees');
      }

      const balanceBefore = parseFloat(selectedAccount.balance);
      const balanceAfter = balanceBefore - totalAmount;

      let withdrawalDescription = '';
      switch (withdrawalForm.withdrawal_method) {
        case 'internal_transfer':
          withdrawalDescription = `Internal transfer to ${withdrawalForm.recipient_account_number}`;
          break;
        case 'external_ach':
          withdrawalDescription = `ACH transfer to ${withdrawalForm.recipient_name} at ${withdrawalForm.recipient_bank}`;
          break;
        case 'wire_domestic':
          withdrawalDescription = `Domestic wire to ${withdrawalForm.recipient_name} at ${withdrawalForm.recipient_bank}`;
          break;
        case 'wire_international':
          withdrawalDescription = `International wire to ${withdrawalForm.recipient_name} at ${withdrawalForm.recipient_bank}`;
          break;
        case 'debit_card':
          withdrawalDescription = `Debit card withdrawal to ${withdrawalForm.recipient_name}`;
          break;
      }

      const reference = `WD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: currentUser.id,
          account_id: withdrawalForm.from_account_id,
          type: 'withdrawal',
          amount: amount,
          description: withdrawalDescription,
          reference: reference,
          status: withdrawalForm.withdrawal_method === 'internal_transfer' ? 'completed' : 'pending',
          balance_before: balanceBefore,
          balance_after: balanceAfter
        }])
        .select()
        .single();

      if (transactionError) throw transactionError;

      if (fee > 0) {
        await supabase.from('transactions').insert([{
          user_id: currentUser.id,
          account_id: withdrawalForm.from_account_id,
          type: 'fee',
          amount: fee,
          description: `${withdrawalForm.withdrawal_method.replace('_', ' ')} fee`,
          reference: `FEE-${reference}`,
          status: 'completed',
          balance_before: balanceAfter,
          balance_after: balanceAfter - fee
        }]);
      }

      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ 
          balance: balanceAfter,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalForm.from_account_id);

      if (balanceError) throw balanceError;

      await supabase.from('notifications').insert([{
        user_id: currentUser.id,
        type: 'withdrawal',
        title: 'Withdrawal Processed',
        message: `$${amount.toFixed(2)} withdrawal processed via ${withdrawalForm.withdrawal_method.replace(/_/g, ' ')}`
      }]);

      setReceiptData({
        reference: reference,
        amount: amount,
        fee: fee,
        total: totalAmount,
        method: withdrawalForm.withdrawal_method,
        account: selectedAccount,
        recipient_name: withdrawalForm.recipient_name,
        recipient_bank: withdrawalForm.recipient_bank,
        timestamp: new Date().toISOString()
      });

      setShowReceipt(true);
      fetchAccounts();
      fetchWithdrawals();

    } catch (error) {
      console.error('Withdrawal error:', error);
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setCurrentStep(1);
    setVerificationCode('');
    setSentCode(false);
    setGeneratedCode('');
    setWithdrawalForm({
      from_account_id: accounts[0]?.id || '',
      withdrawal_method: 'internal_transfer',
      amount: '',
      recipient_name: '',
      recipient_account_number: '',
      recipient_bank: '',
      routing_number: '',
      swift_code: '',
      iban: '',
      recipient_address: '',
      purpose: '',
      fee: 0,
      total_amount: 0
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMethodLabel = (method) => {
    const labels = {
      internal_transfer: '🏦 Internal Transfer',
      external_ach: '🔄 External ACH',
      wire_domestic: '📡 Domestic Wire',
      wire_international: '🌍 International Wire',
      debit_card: '💳 Debit Card Withdrawal'
    };
    return labels[method] || method;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      completed: '#059669',
      failed: '#dc2626',
      cancelled: '#64748b'
    };
    return colors[status] || '#64748b';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2d5986 50%, #1a365d 100%)',
      padding: isMobile ? '1rem' : '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '800',
      color: 'white',
      textDecoration: 'none',
      letterSpacing: '-0.02em'
    },
    backButton: {
      padding: isMobile ? '0.625rem 1.125rem' : '0.75rem 1.5rem',
      backgroundColor: 'rgba(255,255,255,0.15)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: isMobile ? '0.875rem' : '0.9375rem',
      transition: 'all 0.3s',
      border: '1px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(10px)'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto'
    },
    pageTitle: {
      fontSize: isMobile ? '2rem' : '2.75rem',
      fontWeight: '800',
      color: 'white',
      textAlign: 'center',
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em',
      textShadow: '0 2px 10px rgba(0,0,0,0.2)'
    },
    pageSubtitle: {
      fontSize: isMobile ? '1rem' : '1.125rem',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: '2.5rem',
      lineHeight: '1.8',
      fontWeight: '400'
    },
    stepIndicator: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: isMobile ? '0.5rem' : '1rem',
      marginBottom: '2.5rem',
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: isMobile ? '1.5rem 1rem' : '2rem',
      borderRadius: '16px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      maxWidth: '900px',
      margin: '0 auto 2.5rem auto'
    },
    step: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: 'center',
      gap: isMobile ? '0.375rem' : '0.625rem',
      flex: 1
    },
    stepCircle: {
      width: isMobile ? '44px' : '56px',
      height: isMobile ? '44px' : '56px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1.125rem' : '1.375rem',
      fontWeight: '700',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      border: '3px solid transparent'
    },
    stepLabel: {
      fontSize: isMobile ? '0.75rem' : '0.9375rem',
      fontWeight: '600',
      color: 'white',
      textAlign: isMobile ? 'center' : 'left',
      lineHeight: '1.3'
    },
    stepDivider: {
      width: isMobile ? '2px' : '60px',
      height: isMobile ? '24px' : '3px',
      backgroundColor: 'rgba(255,255,255,0.3)',
      borderRadius: '2px',
      transition: 'all 0.3s ease'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #dc2626'
    },
    cardTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #dc2626'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1rem',
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem',
      letterSpacing: '-0.01em'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    button: {
      flex: 1,
      padding: '1rem',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    balanceInfo: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginTop: '1rem',
      border: '1px solid #e2e8f0'
    },
    balanceLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    balanceValue: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    withdrawalsList: {
      maxHeight: '600px',
      overflowY: 'auto'
    },
    withdrawalItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    reviewSection: {
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: '2px solid #e2e8f0'
    },
    reviewTitle: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #dc2626'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e2e8f0'
    },
    reviewLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500'
    },
    reviewValue: {
      fontSize: '0.9375rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.emptyState, color: 'white', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Please sign in to continue</h2>
          <a href="/sign-in" style={{ color: '#FFC857', textDecoration: 'underline' }}>Go to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        {sendingCode && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(26, 54, 93, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(8px)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              border: '6px solid rgba(255,255,255,0.2)',
              borderTop: '6px solid #dc2626',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '2rem'
            }}></div>
            <h2 style={{
              color: 'white',
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              📧 Sending Verification Code
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.9)',
              fontSize: isMobile ? '1rem' : '1.125rem',
              textAlign: 'center',
              maxWidth: '500px',
              lineHeight: '1.6',
              padding: '0 1rem'
            }}>
              Please wait while we send a 6-digit security code to <strong>{user?.email}</strong>
            </p>
            <div style={{
              marginTop: '2rem',
              padding: '1rem 2rem',
              backgroundColor: 'rgba(220, 38, 38, 0.2)',
              borderRadius: '12px',
              border: '2px solid rgba(220, 38, 38, 0.5)',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              🔒 This process is secured with bank-level encryption
            </div>
          </div>
        )}

        <header style={styles.header}>
          <a href="/dashboard" style={styles.logo}>🏦 Oakline Bank</a>
          <a href="/dashboard" style={styles.backButton}>← Back to Dashboard</a>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>💸 Withdrawal Services</h1>
          <p style={styles.pageSubtitle}>
            Securely withdraw funds to your preferred destination
          </p>

          {showReceipt && receiptData ? (
            <div style={{
              maxWidth: '700px',
              margin: '0 auto',
              backgroundColor: 'rgba(255,255,255,0.98)',
              borderRadius: '16px',
              padding: isMobile ? '2rem' : '3rem',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              border: '2px solid #059669'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '2.5rem'
                }}>
                  ✅
                </div>
                <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', color: '#059669', marginBottom: '0.5rem', fontWeight: '800' }}>
                  Withdrawal Successful!
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
                  Your withdrawal has been processed
                </p>
              </div>

              <div style={styles.reviewSection}>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Reference Number</span>
                  <span style={{ ...styles.reviewValue, color: '#dc2626', fontWeight: '700' }}>{receiptData.reference}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account</span>
                  <span style={styles.reviewValue}>
                    {receiptData.account.account_type.toUpperCase()} •••{receiptData.account.account_number.slice(-4)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Withdrawal Method</span>
                  <span style={styles.reviewValue}>{getMethodLabel(receiptData.method)}</span>
                </div>
                {receiptData.recipient_name && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Recipient</span>
                    <span style={styles.reviewValue}>{receiptData.recipient_name}</span>
                  </div>
                )}
                {receiptData.recipient_bank && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Bank</span>
                    <span style={styles.reviewValue}>{receiptData.recipient_bank}</span>
                  </div>
                )}
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Amount</span>
                  <span style={styles.reviewValue}>{formatCurrency(receiptData.amount)}</span>
                </div>
                {receiptData.fee > 0 && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Processing Fee</span>
                    <span style={styles.reviewValue}>{formatCurrency(receiptData.fee)}</span>
                  </div>
                )}
                <div style={{...styles.reviewRow, borderTop: '2px solid #dc2626', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#fee2e2'}}>
                  <span style={{...styles.reviewLabel, fontWeight: '700', fontSize: '1rem', color: '#1a365d'}}>Total Withdrawn</span>
                  <span style={{...styles.reviewValue, fontWeight: '700', fontSize: '1.25rem', color: '#dc2626'}}>
                    {formatCurrency(receiptData.total)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Date & Time</span>
                  <span style={styles.reviewValue}>{formatDate(receiptData.timestamp)}</span>
                </div>
              </div>

              <button
                onClick={closeReceipt}
                style={{
                  ...styles.submitButton,
                  backgroundColor: '#059669',
                  boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)'
                }}
              >
                Make Another Withdrawal
              </button>

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fffbeb',
                borderRadius: '12px',
                border: '1px solid #fbbf24',
                fontSize: '0.875rem',
                color: '#92400e'
              }}>
                <strong>📋 Important:</strong> Please save this reference number for your records.
                {receiptData.method !== 'internal_transfer' && receiptData.method !== 'debit_card' && 
                  ' Processing typically takes 1-3 business days.'
                }
              </div>
            </div>
          ) : accounts.length === 0 ? (
            <div style={{
              maxWidth: '700px',
              margin: '0 auto',
              backgroundColor: 'rgba(255,255,255,0.98)',
              borderRadius: '16px',
              padding: '3rem',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🏦</div>
              <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Active Accounts</h3>
              <p>You need an active account to make withdrawals. Please contact support.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: currentStep === 1 ? (isMobile ? '1fr' : '1fr 1fr') : '1fr',
              gap: '2rem',
              marginBottom: '2rem',
              maxWidth: currentStep === 1 ? '1400px' : '800px',
              margin: currentStep === 1 ? '0 auto 2rem auto' : '0 auto'
            }}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>
                  {currentStep === 1 && '💰 Step 1: Withdrawal Details'}
                  {currentStep === 2 && '📋 Step 2: Recipient Information'}
                  {currentStep === 3 && '🔐 Step 3: Review & Confirm'}
                </h2>

                {message && (
                  <div style={{
                    ...styles.message,
                    backgroundColor: messageType === 'success' ? '#dcfce7' : messageType === 'error' ? '#fee2e2' : '#dbeafe',
                    borderColor: messageType === 'success' ? '#059669' : messageType === 'error' ? '#dc2626' : '#3b82f6',
                    color: messageType === 'success' ? '#065f46' : messageType === 'error' ? '#991b1b' : '#1e40af'
                  }}>
                    {message}
                  </div>
                )}

                <div style={styles.stepIndicator}>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepCircle,
                      backgroundColor: currentStep >= 1 ? '#dc2626' : 'rgba(255,255,255,0.2)',
                      color: currentStep >= 1 ? 'white' : 'rgba(255,255,255,0.6)',
                      borderColor: currentStep === 1 ? '#FFC857' : 'transparent',
                      transform: currentStep === 1 ? 'scale(1.05)' : 'scale(1)'
                    }}>
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <span style={{
                      ...styles.stepLabel,
                      opacity: currentStep >= 1 ? 1 : 0.6,
                      fontWeight: currentStep === 1 ? '700' : '600'
                    }}>
                      Withdrawal Details
                    </span>
                  </div>
                  <div style={{
                    ...styles.stepDivider,
                    backgroundColor: currentStep >= 2 ? '#dc2626' : 'rgba(255,255,255,0.3)'
                  }}></div>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepCircle,
                      backgroundColor: currentStep >= 2 ? '#dc2626' : 'rgba(255,255,255,0.2)',
                      color: currentStep >= 2 ? 'white' : 'rgba(255,255,255,0.6)',
                      borderColor: currentStep === 2 ? '#FFC857' : 'transparent',
                      transform: currentStep === 2 ? 'scale(1.05)' : 'scale(1)'
                    }}>
                      {currentStep > 2 ? '✓' : '2'}
                    </div>
                    <span style={{
                      ...styles.stepLabel,
                      opacity: currentStep >= 2 ? 1 : 0.6,
                      fontWeight: currentStep === 2 ? '700' : '600'
                    }}>
                      Recipient Info
                    </span>
                  </div>
                  <div style={{
                    ...styles.stepDivider,
                    backgroundColor: currentStep >= 3 ? '#dc2626' : 'rgba(255,255,255,0.3)'
                  }}></div>
                  <div style={styles.step}>
                    <div style={{
                      ...styles.stepCircle,
                      backgroundColor: currentStep >= 3 ? '#dc2626' : 'rgba(255,255,255,0.2)',
                      color: currentStep >= 3 ? 'white' : 'rgba(255,255,255,0.6)',
                      borderColor: currentStep === 3 ? '#FFC857' : 'transparent',
                      transform: currentStep === 3 ? 'scale(1.05)' : 'scale(1)'
                    }}>
                      {currentStep > 3 ? '✓' : '3'}
                    </div>
                    <span style={{
                      ...styles.stepLabel,
                      opacity: currentStep >= 3 ? 1 : 0.6,
                      fontWeight: currentStep === 3 ? '700' : '600'
                    }}>
                      Review & Confirm
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {currentStep === 1 && (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>From Account *</label>
                        <select
                          style={styles.select}
                          value={withdrawalForm.from_account_id}
                          onChange={(e) => setWithdrawalForm(prev => ({ ...prev, from_account_id: e.target.value }))}
                          required
                        >
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.account_type.toUpperCase()} •••{account.account_number.slice(-4)} - {formatCurrency(account.balance)}
                            </option>
                          ))}
                        </select>
                        {withdrawalForm.from_account_id && (
                          <div style={styles.balanceInfo}>
                            <div style={styles.balanceLabel}>Available Balance</div>
                            <div style={styles.balanceValue}>
                              {formatCurrency(accounts.find(a => a.id === withdrawalForm.from_account_id)?.balance || 0)}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Withdrawal Method *</label>
                        <select
                          style={styles.select}
                          value={withdrawalForm.withdrawal_method}
                          onChange={(e) => setWithdrawalForm(prev => ({ ...prev, withdrawal_method: e.target.value }))}
                          required
                        >
                          <option value="internal_transfer">🏦 Internal Transfer (Free)</option>
                          <option value="external_ach">🔄 External ACH Transfer ($3.00 fee)</option>
                          <option value="wire_domestic">📡 Domestic Wire ($25.00 fee)</option>
                          <option value="wire_international">🌍 International Wire ($45.00 fee)</option>
                          <option value="debit_card">💳 Debit Card Withdrawal ($2.00 fee)</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Withdrawal Amount ($) *</label>
                        <input
                          type="number"
                          style={styles.input}
                          value={withdrawalForm.amount}
                          onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          max="10000"
                          required
                        />
                      </div>

                      {withdrawalForm.fee > 0 && (
                        <div style={{
                          backgroundColor: '#fffbeb',
                          border: '2px solid #fbbf24',
                          borderRadius: '12px',
                          padding: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Withdrawal Amount:</span>
                            <span style={{ fontSize: '0.9375rem', color: '#92400e', fontWeight: '700' }}>{formatCurrency(parseFloat(withdrawalForm.amount) || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600' }}>Processing Fee:</span>
                            <span style={{ fontSize: '0.9375rem', color: '#92400e', fontWeight: '700' }}>{formatCurrency(withdrawalForm.fee)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid #fbbf24' }}>
                            <span style={{ fontSize: '1rem', color: '#92400e', fontWeight: '700' }}>Total Deduction:</span>
                            <span style={{ fontSize: '1.125rem', color: '#dc2626', fontWeight: '800' }}>{formatCurrency(withdrawalForm.total_amount)}</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleNextStep}
                        style={{
                          ...styles.submitButton,
                          backgroundColor: '#dc2626',
                          opacity: (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) ? 0.5 : 1,
                          cursor: (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0}
                      >
                        Continue to Recipient Details →
                      </button>
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      {withdrawalForm.withdrawal_method === 'internal_transfer' && (
                        <>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Recipient Account Number *</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={withdrawalForm.recipient_account_number}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_account_number: e.target.value }))}
                              placeholder="Enter Oakline Bank account number"
                              required
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Recipient Name (Optional)</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={withdrawalForm.recipient_name}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                              placeholder="For reference only"
                            />
                          </div>
                        </>
                      )}

                      {withdrawalForm.withdrawal_method === 'external_ach' && (
                        <>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Recipient Full Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_name}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                                placeholder="Full name on account"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Bank Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_bank}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_bank: e.target.value }))}
                                placeholder="Bank name"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Routing Number *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.routing_number}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                                placeholder="123456789"
                                maxLength="9"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Account Number *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_account_number}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_account_number: e.target.value }))}
                                placeholder="Account number"
                                required
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {withdrawalForm.withdrawal_method === 'wire_domestic' && (
                        <>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Recipient Full Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_name}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                                placeholder="Full name on account"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Bank Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_bank}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_bank: e.target.value }))}
                                placeholder="Bank name"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Routing Number *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.routing_number}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                                placeholder="123456789"
                                maxLength="9"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Account Number *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_account_number}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_account_number: e.target.value }))}
                                placeholder="Account number"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Recipient Address *</label>
                            <textarea
                              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                              value={withdrawalForm.recipient_address}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_address: e.target.value }))}
                              placeholder="Complete address"
                              required
                            />
                          </div>
                        </>
                      )}

                      {withdrawalForm.withdrawal_method === 'wire_international' && (
                        <>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Recipient Full Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_name}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                                placeholder="Full name on account"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Bank Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_bank}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_bank: e.target.value }))}
                                placeholder="Bank name"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>SWIFT Code *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.swift_code}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, swift_code: e.target.value.toUpperCase().slice(0, 11) }))}
                                placeholder="ABCDUS33XXX"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>IBAN *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.iban}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, iban: e.target.value.toUpperCase() }))}
                                placeholder="International Bank Account Number"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Bank Address *</label>
                            <textarea
                              style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                              value={withdrawalForm.recipient_address}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_address: e.target.value }))}
                              placeholder="Complete bank address"
                              required
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Purpose of Transfer</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={withdrawalForm.purpose}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, purpose: e.target.value }))}
                              placeholder="e.g., Personal transfer, Investment"
                            />
                          </div>
                        </>
                      )}

                      {withdrawalForm.withdrawal_method === 'debit_card' && (
                        <>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Cardholder Name *</label>
                            <input
                              type="text"
                              style={styles.input}
                              value={withdrawalForm.recipient_name}
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                              placeholder="Name on the debit card"
                              required
                            />
                          </div>
                          <div style={styles.formGrid}>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Debit Card Number *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_account_number}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_account_number: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                                placeholder="16-digit card number"
                                maxLength="16"
                                required
                              />
                            </div>
                            <div style={styles.formGroup}>
                              <label style={styles.label}>Bank Name *</label>
                              <input
                                type="text"
                                style={styles.input}
                                value={withdrawalForm.recipient_bank}
                                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, recipient_bank: e.target.value }))}
                                placeholder="Issuing bank name"
                                required
                              />
                            </div>
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>Expiry Date (MM/YY) *</label>
                            <input
                              type="text"
                              style={styles.input}
                              placeholder="MM/YY"
                              maxLength="5"
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                let formattedValue = value;
                                if (value.length > 2) {
                                  formattedValue = `${value.slice(0, 2)}/${value.slice(2, 4)}`;
                                }
                                setWithdrawalForm(prev => ({ ...prev, recipient_address: formattedValue })); // Using recipient_address for expiry date temporarily
                              }}
                              value={withdrawalForm.recipient_address}
                              required
                            />
                          </div>
                          <div style={styles.formGroup}>
                            <label style={styles.label}>CVV *</label>
                            <input
                              type="text"
                              style={styles.input}
                              placeholder="3-digit CVV"
                              maxLength="3"
                              onChange={(e) => setWithdrawalForm(prev => ({ ...prev, purpose: e.target.value }))} // Using purpose for CVV temporarily
                              required
                            />
                          </div>
                        </>
                      )}

                      <div style={styles.buttonGroup}>
                        <button
                          type="button"
                          onClick={handlePreviousStep}
                          style={{
                            ...styles.button,
                            backgroundColor: '#64748b',
                            color: 'white'
                          }}
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          style={{
                            ...styles.button,
                            backgroundColor: '#dc2626',
                            color: 'white'
                          }}
                        >
                          Review Withdrawal →
                        </button>
                      </div>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      {parseFloat(withdrawalForm.amount) >= 5000 && (
                        <div style={{
                          backgroundColor: sentCode ? '#dcfce7' : '#fef3c7',
                          border: `2px solid ${sentCode ? '#059669' : '#f59e0b'}`,
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '1.5rem',
                          textAlign: 'center'
                        }}>
                          <p style={{ fontSize: '1rem', color: sentCode ? '#047857' : '#92400e', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
                            🔐 Security Verification Required
                          </p>
                          <p style={{ fontSize: '0.9375rem', color: sentCode ? '#047857' : '#92400e', margin: 0, lineHeight: '1.6' }}>
                            A 6-digit verification code has been sent to your email address:<br />
                            <strong style={{ fontSize: '1rem' }}>{user?.email}</strong>
                          </p>
                        </div>
                      )}

                      {parseFloat(withdrawalForm.amount) >= 5000 && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Enter Verification Code *</label>
                          <input
                            type="text"
                            style={{
                              ...styles.input,
                              fontSize: '1.75rem',
                              textAlign: 'center',
                              letterSpacing: '0.75rem',
                              fontWeight: '700',
                              padding: '1rem'
                            }}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength="6"
                            required
                            disabled={sendingCode}
                          />
                          <button
                            type="button"
                            onClick={sendVerificationCode}
                            disabled={sendingCode}
                            style={{
                              marginTop: '0.75rem',
                              padding: '0.875rem 1.25rem',
                              backgroundColor: sendingCode ? '#e5e7eb' : '#dc2626',
                              color: sendingCode ? '#9ca3af' : 'white',
                              border: 'none',
                              borderRadius: '12px',
                              fontSize: '0.9375rem',
                              fontWeight: '600',
                              cursor: sendingCode ? 'not-allowed' : 'pointer',
                              width: '100%',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {sendingCode ? 'Sending Code...' : sentCode ? '🔄 Resend Verification Code' : '📧 Send Verification Code'}
                          </button>
                        </div>
                      )}

                      <div style={styles.reviewSection}>
                        <div style={styles.reviewTitle}>Final Confirmation</div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Withdrawal Method</span>
                          <span style={styles.reviewValue}>{getMethodLabel(withdrawalForm.withdrawal_method)}</span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>From Account</span>
                          <span style={styles.reviewValue}>
                            {accounts.find(a => a.id === withdrawalForm.from_account_id)?.account_type?.toUpperCase()} •••{accounts.find(a => a.id === withdrawalForm.from_account_id)?.account_number?.slice(-4)}
                          </span>
                        </div>

                        {withdrawalForm.recipient_name && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Recipient Name</span>
                            <span style={styles.reviewValue}>{withdrawalForm.recipient_name}</span>
                          </div>
                        )}

                        {withdrawalForm.recipient_bank && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Recipient Bank</span>
                            <span style={styles.reviewValue}>{withdrawalForm.recipient_bank}</span>
                          </div>
                        )}

                        {withdrawalForm.recipient_account_number && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Account Number</span>
                            <span style={styles.reviewValue}>•••••{withdrawalForm.recipient_account_number.slice(-4)}</span>
                          </div>
                        )}

                        {withdrawalForm.routing_number && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Routing Number</span>
                            <span style={styles.reviewValue}>{withdrawalForm.routing_number}</span>
                          </div>
                        )}

                        {withdrawalForm.swift_code && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>SWIFT Code</span>
                            <span style={styles.reviewValue}>{withdrawalForm.swift_code}</span>
                          </div>
                        )}

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Withdrawal Amount</span>
                          <span style={styles.reviewValue}>{formatCurrency(parseFloat(withdrawalForm.amount))}</span>
                        </div>

                        {withdrawalForm.fee > 0 && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Processing Fee</span>
                            <span style={styles.reviewValue}>{formatCurrency(withdrawalForm.fee)}</span>
                          </div>
                        )}

                        <div style={{...styles.reviewRow, borderTop: '2px solid #dc2626', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#fee2e2'}}>
                          <span style={{...styles.reviewLabel, fontWeight: '700', fontSize: '1rem', color: '#1a365d'}}>Total Deduction</span>
                          <span style={{...styles.reviewValue, fontWeight: '700', fontSize: '1.25rem', color: '#dc2626'}}>
                            {formatCurrency(withdrawalForm.total_amount)}
                          </span>
                        </div>
                      </div>

                      <div style={styles.buttonGroup}>
                        <button
                          type="button"
                          onClick={handlePreviousStep}
                          style={{
                            ...styles.button,
                            backgroundColor: '#64748b',
                            color: 'white'
                          }}
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          style={{
                            ...styles.button,
                            backgroundColor: loading ? '#cbd5e1' : '#dc2626',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                          }}
                          disabled={loading || (parseFloat(withdrawalForm.amount) >= 5000 && (!verificationCode || verificationCode.length !== 6))}
                        >
                          {loading ? '🔄 Processing...' : '✓ Confirm Withdrawal'}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {currentStep === 1 && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>📋 Recent Withdrawals</h2>
                  <div style={styles.withdrawalsList}>
                    {withdrawals.length === 0 ? (
                      <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem' }}>📋</p>
                        <p>No withdrawal history yet</p>
                      </div>
                    ) : (
                      withdrawals.map(withdrawal => (
                        <div key={withdrawal.id} style={styles.withdrawalItem}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                                {withdrawal.description || 'Withdrawal'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                {formatDate(withdrawal.created_at)}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#dc2626' }}>
                                -{formatCurrency(withdrawal.amount)}
                              </div>
                              <div style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                marginTop: '0.25rem',
                                backgroundColor: getStatusColor(withdrawal.status),
                                color: 'white'
                              }}>
                                {withdrawal.status.toUpperCase()}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                            Ref: {withdrawal.reference}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}