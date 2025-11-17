
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

export default function WireTransferPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [wireTransfers, setWireTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const [wireForm, setWireForm] = useState({
    from_account: '',
    transfer_type: 'domestic',
    beneficiary_name: '',
    beneficiary_email: '',
    beneficiary_phone: '',
    beneficiary_bank: '',
    beneficiary_bank_address: '',
    beneficiary_bank_city: '',
    beneficiary_bank_state: '',
    beneficiary_bank_zip: '',
    beneficiary_address: '',
    beneficiary_city: '',
    beneficiary_state: '',
    beneficiary_zip: '',
    beneficiary_country: 'United States',
    routing_number: '',
    account_number: '',
    swift_code: '',
    iban: '',
    intermediary_bank_name: '',
    intermediary_bank_swift: '',
    intermediary_bank_account: '',
    amount: '',
    transfer_fee: '',
    exchange_rate: '',
    total_deduction: '',
    purpose: '',
    reference_note: '',
    urgent_transfer: false
  });

  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  const TRANSFER_PURPOSES = [
    'Family Support',
    'Business Payment',
    'Real Estate Purchase',
    'Investment',
    'Education',
    'Medical Expenses',
    'Loan Repayment',
    'Personal Savings',
    'Charity/Donation',
    'Other'
  ];

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    calculateFees();
  }, [wireForm.amount, wireForm.transfer_type, wireForm.urgent_transfer]);

  const calculateFees = () => {
    if (!wireForm.amount || isNaN(parseFloat(wireForm.amount))) {
      setWireForm(prev => ({
        ...prev,
        transfer_fee: '',
        total_deduction: ''
      }));
      return;
    }

    const amount = parseFloat(wireForm.amount);
    let baseFee = wireForm.transfer_type === 'domestic' ? 15 : 25;
    const urgentFee = wireForm.urgent_transfer ? 10 : 0;
    const totalFee = baseFee + urgentFee;
    const totalDeduction = amount + totalFee;

    setWireForm(prev => ({
      ...prev,
      transfer_fee: totalFee.toFixed(2),
      total_deduction: totalDeduction.toFixed(2)
    }));
  };

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setWireForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      const { data: wires } = await supabase
        .from('wire_transfers')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setWireTransfers(wires || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setWireForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'transfer_type') {
      if (value === 'domestic') {
        setWireForm(prev => ({ 
          ...prev, 
          swift_code: '', 
          iban: '',
          intermediary_bank_name: '',
          intermediary_bank_swift: '',
          intermediary_bank_account: '',
          beneficiary_country: 'United States' 
        }));
      }
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'from_account', 'beneficiary_name', 'beneficiary_bank',
      'beneficiary_address', 'beneficiary_city', 'routing_number',
      'account_number', 'amount', 'purpose'
    ];

    if (wireForm.transfer_type === 'domestic') {
      requiredFields.push('beneficiary_state', 'beneficiary_zip');
    } else {
      requiredFields.push('beneficiary_country', 'swift_code');
    }

    for (const field of requiredFields) {
      if (!wireForm[field]) {
        return false;
      }
    }

    const amount = parseFloat(wireForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateForm()) {
      setMessage('Please fill in all required fields');
      setMessageType('error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
    const totalAmount = parseFloat(wireForm.total_deduction);

    if (totalAmount > parseFloat(selectedAccount.balance)) {
      setMessage('Insufficient funds in selected account (including fees)');
      setMessageType('error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setMessage('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setCodeSent(false);
    setMessage('');
    
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer',
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      setShowVerificationModal(true);
      setMessage('Verification code sent to ' + user.email);
      setMessageType('success');
    } catch (error) {
      console.error('Error sending verification code:', error);
      setMessage(`${error.message || 'Failed to send verification code. Please try again.'}`);
      setMessageType('error');
      setSentCode('');
      setCodeSent(false);
    } finally {
      setSendingCode(false);
    }
  };

  const completeWireTransfer = async () => {
    if (!codeSent) {
      setMessage('Please request a verification code first.');
      setMessageType('error');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setMessage('Please enter a valid 6-digit verification code.');
      setMessageType('error');
      return;
    }

    if (verificationCode !== sentCode) {
      setMessage('Invalid verification code. Please check and try again.');
      setMessageType('error');
      return;
    }

    setProcessing(true);
    try {
      const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
      const amount = parseFloat(wireForm.amount);
      const totalAmount = parseFloat(wireForm.total_deduction);

      if (totalAmount > parseFloat(selectedAccount.balance)) {
        setMessage('Insufficient funds');
        setMessageType('error');
        setProcessing(false);
        return;
      }

      const { data: wireTransfer, error: wireError } = await supabase
        .from('wire_transfers')
        .insert([{
          user_id: user.id,
          from_account_id: wireForm.from_account,
          beneficiary_name: wireForm.beneficiary_name,
          beneficiary_email: wireForm.beneficiary_email || null,
          beneficiary_phone: wireForm.beneficiary_phone || null,
          beneficiary_bank: wireForm.beneficiary_bank,
          beneficiary_bank_address: wireForm.beneficiary_bank_address || null,
          beneficiary_bank_city: wireForm.beneficiary_bank_city || null,
          beneficiary_bank_state: wireForm.beneficiary_bank_state || null,
          beneficiary_bank_zip: wireForm.beneficiary_bank_zip || null,
          beneficiary_address: `${wireForm.beneficiary_address}, ${wireForm.beneficiary_city}, ${wireForm.beneficiary_state || wireForm.beneficiary_country} ${wireForm.beneficiary_zip || ''}`.trim(),
          routing_number: wireForm.routing_number,
          account_number: wireForm.account_number,
          swift_code: wireForm.swift_code || null,
          iban: wireForm.iban || null,
          intermediary_bank_name: wireForm.intermediary_bank_name || null,
          intermediary_bank_swift: wireForm.intermediary_bank_swift || null,
          intermediary_bank_account: wireForm.intermediary_bank_account || null,
          amount: amount,
          transfer_fee: parseFloat(wireForm.transfer_fee),
          purpose: wireForm.purpose,
          reference_note: wireForm.reference_note || null,
          urgent_transfer: wireForm.urgent_transfer,
          status: 'pending',
          reference_number: `WIRE${Date.now()}${Math.floor(Math.random() * 10000)}`
        }])
        .select()
        .single();

      if (wireError) throw wireError;

      const balanceBefore = parseFloat(selectedAccount.balance);
      const newBalance = balanceBefore - totalAmount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wireForm.from_account);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account,
        type: 'debit',
        amount: totalAmount,
        description: `Wire transfer to ${wireForm.beneficiary_name} - ${wireForm.beneficiary_bank} (including $${wireForm.transfer_fee} fee)`,
        status: 'completed',
        reference: wireTransfer.reference_number,
        balance_before: balanceBefore,
        balance_after: newBalance
      }]);

      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'wire_transfer',
        title: 'Wire Transfer Submitted',
        message: `Wire transfer of ${formatCurrency(amount)} to ${wireForm.beneficiary_name} is pending admin review`
      }]);

      setMessage('Wire transfer submitted successfully and is pending admin review!');
      setMessageType('success');
      setShowVerificationModal(false);
      
      setStep(1);
      setWireForm({
        from_account: wireForm.from_account,
        transfer_type: 'domestic',
        beneficiary_name: '',
        beneficiary_email: '',
        beneficiary_phone: '',
        beneficiary_bank: '',
        beneficiary_bank_address: '',
        beneficiary_bank_city: '',
        beneficiary_bank_state: '',
        beneficiary_bank_zip: '',
        beneficiary_address: '',
        beneficiary_city: '',
        beneficiary_state: '',
        beneficiary_zip: '',
        beneficiary_country: 'United States',
        routing_number: '',
        account_number: '',
        swift_code: '',
        iban: '',
        intermediary_bank_name: '',
        intermediary_bank_swift: '',
        intermediary_bank_account: '',
        amount: '',
        transfer_fee: '',
        exchange_rate: '',
        total_deduction: '',
        purpose: '',
        reference_note: '',
        urgent_transfer: false
      });
      setVerificationCode('');
      setSentCode('');
      setCodeSent(false);

      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        checkUserAndLoadData();
      }, 1000);

    } catch (error) {
      console.error('Wire transfer error:', error);
      setMessage(`${error.message}`);
      setMessageType('error');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      paddingTop: isMobile ? '1rem' : '2rem',
      paddingBottom: '4rem'
    },
    header: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      textDecoration: 'none'
    },
    backButton: {
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2rem'
    },
    pageTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '2rem',
      textAlign: 'center'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    progressSteps: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '2rem',
      padding: '0 1rem'
    },
    progressStep: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: 0.5,
      transition: 'all 0.4s ease'
    },
    progressStepActive: {
      opacity: 1
    },
    progressStepCircle: {
      width: isMobile ? '40px' : '50px',
      height: isMobile ? '40px' : '50px',
      borderRadius: '50%',
      backgroundColor: 'rgba(255,255,255,0.3)',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isMobile ? '1rem' : '1.2rem',
      fontWeight: 'bold',
      border: '2px solid rgba(255,255,255,0.5)'
    },
    progressStepLabel: {
      fontSize: isMobile ? '0.75rem' : '0.875rem',
      fontWeight: '600',
      color: 'white'
    },
    progressLine: {
      flex: 1,
      height: '2px',
      backgroundColor: 'rgba(255,255,255,0.3)',
      margin: '0 0.5rem',
      maxWidth: '80px'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      marginBottom: '2rem'
    },
    cardTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    required: {
      color: '#ef4444',
      marginLeft: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    select: {
      width: '100%',
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      fontFamily: 'inherit'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '1rem',
      marginBottom: '1.25rem'
    },
    balanceInfo: {
      backgroundColor: '#f0fdf4',
      padding: '1.25rem',
      borderRadius: '12px',
      marginTop: '1rem',
      border: '2px solid #86efac'
    },
    balanceLabel: {
      fontSize: '0.75rem',
      color: '#065f46',
      marginBottom: '0.5rem',
      fontWeight: '600'
    },
    balanceValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#059669'
    },
    feeBreakdown: {
      backgroundColor: '#f8fafc',
      padding: '1.25rem',
      borderRadius: '12px',
      marginTop: '1rem',
      border: '2px solid #e2e8f0'
    },
    feeRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
      fontSize: '0.875rem'
    },
    feeLabel: {
      color: '#64748b',
      fontWeight: '500'
    },
    feeValue: {
      color: '#1e293b',
      fontWeight: '600'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      cursor: 'pointer',
      color: '#1e293b',
      fontWeight: '500'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)',
      marginTop: '1rem'
    },
    buttonRow: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    secondaryButton: {
      flex: 1,
      padding: '1rem',
      fontSize: '1rem',
      fontWeight: '600',
      color: '#64748b',
      backgroundColor: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    reviewSection: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    },
    reviewSectionTitle: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #059669'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.75rem',
      gap: '1rem',
      fontSize: '0.875rem'
    },
    reviewLabel: {
      color: '#64748b',
      fontWeight: '500',
      minWidth: '120px'
    },
    reviewValue: {
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right',
      wordBreak: 'break-word'
    },
    historyItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    },
    historyHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    historyName: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    historyBank: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginTop: '0.25rem'
    },
    historyRef: {
      fontSize: '0.75rem',
      color: '#9ca3af',
      fontFamily: 'monospace',
      marginTop: '0.25rem'
    },
    historyAmount: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#059669'
    },
    historyStatus: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginTop: '0.5rem',
      color: 'white'
    },
    historyDate: {
      fontSize: '0.8rem',
      color: '#9ca3af',
      marginTop: '0.5rem'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 31, 68, 0.95)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(8px)'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '20px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      border: '2px solid #059669',
      overflow: 'hidden'
    },
    modalHeader: {
      padding: '1.5rem 2rem',
      borderBottom: '2px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      flexShrink: 0
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '0.5rem',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    modalSubtitle: {
      fontSize: '0.95rem',
      color: '#64748b',
      textAlign: 'center',
      lineHeight: '1.5'
    },
    modalBody: {
      padding: '2rem',
      overflowY: 'auto',
      flex: 1
    },
    modalFooter: {
      padding: '1.5rem 2rem',
      borderTop: '2px solid #e2e8f0',
      backgroundColor: '#f8fafc',
      flexShrink: 0
    },
    verificationInputWrapper: {
      marginBottom: '1.5rem'
    },
    verificationLabel: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.75rem',
      textAlign: 'center'
    },
    verificationInput: {
      width: '100%',
      padding: '1rem',
      fontSize: '1.75rem',
      fontWeight: '700',
      letterSpacing: '0.75rem',
      textAlign: 'center',
      border: '3px solid #e5e7eb',
      borderRadius: '12px',
      fontFamily: 'monospace',
      boxSizing: 'border-box',
      transition: 'all 0.3s ease'
    },
    verificationInputFocused: {
      borderColor: '#10b981',
      outline: 'none',
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)'
    },
    timerSection: {
      textAlign: 'center',
      padding: '1rem',
      backgroundColor: '#fef3c7',
      borderRadius: '10px',
      marginBottom: '1rem',
      border: '1px solid #fbbf24'
    },
    timerText: {
      fontSize: '0.875rem',
      color: '#92400e',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    resendSection: {
      textAlign: 'center',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '10px',
      marginBottom: '1rem'
    },
    resendText: {
      fontSize: '0.875rem',
      color: '#64748b',
      marginBottom: '0.75rem'
    },
    resendButton: {
      background: 'none',
      border: 'none',
      color: '#3b82f6',
      fontSize: '0.9rem',
      fontWeight: '700',
      cursor: 'pointer',
      textDecoration: 'underline',
      padding: '0.5rem 1rem',
      transition: 'color 0.3s ease'
    },
    modalButtons: {
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '1rem'
    },
    cancelButton: {
      padding: '0.875rem',
      fontSize: '1rem',
      fontWeight: '600',
      color: '#64748b',
      backgroundColor: 'white',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    confirmButton: {
      padding: '0.875rem',
      fontSize: '1rem',
      fontWeight: '700',
      color: 'white',
      backgroundColor: '#10b981',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    infoBox: {
      backgroundColor: '#e0f2fe',
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      border: '1px solid #7dd3fc'
    },
    infoText: {
      fontSize: '0.8rem',
      color: '#0c4a6e',
      lineHeight: '1.5'
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Wire Transfer - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <a href="/dashboard" style={styles.logo}>🏦 Oakline Bank</a>
          <a href="/dashboard" style={styles.backButton}>← Back to Dashboard</a>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>💸 Wire Transfer</h1>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: messageType === 'error' ? '#fee2e2' : '#d1fae5',
              color: messageType === 'error' ? '#dc2626' : '#059669',
              borderColor: messageType === 'error' ? '#fca5a5' : '#6ee7b7'
            }}>
              {message}
            </div>
          )}

          <div style={styles.progressSteps}>
            <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.progressStepActive : {}) }}>
              <div style={styles.progressStepCircle}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div style={styles.progressStepLabel}>Transfer Details</div>
            </div>
            <div style={styles.progressLine}></div>
            <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.progressStepActive : {}) }}>
              <div style={styles.progressStepCircle}>
                {step > 2 ? '✓' : '2'}
              </div>
              <div style={styles.progressStepLabel}>Review & Verify</div>
            </div>
          </div>

          {step === 1 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Transfer Information</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Transfer Type <span style={styles.required}>*</span>
                </label>
                <select
                  style={styles.select}
                  value={wireForm.transfer_type}
                  onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                >
                  <option value="domestic">Domestic (Within USA)</option>
                  <option value="international">International</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  From Account <span style={styles.required}>*</span>
                </label>
                <select
                  style={styles.select}
                  value={wireForm.from_account}
                  onChange={(e) => handleInputChange('from_account', e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Purpose of Transfer <span style={styles.required}>*</span>
                </label>
                <select
                  style={styles.select}
                  value={wireForm.purpose}
                  onChange={(e) => handleInputChange('purpose', e.target.value)}
                >
                  <option value="">Select purpose</option>
                  {TRANSFER_PURPOSES.map(purpose => (
                    <option key={purpose} value={purpose}>{purpose}</option>
                  ))}
                </select>
              </div>

              <h3 style={{ ...styles.cardTitle, marginTop: '2rem' }}>Recipient Information</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Beneficiary Full Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_name}
                  onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    style={styles.input}
                    value={wireForm.beneficiary_email}
                    onChange={(e) => handleInputChange('beneficiary_email', e.target.value)}
                    placeholder="john.smith@example.com"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    style={styles.input}
                    value={wireForm.beneficiary_phone}
                    onChange={(e) => handleInputChange('beneficiary_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Street Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_address}
                  onChange={(e) => handleInputChange('beneficiary_address', e.target.value)}
                  placeholder="123 Main Street, Apt 4B"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    City <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.beneficiary_city}
                    onChange={(e) => handleInputChange('beneficiary_city', e.target.value)}
                    placeholder="New York"
                  />
                </div>

                {wireForm.transfer_type === 'domestic' ? (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      State <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      list="state-suggestions"
                      style={styles.input}
                      value={wireForm.beneficiary_state}
                      onChange={(e) => handleInputChange('beneficiary_state', e.target.value)}
                      placeholder="California"
                    />
                    <datalist id="state-suggestions">
                      {US_STATES.map(state => (
                        <option key={state} value={state} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Country <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.beneficiary_country}
                      onChange={(e) => handleInputChange('beneficiary_country', e.target.value)}
                      placeholder="United Kingdom"
                    />
                  </div>
                )}
              </div>

              {wireForm.transfer_type === 'domestic' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    ZIP Code <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.beneficiary_zip}
                    onChange={(e) => handleInputChange('beneficiary_zip', e.target.value)}
                    placeholder="10001"
                    maxLength="10"
                  />
                </div>
              )}

              <h3 style={{ ...styles.cardTitle, marginTop: '2rem' }}>Bank Details</h3>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>
                  ℹ️ Bank address is {wireForm.transfer_type === 'international' ? 'required' : 'recommended'} for {wireForm.transfer_type} wire transfers to ensure proper routing.
                </p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Bank Name <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_bank}
                  onChange={(e) => handleInputChange('beneficiary_bank', e.target.value)}
                  placeholder="Bank of America"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Bank Street Address
                </label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_bank_address}
                  onChange={(e) => handleInputChange('beneficiary_bank_address', e.target.value)}
                  placeholder="100 Bank Street"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bank City</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.beneficiary_bank_city}
                    onChange={(e) => handleInputChange('beneficiary_bank_city', e.target.value)}
                    placeholder="New York"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bank State/Province</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.beneficiary_bank_state}
                    onChange={(e) => handleInputChange('beneficiary_bank_state', e.target.value)}
                    placeholder="NY"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Bank ZIP/Postal Code</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_bank_zip}
                  onChange={(e) => handleInputChange('beneficiary_bank_zip', e.target.value)}
                  placeholder="10001"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Routing Number <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.routing_number}
                    onChange={(e) => handleInputChange('routing_number', e.target.value)}
                    placeholder="021000021"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Account Number <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.account_number}
                    onChange={(e) => handleInputChange('account_number', e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              {wireForm.transfer_type === 'international' && (
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      SWIFT/BIC Code <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.swift_code}
                      onChange={(e) => handleInputChange('swift_code', e.target.value.toUpperCase())}
                      placeholder="BOFAUS3NXXX"
                      maxLength="11"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>IBAN (if applicable)</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.iban}
                      onChange={(e) => handleInputChange('iban', e.target.value.toUpperCase())}
                      placeholder="GB29NWBK60161331926819"
                    />
                  </div>
                </div>
              )}

              <h3 style={{ ...styles.cardTitle, marginTop: '2rem' }}>Transfer Amount</h3>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Amount (USD) <span style={styles.required}>*</span>
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
                  <label style={styles.label}>Reference Note</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.reference_note}
                    onChange={(e) => handleInputChange('reference_note', e.target.value)}
                    placeholder="Invoice #1234"
                  />
                </div>
              </div>

              <div style={styles.feeBreakdown}>
                <div style={styles.feeRow}>
                  <span style={styles.feeLabel}>Transfer Amount:</span>
                  <span style={styles.feeValue}>{formatCurrency(wireForm.amount || 0)}</span>
                </div>
                <div style={styles.feeRow}>
                  <span style={styles.feeLabel}>Transfer Fee:</span>
                  <span style={styles.feeValue}>{formatCurrency(wireForm.transfer_fee || 0)}</span>
                </div>
                <div style={styles.feeRow}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={wireForm.urgent_transfer}
                      onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                      style={styles.checkbox}
                    />
                    <span>Urgent Transfer (+$10.00)</span>
                  </label>
                </div>
                <div style={{ ...styles.feeRow, borderTop: '2px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ ...styles.feeLabel, fontWeight: 'bold' }}>Total Deduction:</span>
                  <span style={{ ...styles.feeValue, fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626' }}>
                    {formatCurrency(wireForm.total_deduction || 0)}
                  </span>
                </div>
              </div>

              {wireForm.from_account && (
                <div style={styles.balanceInfo}>
                  <div style={styles.balanceLabel}>Available Balance</div>
                  <div style={styles.balanceValue}>
                    {formatCurrency(accounts.find(a => a.id === wireForm.from_account)?.balance || 0)}
                  </div>
                  {wireForm.total_deduction && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#065f46', fontWeight: '600' }}>
                      Balance after transfer: {formatCurrency(
                        parseFloat(accounts.find(a => a.id === wireForm.from_account)?.balance || 0) - parseFloat(wireForm.total_deduction || 0)
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                style={{
                  ...styles.submitButton,
                  opacity: processing ? 0.7 : 1,
                  cursor: processing ? 'not-allowed' : 'pointer'
                }}
                onClick={handleNext}
                disabled={processing}
              >
                {processing ? '🔄 Processing...' : 'Continue to Review →'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Review Transfer Details</h2>

              <div style={styles.reviewSection}>
                <h3 style={styles.reviewSectionTitle}>Transfer Information</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Type:</span>
                  <span style={styles.reviewValue}>{wireForm.transfer_type === 'domestic' ? 'Domestic (USA)' : 'International'}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account:</span>
                  <span style={styles.reviewValue}>
                    {accounts.find(acc => acc.id === wireForm.from_account)?.account_type?.toUpperCase()} -
                    ****{accounts.find(acc => acc.id === wireForm.from_account)?.account_number?.slice(-4)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Purpose:</span>
                  <span style={styles.reviewValue}>{wireForm.purpose}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Amount:</span>
                  <span style={{ ...styles.reviewValue, fontWeight: 'bold', fontSize: '1.1rem', color: '#059669' }}>
                    {formatCurrency(wireForm.amount)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Transfer Fee:</span>
                  <span style={styles.reviewValue}>{formatCurrency(wireForm.transfer_fee)}</span>
                </div>
                {wireForm.urgent_transfer && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Processing:</span>
                    <span style={{ ...styles.reviewValue, color: '#dc2626' }}>Urgent (+$10.00)</span>
                  </div>
                )}
                <div style={{ ...styles.reviewRow, borderTop: '2px solid #e5e7eb', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ ...styles.reviewLabel, fontWeight: 'bold' }}>Total Deduction:</span>
                  <span style={{ ...styles.reviewValue, fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626' }}>
                    {formatCurrency(wireForm.total_deduction)}
                  </span>
                </div>
              </div>

              <div style={styles.reviewSection}>
                <h3 style={styles.reviewSectionTitle}>Beneficiary Details</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Name:</span>
                  <span style={styles.reviewValue}>{wireForm.beneficiary_name}</span>
                </div>
                {wireForm.beneficiary_email && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Email:</span>
                    <span style={styles.reviewValue}>{wireForm.beneficiary_email}</span>
                  </div>
                )}
                {wireForm.beneficiary_phone && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Phone:</span>
                    <span style={styles.reviewValue}>{wireForm.beneficiary_phone}</span>
                  </div>
                )}
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Address:</span>
                  <span style={styles.reviewValue}>
                    {wireForm.beneficiary_address}, {wireForm.beneficiary_city}, {wireForm.beneficiary_state || wireForm.beneficiary_country} {wireForm.beneficiary_zip || ''}
                  </span>
                </div>
              </div>

              <div style={styles.reviewSection}>
                <h3 style={styles.reviewSectionTitle}>Bank Details</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Bank Name:</span>
                  <span style={styles.reviewValue}>{wireForm.beneficiary_bank}</span>
                </div>
                {wireForm.beneficiary_bank_address && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Bank Address:</span>
                    <span style={styles.reviewValue}>
                      {wireForm.beneficiary_bank_address}
                      {wireForm.beneficiary_bank_city && `, ${wireForm.beneficiary_bank_city}`}
                      {wireForm.beneficiary_bank_state && `, ${wireForm.beneficiary_bank_state}`}
                      {wireForm.beneficiary_bank_zip && ` ${wireForm.beneficiary_bank_zip}`}
                    </span>
                  </div>
                )}
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Routing Number:</span>
                  <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Account Number:</span>
                  <span style={styles.reviewValue}>****{wireForm.account_number.slice(-4)}</span>
                </div>
                {wireForm.swift_code && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>SWIFT Code:</span>
                    <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                  </div>
                )}
                {wireForm.iban && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>IBAN:</span>
                    <span style={styles.reviewValue}>{wireForm.iban}</span>
                  </div>
                )}
                {wireForm.reference_note && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Reference:</span>
                    <span style={styles.reviewValue}>{wireForm.reference_note}</span>
                  </div>
                )}
              </div>

              <div style={styles.buttonRow}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => setStep(1)}
                  disabled={processing || sendingCode}
                >
                  ← Edit Details
                </button>
                <button
                  style={{
                    ...styles.submitButton,
                    flex: 2,
                    opacity: (processing || sendingCode) ? 0.7 : 1,
                    cursor: (processing || sendingCode) ? 'not-allowed' : 'pointer'
                  }}
                  onClick={sendVerificationCode}
                  disabled={processing || sendingCode}
                >
                  {sendingCode ? '🔄 Sending Code...' : 'Send Verification Code →'}
                </button>
              </div>
            </div>
          )}

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Transfer History</h2>
            {wireTransfers.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={{ fontSize: '2rem' }}>💸</p>
                <p>No wire transfers yet</p>
              </div>
            ) : (
              <div>
                {wireTransfers.slice(0, 5).map(wire => (
                  <div key={wire.id} style={styles.historyItem}>
                    <div style={styles.historyHeader}>
                      <div>
                        <div style={styles.historyName}>{wire.beneficiary_name}</div>
                        <div style={styles.historyBank}>{wire.beneficiary_bank}</div>
                        <div style={styles.historyRef}>Ref: {wire.reference_number}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={styles.historyAmount}>{formatCurrency(wire.amount)}</div>
                        <div style={{
                          ...styles.historyStatus,
                          backgroundColor: getStatusColor(wire.status)
                        }}>
                          {wire.status?.toUpperCase()}
                        </div>
                        <div style={styles.historyDate}>
                          {new Date(wire.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {showVerificationModal && (
        <div style={styles.modalOverlay} onClick={(e) => {
          if (!processing) {
            setShowVerificationModal(false);
          }
        }}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                🔐 Verify Your Transfer
              </h2>
              <p style={styles.modalSubtitle}>
                We've sent a 6-digit code to <strong>{user?.email}</strong>
              </p>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.verificationInputWrapper}>
                <label style={styles.verificationLabel}>Verification Code</label>
                <input
                  type="text"
                  style={{
                    ...styles.verificationInput,
                    ...(verificationCode.length === 6 ? styles.verificationInputFocused : {})
                  }}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  disabled={processing}
                  autoFocus
                />
              </div>

              <div style={styles.timerSection}>
                <p style={styles.timerText}>
                  ⏱ Code expires in 15 minutes
                </p>
              </div>

              <div style={styles.resendSection}>
                <p style={styles.resendText}>Didn't receive the code?</p>
                <button
                  style={styles.resendButton}
                  onClick={sendVerificationCode}
                  disabled={processing || sendingCode}
                >
                  {sendingCode ? 'Resending...' : 'Resend Code'}
                </button>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <div style={styles.modalButtons}>
                <button
                  style={styles.cancelButton}
                  onClick={() => setShowVerificationModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.confirmButton,
                    opacity: (processing || verificationCode.length !== 6) ? 0.5 : 1,
                    cursor: (processing || verificationCode.length !== 6) ? 'not-allowed' : 'pointer'
                  }}
                  onClick={completeWireTransfer}
                  disabled={processing || verificationCode.length !== 6}
                >
                  {processing ? (
                    <>
                      <span>🔄</span>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Verify & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
