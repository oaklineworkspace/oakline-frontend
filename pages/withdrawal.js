import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import SelfieVerification from '../components/SelfieVerification';

export default function Withdrawal() {
  const router = useRouter();
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
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [withdrawalSuspended, setWithdrawalSuspended] = useState(false);
  const [withdrawalSuspensionReason, setWithdrawalSuspensionReason] = useState('');
  const [showWithdrawalVerification, setShowWithdrawalVerification] = useState(false);
  const [withdrawalVerificationSubmitted, setWithdrawalVerificationSubmitted] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenReason, setFrozenReason] = useState('');
  const [freezeAmountRequired, setFreezeAmountRequired] = useState(0);
  const [freezePaymentStatus, setFreezePaymentStatus] = useState('not_submitted');
  const [freezePaymentData, setFreezePaymentData] = useState(null);

  const [withdrawalForm, setWithdrawalForm] = useState({
    from_account_id: '',
    withdrawal_method: 'linked_bank',
    amount: '',
    crypto_type: '',
    network_type: '',
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

  useEffect(() => {
    if (withdrawalForm.crypto_type) {
      fetchAvailableNetworks();
    } else {
      setAvailableNetworks([]);
      setWithdrawalForm(prev => ({ ...prev, network_type: '', crypto_asset_id: '' }));
    }
  }, [withdrawalForm.crypto_type]);

  useEffect(() => {
    if (withdrawalForm.crypto_type && withdrawalForm.network_type) {
      updateCryptoAssetId();
    }
  }, [withdrawalForm.crypto_type, withdrawalForm.network_type]);

  const cryptoTypes = [
    { value: 'Bitcoin', label: 'Bitcoin', icon: '₿', color: '#F7931A' },
    { value: 'Tether USD', label: 'Tether', icon: '₮', color: '#26A17B' },
    { value: 'Ethereum', label: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
    { value: 'BNB', label: 'Binance Coin', icon: 'B', color: '#F3BA2F' },
    { value: 'USD Coin', label: 'USD Coin', icon: '$', color: '#007AFF' },
    { value: 'Solana', label: 'Solana', icon: 'S', color: '#9945FF' },
    { value: 'Cardano', label: 'Cardano', icon: 'A', color: '#0077fa' },
    { value: 'Polygon', label: 'Polygon', icon: 'M', color: '#8247E5' },
    { value: 'Avalanche', label: 'Avalanche', icon: 'A', color: '#E84142' },
    { value: 'Litecoin', label: 'Litecoin', icon: 'Ł', color: '#345D9D' },
    { value: 'XRP', label: 'XRP', icon: 'X', color: '#0070D0' },
    { value: 'TON', label: 'TON', icon: 'T', color: '#007AFF' }
  ];

  const networkIconMap = {
    'Bitcoin': '🟠',
    'BNB Smart Chain (BEP20)': '🟡',
    'Ethereum (ERC20)': '⚪',
    'Arbitrum One': '🔵',
    'Optimism': '🔴',
    'Base': '🔷',
    'Tron (TRC20)': '🔴',
    'Solana (SOL)': '🟣',
    'Polygon (MATIC)': '🟣',
    'Avalanche (C-Chain)': '🔴',
    'Litecoin': '⚪',
    'XRP Ledger': '🔵',
    'The Open Network (TON)': '🔵',
    'Cardano': '🔵'
  };

  const fetchUser = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('requires_verification, withdrawal_suspended, withdrawal_suspension_reason, is_frozen, frozen_reason, freeze_amount_required, freeze_payment_status, freeze_payment_submitted_at, freeze_payment_amount, freeze_payment_method, freeze_payment_tx_hash, freeze_payment_crypto_type, freeze_payment_network, freeze_payment_wallet_address')
          .eq('id', currentUser.id)
          .single();
        
        if (profile?.requires_verification) {
          router.push('/verify-identity');
          return;
        }

        if (profile?.is_frozen) {
          setIsFrozen(true);
          setFrozenReason(profile.frozen_reason || 'Your account has been temporarily frozen.');
          setFreezeAmountRequired(profile.freeze_amount_required || 0);
          
          if (profile.freeze_payment_status) {
            setFreezePaymentStatus(profile.freeze_payment_status);
            if (profile.freeze_payment_status === 'pending' || profile.freeze_payment_status === 'under_review') {
              setFreezePaymentData({
                submitted_at: profile.freeze_payment_submitted_at,
                amount: profile.freeze_payment_amount,
                method: profile.freeze_payment_method,
                tx_hash: profile.freeze_payment_tx_hash,
                crypto_type: profile.freeze_payment_crypto_type,
                network: profile.freeze_payment_network,
                wallet_address: profile.freeze_payment_wallet_address
              });
            }
          }
        }

        if (profile?.withdrawal_suspended) {
          setWithdrawalSuspended(true);
          setWithdrawalSuspensionReason(profile.withdrawal_suspension_reason || 'Withdrawal access has been temporarily restricted.');
          setShowWithdrawalVerification(true);
          
          const { data: verification } = await supabase
            .from('selfie_verifications')
            .select('status, metadata')
            .eq('user_id', currentUser.id)
            .eq('triggered_by', 'withdrawal_suspension')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
          if (verification?.status === 'submitted' || verification?.status === 'under_review') {
            setWithdrawalVerificationSubmitted(true);
          }
        }
        
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

  const fetchAvailableNetworks = async () => {
    if (!withdrawalForm.crypto_type) {
      setAvailableNetworks([]);
      return;
    }

    setLoadingNetworks(true);

    try {
      const { data: cryptoAssets, error } = await supabase
        .from('crypto_assets')
        .select('network_type, confirmations_required, min_deposit')
        .eq('crypto_type', withdrawalForm.crypto_type)
        .eq('status', 'active')
        .order('network_type');

      if (error) {
        console.error('Error fetching networks:', error);
        setAvailableNetworks([]);
        return;
      }

      if (cryptoAssets && cryptoAssets.length > 0) {
        const networks = cryptoAssets.map(asset => ({
          value: asset.network_type,
          label: asset.network_type,
          confirmations: asset.confirmations_required || 3,
          minDeposit: asset.min_deposit || 0.001,
          icon: networkIconMap[asset.network_type] || '🔹'
        }));
        setAvailableNetworks(networks);
      } else {
        setAvailableNetworks([]);
      }
    } catch (error) {
      console.error('Error fetching networks:', error);
      setAvailableNetworks([]);
    } finally {
      setLoadingNetworks(false);
    }
  };

  const updateCryptoAssetId = async () => {
    try {
      const { data, error } = await supabase
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', withdrawalForm.crypto_type)
        .eq('network_type', withdrawalForm.network_type)
        .eq('status', 'active')
        .single();

      if (!error && data) {
        setWithdrawalForm(prev => ({ ...prev, crypto_asset_id: data.id }));
      }
    } catch (error) {
      console.error('Error updating crypto asset ID:', error);
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
        // $5 fixed base fee + 1.5% network fee
        const baseFee = 5.00;
        const networkFee = amount * 0.015;
        fee = baseFee + networkFee;
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
        if (!withdrawalForm.crypto_type) {
          showMessage('Please select a cryptocurrency type', 'error');
          return false;
        }
        if (!withdrawalForm.network_type) {
          showMessage('Please select a network type', 'error');
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
      
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          type: 'withdrawal',
          userId: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setGeneratedCode(data.code);
      setSentCode(true);
      showMessage('Verification code sent to your email', 'success');
    } catch (error) {
      console.error('Error sending code:', error);
      showMessage(error.message || 'Failed to send verification code', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Require verification code for all withdrawals
    if (!verificationCode || verificationCode.length !== 6) {
      showMessage('Please enter the 6-digit verification code', 'error');
      return;
    }
    if (verificationCode !== generatedCode) {
      showMessage('Invalid verification code. Please try again.', 'error');
      return;
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
          withdrawalDescription = `${withdrawalForm.crypto_type} withdrawal via ${withdrawalForm.network_type} to ${withdrawalForm.crypto_wallet_address.substring(0, 8)}...${withdrawalForm.crypto_wallet_address.substring(withdrawalForm.crypto_wallet_address.length - 6)}`;
          metadata = {
            crypto_type: withdrawalForm.crypto_type,
            network_type: withdrawalForm.network_type,
            crypto_asset_id: withdrawalForm.crypto_asset_id,
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

      // Map withdrawal method to withdrawals table format
      let withdrawalMethodForTable = 'bank_transfer';
      let destinationAccount = '';
      let destinationBank = '';
      let routingNumberForTable = '';

      if (withdrawalForm.withdrawal_method === 'linked_bank') {
        withdrawalMethodForTable = 'ach';
        const selectedBank = linkedBanks.find(b => b.id === withdrawalForm.linked_bank_id);
        destinationAccount = withdrawalForm.linked_bank_id ? `****${selectedBank?.account_number.slice(-4)}` : '';
        destinationBank = selectedBank?.bank_name || '';
        routingNumberForTable = selectedBank?.routing_number || '';
      } else if (withdrawalForm.withdrawal_method === 'debit_card') {
        withdrawalMethodForTable = 'wire_transfer';
        const selectedCard = linkedCards.find(c => c.id === withdrawalForm.linked_card_id);
        destinationAccount = withdrawalForm.linked_card_id ? `${selectedCard?.card_brand?.toUpperCase()} ****${selectedCard?.card_number_last4}` : '';
      } else if (withdrawalForm.withdrawal_method === 'crypto_wallet') {
        withdrawalMethodForTable = 'crypto';
        destinationAccount = withdrawalForm.crypto_wallet_address || '';
        destinationBank = 'Cryptocurrency';
      }

      // Insert transaction record
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
          balance_after: balanceAfter
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction error:', transactionError);
        throw new Error(`Transaction failed: ${transactionError.message}`);
      }

      // Insert withdrawal record for admin management
      const { error: withdrawalError } = await supabase
        .from('withdrawals')
        .insert([{
          user_id: currentUser.id,
          account_id: withdrawalForm.from_account_id,
          amount: amount,
          withdrawal_method: withdrawalMethodForTable,
          destination_account: destinationAccount,
          destination_bank: destinationBank,
          routing_number: routingNumberForTable,
          status: 'pending',
          reference_number: reference,
          metadata: {
            description: withdrawalDescription,
            fee: fee,
            verification_code_used: true,
            original_method: withdrawalForm.withdrawal_method
          }
        }])
        .select()
        .single();

      if (withdrawalError) {
        console.error('Withdrawal record error:', withdrawalError);
        // Don't throw - this is a secondary operation
      }

      if (fee > 0) {
        const { error: feeError } = await supabase.from('transactions').insert([{
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
        
        if (feeError) {
          console.error('Fee transaction error:', feeError);
        }
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
      withdrawal_method: 'linked_bank',
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

  const handleWithdrawalVerificationComplete = async (data) => {
    setWithdrawalVerificationSubmitted(true);
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

  if (withdrawalSuspended && showWithdrawalVerification) {
    if (withdrawalVerificationSubmitted) {
      return (
        <>
          <Head>
            <title>Withdrawal Verification - Oakline Bank</title>
          </Head>
          <div style={{
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: isMobile ? '2rem' : '3rem',
              maxWidth: '500px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2.5rem'
              }}>
                ✓
              </div>
              <h2 style={{
                fontSize: isMobile ? '1.5rem' : '1.75rem',
                fontWeight: '700',
                color: '#1a365d',
                marginBottom: '1rem'
              }}>
                Verification Submitted
              </h2>
              <p style={{
                color: '#64748b',
                fontSize: '1rem',
                lineHeight: '1.6',
                marginBottom: '1.5rem'
              }}>
                Thank you for submitting your verification. Our team will review your submission within 24-48 hours.
                You'll receive an email notification once your verification has been reviewed.
              </p>
              <p style={{
                color: '#059669',
                fontSize: '0.9rem',
                fontWeight: '500',
                marginBottom: '2rem'
              }}>
                Your withdrawal access will be restored once your verification is approved.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '1rem 2rem',
                  backgroundColor: '#1a365d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <Head>
          <title>Withdrawal Verification Required - Oakline Bank</title>
        </Head>
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            backgroundColor: '#1a365d',
            padding: isMobile ? '1.5rem' : '2rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <h1 style={{
                fontSize: isMobile ? '1.5rem' : '2rem',
                fontWeight: '700',
                color: 'white',
                marginBottom: '0.75rem'
              }}>
                Withdrawal Verification Required
              </h1>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: isMobile ? '0.9rem' : '1rem',
                lineHeight: '1.6'
              }}>
                {withdrawalSuspensionReason}
              </p>
              <p style={{
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '0.875rem',
                marginTop: '0.75rem'
              }}>
                Please complete video verification to restore withdrawal access.
              </p>
            </div>
          </div>
          <SelfieVerification
            verificationType="video"
            onVerificationComplete={handleWithdrawalVerificationComplete}
          />
        </div>
      </>
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

        {/* Frozen Account Overlay - Scrollable */}
        {isFrozen && (
          <div style={{
            position: 'fixed',
            top: isMobile ? '70px' : '80px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            zIndex: 1000,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{
              minHeight: '100%',
              padding: isMobile ? '1.5rem 1rem' : '2rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Show Payment Pending Confirmation if payment was submitted */}
              {(freezePaymentStatus === 'pending' || freezePaymentStatus === 'under_review') && freezePaymentData ? (
                <>
                  <div style={{
                    width: isMobile ? '80px' : '100px',
                    height: isMobile ? '80px' : '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    border: '4px solid #10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
                    animation: 'pulse 2s infinite'
                  }}>
                    <span style={{ fontSize: isMobile ? '2.5rem' : '3rem' }}>⏳</span>
                  </div>

                  <h2 style={{
                    fontSize: isMobile ? '1.75rem' : '2.25rem',
                    fontWeight: '700',
                    color: '#ffffff',
                    margin: '0 0 0.5rem 0',
                    textAlign: 'center'
                  }}>
                    Payment Pending Confirmation
                  </h2>
                  <p style={{
                    fontSize: '1rem',
                    color: 'rgba(255,255,255,0.7)',
                    margin: '0 0 2rem 0',
                    textAlign: 'center'
                  }}>
                    Your payment is being verified by our team
                  </p>

                  <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    maxWidth: '520px',
                    width: '100%',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                    overflow: 'hidden',
                    marginBottom: '2rem'
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                      borderBottom: '3px solid #f59e0b',
                      padding: isMobile ? '1.25rem' : '1.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#ffffff',
                        padding: '0.5rem 1rem',
                        borderRadius: '50px',
                        marginBottom: '0.75rem'
                      }}>
                        <div style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#f59e0b',
                          animation: 'blink 1.5s infinite'
                        }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>
                          {freezePaymentStatus === 'under_review' ? 'Under Review' : 'Pending Verification'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0 }}>
                        Estimated processing time: a few hours
                      </p>
                    </div>

                    <div style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>📄</span>
                        Payment Details
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600', textTransform: 'uppercase' }}>Submitted</p>
                          <p style={{ fontSize: '0.95rem', color: '#1e293b', margin: 0, fontWeight: '500' }}>
                            {freezePaymentData.submitted_at ? new Date(freezePaymentData.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A'}
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600', textTransform: 'uppercase' }}>Amount</p>
                          <p style={{ fontSize: '0.95rem', color: '#059669', margin: 0, fontWeight: '700' }}>
                            ${freezePaymentData.amount ? parseFloat(freezePaymentData.amount).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                          </p>
                        </div>
                        <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600', textTransform: 'uppercase' }}>Payment Method</p>
                          <p style={{ fontSize: '0.95rem', color: '#1e293b', margin: 0, fontWeight: '500', textTransform: 'capitalize' }}>{freezePaymentData.method || 'N/A'}</p>
                        </div>
                        {freezePaymentData.crypto_type && (
                          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600', textTransform: 'uppercase' }}>Cryptocurrency</p>
                            <p style={{ fontSize: '0.95rem', color: '#1e293b', margin: 0, fontWeight: '500' }}>{freezePaymentData.crypto_type} ({freezePaymentData.network})</p>
                          </div>
                        )}
                        {freezePaymentData.tx_hash && (
                          <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: isMobile ? '1' : '1 / -1' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '600', textTransform: 'uppercase' }}>Transaction Hash</p>
                            <p style={{ fontSize: '0.8rem', color: '#1e293b', margin: 0, fontWeight: '500', wordBreak: 'break-all', fontFamily: 'monospace' }}>{freezePaymentData.tx_hash}</p>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: '1.5rem', backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', borderRadius: '8px', padding: '1rem 1.25rem' }}>
                        <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
                          <strong>What happens next?</strong><br />
                          Our verification team is reviewing your payment. Once confirmed, your account will be unfrozen and you'll receive an email notification.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => router.push('/dashboard')} style={{ maxWidth: '520px', width: '100%', padding: '1rem', backgroundColor: '#1e293b', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    ← Back to Dashboard
                  </button>

                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(16, 185, 129, 0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 60px rgba(16, 185, 129, 0.6); } }
                    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                  `}} />
                </>
              ) : (
                <>
              <div style={{
                width: isMobile ? '80px' : '100px',
                height: isMobile ? '80px' : '100px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
                border: '4px solid #3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)'
              }}>
                <span style={{ fontSize: isMobile ? '2.5rem' : '3rem' }}>❄️</span>
              </div>

              <h2 style={{
                fontSize: isMobile ? '1.75rem' : '2.25rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: '0 0 0.5rem 0',
                textAlign: 'center'
              }}>
                Account Frozen
              </h2>
              <p style={{
                fontSize: '1rem',
                color: 'rgba(255,255,255,0.7)',
                margin: '0 0 2rem 0',
                textAlign: 'center'
              }}>
                Your withdrawal access has been temporarily restricted
              </p>

              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden',
                marginBottom: '2rem'
              }}>
                {freezeAmountRequired > 0 && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    borderBottom: '3px solid #dc2626',
                    padding: isMobile ? '1.25rem' : '1.5rem',
                    textAlign: 'center'
                  }}>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#991b1b',
                      margin: '0 0 0.5rem 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Amount Required to Lift Freeze
                    </p>
                    <p style={{
                      fontSize: isMobile ? '2rem' : '2.5rem',
                      fontWeight: '800',
                      color: '#dc2626',
                      margin: 0,
                      letterSpacing: '-0.02em'
                    }}>
                      {formatCurrency(freezeAmountRequired)}
                    </p>
                  </div>
                )}

                <div style={{ padding: isMobile ? '1.5rem' : '2rem' }}>
                  <div style={{
                    backgroundColor: '#fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem'
                  }}>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#92400e',
                      margin: '0 0 0.25rem 0',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Reason for Freeze
                    </p>
                    <p style={{
                      fontSize: '1rem',
                      color: '#78350f',
                      margin: 0,
                      fontWeight: '500',
                      lineHeight: '1.5'
                    }}>
                      {frozenReason}
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#1e293b',
                      margin: '0 0 1rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.25rem' }}>📋</span>
                      What This Means
                    </h4>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {[
                        'All withdrawals and pending transactions are currently suspended',
                        'The bank cannot withdraw the required amount from your existing balance due to regulatory compliance requirements',
                        'An external deposit or payment is required to resolve this hold',
                        'Once the required amount is received, your account will be restored within 24-48 hours'
                      ].map((item, idx) => (
                        <li key={idx} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.5rem 0',
                          fontSize: '0.9rem',
                          color: '#475569',
                          lineHeight: '1.5',
                          borderBottom: idx < 3 ? '1px solid #f1f5f9' : 'none'
                        }}>
                          <span style={{ color: '#3b82f6', fontWeight: '700', fontSize: '0.85rem', minWidth: '20px' }}>
                            {idx + 1}.
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {freezeAmountRequired > 0 && (
                      <button
                        onClick={() => router.push(`/freeze-payment?amount=${freezeAmountRequired}`)}
                        style={{
                          width: '100%',
                          padding: '1rem 1.5rem',
                          background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.4)'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>💳</span>
                        Pay Now - {formatCurrency(freezeAmountRequired)}
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/dashboard')}
                      style={{
                        width: '100%',
                        padding: '0.875rem',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Return to Dashboard
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '100%'
              }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.5rem 0' }}>
                  Need assistance? Our support team is here to help
                </p>
                <a href="mailto:support@theoaklinebank.com" style={{
                  color: '#60a5fa',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  textDecoration: 'none'
                }}>
                  support@theoaklinebank.com
                </a>
              </div>
                </>
              )}
            </div>
          </div>
        )}

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
                    {withdrawalForm.withdrawal_method === 'crypto_wallet' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>• Base Fee:</span>
                          <span>{formatCurrency(5.00)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                          <span>• Network Fee (1.5%):</span>
                          <span>{formatCurrency(parseFloat(withdrawalForm.amount) * 0.015)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span>Total Fee:</span>
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
                    <label style={styles.label}>Select Cryptocurrency Type</label>
                    <select
                      value={withdrawalForm.crypto_type}
                      onChange={(e) => setWithdrawalForm(prev => ({ 
                        ...prev, 
                        crypto_type: e.target.value,
                        network_type: '',
                        crypto_asset_id: ''
                      }))}
                      style={styles.select}
                    >
                      <option value="">Select Cryptocurrency Type...</option>
                      {cryptoTypes.map(crypto => (
                        <option key={crypto.value} value={crypto.value}>
                          {crypto.icon} {crypto.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {withdrawalForm.crypto_type && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Select Network</label>
                      {loadingNetworks ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
                          Loading available networks...
                        </div>
                      ) : availableNetworks.length === 0 ? (
                        <div style={{
                          padding: '1rem',
                          textAlign: 'center',
                          backgroundColor: '#fef2f2',
                          border: '2px solid #ef4444',
                          borderRadius: '8px',
                          color: '#991b1b',
                          fontSize: '0.9rem'
                        }}>
                          No networks available for {withdrawalForm.crypto_type}. Please contact support.
                        </div>
                      ) : (
                        <>
                          <select
                            value={withdrawalForm.network_type}
                            onChange={(e) => setWithdrawalForm(prev => ({ 
                              ...prev, 
                              network_type: e.target.value 
                            }))}
                            style={styles.select}
                          >
                            <option value="">Select Network...</option>
                            {availableNetworks.map(network => (
                              <option key={network.value} value={network.value}>
                                {network.icon} {network.label}
                              </option>
                            ))}
                          </select>
                          {withdrawalForm.network_type && (
                            <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                              Network: {withdrawalForm.network_type} • Min withdrawal: {availableNetworks.find(n => n.value === withdrawalForm.network_type)?.minDeposit || '0.001'} {withdrawalForm.crypto_type}
                            </small>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {withdrawalForm.crypto_type && withdrawalForm.network_type && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Wallet Address</label>
                      <input
                        type="text"
                        value={withdrawalForm.crypto_wallet_address}
                        onChange={(e) => setWithdrawalForm(prev => ({ ...prev, crypto_wallet_address: e.target.value }))}
                        style={styles.input}
                        placeholder={`Enter ${withdrawalForm.crypto_type} wallet address for ${withdrawalForm.network_type}`}
                      />
                      <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                        ⚠️ Please double-check the address and network. Cryptocurrency transactions cannot be reversed.
                      </small>
                    </div>
                  )}
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

                {withdrawalForm.withdrawal_method === 'crypto_wallet' && withdrawalForm.crypto_type && withdrawalForm.network_type && (
                  <>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Cryptocurrency</span>
                      <span style={styles.reviewValue}>
                        {cryptoTypes.find(c => c.value === withdrawalForm.crypto_type)?.label || withdrawalForm.crypto_type}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Network</span>
                      <span style={styles.reviewValue}>
                        {withdrawalForm.network_type}
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
                {withdrawalForm.withdrawal_method === 'crypto_wallet' && (
                  <>
                    <div style={{ ...styles.reviewRow, fontSize: '0.75rem', color: '#64748b', borderBottom: 'none', paddingBottom: '0.25rem' }}>
                      <span style={styles.reviewLabel}>• Base Fee</span>
                      <span style={styles.reviewValue}>{formatCurrency(5.00)}</span>
                    </div>
                    <div style={{ ...styles.reviewRow, fontSize: '0.75rem', color: '#64748b', paddingTop: '0.25rem' }}>
                      <span style={styles.reviewLabel}>• Network Fee (1.5%)</span>
                      <span style={styles.reviewValue}>{formatCurrency(parseFloat(withdrawalForm.amount) * 0.015)}</span>
                    </div>
                  </>
                )}
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Total Fee</span>
                  <span style={styles.reviewValue}>{formatCurrency(withdrawalForm.fee)}</span>
                </div>
                <div style={{ ...styles.reviewRow, borderTop: '2px solid #059669', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px' }}>
                  <span style={{ ...styles.reviewLabel, fontWeight: '700', color: '#065f46' }}>Total Deduction</span>
                  <span style={{ ...styles.reviewValue, color: '#059669', fontSize: '1.25rem' }}>{formatCurrency(withdrawalForm.total_amount)}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ ...styles.infoBox, borderColor: '#f59e0b', backgroundColor: '#fffbeb' }}>
                  <p style={{ fontSize: '0.875rem', color: '#78350f', marginBottom: '1rem' }}>
                    🔐 For security purposes, all withdrawals require email verification.
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