import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function Withdrawal() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [linkedCards, setLinkedCards] = useState([]);
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
    withdrawal_method: 'crypto_wallet',
    amount: '',
    crypto_asset_id: '',
    crypto_wallet_address: '',
    linked_bank_id: '',
    linked_card_id: '',
    new_bank_details: {
      account_holder_name: '',
      bank_name: '',
      account_number: '',
      routing_number: '',
      account_type: 'checking',
      swift_code: '',
      iban: ''
    },
    new_card_details: {
      cardholder_name: '',
      card_number: '',
      cvv: '',
      expiry_month: '',
      expiry_year: '',
      billing_address: '',
      billing_city: '',
      billing_state: '',
      billing_zip: ''
    },
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
      fetchCryptoAssets();
      fetchLinkedBanks();
      fetchLinkedCards();
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

  const fetchCryptoAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_assets')
        .select('*')
        .eq('status', 'active')
        .order('crypto_type');

      if (error) throw error;
      setCryptoAssets(data || []);
    } catch (error) {
      console.error('Error fetching crypto assets:', error);
    }
  };

  const fetchLinkedBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setLinkedBanks(data || []);
    } catch (error) {
      console.error('Error fetching linked banks:', error);
    }
  };

  const fetchLinkedCards = async () => {
    try {
      const { data, error } = await supabase
        .from('linked_debit_cards')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('is_primary', { ascending: false});

      if (error) throw error;
      setLinkedCards(data || []);
    } catch (error) {
      console.error('Error fetching linked cards:', error);
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
      case 'crypto_wallet':
        fee = amount * 0.015; // 1.5% crypto network fee (minimum $5)
        fee = Math.max(fee, 5.00);
        break;
      case 'linked_bank':
        fee = 0.00; // Free ACH transfer to linked banks
        break;
      case 'debit_card':
        fee = amount >= 1000 ? 15.00 : 5.00; // Express withdrawal fee
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

    if (parseFloat(withdrawalForm.amount) > 50000) {
      showMessage('Single withdrawal limit is $50,000. Please contact support for higher amounts.', 'error');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    const { withdrawal_method, crypto_asset_id, crypto_wallet_address, linked_bank_id, linked_card_id, new_bank_details } = withdrawalForm;

    switch (withdrawal_method) {
      case 'crypto_wallet':
        if (!crypto_asset_id) {
          showMessage('Please select a cryptocurrency', 'error');
          return false;
        }
        if (!crypto_wallet_address) {
          showMessage('Please enter the crypto wallet address', 'error');
          return false;
        }
        if (crypto_wallet_address.length < 26) {
          showMessage('Please enter a valid wallet address', 'error');
          return false;
        }
        break;

      case 'linked_bank':
        if (!linked_bank_id && !new_bank_details.bank_name) {
          showMessage('Please select a linked bank or provide new bank details', 'error');
          return false;
        }
        if (!linked_bank_id) {
          // Validate new bank details
          if (!new_bank_details.account_holder_name || !new_bank_details.bank_name || 
              !new_bank_details.account_number || !new_bank_details.routing_number) {
            showMessage('Please fill in all required bank details', 'error');
            return false;
          }
          if (new_bank_details.routing_number.length !== 9) {
            showMessage('Routing number must be 9 digits', 'error');
            return false;
          }
        }
        break;

      case 'debit_card':
        if (!withdrawalForm.linked_card_id) {
          const { new_card_details } = withdrawalForm;
          if (!new_card_details.cardholder_name || !new_card_details.card_number || 
              !new_card_details.cvv || !new_card_details.expiry_month || 
              !new_card_details.expiry_year || !new_card_details.billing_address ||
              !new_card_details.billing_city || !new_card_details.billing_state || 
              !new_card_details.billing_zip) {
            showMessage('Please select a linked card or fill in all new card details', 'error');
            return false;
          }

          const cleaned = new_card_details.card_number.replace(/\s/g, '');
          if (cleaned.length < 13 || cleaned.length > 19) {
            showMessage('Please enter a valid card number', 'error');
            return false;
          }

          if (new_card_details.cvv.length < 3 || new_card_details.cvv.length > 4) {
            showMessage('Please enter a valid CVV/CVC (3-4 digits)', 'error');
            return false;
          }

          const month = parseInt(new_card_details.expiry_month);
          if (month < 1 || month > 12) {
            showMessage('Expiry month must be between 01 and 12', 'error');
            return false;
          }

          const currentYear = new Date().getFullYear();
          const year = parseInt(new_card_details.expiry_year);
          if (year < currentYear || year > currentYear + 20) {
            showMessage('Invalid expiry year', 'error');
            return false;
          }
        }
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
      let metadata = {};

      switch (withdrawalForm.withdrawal_method) {
        case 'crypto_wallet':
          const selectedCrypto = cryptoAssets.find(c => c.id === withdrawalForm.crypto_asset_id);
          withdrawalDescription = `${selectedCrypto?.crypto_type} withdrawal via ${selectedCrypto?.network_type} to ${withdrawalForm.crypto_wallet_address.substring(0, 8)}...${withdrawalForm.crypto_wallet_address.substring(withdrawalForm.crypto_wallet_address.length - 6)}`;
          metadata = {
            crypto_type: selectedCrypto?.crypto_type,
            network_type: selectedCrypto?.network_type,
            wallet_address: withdrawalForm.crypto_wallet_address
          };
          break;
        case 'linked_bank':
          if (withdrawalForm.linked_bank_id) {
            const selectedBank = linkedBanks.find(b => b.id === withdrawalForm.linked_bank_id);
            withdrawalDescription = `Bank transfer to ${selectedBank?.bank_name} ****${selectedBank?.account_number.slice(-4)}`;
            metadata = {
              linked_bank_id: withdrawalForm.linked_bank_id,
              bank_name: selectedBank?.bank_name
            };
          } else {
            withdrawalDescription = `Bank transfer to ${withdrawalForm.new_bank_details.bank_name}`;
            metadata = {
              new_bank: withdrawalForm.new_bank_details
            };
          }
          break;
        case 'debit_card':
          if (withdrawalForm.linked_card_id) {
            const selectedCard = linkedCards.find(c => c.id === withdrawalForm.linked_card_id);
            withdrawalDescription = `Debit card withdrawal to ${selectedCard?.card_brand.toUpperCase()} ****${selectedCard?.card_number_last4}`;
            metadata = {
              linked_card_id: withdrawalForm.linked_card_id,
              card_brand: selectedCard?.card_brand
            };
          } else {
            withdrawalDescription = `Debit card withdrawal to new card ending in ${withdrawalForm.new_card_details.card_number.slice(-4)}`;
            metadata = {
              new_card: withdrawalForm.new_card_details
            };
          }
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
          status: 'pending',
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          metadata: metadata
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
          description: `${withdrawalForm.withdrawal_method.replace('_', ' ')} withdrawal fee`,
          reference: `FEE-${reference}`,
          status: 'completed',
          balance_before: balanceAfter,
          balance_after: balanceAfter - fee
        }]);
      }

      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ 
          balance: balanceAfter - fee,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalForm.from_account_id);

      if (balanceError) throw balanceError;

      await supabase.from('notifications').insert([{
        user_id: currentUser.id,
        type: 'withdrawal',
        title: 'Withdrawal Initiated',
        message: `$${amount.toFixed(2)} withdrawal is being processed`
      }]);

      setReceiptData({
        reference: reference,
        amount: amount,
        fee: fee,
        total: totalAmount,
        method: withdrawalForm.withdrawal_method,
        account: selectedAccount,
        description: withdrawalDescription,
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
      withdrawal_method: 'crypto_wallet',
      amount: '',
      crypto_asset_id: '',
      crypto_wallet_address: '',
      linked_bank_id: '',
      linked_card_id: '',
      new_bank_details: {
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        routing_number: '',
        account_type: 'checking',
        swift_code: '',
        iban: ''
      },
      new_card_details: {
        cardholder_name: '',
        card_number: '',
        cvv: '',
        expiry_month: '',
        expiry_year: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_zip: ''
      },
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
      crypto_wallet: '💎 Cryptocurrency Wallet',
      linked_bank: '🏦 Bank Account (ACH)',
      debit_card: '💳 Debit Card (Instant)'
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
      border: '1px solid #e2e8f0'
    },
    cardTitle: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
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
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(5, 150, 105, 0.4)',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    balanceInfo: {
      backgroundColor: '#f0f9ff',
      padding: '1.25rem',
      borderRadius: '12px',
      marginTop: '1rem',
      border: '2px solid #0ea5e9'
    },
    balanceLabel: {
      fontSize: '0.875rem',
      color: '#0c4a6e',
      marginBottom: '0.5rem',
      fontWeight: '600'
    },
    balanceValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#075985'
    },
    infoBox: {
      backgroundColor: '#f0fdf4',
      border: '2px solid #059669',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1.5rem'
    },
    linkButton: {
      color: '#059669',
      textDecoration: 'none',
      fontWeight: '600',
      fontSize: '0.875rem',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      marginTop: '0.5rem'
    },
    reviewSection: {
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      border: '2px solid #e2e8f0'
    },
    reviewTitle: {
      fontSize: '1.125rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #059669'
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
        <div style={{ color: 'white', textAlign: 'center', paddingTop: '4rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Please sign in to continue</h2>
          <Link href="/sign-in" style={{ color: '#FFC857', textDecoration: 'underline' }}>Go to Sign In</Link>
        </div>
      </div>
    );
  }

  if (showReceipt && receiptData) {
    return (
      <div style={styles.container}>
        <div style={styles.main}>
          <div style={{ ...styles.card, maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#059669', marginBottom: '0.5rem' }}>
              Withdrawal Initiated!
            </h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Your withdrawal request has been submitted and is being processed
            </p>

            <div style={styles.reviewSection}>
              <h3 style={styles.reviewTitle}>Withdrawal Details</h3>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Reference</span>
                <span style={styles.reviewValue}>{receiptData.reference}</span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Amount</span>
                <span style={styles.reviewValue}>{formatCurrency(receiptData.amount)}</span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Fee</span>
                <span style={styles.reviewValue}>{formatCurrency(receiptData.fee)}</span>
              </div>
              <div style={{ ...styles.reviewRow, borderTop: '2px solid #059669', marginTop: '0.5rem', backgroundColor: '#f0fdf4' }}>
                <span style={{ ...styles.reviewLabel, fontWeight: '700' }}>Total Deducted</span>
                <span style={{ ...styles.reviewValue, color: '#059669', fontSize: '1.125rem' }}>{formatCurrency(receiptData.total)}</span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Method</span>
                <span style={styles.reviewValue}>{getMethodLabel(receiptData.method)}</span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Account</span>
                <span style={styles.reviewValue}>****{receiptData.account.account_number.slice(-4)}</span>
              </div>
              <div style={{ ...styles.reviewRow, borderBottom: 'none' }}>
                <span style={styles.reviewLabel}>Date</span>
                <span style={styles.reviewValue}>{formatDate(receiptData.timestamp)}</span>
              </div>
            </div>

            <button
              onClick={closeReceipt}
              style={{
                ...styles.submitButton,
                backgroundColor: '#059669'
              }}
            >
              Done
            </button>
          </div>
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
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
        </div>

        <div style={styles.main}>
          <h1 style={styles.pageTitle}>Withdraw Funds</h1>
          <p style={styles.pageSubtitle}>
            Transfer money from your account to your wallet, bank, or card
          </p>

          {/* Step Indicator */}
          <div style={styles.stepIndicator}>
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 1 ? '#059669' : '#94a3b8',
                color: 'white',
                borderColor: currentStep === 1 ? 'white' : 'transparent'
              }}>
                1
              </div>
              <div style={styles.stepLabel}>Amount & Method</div>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 2 ? '#059669' : 'rgba(255,255,255,0.3)'
            }} />
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 2 ? '#059669' : '#94a3b8',
                color: 'white',
                borderColor: currentStep === 2 ? 'white' : 'transparent'
              }}>
                2
              </div>
              <div style={styles.stepLabel}>Destination Details</div>
            </div>
            <div style={{
              ...styles.stepDivider,
              backgroundColor: currentStep >= 3 ? '#059669' : 'rgba(255,255,255,0.3)'
            }} />
            <div style={styles.step}>
              <div style={{
                ...styles.stepCircle,
                backgroundColor: currentStep >= 3 ? '#059669' : '#94a3b8',
                color: 'white',
                borderColor: currentStep === 3 ? 'white' : 'transparent'
              }}>
                3
              </div>
              <div style={styles.stepLabel}>Review & Confirm</div>
            </div>
          </div>

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

          {/* Step 1: Amount and Method */}
          {currentStep === 1 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Step 1: Amount & Withdrawal Method</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>From Account</label>
                <select
                  value={withdrawalForm.from_account_id}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, from_account_id: e.target.value }))}
                  style={styles.select}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type.toUpperCase()} - ****{acc.account_number.slice(-4)} (Balance: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Withdrawal Method</label>
                <select
                  value={withdrawalForm.withdrawal_method}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, withdrawal_method: e.target.value }))}
                  style={styles.select}
                >
                  <option value="crypto_wallet">💎 Cryptocurrency (1.5% fee, min $5)</option>
                  <option value="linked_bank">🏦 Bank Account - ACH (Free, 1-3 business days)</option>
                  <option value="debit_card">💳 Debit Card - Instant ($5-$15 fee)</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={withdrawalForm.amount}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={styles.input}
                  placeholder="0.00"
                />
              </div>

              {withdrawalForm.amount > 0 && (
                <div style={styles.balanceInfo}>
                  <div style={styles.balanceLabel}>Withdrawal Summary</div>
                  <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#0c4a6e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Amount:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(parseFloat(withdrawalForm.amount))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Fee:</span>
                      <span style={{ fontWeight: '600' }}>{formatCurrency(withdrawalForm.fee)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '2px solid #0ea5e9' }}>
                      <span style={{ fontWeight: '700' }}>Total:</span>
                      <span style={{ fontWeight: '700', fontSize: '1.125rem' }}>{formatCurrency(withdrawalForm.total_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={styles.buttonGroup}>
                <button
                  onClick={handleNextStep}
                  style={{
                    ...styles.button,
                    backgroundColor: '#059669',
                    color: 'white'
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Destination Details */}
          {currentStep === 2 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Step 2: Destination Details</h2>

              {withdrawalForm.withdrawal_method === 'crypto_wallet' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Cryptocurrency & Network</label>
                    <select
                      value={withdrawalForm.crypto_asset_id}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, crypto_asset_id: e.target.value }))}
                      style={styles.select}
                    >
                      <option value="">Select Cryptocurrency...</option>
                      {cryptoAssets.map(crypto => (
                        <option key={crypto.id} value={crypto.id}>
                          {crypto.crypto_type} ({crypto.symbol}) - {crypto.network_type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Wallet Address</label>
                    <input
                      type="text"
                      value={withdrawalForm.crypto_wallet_address}
                      onChange={(e) => setWithdrawalForm(prev => ({ ...prev, crypto_wallet_address: e.target.value }))}
                      style={styles.input}
                      placeholder="Enter wallet address"
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                      Please double-check the address. Cryptocurrency transactions cannot be reversed.
                    </small>
                  </div>
                </>
              )}

              {withdrawalForm.withdrawal_method === 'linked_bank' && (
                <>
                  {linkedBanks.length > 0 ? (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Select Linked Bank Account</label>
                        <select
                          value={withdrawalForm.linked_bank_id}
                          onChange={(e) => setWithdrawalForm(prev => ({ ...prev, linked_bank_id: e.target.value }))}
                          style={styles.select}
                        >
                          <option value="">Select bank or add new...</option>
                          {linkedBanks.map(bank => (
                            <option key={bank.id} value={bank.id}>
                              {bank.bank_name} - {bank.account_type.toUpperCase()} ****{bank.account_number.slice(-4)}
                              {bank.is_primary ? ' (Primary)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.infoBox}>
                        <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0 }}>
                          💡 <strong>No linked bank?</strong>{' '}
                          <Link href="/link-bank-account" style={styles.linkButton}>
                            Add a new bank account →
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div style={styles.infoBox}>
                      <p style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '1rem' }}>
                        <strong>No linked bank accounts found.</strong> You can add a bank account for faster future withdrawals.
                      </p>
                      <Link href="/link-bank-account" style={styles.linkButton}>
                        Add Bank Account →
                      </Link>
                    </div>
                  )}

                  {!withdrawalForm.linked_bank_id && (
                    <>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '1.5rem', marginBottom: '1rem' }}>
                        Or Enter Bank Details Manually
                      </h3>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Account Holder Name</label>
                        <input
                          type="text"
                          value={withdrawalForm.new_bank_details.account_holder_name}
                          onChange={(e) => setWithdrawalForm(prev => ({
                            ...prev,
                            new_bank_details: { ...prev.new_bank_details, account_holder_name: e.target.value }
                          }))}
                          style={styles.input}
                          placeholder="John Doe"
                        />
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Bank Name</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_bank_details.bank_name}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, bank_name: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="Bank of America"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Account Type</label>
                          <select
                            value={withdrawalForm.new_bank_details.account_type}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, account_type: e.target.value }
                            }))}
                            style={styles.select}
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </select>
                        </div>
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Account Number</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_bank_details.account_number}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, account_number: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="1234567890"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Routing Number (9 digits)</label>
                          <input
                            type="text"
                            maxLength={9}
                            value={withdrawalForm.new_bank_details.routing_number}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, routing_number: e.target.value.replace(/\D/g, '') }
                            }))}
                            style={styles.input}
                            placeholder="021000021"
                          />
                        </div>
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>SWIFT Code (Optional)</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_bank_details.swift_code}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, swift_code: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="BOFAUS3N"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>IBAN (Optional)</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_bank_details.iban}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_bank_details: { ...prev.new_bank_details, iban: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="GB82 WEST 1234 5698 7654 32"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {withdrawalForm.withdrawal_method === 'debit_card' && (
                <>
                  {linkedCards.length > 0 ? (
                    <>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Select Linked Debit Card</label>
                        <select
                          value={withdrawalForm.linked_card_id}
                          onChange={(e) => setWithdrawalForm(prev => ({ ...prev, linked_card_id: e.target.value }))}
                          style={styles.select}
                        >
                          <option value="">Select card...</option>
                          {linkedCards.map(card => (
                            <option key={card.id} value={card.id}>
                              {card.card_brand.toUpperCase()} ****{card.card_number_last4}
                              {card.is_primary ? ' (Primary)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={styles.infoBox}>
                        <p style={{ fontSize: '0.875rem', color: '#065f46', margin: 0 }}>
                          💡 <strong>Need to add a card?</strong>{' '}
                          <Link href="/link-debit-card" style={styles.linkButton}>
                            Link a new debit card →
                          </Link>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div style={styles.infoBox}>
                      <p style={{ fontSize: '0.875rem', color: '#065f46', marginBottom: '1rem' }}>
                        <strong>No linked debit cards found.</strong> Please add a debit card to use this withdrawal method.
                      </p>
                      <Link href="/link-debit-card" style={styles.linkButton}>
                        Link Debit Card →
                      </Link>
                    </div>
                  )}

                  {!withdrawalForm.linked_card_id && (
                    <>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '1.5rem', marginBottom: '1rem' }}>
                        Or Enter Card Details Manually
                      </h3>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Cardholder Name</label>
                        <input
                          type="text"
                          value={withdrawalForm.new_card_details.cardholder_name}
                          onChange={(e) => setWithdrawalForm(prev => ({
                            ...prev,
                            new_card_details: { ...prev.new_card_details, cardholder_name: e.target.value }
                          }))}
                          style={styles.input}
                          placeholder="John Doe"
                        />
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Card Number</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_card_details.card_number}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, card_number: e.target.value.replace(/\D/g, '') }
                            }))}
                            style={styles.input}
                            placeholder="4111 1111 1111 1111"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>CVV/CVC</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={withdrawalForm.new_card_details.cvv}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, cvv: e.target.value.replace(/\D/g, '') }
                            }))}
                            style={styles.input}
                            placeholder="123"
                          />
                        </div>
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Expiry Month</label>
                          <input
                            type="text"
                            maxLength={2}
                            value={withdrawalForm.new_card_details.expiry_month}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, expiry_month: e.target.value.replace(/\D/g, '') }
                            }))}
                            style={styles.input}
                            placeholder="MM"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Expiry Year</label>
                          <input
                            type="text"
                            maxLength={4}
                            value={withdrawalForm.new_card_details.expiry_year}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, expiry_year: e.target.value.replace(/\D/g, '') }
                            }))}
                            style={styles.input}
                            placeholder="YYYY"
                          />
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Billing Address</label>
                        <input
                          type="text"
                          value={withdrawalForm.new_card_details.billing_address}
                          onChange={(e) => setWithdrawalForm(prev => ({
                            ...prev,
                            new_card_details: { ...prev.new_card_details, billing_address: e.target.value }
                          }))}
                          style={styles.input}
                          placeholder="123 Main St"
                        />
                      </div>

                      <div style={styles.formGrid}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>City</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_card_details.billing_city}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, billing_city: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="Anytown"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>State</label>
                          <input
                            type="text"
                            value={withdrawalForm.new_card_details.billing_state}
                            onChange={(e) => setWithdrawalForm(prev => ({
                              ...prev,
                              new_card_details: { ...prev.new_card_details, billing_state: e.target.value }
                            }))}
                            style={styles.input}
                            placeholder="CA"
                          />
                        </div>
                      </div>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>ZIP Code</label>
                        <input
                          type="text"
                          value={withdrawalForm.new_card_details.billing_zip}
                          onChange={(e) => setWithdrawalForm(prev => ({
                            ...prev,
                            new_card_details: { ...prev.new_card_details, billing_zip: e.target.value }
                          }))}
                          style={styles.input}
                          placeholder="90210"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div style={styles.buttonGroup}>
                <button
                  onClick={handlePreviousStep}
                  style={{
                    ...styles.button,
                    backgroundColor: 'white',
                    color: '#059669',
                    border: '2px solid #059669'
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleNextStep}
                  style={{
                    ...styles.button,
                    backgroundColor: '#059669',
                    color: 'white'
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {currentStep === 3 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Step 3: Review & Confirm</h2>

              <div style={styles.reviewSection}>
                <h3 style={styles.reviewTitle}>Withdrawal Summary</h3>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account</span>
                  <span style={styles.reviewValue}>
                    {accounts.find(a => a.id === withdrawalForm.from_account_id)?.account_type.toUpperCase()} ****
                    {accounts.find(a => a.id === withdrawalForm.from_account_id)?.account_number.slice(-4)}
                  </span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Withdrawal Method</span>
                  <span style={styles.reviewValue}>{getMethodLabel(withdrawalForm.withdrawal_method)}</span>
                </div>

                {withdrawalForm.withdrawal_method === 'crypto_wallet' && withdrawalForm.crypto_asset_id && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Cryptocurrency</span>
                      <span style={styles.reviewValue}>
                        {cryptoAssets.find(c => c.id === withdrawalForm.crypto_asset_id)?.crypto_type}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Network</span>
                      <span style={styles.reviewValue}>
                        {cryptoAssets.find(c => c.id === withdrawalForm.crypto_asset_id)?.network_type}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Wallet Address</span>
                      <span style={styles.reviewValue}>
                        {withdrawalForm.crypto_wallet_address.substring(0, 10)}...{withdrawalForm.crypto_wallet_address.substring(withdrawalForm.crypto_wallet_address.length - 8)}
                      </span>
                    </div>
                  </>
                )}

                {withdrawalForm.withdrawal_method === 'linked_bank' && withdrawalForm.linked_bank_id && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Bank</span>
                      <span style={styles.reviewValue}>
                        {linkedBanks.find(b => b.id === withdrawalForm.linked_bank_id)?.bank_name}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Account</span>
                      <span style={styles.reviewValue}>
                        ****{linkedBanks.find(b => b.id === withdrawalForm.linked_bank_id)?.account_number.slice(-4)}
                      </span>
                    </div>
                  </>
                )}

                {withdrawalForm.withdrawal_method === 'linked_bank' && !withdrawalForm.linked_bank_id && withdrawalForm.new_bank_details.bank_name && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Bank</span>
                      <span style={styles.reviewValue}>{withdrawalForm.new_bank_details.bank_name}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Account Holder</span>
                      <span style={styles.reviewValue}>{withdrawalForm.new_bank_details.account_holder_name}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Account</span>
                      <span style={styles.reviewValue}>
                        ****{withdrawalForm.new_bank_details.account_number.slice(-4)}
                      </span>
                    </div>
                  </>
                )}

                {withdrawalForm.withdrawal_method === 'debit_card' && withdrawalForm.linked_card_id && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Card</span>
                      <span style={styles.reviewValue}>
                        {linkedCards.find(c => c.id === withdrawalForm.linked_card_id)?.card_brand.toUpperCase()} ****
                        {linkedCards.find(c => c.id === withdrawalForm.linked_card_id)?.card_number_last4}
                      </span>
                    </div>
                  </>
                )}

                {withdrawalForm.withdrawal_method === 'debit_card' && !withdrawalForm.linked_card_id && withdrawalForm.new_card_details.cardholder_name && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Cardholder Name</span>
                      <span style={styles.reviewValue}>{withdrawalForm.new_card_details.cardholder_name}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Card</span>
                      <span style={styles.reviewValue}>
                        ****{withdrawalForm.new_card_details.card_number.slice(-4)}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Expiry</span>
                      <span style={styles.reviewValue}>
                        {withdrawalForm.new_card_details.expiry_month}/{withdrawalForm.new_card_details.expiry_year}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Billing Address</span>
                      <span style={styles.reviewValue}>
                        {withdrawalForm.new_card_details.billing_address}, {withdrawalForm.new_card_details.billing_city}, {withdrawalForm.new_card_details.billing_state} {withdrawalForm.new_card_details.billing_zip}
                      </span>
                    </div>
                  </>
                )}

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Amount</span>
                  <span style={styles.reviewValue}>{formatCurrency(parseFloat(withdrawalForm.amount))}</span>
                </div>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Fee</span>
                  <span style={styles.reviewValue}>{formatCurrency(withdrawalForm.fee)}</span>
                </div>
                <div style={{ ...styles.reviewRow, borderTop: '2px solid #059669', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>
                  <span style={{ ...styles.reviewLabel, fontWeight: '700', color: '#065f46' }}>Total Deduction</span>
                  <span style={{ ...styles.reviewValue, color: '#059669', fontSize: '1.25rem' }}>{formatCurrency(withdrawalForm.total_amount)}</span>
                </div>
              </div>

              {parseFloat(withdrawalForm.amount) >= 5000 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ ...styles.infoBox, borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
                    <p style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem' }}>
                      🔐 For security purposes, withdrawals over $5,000 require email verification.
                    </p>
                    {!sentCode ? (
                      <button
                        onClick={sendVerificationCode}
                        disabled={sendingCode}
                        style={{
                          ...styles.button,
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          opacity: sendingCode ? 0.6 : 1
                        }}
                      >
                        {sendingCode ? 'Sending...' : 'Send Verification Code'}
                      </button>
                    ) : (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Enter 6-Digit Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          style={styles.input}
                          placeholder="000000"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    style={{
                      ...styles.button,
                      backgroundColor: 'white',
                      color: '#059669',
                      border: '2px solid #059669'
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...styles.button,
                      backgroundColor: '#059669',
                      color: 'white',
                      opacity: loading ? 0.6 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Processing...' : `Confirm Withdrawal`}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}