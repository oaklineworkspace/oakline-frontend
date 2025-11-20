import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
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

export default function WireTransfer() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null); // For transfer details modal
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionPin, setTransactionPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    routing_number: '',
    swift_code: '',
    recipient_account: ''
  });

  const [locationData, setLocationData] = useState({
    states: [],
    cities: [],
    counties: []
  });
  const [showManualState, setShowManualState] = useState(false);
  const [showManualCity, setShowManualCity] = useState(false);
  const [showManualCounty, setShowManualCounty] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

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
    recipient_bank_county: '',
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
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (wireForm.recipient_bank_country) {
      fetchStates(wireForm.recipient_bank_country);
    }
  }, [wireForm.recipient_bank_country]);

  useEffect(() => {
    if (wireForm.recipient_bank_state && !showManualState) {
      fetchCities(wireForm.recipient_bank_country, wireForm.recipient_bank_state);
    }
  }, [wireForm.recipient_bank_state, wireForm.recipient_bank_country, showManualState]);

  const fetchStates = async (countryCode) => {
    if (countryCode === 'Other') {
      setLocationData(prev => ({ ...prev, states: [], cities: [], counties: [] }));
      setShowManualState(true);
      setShowManualCity(true);
      setShowManualCounty(true);
      return;
    }

    setLoadingStates(true);
    try {
      const response = await fetch(`/api/locations/states?country_code=${countryCode}`);
      if (response.ok) {
        const data = await response.json();
        setLocationData(prev => ({ ...prev, states: data.states || [], cities: [], counties: [] }));
        if (!data.states || data.states.length === 0) {
          setShowManualState(true);
          setShowManualCity(true);
          setShowManualCounty(true);
        } else {
          setShowManualState(false);
        }
      } else {
        setLocationData(prev => ({ ...prev, states: [], cities: [], counties: [] }));
        setShowManualState(true);
        setShowManualCity(true);
        setShowManualCounty(true);
      }
    } catch (error) {
      console.error('Error fetching states:', error);
      setLocationData(prev => ({ ...prev, states: [], cities: [], counties: [] }));
      setShowManualState(true);
      setShowManualCity(true);
      setShowManualCounty(true);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (countryCode, stateCode) => {
    setLoadingCities(true);
    try {
      const response = await fetch(`/api/locations/cities?country_code=${countryCode}&state_code=${stateCode}`);
      if (response.ok) {
        const data = await response.json();
        setLocationData(prev => ({ ...prev, cities: data.cities || [], counties: [] }));
        if (!data.cities || data.cities.length === 0) {
          setShowManualCity(true);
        } else {
          setShowManualCity(false);
        }
      } else {
        setLocationData(prev => ({ ...prev, cities: [], counties: [] }));
        setShowManualCity(true);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setLocationData(prev => ({ ...prev, cities: [], counties: [] }));
      setShowManualCity(true);
    } finally {
      setLoadingCities(false);
    }
  };

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const [accountsRes, transfersRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true }),
        supabase
          .from('wire_transfers')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        setAccounts(accountsRes.data);
        setWireForm(prev => ({ ...prev, from_account_id: accountsRes.data[0].id }));
      }

      if (transfersRes.data) {
        setTransfers(transfersRes.data);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setPageLoading(false);
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

  const formatCompactCurrency = (amount) => {
    const value = amount || 0;
    if (Math.abs(value) >= 1000000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 2
      }).format(value);
    } else if (Math.abs(value) >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 1
      }).format(value);
    }
    return formatCurrency(value);
  };

  const validateRoutingNumber = (routing, transferType, country) => {
    // Check if routing number exists
    if (!routing || routing.trim() === '') {
      return { valid: false, error: 'Routing number is required' };
    }

    if (country === 'United States') {
      // US domestic validation (ABA routing number)
      // Must be exactly 9 digits
      if (routing.length !== 9) {
        return { valid: false, error: `US routing number must be exactly 9 digits (you entered ${routing.length})` };
      }

      // Must contain only digits
      if (!/^\d{9}$/.test(routing)) {
        return { valid: false, error: 'US routing number must contain only numbers' };
      }

      // ABA routing number checksum validation
      const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(routing[i]) * weights[i];
      }

      if (sum % 10 !== 0) {
        return { valid: false, error: 'Invalid US routing number (failed checksum validation)' };
      }
    } else {
      // International routing/transit number validation
      // Length can vary (e.g., UK: 6 digits, Canada: 8 digits, Australia: 6 digits, India: 11 characters)
      // We'll allow alphanumeric and a range for length, with specific country checks if needed later.
      if (routing.length < 6 || routing.length > 11) {
        return { valid: false, error: 'International routing/transit number is typically 6-11 characters' };
      }

      // Allow alphanumeric, spaces, and hyphens for international numbers
      if (!/^[A-Z0-9\s-]+$/i.test(routing)) {
        return { valid: false, error: 'International routing/transit number can contain letters, numbers, spaces, and hyphens' };
      }
      // Further specific country validation could be added here if required by API/bank.
    }

    return { valid: true };
  };

  const validateAccountNumber = (accountNumber, transferType) => {
    if (!accountNumber || accountNumber.trim() === '') {
      return { valid: false, error: 'Account number is required' };
    }

    if (transferType === 'domestic') {
      // US domestic account numbers: 4-17 digits
      if (accountNumber.length < 4 || accountNumber.length > 17) {
        return { valid: false, error: 'Domestic account number must be between 4 and 17 digits' };
      }

      if (!/^\d+$/.test(accountNumber)) {
        return { valid: false, error: 'Domestic account number must contain only numbers' };
      }
    } else {
      // International account numbers (including IBAN): 8-34 characters
      if (accountNumber.length < 8 || accountNumber.length > 34) {
        return { valid: false, error: 'International account number must be between 8 and 34 characters' };
      }

      // Allow alphanumeric for international accounts (IBAN format)
      if (!/^[A-Z0-9]+$/i.test(accountNumber)) {
        return { valid: false, error: 'Account number must contain only letters and numbers' };
      }
    }

    return { valid: true };
  };

  const validateSwiftCode = (swiftCode) => {
    if (!swiftCode || swiftCode.trim() === '') {
      return { valid: false, error: 'SWIFT/BIC code is required for international transfers' };
    }

    // SWIFT code must be 8 or 11 characters
    if (swiftCode.length !== 8 && swiftCode.length !== 11) {
      return { valid: false, error: 'SWIFT/BIC code must be 8 or 11 characters' };
    }

    // SWIFT code format: AAAABBCCXXX
    // AAAA = Bank code (letters only)
    // BB = Country code (letters only)
    // CC = Location code (letters or digits)
    // XXX = Branch code (letters or digits, optional)
    const swiftPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

    if (!swiftPattern.test(swiftCode.toUpperCase())) {
      return { valid: false, error: 'Invalid SWIFT/BIC code format (e.g., CHASUS33XXX)' };
    }

    return { valid: true };
  };

  const validateStep1 = () => {
    if (!wireForm.from_account_id) {
      setMessage('Please select a source account');
      setMessageType('error');
      return false;
    }

    if (!wireForm.recipient_first_name || !wireForm.recipient_last_name) {
      setMessage('Please enter recipient first and last name');
      setMessageType('error');
      return false;
    }

    if (!wireForm.recipient_bank) {
      setMessage('Please enter recipient bank name');
      setMessageType('error');
      return false;
    }

    if (!wireForm.recipient_bank_country) {
      setMessage('Please enter recipient bank country');
      setMessageType('error');
      return false;
    }

    // Validate account number based on transfer type
    const accountValidation = validateAccountNumber(wireForm.recipient_account, wireForm.transfer_type);
    if (!accountValidation.valid) {
      setMessage(accountValidation.error);
      setMessageType('error');
      return false;
    }

    // Validate SWIFT code for international transfers
    if (wireForm.transfer_type === 'international') {
      const swiftValidation = validateSwiftCode(wireForm.swift_code);
      if (!swiftValidation.valid) {
        setMessage(swiftValidation.error);
        setMessageType('error');
        return false;
      }
    }

    // Validate routing number only if provided or if US domestic
    if (wireForm.routing_number) {
      const routingValidation = validateRoutingNumber(
        wireForm.routing_number,
        wireForm.transfer_type,
        wireForm.recipient_bank_country
      );
      if (!routingValidation.valid) {
        setMessage(routingValidation.error);
        setMessageType('error');
        return false;
      }
    } else if (wireForm.recipient_bank_country === 'United States') {
      // US transfers require routing number
      setMessage('US transfers require a routing number');
      setMessageType('error');
      return false;
    }

    const amount = parseFloat(wireForm.amount);
    if (!amount || amount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return false;
    }

    const account = accounts.find(a => a.id === wireForm.from_account_id);
    if (parseFloat(account.balance) < wireForm.total_amount) {
      setMessage('Insufficient funds (including fees)');
      setMessageType('error');
      return false;
    }

    return true;
  };

  const handleNextStep = async () => {
    setMessage('');
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
      if (!sentCode) {
        setSendingCode(true);
        await sendVerificationCode();
      }
    } else if (currentStep === 3) {
      if (verificationCode !== sentCode) {
        setMessage('Invalid verification code');
        setMessageType('error');
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Verify PIN before proceeding to final confirmation
      await verifyTransactionPin();
    }
  };

  const handlePreviousStep = () => {
    setMessage('');
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setMessage('');
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/send-verification-code', {
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

      if (!response.ok) {
        throw new Error('Failed to send verification code');
      }

      setMessage('Verification code sent to your email');
      setMessageType('success');
    } catch (error) {
      console.error('Error sending code:', error);
      setMessage('Failed to send verification code. Please try again.');
      setMessageType('error');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyTransactionPin = async () => {
    if (!transactionPin || transactionPin.length < 4) {
      setMessage('Please enter your transaction PIN');
      setMessageType('error');
      return;
    }

    setVerifyingPin(true);
    setMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/verify-transaction-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          pin: transactionPin,
          type: 'wire_transfer'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid PIN');
      }

      setMessage('PIN verified successfully');
      setMessageType('success');
      setCurrentStep(5);
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setMessage(error.message || 'Invalid PIN. Please try again.');
      setMessageType('error');
    } finally {
      setVerifyingPin(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setIsSubmitting(true);
    setMessage('');

    try {
      if (verificationCode !== sentCode) {
        throw new Error('Invalid verification code');
      }

      const account = accounts.find(a => a.id === wireForm.from_account_id);
      const recipientFullName = `${wireForm.recipient_first_name} ${wireForm.recipient_middle_name ? wireForm.recipient_middle_name + ' ' : ''}${wireForm.recipient_last_name}`;
      const reference = `WIRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const transferData = {
        user_id: user.id,
        from_account_id: wireForm.from_account_id,
        transfer_type: wireForm.transfer_type,
        recipient_name: recipientFullName,
        recipient_account: wireForm.recipient_account,
        recipient_bank: wireForm.recipient_bank,
        recipient_bank_address: `${wireForm.recipient_bank_address}, ${wireForm.recipient_bank_city}, ${wireForm.recipient_bank_state} ${wireForm.recipient_bank_zip}, ${wireForm.recipient_bank_country}`,
        swift_code: wireForm.transfer_type === 'international' ? wireForm.swift_code : null,
        routing_number: wireForm.routing_number, // This will now contain international routing/transit numbers if applicable
        amount: parseFloat(wireForm.amount),
        fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
        total_amount: wireForm.total_amount,
        urgent_transfer: wireForm.urgent_transfer,
        description: wireForm.description || null,
        status: 'pending',
        reference: reference,
        verification_code: verificationCode,
        verified_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('wire_transfers')
        .insert([transferData])
        .select()
        .single();

      if (error) throw error;

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
        reference: reference
      }]);

      const receipt = {
        reference: reference,
        date: new Date().toLocaleString(),
        recipientName: recipientFullName,
        recipientBank: wireForm.recipient_bank,
        transferType: wireForm.transfer_type,
        amount: wireForm.amount,
        fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
        totalAmount: wireForm.total_amount,
        account: {
          type: account.account_type,
          number: account.account_number,
          balance: newBalance
        },
        urgent: wireForm.urgent_transfer,
        description: wireForm.description
      };

      setReceiptData(receipt);
      setShowReceipt(true);

      // Send email notification
      try {
        await fetch('/api/send-wire-transfer-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            userName: user.user_metadata?.full_name || user.email,
            userId: user.id,
            transferType: wireForm.transfer_type,
            recipientName: recipientFullName,
            recipientBank: wireForm.recipient_bank,
            amount: wireForm.amount,
            fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
            totalAmount: wireForm.total_amount,
            reference: reference,
            urgent: wireForm.urgent_transfer,
            description: wireForm.description,
            fromAccount: {
              type: account.account_type,
              number: account.account_number
            },
            swiftCode: wireForm.transfer_type === 'international' ? wireForm.swift_code : null,
            routingNumber: wireForm.routing_number, // This will now contain international routing/transit numbers if applicable
            contactEmail: user.email, // Ensure contact email is sent
            contactPhone: user.user_metadata?.phone // Include phone if available
          })
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the transaction if email fails
      }

      setWireForm({
        from_account_id: accounts[0]?.id || '',
        transfer_type: 'domestic',
        recipient_first_name: '',
        recipient_middle_name: '',
        recipient_last_name: '',
        recipient_account: '',
        recipient_bank: '',
        recipient_bank_address: '',
        recipient_bank_city: '',
        recipient_bank_state: '',
        recipient_bank_county: '',
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
      setVerificationCode('');
      setSentCode('');
      setCurrentStep(1);

      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Wire transfer failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
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
      fontSize: isMobile ? '1.75rem' : '2.25rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '1rem',
      textAlign: 'center',
      letterSpacing: '-0.02em'
    },
    pageSubtitle: {
      fontSize: isMobile ? '0.9375rem' : '1.0625rem',
      color: 'rgba(255,255,255,0.95)',
      textAlign: 'center',
      marginBottom: '2rem',
      maxWidth: '800px',
      margin: '0 auto 2rem auto',
      lineHeight: '1.6',
      fontWeight: '400'
    },
    infoCard: {
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      marginBottom: '2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: '1px solid #e5e7eb'
    },
    infoTitle: {
      fontSize: isMobile ? '1.125rem' : '1.25rem',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.625rem',
      letterSpacing: '-0.01em'
    },
    infoText: {
      fontSize: '0.9375rem',
      color: '#4b5563',
      lineHeight: '1.7',
      marginBottom: '0.875rem',
      fontWeight: '400'
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1rem',
      marginTop: '1rem'
    },
    infoBox: {
      backgroundColor: '#f9fafb',
      padding: '1.125rem',
      borderRadius: '12px',
      border: '1px solid #e5e7eb'
    },
    infoBoxTitle: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#059669',
      marginBottom: '0.625rem',
      letterSpacing: '-0.01em'
    },
    infoBoxText: {
      fontSize: '0.875rem',
      color: '#374151',
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
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '2rem',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669'
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
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
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
      boxSizing: 'border-box',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
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
      marginBottom: '1rem'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
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
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    transfersList: {
      maxHeight: '600px',
      overflowY: 'auto'
    },
    transferItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0',
      cursor: 'pointer',
      transition: 'box-shadow 0.3s ease',
    },
    transferItemHover: {
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
    },
    transferHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    transferRecipient: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    transferAmount: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#059669'
    },
    transferDetails: {
      fontSize: '0.8rem',
      color: '#64748b',
      marginTop: '0.5rem'
    },
    transferStatus: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginTop: '0.5rem',
      color: 'white'
    },
    reviewSection: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      marginBottom: '1.5rem'
    },
    reviewTitle: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1rem'
    },
    reviewRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e2e8f0'
    },
    reviewLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500'
    },
    reviewValue: {
      fontSize: '0.875rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    },
    receiptModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 31, 68, 0.95)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(8px)'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '2.5rem',
      maxWidth: '550px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      border: '2px solid #059669'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '3px solid #059669',
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      margin: '-2.5rem -2.5rem 2rem -2.5rem',
      padding: '2rem 2.5rem',
      borderRadius: '18px 18px 0 0',
      color: 'white'
    },
    receiptTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      marginBottom: '0.5rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e2e8f0'
    },
    receiptLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      fontSize: '0.875rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    },
    receiptButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    receiptButton: {
      flex: 1,
      padding: '1rem',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
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
    }
  };

  if (pageLoading) {
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
        <meta name="description" content="Send domestic and international wire transfers securely" />
      </Head>

      <style jsx>{`
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
              borderTop: '6px solid #059669',
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
              backgroundColor: 'rgba(5, 150, 105, 0.2)',
              borderRadius: '12px',
              border: '2px solid rgba(5, 150, 105, 0.5)',
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
          <h1 style={styles.pageTitle}>Wire Transfer Services</h1>
          <p style={styles.pageSubtitle}>
            Secure, fast, and reliable domestic and international wire transfers with competitive rates and professional banking service
          </p>

          {currentStep === 1 && (
            <div style={styles.infoCard}>
              <div style={styles.infoTitle}>
                Important Wire Transfer Information
              </div>
              <p style={styles.infoText}>
                Wire transfers are a secure method of sending money electronically between banks. Unlike other payment methods, wire transfers are typically <strong>irreversible once processed</strong>. Please ensure all recipient details are accurate before submitting your transfer.
              </p>

              <div style={styles.infoGrid}>
                <div style={styles.infoBox}>
                  <div style={styles.infoBoxTitle}>🇺🇸 Domestic Transfers</div>
                  <div style={styles.infoBoxText}>
                    <strong>Processing Time:</strong> Same business day if submitted before 3:00 PM ET<br/>
                    <strong>Standard Fee:</strong> $15.00<br/>
                    <strong>Expedited Option:</strong> +$10.00 (within 2 hours)<br/>
                    <strong>Requirements:</strong> Routing number and account number
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={styles.infoBoxTitle}>🌍 International Transfers</div>
                  <div style={styles.infoBoxText}>
                    <strong>Processing Time:</strong> 1-3 business days<br/>
                    <strong>Standard Fee:</strong> $25.00<br/>
                    <strong>Expedited Option:</strong> +$10.00 (24-48 hours)<br/>
                    <strong>Requirements:</strong> SWIFT/BIC code and account details
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={styles.infoBoxTitle}>🔒 Security Features</div>
                  <div style={styles.infoBoxText}>
                    <strong>•</strong> Multi-factor authentication required<br/>
                    <strong>•</strong> Email verification code confirmation<br/>
                    <strong>•</strong> Real-time fraud monitoring<br/>
                    <strong>•</strong> Encrypted transmission of all data
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <div style={styles.infoBoxTitle}>⏰ Cut-off Times</div>
                  <div style={styles.infoBoxText}>
                    <strong>Domestic:</strong> 3:00 PM ET for same-day processing<br/>
                    <strong>International:</strong> 2:00 PM ET for next-day processing<br/>
                    <strong>Expedited:</strong> Available until 5:00 PM ET<br/>
                    <strong>Note:</strong> No weekend or holiday processing
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '1.25rem'
              }}>
                <p style={{ fontSize: '0.9375rem', color: '#991b1b', margin: 0, fontWeight: '600', lineHeight: '1.6' }}>
                  <strong>⚠️ Important Notice:</strong> Wire transfers cannot be cancelled or reversed once processed. Please verify all recipient information carefully before confirming your transfer.
                </p>
              </div>
            </div>
          )}

          <div style={styles.stepIndicator}>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 1 ? '#059669' : 'rgba(255,255,255,0.2)',
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
                Transfer Details
              </span>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 2 ? '#059669' : 'rgba(255,255,255,0.3)'
            }}></div>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 2 ? '#059669' : 'rgba(255,255,255,0.2)',
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
                Review & Confirm
              </span>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 3 ? '#059669' : 'rgba(255,255,255,0.3)'
            }}></div>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 3 ? '#059669' : 'rgba(255,255,255,0.2)',
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
                Email Code
              </span>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 4 ? '#059669' : 'rgba(255,255,255,0.3)'
            }}></div>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 4 ? '#059669' : 'rgba(255,255,255,0.2)',
                color: currentStep >= 4 ? 'white' : 'rgba(255,255,255,0.6)',
                borderColor: currentStep === 4 ? '#FFC857' : 'transparent',
                transform: currentStep === 4 ? 'scale(1.05)' : 'scale(1)'
              }}>
                {currentStep > 4 ? '✓' : '4'}
              </div>
              <span style={{
                ...styles.stepLabel,
                opacity: currentStep >= 4 ? 1 : 0.6,
                fontWeight: currentStep === 4 ? '700' : '600'
              }}>
                Verify PIN
              </span>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 5 ? '#059669' : 'rgba(255,255,255,0.3)'
            }}></div>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 5 ? '#059669' : 'rgba(255,255,255,0.2)',
                color: currentStep >= 5 ? 'white' : 'rgba(255,255,255,0.6)',
                borderColor: currentStep === 5 ? '#FFC857' : 'transparent',
                transform: currentStep === 5 ? 'scale(1.05)' : 'scale(1)'
              }}>
                {currentStep > 5 ? '✓' : '5'}
              </div>
              <span style={{
                ...styles.stepLabel,
                opacity: currentStep >= 5 ? 1 : 0.6,
                fontWeight: currentStep === 5 ? '700' : '600'
              }}>
                Submit
              </span>
            </div>
          </div>

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

          {accounts.length === 0 ? (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</p>
                <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Active Accounts</h3>
                <p>You need an active account to send wire transfers. Please contact support.</p>
              </div>
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
                  {currentStep === 1 && '📝 Step 1: Transfer Details'}
                  {currentStep === 2 && '👁️ Step 2: Review & Confirm'}
                  {currentStep === 3 && '🔐 Step 3: Verify Code'}
                  {currentStep === 4 && '✅ Step 4: Final Confirmation'}
                </h2>

                <form onSubmit={handleSubmit}>
                  {currentStep === 1 && (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Transfer Type *</label>
                        <select
                          style={styles.select}
                          value={wireForm.transfer_type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            handleInputChange('transfer_type', newType);
                            // Reset country if switching from international to domestic
                            if (newType === 'domestic' && wireForm.recipient_bank_country !== 'United States') {
                              handleInputChange('recipient_bank_country', 'United States');
                            }
                            // Recalculate total as fees might change
                            calculateTotal();
                          }}
                          required
                        >
                          <option value="domestic">🇺🇸 Domestic (US) - Same Day Processing</option>
                          <option value="international">🌍 International - 1-3 Business Days</option>
                        </select>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>From Account *</label>
                        <select
                          style={styles.select}
                          value={wireForm.from_account_id}
                          onChange={(e) => handleInputChange('from_account_id', e.target.value)}
                          required
                        >
                          {accounts.map(account => (
                            <option key={account.id} value={account.id}>
                              {account.account_type?.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{
                        backgroundColor: '#eff6ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1.25rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          👤 Recipient Name Information
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e40af', lineHeight: '1.6' }}>
                          Please enter the recipient's full legal name exactly as it appears on their bank account. This ensures the transfer is processed correctly.
                        </div>
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>First Name *</label>
                          <input
                            type="text"
                            style={styles.input}
                            value={wireForm.recipient_first_name}
                            onChange={(e) => handleInputChange('recipient_first_name', e.target.value)}
                            placeholder="Example: Michael"
                            required
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Middle Name</label>
                          <input
                            type="text"
                            style={styles.input}
                            value={wireForm.recipient_middle_name}
                            onChange={(e) => handleInputChange('recipient_middle_name', e.target.value)}
                            placeholder="Optional"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Last Name *</label>
                          <input
                            type="text"
                            style={styles.input}
                            value={wireForm.recipient_last_name}
                            onChange={(e) => handleInputChange('recipient_last_name', e.target.value)}
                            placeholder="Example: Rodriguez"
                            required
                          />
                        </div>
                      </div>

                      {(wireForm.recipient_first_name || wireForm.recipient_last_name) && (
                        <div style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '10px',
                          padding: '0.875rem',
                          marginBottom: '1.25rem'
                        }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#059669', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Recipient Full Name Preview
                          </div>
                          <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#047857', letterSpacing: '-0.01em' }}>
                            {wireForm.recipient_first_name} {wireForm.recipient_middle_name && `${wireForm.recipient_middle_name} `}{wireForm.recipient_last_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.375rem' }}>
                            ✓ Please verify this name matches the recipient's bank account
                          </div>
                        </div>
                      )}

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Recipient Bank Name *</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={wireForm.recipient_bank}
                          onChange={(e) => handleInputChange('recipient_bank', e.target.value)}
                          placeholder="Example: Wells Fargo Bank (Enter your bank's name)"
                          required
                        />
                      </div>

                      {wireForm.transfer_type === 'international' && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Recipient Bank Country *</label>
                          {wireForm.recipient_bank_country === 'Other' ? (
                            <input
                              type="text"
                              style={styles.input}
                              value={wireForm.recipient_bank_country === 'Other' ? '' : wireForm.recipient_bank_country}
                              onChange={(e) => handleInputChange('recipient_bank_country', e.target.value)}
                              placeholder="Enter country name"
                              required
                            />
                          ) : (
                            <select
                              style={styles.select}
                              value={wireForm.recipient_bank_country}
                              onChange={(e) => {
                                const newCountry = e.target.value;
                                handleInputChange('recipient_bank_country', newCountry);
                                // If switching to US, reset transfer type and clear routing/swift if necessary
                                if (newCountry === 'United States') {
                                  handleInputChange('transfer_type', 'domestic');
                                  // Clear potentially conflicting international fields
                                  handleInputChange('swift_code', '');
                                  // Ensure routing number is validated as US ABA
                                  if (wireForm.routing_number) {
                                    const validation = validateRoutingNumber(wireForm.routing_number, 'domestic', 'United States');
                                    setValidationErrors(prev => ({ ...prev, routing_number: validation.valid ? '' : validation.error }));
                                  }
                                } else if (newCountry !== 'Other') {
                                  // If switching away from US, ensure transfer type is international and clear US-specific fields
                                  handleInputChange('transfer_type', 'international');
                                  handleInputChange('routing_number', ''); // Clear ABA number
                                  // If SWIFT is needed, prompt for it (handled by validation below)
                                }
                                // Recalculate total as fees might change
                                calculateTotal();
                              }}
                              required
                            >
                              <option value="Canada">🇨🇦 Canada</option>
                              <option value="United Kingdom">🇬🇧 United Kingdom</option>
                              <option value="Australia">🇦🇺 Australia</option>
                              <option value="Germany">🇩🇪 Germany</option>
                              <option value="France">🇫🇷 France</option>
                              <option value="Italy">🇮🇹 Italy</option>
                              <option value="Spain">🇪🇸 Spain</option>
                              <option value="Netherlands">🇳🇱 Netherlands</option>
                              <option value="Switzerland">🇨🇭 Switzerland</option>
                              <option value="Belgium">🇧🇪 Belgium</option>
                              <option value="Sweden">🇸🇪 Sweden</option>
                              <option value="Norway">🇳🇴 Norway</option>
                              <option value="Denmark">🇩🇰 Denmark</option>
                              <option value="India">🇮🇳 India</option>
                              <option value="China">🇨🇳 China</option>
                              <option value="Japan">🇯🇵 Japan</option>
                              <option value="South Korea">🇰🇷 South Korea</option>
                              <option value="Singapore">🇸🇬 Singapore</option>
                              <option value="Hong Kong">🇭🇰 Hong Kong</option>
                              <option value="Malaysia">🇲🇾 Malaysia</option>
                              <option value="Thailand">🇹🇭 Thailand</option>
                              <option value="Philippines">🇵🇭 Philippines</option>
                              <option value="Indonesia">🇮🇩 Indonesia</option>
                              <option value="Vietnam">🇻🇳 Vietnam</option>
                              <option value="United Arab Emirates">🇦🇪 United Arab Emirates</option>
                              <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                              <option value="Israel">🇮🇱 Israel</option>
                              <option value="Turkey">🇹🇷 Turkey</option>
                              <option value="South Africa">🇿🇦 South Africa</option>
                              <option value="Nigeria">🇳🇬 Nigeria</option>
                              <option value="Kenya">🇰🇪 Kenya</option>
                              <option value="Egypt">🇪🇬 Egypt</option>
                              <option value="Mexico">🇲🇽 Mexico</option>
                              <option value="Brazil">🇧🇷 Brazil</option>
                              <option value="Argentina">🇦🇷 Argentina</option>
                              <option value="Chile">🇨🇱 Chile</option>
                              <option value="Colombia">🇨🇴 Colombia</option>
                              <option value="Peru">🇵🇪 Peru</option>
                              <option value="New Zealand">🇳🇿 New Zealand</option>
                              <option value="Ireland">🇮🇪 Ireland</option>
                              <option value="Portugal">🇵🇹 Portugal</option>
                              <option value="Poland">🇵🇱 Poland</option>
                              <option value="Czech Republic">🇨🇿 Czech Republic</option>
                              <option value="Austria">🇦🇹 Austria</option>
                              <option value="Greece">🇬🇷 Greece</option>
                              <option value="Russia">🇷🇺 Russia</option>
                              <option value="Ukraine">🇺🇦 Ukraine</option>
                              <option value="Other">🌍 Other (Enter Manually)</option>
                            </select>
                          )}
                          {wireForm.recipient_bank_country !== 'Other' && (
                            <button
                              type="button"
                              onClick={() => {
                                handleInputChange('recipient_bank_country', 'Other');
                              }}
                              style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                color: '#374151',
                                fontWeight: '500'
                              }}
                            >
                              ✏️ Enter country manually
                            </button>
                          )}
                        </div>
                      )}

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Recipient Account Number *</label>
                        <input
                          type="text"
                          style={{
                            ...styles.input,
                            borderColor: validationErrors.recipient_account ? '#dc2626' : '#e2e8f0'
                          }}
                          value={wireForm.recipient_account}
                          onChange={(e) => {
                            const value = wireForm.recipient_bank_country === 'United States'
                              ? e.target.value.replace(/\D/g, '').slice(0, 17) // Domestic US: digits only, 4-17
                              : e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').slice(0, 34); // International: alphanumeric, spaces, hyphens, up to 34
                            handleInputChange('recipient_account', value);
                            setValidationErrors(prev => ({ ...prev, recipient_account: '' }));
                          }}
                          onBlur={() => {
                            if (wireForm.recipient_account) {
                              const validation = validateAccountNumber(wireForm.recipient_account, wireForm.transfer_type);
                              if (!validation.valid) {
                                setValidationErrors(prev => ({ ...prev, recipient_account: validation.error }));
                              }
                            }
                          }}
                          placeholder={wireForm.recipient_bank_country === 'United States' ? 'Example: 1234567890 (Enter 4-17 digit account number)' : 'Example: GB29NWBK60161331926819 (Enter IBAN or account number)'}
                          maxLength={wireForm.recipient_bank_country === 'United States' ? '17' : '34'}
                          required
                        />
                        {validationErrors.recipient_account ? (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem', fontWeight: '600' }}>
                            ⚠️ {validationErrors.recipient_account}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
                            {wireForm.recipient_bank_country === 'United States'
                              ? 'US account numbers are 4-17 digits'
                              : 'International account numbers (IBAN): 8-34 alphanumeric characters'
                            }
                          </div>
                        )}
                      </div>

                      {wireForm.recipient_bank_country !== 'United States' && (
                        <div style={styles.formGroup}>
                          <label style={styles.label}>
                            SWIFT/BIC Code *
                          </label>
                          <input
                            type="text"
                            style={{
                              ...styles.input,
                              borderColor: validationErrors.swift_code ? '#dc2626' : '#e2e8f0'
                            }}
                            value={wireForm.swift_code}
                            onChange={(e) => {
                              handleInputChange('swift_code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                              setValidationErrors(prev => ({ ...prev, swift_code: '' }));
                            }}
                            onBlur={() => {
                              if (wireForm.swift_code) {
                                const validation = validateSwiftCode(wireForm.swift_code);
                                if (!validation.valid) {
                                  setValidationErrors(prev => ({ ...prev, swift_code: validation.error }));
                                }
                              }
                            }}
                            placeholder="Example: CHASUS33XXX (Enter bank's SWIFT/BIC code)"
                            maxLength="11"
                            required
                          />
                          {validationErrors.swift_code ? (
                            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem', fontWeight: '600' }}>
                              ⚠️ {validationErrors.swift_code}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
                              Format: 4 letters (bank) + 2 letters (country) + 2 characters (location) + 3 characters (branch, optional)
                            </div>
                          )}
                        </div>
                      )}

                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          Routing/Transit Number {wireForm.recipient_bank_country === 'United States' ? '*' : '(Optional)'}
                          {wireForm.recipient_bank_country === 'United States' && ' (ABA)'}
                        </label>
                        <input
                          type="text"
                          style={{
                            ...styles.input,
                            borderColor: validationErrors.routing_number ? '#dc2626' : '#e2e8f0'
                          }}
                          value={wireForm.routing_number}
                          onChange={(e) => {
                            // For US, only allow digits and limit to 9
                            // For international, allow alphanumeric up to 11 characters
                            const value = wireForm.recipient_bank_country === 'United States'
                              ? e.target.value.replace(/\D/g, '').slice(0, 9)
                              : e.target.value.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').slice(0, 11);
                            handleInputChange('routing_number', value);
                            setValidationErrors(prev => ({ ...prev, routing_number: '' }));
                          }}
                          onBlur={() => {
                            if (wireForm.routing_number) {
                              const validation = validateRoutingNumber(
                                wireForm.routing_number,
                                wireForm.transfer_type,
                                wireForm.recipient_bank_country
                              );
                              if (!validation.valid) {
                                setValidationErrors(prev => ({ ...prev, routing_number: validation.error }));
                              }
                            }
                          }}
                          placeholder={
                            wireForm.recipient_bank_country === 'United States'
                              ? 'Example: 021000021 (Enter 9-digit ABA routing number)'
                              : 'Example: UK-123456, CA-12345678 (Optional - if required by bank)'
                          }
                          maxLength={wireForm.recipient_bank_country === 'United States' ? '9' : '11'}
                          required={wireForm.recipient_bank_country === 'United States'}
                        />
                        {validationErrors.routing_number ? (
                          <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem', fontWeight: '600' }}>
                            ⚠️ {validationErrors.routing_number}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
                            {wireForm.recipient_bank_country === 'United States'
                              ? 'US: 9-digit ABA routing number (Required)'
                              : 'Optional: Format varies by country (UK: 6 digits, CA: 8 digits, AU: 6 digits, IN: 11 chars)'
                            }
                          </div>
                        )}
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Bank Street Address (Optional)</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={wireForm.recipient_bank_address}
                          onChange={(e) => handleInputChange('recipient_bank_address', e.target.value)}
                          placeholder="Example: 456 Oak Avenue (Optional)"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>State/Province (Optional)</label>
                        {showManualState ? (
                          <input
                            type="text"
                            style={styles.input}
                            value={wireForm.recipient_bank_state}
                            onChange={(e) => handleInputChange('recipient_bank_state', e.target.value)}
                            placeholder="Enter State/Province (Optional)"
                          />
                        ) : (
                          <select
                            style={styles.select}
                            value={wireForm.recipient_bank_state}
                            onChange={(e) => {
                              handleInputChange('recipient_bank_state', e.target.value);
                              handleInputChange('recipient_bank_city', '');
                            }}
                            disabled={loadingStates}
                          >
                            <option value="">
                              {loadingStates ? 'Loading states...' : 'Select State/Province (Optional)'}
                            </option>
                            {locationData.states.map(state => (
                              <option key={state.id} value={state.code}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {locationData.states.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowManualState(!showManualState);
                              handleInputChange('recipient_bank_state', '');
                              handleInputChange('recipient_bank_city', '');
                              setShowManualCity(false);
                            }}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              color: '#374151',
                              fontWeight: '500'
                            }}
                          >
                            {showManualState ? '📋 Select from list' : '✏️ Enter manually'}
                          </button>
                        )}
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>City (Optional)</label>
                        {showManualCity ? (
                          <input
                            type="text"
                            style={styles.input}
                            value={wireForm.recipient_bank_city}
                            onChange={(e) => handleInputChange('recipient_bank_city', e.target.value)}
                            placeholder="Enter City (Optional)"
                          />
                        ) : (
                          <select
                            style={styles.select}
                            value={wireForm.recipient_bank_city}
                            onChange={(e) => handleInputChange('recipient_bank_city', e.target.value)}
                            disabled={loadingCities || !wireForm.recipient_bank_state}
                          >
                            <option value="">
                              {loadingCities ? 'Loading cities...' : wireForm.recipient_bank_state ? 'Select City (Optional)' : 'Select state first'}
                            </option>
                            {locationData.cities.map(city => (
                              <option key={city.id} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {locationData.cities.length > 0 && !showManualState && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowManualCity(!showManualCity);
                              handleInputChange('recipient_bank_city', '');
                            }}
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem 1rem',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              color: '#374151',
                              fontWeight: '500'
                            }}
                          >
                            {showManualCity ? '📋 Select from list' : '✏️ Enter manually'}
                          </button>
                        )}
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>County (Optional)</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={wireForm.recipient_bank_county || ''}
                          onChange={(e) => handleInputChange('recipient_bank_county', e.target.value)}
                          placeholder="Enter County (Optional)"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>ZIP/Postal Code (Optional)</label>
                        <input
                          type="text"
                          style={styles.input}
                          value={wireForm.recipient_bank_zip}
                          onChange={(e) => handleInputChange('recipient_bank_zip', e.target.value)}
                          placeholder="ZIP/Postal Code (Optional)"
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Transfer Amount ($) *</label>
                        <input
                          type="number"
                          style={styles.input}
                          value={wireForm.amount}
                          onChange={(e) => handleInputChange('amount', e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Transfer Purpose *</label>
                        <select
                          style={styles.select}
                          value={wireForm.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          required
                        >
                          <option value="">Select transfer purpose</option>
                          <option value="Family Support">Family Support</option>
                          <option value="Business Payment">Business Payment</option>
                          <option value="Invoice Payment">Invoice Payment</option>
                          <option value="Property Purchase">Property Purchase</option>
                          <option value="Rent Payment">Rent Payment</option>
                          <option value="Loan Payment">Loan Payment</option>
                          <option value="Educational Expenses">Educational Expenses</option>
                          <option value="Medical Expenses">Medical Expenses</option>
                          <option value="Investment">Investment</option>
                          <option value="Gift">Gift</option>
                          <option value="Salary Payment">Salary Payment</option>
                          <option value="Contract Payment">Contract Payment</option>
                          <option value="Subscription Payment">Subscription Payment</option>
                          <option value="Insurance Premium">Insurance Premium</option>
                          <option value="Tax Payment">Tax Payment</option>
                          <option value="Legal Services">Legal Services</option>
                          <option value="Consulting Fees">Consulting Fees</option>
                          <option value="Travel Expenses">Travel Expenses</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div style={{
                        backgroundColor: '#f0f9ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1.25rem'
                      }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ⚡ Optional: Expedited Processing Service
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                          Select this option if you need your transfer processed faster than standard processing times.
                        </div>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem',
                            backgroundColor: wireForm.urgent_transfer ? '#f0fdf4' : '#ffffff',
                            borderRadius: '10px',
                            border: wireForm.urgent_transfer ? '2px solid #059669' : '2px solid #cbd5e1',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: wireForm.urgent_transfer ? '0 4px 12px rgba(5, 150, 105, 0.2)' : 'none'
                          }}
                        >
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: wireForm.urgent_transfer ? '2px solid #059669' : '2px solid #cbd5e1',
                            backgroundColor: wireForm.urgent_transfer ? '#059669' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.2s ease'
                          }}>
                            {wireForm.urgent_transfer && (
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <input
                            type="checkbox"
                            style={{ display: 'none' }}
                            checked={wireForm.urgent_transfer}
                            onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#111827', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
                              ⚡ Expedited Processing (+$10.00)
                            </div>
                            <div style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '600' }}>
                              {wireForm.urgent_transfer
                                ? (wireForm.transfer_type === 'domestic'
                                  ? '✓ Completed within 2 hours'
                                  : '✓ Completed within 24-48 hours')
                                : ''}
                            </div>
                          </div>
                        </label>
                      </div>

                      {wireForm.from_account_id && (
                        <div style={styles.balanceInfo}>
                          <div style={styles.balanceLabel}>Available Balance</div>
                          <div style={styles.balanceValue}>
                            {formatCurrency(accounts.find(a => a.id === wireForm.from_account_id)?.balance || 0)}
                          </div>
                          {wireForm.amount && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                              Transfer Amount: {formatCurrency(wireForm.amount)}<br/>
                              Fees: {formatCurrency(wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0))}<br/>
                              Total Debit: {formatCurrency(wireForm.total_amount)}<br/>
                              Remaining Balance: {formatCurrency(
                                parseFloat(accounts.find(a => a.id === wireForm.from_account_id)?.balance || 0) - wireForm.total_amount
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleNextStep}
                        style={{
                          ...styles.submitButton,
                          backgroundColor: '#059669'
                        }}
                      >
                        Continue to Review →
                      </button>
                    </>
                  )}

                  {currentStep === 2 && (
                    <>
                      <div style={styles.reviewSection}>
                        <div style={styles.reviewTitle}>Transfer Summary</div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Transfer Type</span>
                          <span style={styles.reviewValue}>
                            {wireForm.transfer_type === 'domestic' ? '🇺🇸 Domestic' : '🌍 International'}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>From Account</span>
                          <span style={styles.reviewValue}>
                            {accounts.find(a => a.id === wireForm.from_account_id)?.account_type?.toUpperCase()} -
                            {accounts.find(a => a.id === wireForm.from_account_id)?.account_number}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Recipient Name</span>
                          <span style={styles.reviewValue}>
                            {wireForm.recipient_first_name} {wireForm.recipient_middle_name} {wireForm.recipient_last_name}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Recipient Bank</span>
                          <span style={styles.reviewValue}>{wireForm.recipient_bank}</span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Account Number</span>
                          <span style={styles.reviewValue}>{wireForm.recipient_account}</span>
                        </div>

                        {wireForm.transfer_type === 'international' && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>SWIFT Code</span>
                            <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                          </div>
                        )}

                        {wireForm.transfer_type === 'domestic' && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Routing Number</span>
                            <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                          </div>
                        )}

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Bank Address</span>
                          <span style={styles.reviewValue}>
                            {wireForm.recipient_bank_address}, {wireForm.recipient_bank_city},
                            {wireForm.recipient_bank_county ? `${wireForm.recipient_bank_county}, ` : ''}
                            {wireForm.recipient_bank_state} {wireForm.recipient_bank_zip}, {wireForm.recipient_bank_country}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Transfer Amount</span>
                          <span style={styles.reviewValue}>{formatCurrency(wireForm.amount)}</span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Processing Fee</span>
                          <span style={styles.reviewValue}>{formatCurrency(wireForm.fee)}</span>
                        </div>

                        {wireForm.urgent_transfer && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Expedited Fee</span>
                            <span style={styles.reviewValue}>{formatCurrency(wireForm.urgent_fee)}</span>
                          </div>
                        )}

                        <div style={{...styles.reviewRow, borderTop: '2px solid #059669', paddingTop: '1rem', marginTop: '0.5rem'}}>
                          <span style={{...styles.reviewLabel, fontWeight: '700', color: '#1a365d'}}>Total Amount</span>
                          <span style={{...styles.reviewValue, fontWeight: '700', color: '#059669', fontSize: '1.1rem'}}>
                            {formatCurrency(wireForm.total_amount)}
                          </span>
                        </div>

                        {wireForm.description && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Description</span>
                            <span style={styles.reviewValue}>{wireForm.description}</span>
                          </div>
                        )}

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Processing Time</span>
                          <span style={styles.reviewValue}>
                            {wireForm.urgent_transfer
                              ? (wireForm.transfer_type === 'domestic' ? 'Within 2 hours' : '24-48 hours')
                              : (wireForm.transfer_type === 'domestic' ? 'Same business day' : '1-3 business days')
                            }
                          </span>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1.5rem'
                      }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                          <strong>⚠️ Please Review Carefully:</strong> Wire transfers are typically irreversible.
                          Verify all recipient information is correct before proceeding to the next step.
                        </p>
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
                          type="button"
                          onClick={handleNextStep}
                          style={{
                            ...styles.button,
                            backgroundColor: '#059669',
                            color: 'white'
                          }}
                        >
                          Proceed to Verification →
                        </button>
                      </div>
                    </>
                  )}

                  {currentStep === 3 && (
                    <>
                      {sendingCode ? (
                        <div style={{
                          backgroundColor: '#f0f9ff',
                          border: '2px solid #3b82f6',
                          borderRadius: '12px',
                          padding: '2rem',
                          marginBottom: '1.5rem',
                          textAlign: 'center'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #dbeafe',
                            borderTop: '4px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 1rem auto'
                          }}></div>
                          <p style={{ fontSize: '1.125rem', color: '#1e40af', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
                            Sending Verification Code...
                          </p>
                          <p style={{ fontSize: '0.9375rem', color: '#1e40af', margin: 0 }}>
                            Please wait while we send a secure code to <strong>{user?.email}</strong>
                          </p>
                        </div>
                      ) : (
                        <div style={{
                          backgroundColor: '#f0fdf4',
                          border: '2px solid #059669',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '1.5rem',
                          textAlign: 'center'
                        }}>
                          <p style={{ fontSize: '1rem', color: '#047857', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
                            🔐 Security Verification Required
                          </p>
                          <p style={{ fontSize: '0.9375rem', color: '#047857', margin: 0, lineHeight: '1.6' }}>
                            A 6-digit verification code has been sent to your email address:<br/>
                            <strong style={{ fontSize: '1rem' }}>{user?.email}</strong>
                          </p>
                        </div>
                      )}

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
                            backgroundColor: sendingCode ? '#e5e7eb' : '#059669',
                            color: sendingCode ? '#9ca3af' : 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '0.9375rem',
                            fontWeight: '600',
                            cursor: sendingCode ? 'not-allowed' : 'pointer',
                            width: '100%',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                          }}
                        >
                          {sendingCode ? (
                            <>
                              <div style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid #9ca3af',
                                borderTop: '2px solid transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                              }}></div>
                              Sending Code...
                            </>
                          ) : sentCode ? '🔄 Resend Verification Code' : '📧 Send Verification Code'}
                        </button>
                      </div>

                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginTop: '1.5rem',
                        marginBottom: '1.5rem'
                      }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                          <strong>🔐 Important:</strong> Enter the 6-digit code from your email to proceed to the final confirmation step.
                        </p>
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
                          type="button"
                          onClick={handleNextStep}
                          disabled={!verificationCode || verificationCode.length !== 6}
                          style={{
                            ...styles.button,
                            backgroundColor: (!verificationCode || verificationCode.length !== 6) ? '#cbd5e1' : '#059669',
                            color: 'white',
                            cursor: (!verificationCode || verificationCode.length !== 6) ? 'not-allowed' : 'pointer',
                            opacity: (!verificationCode || verificationCode.length !== 6) ? 0.7 : 1
                          }}
                        >
                          Proceed to Confirmation →
                        </button>
                      </div>
                    </>
                  )}

                  {currentStep === 4 && (
                    <>
                      <div style={{
                        backgroundColor: '#f0fdf4',
                        border: '2px solid #059669',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                      }}>
                        <p style={{ fontSize: '1rem', color: '#047857', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
                          🔐 Transaction PIN Required
                        </p>
                        <p style={{ fontSize: '0.9375rem', color: '#047857', margin: 0, lineHeight: '1.6' }}>
                          For your security, please enter your transaction PIN to authorize this wire transfer.
                        </p>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Enter Your Transaction PIN *</label>
                        <input
                          type="password"
                          maxLength={6}
                          value={transactionPin}
                          onChange={(e) => setTransactionPin(e.target.value.replace(/\D/g, ''))}
                          style={{
                            ...styles.input,
                            fontSize: '1.5rem',
                            textAlign: 'center',
                            letterSpacing: '0.5rem',
                            fontWeight: '700',
                            padding: '1rem'
                          }}
                          placeholder="••••••"
                          required
                        />
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                          Don't have a transaction PIN? <a href="/security" style={{ color: '#059669', textDecoration: 'underline' }}>Set it up in Security settings</a>
                        </p>
                      </div>

                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #f59e0b',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginTop: '1.5rem',
                        marginBottom: '1.5rem'
                      }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400e', margin: 0 }}>
                          <strong>🔐 Important:</strong> Your transaction PIN adds an extra layer of security. Never share your PIN with anyone.
                        </p>
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
                          type="button"
                          onClick={handleNextStep}
                          disabled={!transactionPin || transactionPin.length < 4 || verifyingPin}
                          style={{
                            ...styles.button,
                            backgroundColor: (!transactionPin || transactionPin.length < 4 || verifyingPin) ? '#cbd5e1' : '#059669',
                            color: 'white',
                            cursor: (!transactionPin || transactionPin.length < 4 || verifyingPin) ? 'not-allowed' : 'pointer',
                            opacity: (!transactionPin || transactionPin.length < 4 || verifyingPin) ? 0.7 : 1
                          }}
                        >
                          {verifyingPin ? '🔄 Verifying...' : 'Verify PIN & Continue →'}
                        </button>
                      </div>
                    </>
                  )}

                  {currentStep === 5 && (
                    <>
                      <div style={styles.reviewSection}>
                        <div style={styles.reviewTitle}>✅ Final Confirmation</div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Transfer Type</span>
                          <span style={styles.reviewValue}>
                            {wireForm.transfer_type === 'domestic' ? '🇺🇸 Domestic Wire' : '🌍 International Wire'}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>From Account</span>
                          <span style={styles.reviewValue}>
                            {accounts.find(a => a.id === wireForm.from_account_id)?.account_type?.toUpperCase()} •••{accounts.find(a => a.id === wireForm.from_account_id)?.account_number?.slice(-4)}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Recipient Name</span>
                          <span style={styles.reviewValue}>
                            {wireForm.recipient_first_name} {wireForm.recipient_middle_name && `${wireForm.recipient_middle_name} `}{wireForm.recipient_last_name}
                          </span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Recipient Bank</span>
                          <span style={styles.reviewValue}>{wireForm.recipient_bank}</span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Account Number</span>
                          <span style={styles.reviewValue}>•••••{wireForm.recipient_account.slice(-4)}</span>
                        </div>

                        {wireForm.transfer_type === 'international' ? (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>SWIFT Code</span>
                            <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                          </div>
                        ) : (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Routing Number</span>
                            <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                          </div>
                        )}

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Transfer Amount</span>
                          <span style={styles.reviewValue}>{formatCurrency(wireForm.amount)}</span>
                        </div>

                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>Processing Fee</span>
                          <span style={styles.reviewValue}>{formatCurrency(wireForm.fee)}</span>
                        </div>

                        {wireForm.urgent_transfer && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Expedited Fee</span>
                            <span style={styles.reviewValue}>{formatCurrency(wireForm.urgent_fee)}</span>
                          </div>
                        )}

                        <div style={{...styles.reviewRow, borderTop: '2px solid #059669', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#fef3c7'}}>
                          <span style={{...styles.reviewLabel, fontWeight: '700', fontSize: '1rem', color: '#1a365d'}}>Total Debit</span>
                          <span style={{...styles.reviewValue, fontWeight: '700', fontSize: '1.25rem', color: '#dc2626'}}>
                            {formatCurrency(wireForm.total_amount)}
                          </span>
                        </div>

                        {wireForm.urgent_transfer && (
                          <div style={styles.reviewRow}>
                            <span style={styles.reviewLabel}>Processing Speed</span>
                            <span style={{...styles.reviewValue, color: '#059669', fontWeight: '600'}}>
                              ⚡ {wireForm.transfer_type === 'domestic' ? 'Within 2 hours' : '24-48 hours'}
                            </span>
                          </div>
                        )}
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
                            backgroundColor: loading ? '#cbd5e1' : '#1e40af',
                            color: 'white',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                          }}
                          disabled={loading || !verificationCode || verificationCode.length !== 6}
                        >
                          {loading ? '🔄 Processing...' : `✓ Submit Transfer`}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </div>

              {currentStep === 1 && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>📋 Recent Transfer History</h2>
                  <div style={styles.transfersList}>
                    {transfers.length === 0 ? (
                      <div style={styles.emptyState}>
                        <p style={{ fontSize: '2rem' }}>📋</p>
                        <p>No transfer history yet</p>
                      </div>
                    ) : (
                      transfers.map(transfer => (
                        <div
                          key={transfer.id}
                          style={styles.transferItem}
                          onClick={() => setSelectedTransfer(transfer)}
                          onMouseEnter={(e) => e.currentTarget.style.boxShadow = styles.transferItemHover.boxShadow}
                          onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                        >
                          <div style={styles.transferHeader}>
                            <div>
                              <div style={styles.transferRecipient}>
                                {transfer.transfer_type === 'domestic' ? '🇺🇸' : '🌍'} {transfer.recipient_name}
                              </div>
                              <div style={styles.transferDetails}>
                                {transfer.recipient_bank}
                              </div>
                              <div style={styles.transferDetails}>
                                Ref: {transfer.reference}
                              </div>
                              <div style={styles.transferDetails}>
                                {new Date(transfer.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={styles.transferAmount}>
                                {formatCurrency(transfer.total_amount)}
                              </div>
                              <div style={{
                                ...styles.transferStatus,
                                backgroundColor: getStatusColor(transfer.status)
                              }}>
                                {transfer.status?.toUpperCase()}
                              </div>
                            </div>
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

      {showReceipt && receiptData && (
        <div style={styles.receiptModal} onClick={() => setShowReceipt(false)}>
          <div style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={styles.receiptTitle}>Wire Transfer Submitted</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Oakline Bank</div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Reference Number</span>
              <span style={styles.receiptValue}>{receiptData.reference}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>{receiptData.date}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Recipient</span>
              <span style={styles.receiptValue}>{receiptData.recipientName}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Recipient Bank</span>
              <span style={styles.receiptValue}>{receiptData.recipientBank}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Transfer Type</span>
              <span style={styles.receiptValue}>
                {receiptData.transferType === 'domestic' ? '🇺🇸 Domestic' : '🌍 International'}
              </span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Transfer Amount</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.amount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Processing Fee</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.fee)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Total Debit</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.totalAmount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>From Account</span>
              <span style={styles.receiptValue}>{receiptData.account.type?.toUpperCase()} - {receiptData.account.number}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>New Balance</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.account.balance)}</span>
            </div>
            {receiptData.urgent && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Processing</span>
                <span style={styles.receiptValue}>⚡ Expedited</span>
              </div>
            )}
            {receiptData.description && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Description</span>
                <span style={styles.receiptValue}>{receiptData.description}</span>
              </div>
            )}

            <div style={{
              backgroundColor: '#dbeafe',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.8rem', color: '#1e40af', margin: 0, textAlign: 'center' }}>
                Your wire transfer has been submitted for processing. You will receive email confirmation once completed.
              </p>
            </div>

            <div style={styles.receiptButtons}>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#059669',
                  color: 'white'
                }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#1a365d',
                  color: 'white'
                }}
                onClick={() => setShowReceipt(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Details Modal */}
      {selectedTransfer && (
        <div style={styles.receiptModal} onClick={() => setSelectedTransfer(null)}>
          <div style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {selectedTransfer.transfer_type === 'domestic' ? '🇺🇸' : '🌍'}
              </div>
              <div style={styles.receiptTitle}>Wire Transfer Details</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Oakline Bank</div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Reference Number</span>
              <span style={styles.receiptValue}>{selectedTransfer.reference}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>{new Date(selectedTransfer.created_at).toLocaleString()}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Transfer Type</span>
              <span style={styles.receiptValue}>
                {selectedTransfer.transfer_type === 'domestic' ? '🇺🇸 Domestic Wire' : '🌍 International Wire'}
              </span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Recipient Name</span>
              <span style={styles.receiptValue}>{selectedTransfer.recipient_name}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Recipient Bank</span>
              <span style={styles.receiptValue}>{selectedTransfer.recipient_bank}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Recipient Account</span>
              <span style={styles.receiptValue}>••••{selectedTransfer.recipient_account?.slice(-4)}</span>
            </div>
            {selectedTransfer.recipient_bank_address && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Bank Address</span>
                <span style={styles.receiptValue}>{selectedTransfer.recipient_bank_address}</span>
              </div>
            )}
            {selectedTransfer.swift_code && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>SWIFT Code</span>
                <span style={styles.receiptValue}>{selectedTransfer.swift_code}</span>
              </div>
            )}
            {selectedTransfer.routing_number && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Routing Number</span>
                <span style={styles.reviewValue}>{selectedTransfer.routing_number}</span>
              </div>
            )}
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Transfer Amount</span>
              <span style={styles.receiptValue}>{formatCurrency(selectedTransfer.amount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Processing Fee</span>
              <span style={styles.receiptValue}>{formatCurrency(selectedTransfer.fee)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Total Amount</span>
              <span style={styles.receiptValue}>{formatCurrency(selectedTransfer.total_amount)}</span>
            </div>
            {selectedTransfer.urgent_transfer && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Processing Speed</span>
                <span style={{...styles.receiptValue, color: '#059669', fontWeight: '600'}}>
                  ⚡ Expedited
                </span>
              </div>
            )}
            {selectedTransfer.description && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Purpose</span>
                <span style={styles.receiptValue}>{selectedTransfer.description}</span>
              </div>
            )}
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Status</span>
              <span style={{
                ...styles.receiptValue,
                color: 'white',
                backgroundColor: getStatusColor(selectedTransfer.status),
                padding: '0.5rem 1rem',
                borderRadius: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {selectedTransfer.status}
              </span>
            </div>

            {selectedTransfer.processed_at && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Processed At</span>
                <span style={styles.receiptValue}>{new Date(selectedTransfer.processed_at).toLocaleString()}</span>
              </div>
            )}

            {selectedTransfer.rejection_reason && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '12px',
                padding: '1rem',
                marginTop: '1rem',
                marginBottom: '1rem'
              }}>
                <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0, fontWeight: '600' }}>
                  <strong>❌ Rejection Reason:</strong> {selectedTransfer.rejection_reason}
                </p>
              </div>
            )}

            <div style={styles.receiptButtons}>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#059669',
                  color: 'white'
                }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#1a365d',
                  color: 'white'
                }}
                onClick={() => setSelectedTransfer(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Loading Overlay when Submitting Transfer */}
      {isSubmitting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: isMobile ? '2.5rem 1.5rem' : '3rem 2.5rem',
            textAlign: 'center',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              border: '6px solid #e2e8f0',
              borderTop: '6px solid #059669',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 2rem'
            }}></div>
            <h2 style={{
              fontSize: isMobile ? '1.5rem' : '1.75rem',
              fontWeight: '700',
              color: '#1a365d',
              marginBottom: '1rem',
              letterSpacing: '-0.02em'
            }}>
              Processing Your Wire Transfer
            </h2>
            <p style={{
              fontSize: isMobile ? '1rem' : '1.125rem',
              color: '#4a5568',
              marginBottom: '1.5rem',
              lineHeight: '1.6'
            }}>
              Please wait while we securely process your wire transfer request...
            </p>
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #059669',
              borderRadius: '12px',
              padding: '1rem',
              marginTop: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#047857',
                margin: 0,
                fontWeight: '600',
                lineHeight: '1.6'
              }}>
                🔐 Your transaction is being securely processed. Do not close this window or navigate away.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}