import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const QRCode = dynamic(() => import('react-qr-code').then(mod => mod.default), { ssr: false });

export default function CryptoDeposit() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPath, setProofPath] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientMessage, setInsufficientMessage] = useState('');
  const router = useRouter();

  // New states for processing and success modals
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const [depositForm, setDepositForm] = useState({
    account_id: '',
    account_number: '',
    crypto_type: '',
    network_type: '',
    amount: ''
  });

  const [fundingMode, setFundingMode] = useState(false);
  const [accountMinDeposit, setAccountMinDeposit] = useState(0);
  const [accountCurrentBalance, setAccountCurrentBalance] = useState(0);

  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkFeePercent, setNetworkFeePercent] = useState(0);
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [calculatedNetAmount, setCalculatedNetAmount] = useState(0);

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

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    if (depositForm.crypto_type) {
      fetchAvailableNetworks();
    } else {
      setAvailableNetworks([]);
    }
  }, [depositForm.crypto_type]);

  useEffect(() => {
    if (user && depositForm.crypto_type && depositForm.network_type && currentStep >= 2) {
      fetchWalletAddress();
    }
  }, [depositForm.crypto_type, depositForm.network_type, user, currentStep]);

  useEffect(() => {
    const amount = parseFloat(depositForm.amount) || 0;
    const feePercent = networkFeePercent || 0;

    const fee = amount * (feePercent / 100);
    const netAmount = amount - fee;

    setCalculatedFee(fee);
    setCalculatedNetAmount(Math.max(0, netAmount));
  }, [depositForm.amount, networkFeePercent]);

  const fetchAvailableNetworks = async () => {
    if (!depositForm.crypto_type) {
      setAvailableNetworks([]);
      return;
    }

    setLoadingNetworks(true);
    setMessage('');
    setMessageType('');

    try {
      const { data: cryptoAssets, error } = await supabase
        .from('crypto_assets')
        .select('network_type, confirmations_required, min_deposit, deposit_fee_percent')
        .eq('crypto_type', depositForm.crypto_type)
        .eq('status', 'active')
        .order('network_type');

      if (error) {
        console.error('Error fetching networks:', error);
        setMessage('Error loading available networks. Please try again.');
        setMessageType('error');
        setAvailableNetworks([]);
        return;
      }

      if (cryptoAssets && cryptoAssets.length > 0) {
        const networks = cryptoAssets.map(asset => ({
          value: asset.network_type,
          label: asset.network_type,
          confirmations: asset.confirmations_required || 3,
          minDeposit: asset.min_deposit || 0.001,
          fee: asset.deposit_fee_percent || 0,
          icon: networkIconMap[asset.network_type] || '🔹'
        }));
        setAvailableNetworks(networks);
      } else {
        setAvailableNetworks([]);
      }
    } catch (error) {
      console.error('Error fetching networks:', error);
      setMessage('Error loading networks. Please try again.');
      setMessageType('error');
      setAvailableNetworks([]);
    } finally {
      setLoadingNetworks(false);
    }
  };

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      // Check if we're in funding mode from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const accountId = urlParams.get('account_id');
      const mode = urlParams.get('mode');

      if (accountId && mode === 'funding') {
        setFundingMode(true);
      }

      // Fetch all user accounts (including pending_funding)
      const { data: userAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .in('status', ['active', 'approved', 'pending_funding'])
        .order('created_at');

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        setMessage('Error loading accounts. Please try again.');
        setMessageType('error');
      }

      setAccounts(userAccounts || []);

      // If funding mode, set the specific account and get its actual min_deposit from DB
      if (accountId && userAccounts) {
        const targetAccount = userAccounts.find(acc => acc.id === accountId);
        if (targetAccount) {
          // Use the actual min_deposit from the account record in the database
          const actualMinDeposit = parseFloat(targetAccount.min_deposit) || 0;
          const currentBalance = parseFloat(targetAccount.balance) || 0;

          console.log('Target account found:', {
            accountId: targetAccount.id,
            accountNumber: targetAccount.account_number,
            minDeposit: actualMinDeposit,
            currentBalance: currentBalance,
            status: targetAccount.status
          });

          setDepositForm(prev => ({ 
            ...prev, 
            account_id: targetAccount.id,
            account_number: targetAccount.account_number 
          }));
          setAccountCurrentBalance(currentBalance);
          setAccountMinDeposit(actualMinDeposit);

          // If this account doesn't actually need funding, redirect to dashboard
          if (actualMinDeposit === 0 || currentBalance >= actualMinDeposit) {
            setMessage('This account does not require a minimum deposit or is already funded.');
            setMessageType('info');
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          }
        } else {
          console.error('Account not found with ID:', accountId);
          setMessage('Account not found.');
          setMessageType('error');
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      } else if (userAccounts && userAccounts.length > 0) {
        setDepositForm(prev => ({ 
          ...prev, 
          account_id: userAccounts[0].id,
          account_number: userAccounts[0].account_number 
        }));
      }

      const { data: userDeposits } = await supabase
        .from('crypto_deposits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setDeposits(userDeposits || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletAddress = async () => {
    setLoadingWallet(true);
    setWalletAddress('');
    setMemo('');
    try {
      console.log('Fetching wallet for:', { 
        userId: user.id, 
        cryptoType: depositForm.crypto_type, 
        networkType: depositForm.network_type,
        fundingMode: fundingMode
      });

      let adminWallets;
      let adminError;

      if (fundingMode) {
        console.log('Funding mode: Fetching from generic wallet pool (user_id IS NULL)');
        const result = await supabase
          .from('admin_assigned_wallets')
          .select('crypto_type, network_type, wallet_address, memo')
          .is('user_id', null)
          .eq('crypto_type', depositForm.crypto_type)
          .eq('network_type', depositForm.network_type);

        adminWallets = result.data;
        adminError = result.error;
      } else {
        console.log('Regular mode: Fetching user-specific wallet');
        const result = await supabase
          .from('admin_assigned_wallets')
          .select('crypto_type, network_type, wallet_address, memo')
          .eq('user_id', user.id)
          .eq('crypto_type', depositForm.crypto_type)
          .eq('network_type', depositForm.network_type);

        adminWallets = result.data;
        adminError = result.error;
      }

      console.log('Admin wallets query result:', { adminWallets, adminError, fundingMode });

      if (adminError) {
        console.error('Error fetching admin wallets:', adminError);
        setMessage('Error loading wallet information. Please contact support.');
        setMessageType('error');
        return;
      }

      if (adminWallets && adminWallets.length > 0) {
        const wallet = fundingMode 
          ? adminWallets[Math.floor(Math.random() * adminWallets.length)]
          : adminWallets[0];

        if (wallet.wallet_address) {
          setWalletAddress(wallet.wallet_address);
          setMemo(wallet.memo || '');
          console.log('Wallet address found:', wallet.wallet_address, 'Memo:', wallet.memo);
          return;
        }
      }

      const walletType = fundingMode ? 'generic account opening' : 'user-specific';
      console.log(`No ${walletType} wallet assigned for this crypto/network combination`);
      setMessage(`No wallet assigned for ${depositForm.crypto_type} on ${depositForm.network_type}. Please contact support.`);
      setMessageType('error');
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setMessage('Unexpected error loading wallet. Please try again.');
      setMessageType('error');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleAccountChange = (e) => {
    const selectedAccount = accounts.find(acc => acc.id === e.target.value);
    if (selectedAccount) {
      setDepositForm({
        ...depositForm,
        account_id: selectedAccount.id,
        account_number: selectedAccount.account_number
      });
    }
  };

  const handleCryptoChange = (crypto) => {
    // Don't do anything if clicking the same crypto type again
    if (depositForm.crypto_type === crypto) {
      return;
    }

    setDepositForm({
      ...depositForm,
      crypto_type: crypto,
      network_type: ''
    });
    setWalletAddress('');
    setMemo('');
    setAvailableNetworks([]);

    // Auto-scroll to network section after selecting crypto type
    setTimeout(() => {
      const networkSection = document.getElementById('network-section');
      if (networkSection) {
        networkSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  const handleNetworkChange = (network) => {
    setDepositForm({
      ...depositForm,
      network_type: network
    });

    const selectedNetwork = availableNetworks.find(n => n.value === network);
    if (selectedNetwork) {
      setNetworkFeePercent(selectedNetwork.fee || 0);
    } else {
      setNetworkFeePercent(0);
    }

    setWalletAddress('');
    setMemo('');

    // Auto-scroll to network details section after selecting network
    setTimeout(() => {
      const networkDetailsSection = document.getElementById('network-details-section');
      if (networkDetailsSection) {
        networkDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  const handleNextStep = () => {
    setMessage('');
    setMessageType('');

    if (currentStep === 1) {
      if (!depositForm.account_id) {
        setMessage('Please select an account');
        setMessageType('error');
        return;
      }
      if (!depositForm.crypto_type) {
        setMessage('Please select a cryptocurrency');
        setMessageType('error');
        return;
      }
      if (!depositForm.network_type) {
        setMessage('Please select a network');
        setMessageType('error');
        return;
      }
      if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
        setMessage('Please enter a valid amount');
        setMessageType('error');
        return;
      }

      if (fundingMode && accountMinDeposit > 0) {
        const remainingNeeded = accountMinDeposit - accountCurrentBalance;
        const netAmount = calculatedNetAmount;
        const feePercent = networkFeePercent || 0;

        // Only show error if net amount is truly insufficient (with small tolerance for rounding)
        if (remainingNeeded > 0 && netAmount < (remainingNeeded - 0.01)) {
          const requiredGrossAmount = remainingNeeded / (1 - feePercent / 100);

          setInsufficientMessage(
            `To activate your account, you need at least $${remainingNeeded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to be credited after fees.\n\n` +
            `Your entered amount: $${parseFloat(depositForm.amount).toFixed(2)}\n` +
            `Network fee (${feePercent}%): -$${calculatedFee.toFixed(2)}\n` +
            `Amount after fees: $${netAmount.toFixed(2)}\n\n` +
            `Required: $${remainingNeeded.toFixed(2)}\n` +
            `Shortage: $${(remainingNeeded - netAmount).toFixed(2)}\n\n` +
            `You need to deposit at least $${requiredGrossAmount.toFixed(2)} (including the ${feePercent}% fee) to meet the minimum requirement.`
          );
          setShowInsufficientModal(true);
          return;
        }
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!walletAddress) {
        setMessage('Cannot proceed without an assigned wallet address');
        setMessageType('error');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Please upload a PNG, JPG, or PDF file');
      setMessageType('error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File size must be less than 5MB');
      setMessageType('error');
      return;
    }

    setProofFile(file);
    setUploadingProof(true);
    setMessage('');
    setMessageType('');

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('crypto-deposit-proofs')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        setMessage('Failed to upload proof. You can still submit without it.');
        setMessageType('error');
        setProofFile(null);
      } else {
        setProofPath(fileName);
        setMessage('Proof uploaded successfully');
        setMessageType('success');
        setTimeout(() => {
          if (messageType === 'success') {
            setMessage('');
            setMessageType('');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Failed to upload proof. You can still submit without it.');
      setMessageType('error');
      setProofFile(null);
    } finally {
      setUploadingProof(false);
    }
  };

  const removeProof = async () => {
    if (proofPath) {
      try {
        await supabase.storage.from('crypto-deposit-proofs').remove([proofPath]);
      } catch (error) {
        console.error('Error removing proof:', error);
      }
    }
    setProofFile(null);
    setProofPath('');
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    setIsProcessing(true); // Show processing overlay
    setMessage('');
    setMessageType('');

    // Validate that either transaction hash OR proof is provided
    if ((!txHash || txHash.trim().length < 10) && !proofPath) {
      setMessage('Please provide either a transaction hash OR upload proof of payment');
      setMessageType('error');
      setSubmitting(false);
      setIsProcessing(false); // Hide processing overlay
      return;
    }

    try {
      // Check for existing pending deposit in the correct table
      if (fundingMode) {
        const { data: existingDeposit, error: checkError } = await supabase
          .from('account_opening_crypto_deposits')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('account_id', depositForm.account_id)
          .in('status', ['pending', 'awaiting_confirmations', 'under_review'])
          .single();

        if (existingDeposit && !checkError) {
          setMessage('You already have a pending account activation deposit. Please wait for confirmation.');
          setMessageType('info');
          setSubmitting(false);
          setIsProcessing(false);
          return;
        }
      } else {
        const { data: existingDeposit, error: checkError } = await supabase
          .from('crypto_deposits')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('account_id', depositForm.account_id)
          .in('status', ['pending', 'processing', 'awaiting_confirmations'])
          .single();

        if (existingDeposit && !checkError) {
          setMessage('You already have a pending deposit for this account. Please wait for confirmation.');
          setMessageType('info');
          setSubmitting(false);
          setIsProcessing(false);
          return;
        }
      }

      // First, get the crypto_asset_id for this crypto_type and network_type
      const { data: cryptoAsset, error: assetError } = await supabase
        .from('crypto_assets')
        .select('id, confirmations_required')
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        throw new Error('Crypto asset configuration not found. Please contact support.');
      }

      // Get the wallet ID from admin_assigned_wallets
      const walletQuery = fundingMode 
        ? supabase.from('admin_assigned_wallets').select('id').is('user_id', null)
        : supabase.from('admin_assigned_wallets').select('id').eq('user_id', user.id);

      const { data: walletData } = await walletQuery
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type)
        .eq('wallet_address', walletAddress)
        .single();

      // Get application_id if in funding mode
      let applicationId = null;
      if (fundingMode) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('application_id')
          .eq('id', depositForm.account_id)
          .single();

        applicationId = accountData?.application_id;
      }

      let data;
      let error;

      if (fundingMode) {
        // For account opening, save to account_opening_crypto_deposits
        const result = await supabase
          .from('account_opening_crypto_deposits')
          .insert([{
            user_id: user.id,
            application_id: applicationId,
            account_id: depositForm.account_id,
            crypto_asset_id: cryptoAsset.id,
            assigned_wallet_id: walletData?.id,
            amount: parseFloat(depositForm.amount),
            fee: parseFloat(calculatedFee.toFixed(2)),
            required_amount: accountMinDeposit,
            status: 'pending',
            confirmations: 0,
            required_confirmations: cryptoAsset.confirmations_required || 3,
            tx_hash: txHash.trim() || null,
            proof_path: proofPath || null,
            metadata: {
              wallet_address: walletAddress,
              memo: memo || null,
              deposit_source: 'account_opening_page',
              funding_mode: true,
              crypto_type: depositForm.crypto_type,
              network_type: depositForm.network_type,
              fee_percent: networkFeePercent,
              has_proof: !!proofPath,
              has_tx_hash: !!txHash
            }
          }])
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        // For regular deposits, save to crypto_deposits
        const result = await supabase
          .from('crypto_deposits')
          .insert([{
            user_id: user.id,
            account_id: depositForm.account_id,
            crypto_asset_id: cryptoAsset.id,
            amount: parseFloat(depositForm.amount),
            fee: parseFloat(calculatedFee.toFixed(2)),
            status: 'pending',
            purpose: 'general_deposit',
            confirmations: 0,
            required_confirmations: cryptoAsset.confirmations_required || 3,
            tx_hash: txHash.trim() || null,
            proof_path: proofPath || null,
            metadata: {
              wallet_address: walletAddress,
              memo: memo || null,
              deposit_source: 'user_deposit_page',
              crypto_type: depositForm.crypto_type,
              network_type: depositForm.network_type,
              fee_percent: networkFeePercent,
              has_proof: !!proofPath,
              has_tx_hash: !!txHash
            }
          }])
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Deposit insertion error:', error);
        throw new Error(error.message || 'Deposit submission failed');
      }

      if (!data || !data.id) {
        console.error('No data returned from deposit insertion');
        throw new Error('Failed to create deposit record');
      }

      // Send email notification
      try {
        const profileResponse = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const userProfile = profileResponse.data;
        const userEmail = userProfile?.email || user.email;
        const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Valued Customer';

        await fetch('/api/send-crypto-deposit-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            email: userEmail,
            userName: userName,
            cryptoType: getSelectedCrypto()?.label || depositForm.crypto_type,
            networkType: getSelectedNetwork()?.label || depositForm.network_type,
            amount: depositForm.amount,
            walletAddress: walletAddress,
            depositId: data.id,
            accountNumber: depositForm.account_number,
            isAccountOpening: fundingMode,
            minDeposit: fundingMode ? accountMinDeposit : null
          })
        });
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // Don't fail the deposit if email fails
      }

      // Create receipt data
      const receipt = {
        referenceNumber: String(data.id).substring(0, 8).toUpperCase(),
        date: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        accountNumber: depositForm.account_number,
        cryptoType: getSelectedCrypto()?.label || depositForm.crypto_type,
        cryptoSymbol: depositForm.crypto_type,
        network: getSelectedNetwork()?.label || depositForm.network_type,
        amount: formatCurrency(depositForm.amount),
        fee: formatCurrency(calculatedFee), // Include fee in receipt
        netAmount: formatCurrency(calculatedNetAmount), // Include net amount in receipt
        walletAddress: walletAddress,
        confirmations: getSelectedNetwork()?.confirmations || 3,
        status: 'Pending Confirmation',
        transactionId: data.id
      };

      setReceiptData(receipt);
      // Removed setShowReceipt(true); to use the new success modal
      // Instead, set state to show the success modal
      setShowSuccessModal(true);
      setIsProcessing(false); // Hide processing overlay

      // Update message and type for confirmation
      setMessage(fundingMode 
        ? 'Payment submitted! Your deposit is awaiting blockchain confirmation. You will be notified once confirmed.'
        : 'Payment submitted! Your deposit is awaiting blockchain confirmation.');
      setMessageType('success');

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage(error.message || 'Deposit submission failed. Please try again.');
      setMessageType('error');
      setIsProcessing(false); // Hide processing overlay on error
    } finally {
      setSubmitting(false);
    }
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard!');
    setMessageType('info');
    setTimeout(() => {
      if (messageType === 'info') {
        setMessage('');
        setMessageType('');
      }
    }, 2000);
  };

  const getSelectedCrypto = () => {
    return cryptoTypes.find(c => c.value === depositForm.crypto_type);
  };

  const getAvailableNetworks = () => {
    return availableNetworks;
  };

  const getSelectedNetwork = () => {
    return getAvailableNetworks().find(n => n.value === depositForm.network_type);
  };

  const printReceipt = () => {
    window.print();
  };

  const viewDepositReceipt = (deposit) => {
    // Extract crypto and network info from metadata if not directly available
    const cryptoType = deposit.metadata?.crypto_type || deposit.crypto_type || 'Bitcoin';
    const networkType = deposit.metadata?.network_type || deposit.network_type || 'N/A';
    const walletAddress = deposit.metadata?.wallet_address || deposit.wallet_address || 'N/A';

    // Get crypto and network details
    const cryptoInfo = cryptoTypes.find(c => c.value === cryptoType);

    // Get the account number from the deposit or from the accounts list
    let accountNumber = deposit.account_number;
    if (!accountNumber && deposit.account_id) {
      const account = accounts.find(acc => acc.id === deposit.account_id);
      accountNumber = account?.account_number || 'N/A';
    }

    const receipt = {
      referenceNumber: String(deposit.id).substring(0, 8).toUpperCase(),
      date: new Date(deposit.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }),
      accountNumber: accountNumber || 'N/A',
      cryptoType: cryptoInfo?.label || cryptoType,
      cryptoSymbol: cryptoType,
      network: networkType,
      amount: formatCurrency(deposit.amount),
      fee: formatCurrency(deposit.fee || 0),
      netAmount: formatCurrency(deposit.net_amount || deposit.amount),
      walletAddress: walletAddress,
      confirmations: deposit.required_confirmations || 3,
      status: deposit.status === 'pending' ? 'Pending Confirmation' : 
              deposit.status === 'awaiting_confirmations' ? 'Awaiting Confirmations' :
              deposit.status === 'confirmed' ? 'Confirmed' :
              deposit.status === 'completed' ? 'Completed & Credited' :
              deposit.status === 'approved' ? 'Approved & Credited' : 
              deposit.status === 'failed' ? 'Failed' :
              deposit.status === 'reversed' ? 'Reversed' : 'Under Review',
      transactionId: deposit.id
    };

    setReceiptData(receipt);
    setShowReceipt(true);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      width: '100%',
      maxWidth: '100vw',
      overflowX: 'hidden'
    },
    header: {
      backgroundColor: '#1e40af',
      color: 'white',
      padding: isMobile ? '0.75rem 1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      width: '100%',
      boxSizing: 'border-box'
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
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700'
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
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2.5rem 2rem',
      width: '100%',
      boxSizing: 'border-box'
    },
    welcomeSection: {
      marginBottom: '2rem'
    },
    welcomeTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '0.95rem' : '1.1rem',
      color: '#64748b'
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      backgroundColor: 'white',
      padding: isMobile ? '1.5rem 1rem' : '2rem',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
    },
    stepItem: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    },
    stepNumber: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '16px',
      position: 'relative',
      zIndex: 1,
      marginBottom: '0.5rem'
    },
    stepLabel: {
      fontSize: isMobile ? '0.75rem' : '0.9rem',
      textAlign: 'center',
      fontWeight: '500'
    },
    contentCard: {
      backgroundColor: 'white',
      borderRadius: isMobile ? '12px' : '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      marginBottom: isMobile ? '1rem' : '2rem',
      width: '100%',
      boxSizing: 'border-box'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.2rem' : '1.4rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1.5rem'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      marginBottom: '0.75rem',
      fontWeight: '600',
      color: '#374151',
      fontSize: '0.95rem'
    },
    select: {
      width: '100%',
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      fontSize: '0.95rem',
      backgroundColor: '#fff',
      cursor: 'pointer',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      appearance: 'none',
      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.75rem center',
      backgroundSize: '1.25em 1.25em',
      paddingRight: '2.5rem'
    },
    input: {
      width: '100%',
      padding: isMobile ? '0.75rem 0.875rem' : '0.875rem 1rem',
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      fontSize: isMobile ? '16px' : '0.95rem',
      backgroundColor: '#fff',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
      WebkitAppearance: 'none'
    },
    cryptoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1rem'
    },
    cryptoCard: {
      padding: '1.25rem',
      borderRadius: '12px',
      border: '2px solid',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
      userSelect: 'none'
    },
    cryptoIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: '700',
      color: '#fff'
    },
    cryptoName: {
      fontWeight: '600',
      color: '#1e293b',
      fontSize: '1rem',
      marginBottom: '0.25rem'
    },
    cryptoSymbol: {
      fontSize: '0.85rem',
      color: '#64748b'
    },
    networkGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: '1rem',
      marginTop: '0.5rem'
    },
    networkCard: {
      padding: '1.25rem',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      '&:hover': {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        transform: 'translateY(-2px)'
      }
    },
    networkHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.5rem'
    },
    networkIcon: {
      fontSize: '20px'
    },
    networkName: {
      fontWeight: '600',
      color: '#1e293b',
      fontSize: '0.95rem'
    },
    networkInfo: {
      fontSize: '0.8rem',
      color: '#64748b',
      marginLeft: '28px'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    button: {
      padding: isMobile ? '0.875rem 1.25rem' : '1rem 2rem',
      borderRadius: '8px',
      fontSize: isMobile ? '0.9rem' : '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      flex: 1,
      minHeight: '48px',
      touchAction: 'manipulation'
    },
    primaryButton: {
      backgroundColor: '#1e40af',
      color: 'white',
      boxShadow: '0 2px 8px rgba(30,64,175,0.3)'
    },
    secondaryButton: {
      backgroundColor: '#f8fafc',
      color: '#64748b',
      border: '2px solid #e2e8f0'
    },
    messageBox: {
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      fontSize: '0.95rem',
      fontWeight: '500'
    },
    walletCard: {
      backgroundColor: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '2rem',
      marginBottom: '1.5rem'
    },
    qrContainer: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '1.5rem'
    },
    qrBox: {
      padding: '1rem',
      backgroundColor: '#fff',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    },
    walletAddress: {
      padding: '1rem',
      backgroundColor: '#fff',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      wordBreak: 'break-all',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    warningBox: {
      backgroundColor: '#fef3c7',
      border: '2px solid #fbbf24',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    },
    warningContent: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start'
    },
    warningIcon: {
      fontSize: '28px'
    },
    warningTitle: {
      margin: '0 0 0.75rem 0',
      fontSize: '1rem',
      color: '#92400e',
      fontWeight: '600'
    },
    warningList: {
      margin: 0,
      paddingLeft: '20px',
      color: '#92400e',
      fontSize: '0.9rem',
      lineHeight: '1.6'
    },
    summaryCard: {
      backgroundColor: '#f8fafc',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    },
    summaryTitle: {
      fontSize: '0.85rem',
      color: '#64748b',
      fontWeight: '600',
      marginBottom: '1rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.75rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #e5e7eb'
    },
    summaryLabel: {
      color: '#64748b',
      fontSize: '0.95rem'
    },
    summaryValue: {
      color: '#1e293b',
      fontWeight: '600',
      fontSize: '0.95rem'
    },
    transactionsTable: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    tableHeader: {
      borderBottom: '2px solid #e5e7eb',
      textAlign: 'left'
    },
    th: {
      padding: '1rem',
      color: '#64748b',
      fontWeight: '600',
      fontSize: '0.85rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    td: {
      padding: '1rem',
      borderBottom: '1px solid #f3f4f6',
      fontSize: '0.9rem'
    },
    statusBadge: {
      padding: '0.4rem 0.875rem',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      fontSize: '1.2rem',
      color: '#64748b'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    },
    receiptOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '2px solid #e5e7eb',
      paddingBottom: '1.5rem',
      marginBottom: '1.5rem'
    },
    receiptTitle: {
      fontSize: '1.75rem',
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: '0.5rem'
    },
    receiptSubtitle: {
      fontSize: '0.95rem',
      color: '#64748b'
    },
    receiptSuccessBadge: {
      backgroundColor: '#ecfdf5',
      color: '#059669',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.875rem 0',
      borderBottom: '1px solid #f1f5f9'
    },
    receiptLabel: {
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      fontSize: '0.9rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right',
      maxWidth: '60%',
      wordBreak: 'break-word'
    },
    receiptHighlight: {
      backgroundColor: '#eff6ff',
      padding: '1rem',
      borderRadius: '8px',
      margin: '1rem 0',
      border: '1px solid #bfdbfe'
    },
    receiptButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    receiptButton: {
      flex: 1,
      padding: '0.875rem',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      border: 'none'
    },

    // New styles for processing and success modals
    processingOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    },
    processingCard: {
      backgroundColor: 'white',
      padding: '3rem 4rem',
      borderRadius: '20px',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      maxWidth: '400px'
    },
    processingTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    processingText: {
      fontSize: '1rem',
      color: '#64748b'
    },
    successOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
      padding: '1rem'
    },
    successModal: {
      backgroundColor: 'white',
      padding: '2.5rem',
      borderRadius: '20px',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      animation: 'slideIn 0.3s ease-out'
    },
    successIcon: {
      fontSize: '4rem',
      textAlign: 'center',
      marginBottom: '1rem'
    },
    successTitle: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#059669',
      textAlign: 'center',
      marginBottom: '1rem'
    },
    successMessage: {
      fontSize: '1.1rem',
      color: '#4a5568',
      textAlign: 'center',
      lineHeight: '1.6',
      marginBottom: '2rem'
    },
    successInfoBox: {
      backgroundColor: '#f7fafc',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '1.5rem'
    },
    receiptSectionTitle: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #e2e8f0'
    },
    successSteps: {
      backgroundColor: '#ecfdf5',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      border: '2px solid #10b981'
    },
    stepsTitle: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#065f46',
      marginBottom: '1rem'
    },
    successButtons: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center'
    },
    dashboardButton: {
      padding: '1rem 2rem',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
    },
    closeButton: {
      padding: '1rem 2rem',
      backgroundColor: '#f3f4f6',
      color: '#4a5568',
      border: 'none',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Head>
          <title>Add Funds via Cryptocurrency - Oakline Bank</title>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </Head>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Head>
        <title>Add Funds via Cryptocurrency - Oakline Bank</title>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-print, .receipt-print * {
              visibility: visible;
            }
            .receipt-print {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </Head>

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
        <div style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>
            {fundingMode && depositForm.account_id && accountMinDeposit > 0 && (accountMinDeposit - accountCurrentBalance) > 0
              ? 'Fund Your Account via Cryptocurrency' 
              : 'Add Funds via Cryptocurrency'}
          </h1>
          <p style={styles.welcomeSubtitle}>
            {fundingMode && depositForm.account_id && accountMinDeposit > 0 && (accountMinDeposit - accountCurrentBalance) > 0
              ? 'Complete the minimum deposit requirement below to activate your account'
              : 'Add funds to your account balance using cryptocurrency'}
          </p>
        </div>

        {/* Account Funding Banner - shown only in funding mode */}
        {fundingMode && depositForm.account_id && accountMinDeposit > 0 && (accountMinDeposit - accountCurrentBalance) > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0
              }}>
                💳
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  color: 'white', 
                  fontSize: '15px', 
                  fontWeight: '600',
                  margin: '0 0 4px 0'
                }}>
                  Account Activation Deposit
                </h3>
                <p style={{ 
                  color: 'white', 
                  fontSize: '13px',
                  margin: 0,
                  opacity: 0.9,
                  lineHeight: '1.4'
                }}>
                  Minimum required: ${formatCurrency((accountMinDeposit - accountCurrentBalance).toFixed(2))} to activate {depositForm.account_number}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={styles.progressSteps}>
          {[
            { num: 1, label: 'Deposit Details' },
            { num: 2, label: 'Send Payment' },
            { num: 3, label: 'Confirm' }
          ].map((step, index) => (
            <div key={step.num} style={styles.stepItem}>
              <div style={{
                ...styles.stepNumber,
                backgroundColor: currentStep >= step.num ? '#1e40af' : '#e5e7eb',
                color: currentStep >= step.num ? '#fff' : '#64748b'
              }}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span style={{
                ...styles.stepLabel,
                color: currentStep >= step.num ? '#1e293b' : '#64748b'
              }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {message && (
          <div style={{
            ...styles.messageBox,
            backgroundColor: 
              messageType === 'error' ? '#fef2f2' : 
              messageType === 'success' ? '#f0fdf4' : '#eff6ff',
            color:
              messageType === 'error' ? '#991b1b' : 
              messageType === 'success' ? '#166534' : '#1e40af',
            borderLeft: `4px solid ${
              messageType === 'error' ? '#dc2626' : 
              messageType === 'success' ? '#16a34a' : '#1e40af'
            }`
          }}>
            {message}
          </div>
        )}

        {currentStep === 1 && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Enter Deposit Information</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Account</label>
              <select
                value={depositForm.account_id}
                onChange={handleAccountChange}
                style={styles.select}
                required
                disabled={fundingMode}
              >
                {accounts.length === 0 && (
                  <option value="">No active accounts available</option>
                )}
                {accounts.map(account => {
                  const minDeposit = parseFloat(account.min_deposit) || 0;
                  const balance = parseFloat(account.balance) || 0;
                  const needsFunding = minDeposit > 0 && balance < minDeposit;

                  return (
                    <option key={account.id} value={account.id}>
                      {account.account_type.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                      {needsFunding ? ` - Needs $${(minDeposit - balance).toFixed(2)}` : ''}
                    </option>
                  );
                })}
              </select>
              {fundingMode && (
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Account pre-selected for minimum deposit requirement
                </p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Cryptocurrency</label>

              {/* Network Selection - appears first when crypto is selected */}
              {depositForm.crypto_type && (
                <div id="network-section" style={{
                  backgroundColor: '#f8fafc',
                  border: '2px solid #3b82f6',
                  borderRadius: '16px',
                  padding: '1.75rem',
                  marginTop: '1.5rem',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.15)'
                }}>
                <div style={{ 
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                  paddingBottom: '1rem',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <label style={{
                    ...styles.label,
                    fontSize: '1.1rem',
                    color: '#1e40af',
                    fontWeight: '700',
                    display: 'block',
                    marginBottom: '0.5rem'
                  }}>
                    Select Network <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <p style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    margin: '0.5rem 0 0 0'
                  }}>
                    Choose the blockchain network for your {depositForm.crypto_type} deposit
                  </p>
                </div>

                {loadingNetworks ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <div style={{ ...styles.spinner, margin: '0 auto 1rem' }} />
                    Loading available networks...
                  </div>
                ) : availableNetworks.length === 0 && !loadingNetworks ? (
                  <div style={{
                    padding: '1.5rem',
                    textAlign: 'center',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #fca5a5',
                    borderRadius: '12px',
                    color: '#991b1b',
                    fontSize: '0.9rem'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                    <strong>No networks available for {depositForm.crypto_type}</strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>Please contact support to enable this cryptocurrency.</p>
                  </div>
                ) : availableNetworks.length > 0 ? (
                  <>
                    <div style={{
                      backgroundColor: '#fffbeb',
                      border: '2px solid #fbbf24',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      fontSize: '0.85rem',
                      color: '#92400e',
                      lineHeight: '1.5'
                    }}>
                      <strong>⚠️ Important:</strong> Select the correct network for your {depositForm.crypto_type} deposit. Using the wrong network may result in permanent loss of funds.
                    </div>
                    <select
                      value={depositForm.network_type}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                      style={{
                        ...styles.select,
                        fontSize: '1.05rem',
                        fontWeight: '600',
                        padding: '1rem',
                        border: '2px solid #3b82f6',
                        backgroundColor: '#fff',
                        color: depositForm.network_type ? '#1e293b' : '#94a3b8'
                      }}
                      required
                    >
                      <option value="">Choose a network...</option>
                      {getAvailableNetworks().map(network => (
                        <option key={network.value} value={network.value}>
                          {network.icon} {network.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                </div>
              )}

              <div style={styles.cryptoGrid}>
                {cryptoTypes.map(crypto => {
                  const isSelected = depositForm.crypto_type === crypto.value;
                  return (
                    <div
                      key={crypto.value}
                      onClick={() => handleCryptoChange(crypto.value)}
                      style={{
                        ...styles.cryptoCard,
                        borderColor: isSelected ? '#1e40af' : '#e5e7eb',
                        backgroundColor: isSelected ? '#eff6ff' : '#fff',
                        boxShadow: isSelected 
                          ? '0 4px 12px rgba(30, 64, 175, 0.2)' 
                          : '0 2px 6px rgba(0,0,0,0.05)',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#94a3b8';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div style={{
                        ...styles.cryptoIcon,
                        backgroundColor: crypto.color,
                        boxShadow: `0 2px 8px ${crypto.color}40`
                      }}>
                        {crypto.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={styles.cryptoName}>{crypto.label}</div>
                        <div style={styles.cryptoSymbol}>{crypto.value}</div>
                      </div>
                      {isSelected && (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: '#1e40af',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: '700'
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {depositForm.network_type && getSelectedNetwork() && (
              <div id="network-details-section" style={{
                backgroundColor: '#f0f9ff',
                border: '2px solid #3b82f6',
                borderRadius: '16px',
                padding: '2rem',
                marginTop: '1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}>
                <div style={{ 
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #bfdbfe'
                }}>
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '0.5rem'
                  }}>
                    {getSelectedNetwork().icon}
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#1e40af',
                    marginBottom: '0.25rem'
                  }}>
                    {getSelectedNetwork().label}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: '#64748b'
                  }}>
                    Network Details & Fees
                  </p>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                  gap: '1.25rem'
                }}>
                  <div style={{
                    backgroundColor: '#fff',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8rem', 
                      color: '#64748b', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.5rem'
                    }}>
                      Confirmations Required
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.75rem', 
                      fontWeight: '700', 
                      color: '#1e40af' 
                    }}>
                      {getSelectedNetwork().confirmations}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: '#fff',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px solid #bfdbfe',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8rem', 
                      color: '#64748b', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.5rem'
                    }}>
                      Minimum Deposit
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.25rem', 
                      fontWeight: '700', 
                      color: '#1e40af',
                      wordBreak: 'break-word'
                    }}>
                      {getSelectedNetwork().minDeposit} {depositForm.crypto_type}
                    </p>
                  </div>

                  <div style={{
                    backgroundColor: getSelectedNetwork().fee > 0 ? '#fef2f2' : '#f0fdf4',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: getSelectedNetwork().fee > 0 ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                    textAlign: 'center'
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.8rem', 
                      color: '#64748b', 
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '0.5rem'
                    }}>
                      Network Fee
                    </p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.75rem', 
                      fontWeight: '700', 
                      color: getSelectedNetwork().fee > 0 ? '#dc2626' : '#16a34a'
                    }}>
                      {getSelectedNetwork().fee > 0 ? `${getSelectedNetwork().fee}%` : 'Free'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div id="amount-section" style={styles.formGroup}>
              <label style={styles.label}>Amount (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.1rem',
                  color: '#64748b',
                  fontWeight: '600'
                }}>
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder="0.00"
                  style={{
                    ...styles.input,
                    paddingLeft: '2.5rem'
                  }}
                  required
                />
              </div>
              {fundingMode && depositForm.account_id && accountMinDeposit > 0 && (accountMinDeposit - accountCurrentBalance) > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const remainingNeeded = accountMinDeposit - accountCurrentBalance;
                      const feePercent = networkFeePercent || 0;
                      // Calculate gross amount needed to get the net amount after fees
                      // Add a tiny buffer (0.01) to ensure we meet the minimum even with rounding
                      const requiredGrossAmount = (remainingNeeded / (1 - feePercent / 100)) + 0.01;
                      setDepositForm({ ...depositForm, amount: Math.ceil(requiredGrossAmount * 100) / 100 });
                    }}
                    disabled={!depositForm.network_type}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: depositForm.network_type ? '#059669' : '#9ca3af',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: depositForm.network_type ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      boxShadow: depositForm.network_type ? '0 2px 4px rgba(5, 150, 105, 0.2)' : 'none',
                      opacity: depositForm.network_type ? 1 : 0.6
                    }}
                    onMouseOver={(e) => {
                      if (depositForm.network_type) {
                        e.target.style.backgroundColor = '#047857';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (depositForm.network_type) {
                        e.target.style.backgroundColor = '#059669';
                      }
                    }}
                  >
                    💡 Auto-Fill Amount (Includes Fees)
                  </button>
                  <p style={{ fontSize: '0.8rem', color: depositForm.network_type ? '#059669' : '#6b7280', marginTop: '0.5rem', fontWeight: '500' }}>
                    {depositForm.network_type 
                      ? `✓ Click to auto-fill the amount needed including ${networkFeePercent}% network fee`
                      : '⚠️ Please select a network first to calculate the required amount with fees'
                    }
                  </p>
                </div>
              )}
              {depositForm.network_type && getSelectedNetwork() && (
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Network: {getSelectedNetwork().label} • {getSelectedNetwork().confirmations} confirmations required
                </p>
              )}
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={handleNextStep}
                disabled={accounts.length === 0}
                style={{
                  ...styles.button,
                  ...styles.primaryButton,
                  opacity: accounts.length === 0 ? 0.5 : 1,
                  cursor: accounts.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div style={styles.contentCard}>
            <h2 style={styles.sectionTitle}>Send {getSelectedCrypto()?.label} Payment</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Send exactly {formatCurrency(parseFloat(depositForm.amount))} worth of {depositForm.crypto_type} via <strong>{getSelectedNetwork()?.label}</strong>
            </p>

            {loadingWallet ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                <div style={{ ...styles.spinner, margin: '0 auto 1rem' }} />
                Loading wallet address...
              </div>
            ) : walletAddress ? (
              <>
                <div style={styles.walletCard}>
                  <div style={styles.qrContainer}>
                    <div style={styles.qrBox}>
                      <QRCode value={walletAddress} size={200} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ 
                      fontSize: '0.85rem', 
                      color: '#64748b',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      {getSelectedNetwork()?.label || depositForm.network_type} WALLET ADDRESS
                    </p>
                    <div style={styles.walletAddress}>
                      {walletAddress}
                    </div>
                    <button
                      onClick={() => copyToClipboard(walletAddress)}
                      style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        flex: 'none',
                        padding: '0.75rem 1.5rem',
                        marginBottom: memo ? '1rem' : '0'
                      }}
                    >
                      📋 Copy Address
                    </button>

                    {memo && (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ 
                          fontSize: '0.85rem', 
                          color: '#64748b',
                          marginBottom: '0.5rem',
                          fontWeight: '500'
                        }}>
                          MEMO / TAG (REQUIRED)
                        </p>
                        <div style={{
                          ...styles.walletAddress,
                          backgroundColor: '#fef3c7',
                          border: '2px solid #fbbf24',
                          fontWeight: '600'
                        }}>
                          {memo}
                        </div>
                        <button
                          onClick={() => copyToClipboard(memo)}
                          style={{
                            ...styles.button,
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            flex: 'none',
                            padding: '0.75rem 1.5rem'
                          }}
                        >
                          📋 Copy Memo
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.warningBox}>
                  <div style={styles.warningContent}>
                    <div style={styles.warningIcon}>⚠️</div>
                    <div>
                      <h3 style={styles.warningTitle}>Important Instructions</h3>
                      <ul style={styles.warningList}>
                        <li><strong>Make sure you deposit on the {getSelectedNetwork()?.label || depositForm.network_type} network</strong></li>
                        {memo && (
                          <li><strong style={{ color: '#dc2626' }}>YOU MUST INCLUDE THE MEMO/TAG OR YOUR DEPOSIT WILL BE LOST</strong></li>
                        )}
                        <li>Deposits on the wrong chain may be permanently lost</li>
                        <li>Send only {getSelectedCrypto()?.value || depositForm.crypto_type} to this address</li>
                        <li>Minimum deposit: {getSelectedNetwork()?.minDeposit || '0.001'} {depositForm.crypto_type}</li>
                        <li>Required confirmations: {getSelectedNetwork()?.confirmations || 3}</li>
                        {getSelectedNetwork()?.fee > 0 && (
                          <li>Network fee: {getSelectedNetwork()?.fee}%</li>
                        )}
                        <li>Once sent, click "I've Sent the Payment" below</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginTop: '2rem',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e40af',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    💡 Need to buy cryptocurrency?
                  </h3>
                  <p style={{ 
                    color: '#1e40af', 
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    lineHeight: '1.5'
                  }}>
                    If you don't have crypto yet, you can purchase it from these trusted providers:
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem'
                  }}>
                    <a
                      href="https://www.coinbase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#1652f0',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🟦 Coinbase
                    </a>
                    <a
                      href="https://www.binance.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#f3ba2f',
                        color: '#000',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🟨 Binance
                    </a>
                    <a
                      href="https://www.kraken.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#5741d9',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🟪 Kraken
                    </a>
                    <a
                      href="https://www.moonpay.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#7B3FE4',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🟣 MoonPay
                    </a>
                    <a
                      href="https://global.transak.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#1A5AFF',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🔵 Transak
                    </a>
                    <a
                      href="https://alchemypay.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#00C3FF',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      💠 AlchemyPay
                    </a>
                    <a
                      href="https://ramp.network"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#05C77E',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🟢 Ramp
                    </a>
                    <a
                      href="https://www.mercuryo.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#00D4AA',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🌐 Mercuryo
                    </a>
                    <a
                      href="https://www.simplex.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#3D5AFE',
                        color: 'white',
                        padding: '0.65rem 1rem',
                        fontSize: '0.85rem',
                        textDecoration: 'none',
                        textAlign: 'center'
                      }}
                    >
                      🔷 Simplex
                    </a>
                  </div>
                  <p style={{ 
                    color: '#64748b', 
                    marginTop: '0.75rem',
                    fontSize: '0.8rem',
                    fontStyle: 'italic'
                  }}>
                    After purchasing, send the crypto to the wallet address shown above.
                  </p>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{
                      ...styles.button,
                      ...styles.secondaryButton
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton
                    }}
                  >
                    I've Sent the Payment →
                  </button>
                </div>
              </>
            ) : (
              <div style={{
                ...styles.warningBox,
                textAlign: 'center',
                padding: '3rem 2rem'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={styles.warningTitle}>No Wallet Assigned for This Network</h3>
                <p style={{ color: '#92400e', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  You don't have a {getSelectedCrypto()?.value} wallet assigned for {getSelectedNetwork()?.label} yet. Please contact our support team.
                </p>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    flex: 'none',
                    padding: '0.75rem 1.5rem'
                  }}
                >
                  ← Go Back
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={styles.contentCard}>
            <div style={{
              backgroundColor: '#1e40af',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ fontSize: '28px', flexShrink: 0 }}>ℹ️</div>
                <div>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#ffffff',
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}>
                    Transaction Hash Not Available?
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    color: '#ffffff',
                    lineHeight: '1.6'
                  }}>
                    If you made your payment through an online cryptocurrency exchange platform (such as Coinbase, Binance, Kraken, etc.) and are unable to locate the transaction hash, you may upload a screenshot of your transaction confirmation page displaying the payment details. Our Cryptocurrency Verification Department will review and process your deposit accordingly.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#ecfdf5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '40px'
              }}>
                ✓
              </div>
              <h2 style={styles.sectionTitle}>Confirm Your Payment</h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Please provide verification of your payment below. You can enter the transaction hash OR upload proof of payment - whichever is easier for you.
              </p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Deposit Summary</h3>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Account Number</span>
                <span style={{
                  ...styles.summaryValue,
                  fontFamily: 'monospace'
                }}>
                  {depositForm.account_number}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Cryptocurrency</span>
                <span style={styles.summaryValue}>
                  {getSelectedCrypto()?.label} ({getSelectedCrypto()?.value})
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Network</span>
                <span style={styles.summaryValue}>
                  {getSelectedNetwork()?.label}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Deposit Address</span>
                <span style={{
                  ...styles.summaryValue,
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  wordBreak: 'break-all'
                }}>
                  {walletAddress}
                </span>
              </div>
              {memo && (
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Memo/Tag</span>
                  <span style={{
                    ...styles.summaryValue,
                    fontFamily: 'monospace',
                    color: '#f59e0b',
                    fontWeight: '700'
                  }}>
                    {memo}
                  </span>
                </div>
              )}
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Required Confirmations</span>
                <span style={styles.summaryValue}>
                  {getSelectedNetwork()?.confirmations}
                </span>
              </div>

              <div style={{
                borderTop: '2px solid #e5e7eb',
                marginTop: '1rem',
                paddingTop: '1rem'
              }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: '#1e293b'
                }}>
                  Transaction Breakdown
                </h4>
                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Deposit Amount</span>
                  <span style={styles.summaryValue}>
                    {formatCurrency(depositForm.amount)}
                  </span>
                </div>
                <div style={styles.summaryRow}>
                  <span style={{...styles.summaryLabel, color: '#dc2626' }}>
                    Network Fee ({networkFeePercent}%)
                  </span>
                  <span style={{...styles.summaryValue, color: '#dc2626' }}>
                    -{formatCurrency(calculatedFee)}
                  </span>
                </div>
                <div style={{
                  ...styles.summaryRow,
                  borderBottom: 'none',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem',
                  borderTop: '2px solid #e5e7eb'
                }}>
                  <span style={{
                    ...styles.summaryLabel,
                    fontSize: '1rem',
                    fontWeight: '700'
                  }}>
                    You Will Receive
                  </span>
                  <span style={{
                    ...styles.summaryValue,
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#059669'
                  }}>
                    {formatCurrency(calculatedNetAmount)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff7ed',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '1.5rem',
              marginTop: '2rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: '700',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📝 Payment Verification
              </h4>

              <div style={{
                backgroundColor: '#1e40af',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#ffffff',
                  margin: 0,
                  lineHeight: '1.5'
                }}>
                  💡 <strong>Flexible Verification Options:</strong> You may provide either the transaction hash from your cryptocurrency wallet <strong>OR</strong> upload a screenshot or confirmation document of your payment. For transactions initiated through online exchange platforms (such as Coinbase, Binance, etc.), a screenshot displaying your transaction details is acceptable.
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Transaction Hash / TX ID <span style={{ color: '#64748b', fontWeight: 'normal' }}>(Optional if uploading proof)</span>
                </label>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  Please enter your transaction hash if available. This identifier can typically be located in your wallet's transaction history and appears in formats such as "0x..." or "bc1..." depending on the blockchain network.
                </p>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Example: 0xabc123... or bc1qm4v... (optional if uploading proof)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    border: txHash.length > 0 && txHash.length < 10 && !proofPath ? '2px solid #dc2626' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {txHash.length > 0 && txHash.length < 10 && !proofPath && (
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Transaction hash seems too short. Consider uploading proof of payment instead.
                  </p>
                )}
              </div>

              <div style={{
                textAlign: 'center',
                padding: '0.5rem',
                fontSize: '0.85rem',
                color: '#64748b',
                fontWeight: '600'
              }}>
                - OR -
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Proof of Payment <span style={{ color: '#64748b', fontWeight: 'normal' }}>(Optional if you provided TX hash)</span>
                </label>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  Upload a screenshot or confirmation document from your cryptocurrency exchange platform (Coinbase, Binance, etc.). Accepted file formats: PNG, JPG, or PDF (maximum file size: 5MB). This documentation enables our Verification Department to efficiently process your deposit.
                </p>
                {!proofFile ? (
                  <label style={{
                    display: 'inline-block',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f3f4f6',
                    border: '2px dashed #9ca3af',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#4b5563',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}>
                    📎 Choose File
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,application/pdf"
                      onChange={handleProofUpload}
                      disabled={uploadingProof}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #10b981',
                    borderRadius: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', color: '#065f46', fontWeight: '600' }}>
                        ✓ {proofFile.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                        {(proofFile.size / 1024).toFixed(2)} KB
                      </div>
                    </div>
                    <button
                      onClick={removeProof}
                      disabled={uploadingProof}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {uploadingProof && (
                  <p style={{ color: '#3b82f6', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Uploading...
                  </p>
                )}
              </div>
            </div>

            <div style={{
              backgroundColor: '#1e40af',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: '1.25rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>🔒</div>
                <div>
                  <h4 style={{ 
                    margin: '0 0 0.5rem 0', 
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: '700'
                  }}>
                    Secure Transaction Verification
                  </h4>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.85rem', 
                    color: '#ffffff',
                    lineHeight: '1.5'
                  }}>
                    By clicking "Confirm Payment", you certify that you have transmitted {formatCurrency(depositForm.amount)} worth of {getSelectedCrypto()?.value} to the designated address above via the {getSelectedNetwork()?.label} network. Our Cryptocurrency Verification Department will authenticate your {txHash ? 'transaction hash' : 'proof of payment'} and credit your account upon confirmation.
                  </p>
                </div>
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={submitting}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  opacity: submitting ? 0.5 : 1
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                style={{
                  ...styles.button,
                  backgroundColor: submitting ? '#9ca3af' : '#10b981',
                  color: 'white',
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {submitting ? (
                  <>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '8px',
                      verticalAlign: 'middle'
                    }} />
                    Processing Transaction...
                  </>
                ) : '✓ Confirm Payment'}
              </button>
            </div>

            <div style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px'
            }}>
              <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#92400e',
                lineHeight: '1.5',
                textAlign: 'center'
              }}>
                ⏱️ <strong>Processing Time:</strong> Your deposit will be credited after {getSelectedNetwork()?.confirmations} network confirmations (typically 15-60 minutes). You'll receive email updates throughout the process.
              </p>
            </div>

            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              textAlign: 'center',
              fontSize: '0.75rem',
              color: '#64748b',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{ margin: '0.25rem 0' }}>
                🔐 <strong>Security Notice:</strong> Oakline Bank will never ask you to send cryptocurrency to a different address via email or phone.
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                Need help? Contact our Crypto Support: <a href="mailto:crypto@theoaklinebank.com" style={{ color: '#1e40af', textDecoration: 'none', fontWeight: '600' }}>crypto@theoaklinebank.com</a>
              </p>
            </div>
          </div>
        )}

        {deposits.length > 0 && (
          <div style={styles.contentCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={styles.sectionTitle}>Recent Deposits</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                💡 Click any row to view full receipt
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.transactionsTable}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Cryptocurrency</th>
                    <th style={styles.th}>Network</th>
                    <th style={styles.th}>Account</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Gross Amount</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Fee</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Net Amount</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => {
                    // Extract crypto and network info from metadata if not directly available
                    const cryptoType = deposit.metadata?.crypto_type || deposit.crypto_type || 'Bitcoin';
                    const networkType = deposit.metadata?.network_type || deposit.network_type || 'N/A';

                    const cryptoInfo = cryptoTypes.find(c => c.value === cryptoType);
                    const networkIcon = networkIconMap[networkType] || '🔹';

                    return (
                      <tr 
                        key={deposit.id}
                        onClick={() => viewDepositReceipt(deposit)}
                        style={{ 
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ ...styles.td, fontSize: '0.85rem' }}>
                          {formatDate(deposit.created_at)}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: cryptoInfo?.color || '#64748b',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              fontWeight: '700',
                              boxShadow: `0 2px 6px ${cryptoInfo?.color || '#64748b'}30`
                            }}>
                              {cryptoInfo?.icon || '₿'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600' }}>
                                {cryptoInfo?.label || cryptoType}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {cryptoType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ ...styles.td }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>{networkIcon}</span>
                            <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '500' }}>
                              {networkType}
                            </span>
                          </div>
                        </td>
                        <td style={{ ...styles.td, fontFamily: 'monospace', color: '#1e293b', fontSize: '0.85rem', fontWeight: '500' }}>
                          {deposit.account_number}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', fontSize: '0.9rem', color: '#1e293b' }}>
                          {formatCurrency(deposit.amount)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', color: '#dc2626', fontSize: '0.85rem', fontWeight: '500' }}>
                          {deposit.fee ? `-${formatCurrency(deposit.fee)}` : '$0.00'}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: '700', color: '#059669', fontSize: '0.95rem' }}>
                          {formatCurrency(deposit.net_amount || deposit.amount)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: 
                              deposit.status === 'pending' ? '#fef3c7' :
                              deposit.status === 'on_hold' ? '#fef3c7' :
                              deposit.status === 'awaiting_confirmations' ? '#fef3c7' :
                              deposit.status === 'processing' ? '#fef3c7' :
                              deposit.status === 'confirmed' ? '#d1fae5' :
                              deposit.status === 'completed' ? '#d1fae5' :
                              deposit.status === 'approved' ? '#d1fae5' :
                              deposit.status === 'failed' ? '#fee2e2' :
                              deposit.status === 'reversed' ? '#fee2e2' : '#fee2e2',
                            color:
                              deposit.status === 'pending' ? '#92400e' :
                              deposit.status === 'on_hold' ? '#92400e' :
                              deposit.status === 'awaiting_confirmations' ? '#92400e' :
                              deposit.status === 'processing' ? '#92400e' :
                              deposit.status === 'confirmed' ? '#065f46' :
                              deposit.status === 'completed' ? '#065f46' :
                              deposit.status === 'approved' ? '#065f46' :
                              deposit.status === 'failed' ? '#991b1b' :
                              deposit.status === 'reversed' ? '#991b1b' : '#991b1b'
                          }}>
                            {deposit.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDepositReceipt(deposit);
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#1e40af',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e3a8a'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e40af'}
                          >
                            📄 View Receipt
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Insufficient Deposit Modal */}
      {showInsufficientModal && (
        <div style={styles.receiptOverlay}>
          <div style={{
            ...styles.receipt,
            maxWidth: '500px',
            padding: '2rem'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                fontSize: '40px'
              }}>
                ⚠️
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#dc2626',
                marginBottom: '0.5rem'
              }}>
                Insufficient Deposit Amount
              </h2>
            </div>

            <div style={{
              backgroundColor: '#fef2f2',
              border: '2px solid #fca5a5',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#991b1b',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                margin: 0,
                whiteSpace: 'pre-line'
              }}>
                {insufficientMessage}
              </p>
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#1e40af',
                fontSize: '0.85rem',
                margin: 0,
                lineHeight: '1.5'
              }}>
                💡 <strong>Tip:</strong> Use the "Auto-Fill Amount (Includes Fees)" button below the amount field to automatically set the correct deposit amount.
              </p>
            </div>

            <button
              onClick={() => {
                setShowInsufficientModal(false);
                setInsufficientMessage('');
              }}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#1e3a8a'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#1e40af'}
            >
              Got It - Adjust Amount
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal for Recent Deposits */}
      {showReceipt && receiptData && (
        <div style={styles.receiptOverlay} onClick={() => setShowReceipt(false)}>
          <div className="receipt-print" style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <h2 style={styles.receiptTitle}>Deposit Receipt</h2>
              <p style={styles.receiptSubtitle}>Oakline Bank</p>
              <div style={styles.receiptSuccessBadge}>
                {receiptData.status === 'Completed & Credited' || receiptData.status === 'Approved & Credited' ? '✓' : '⏱️'} {receiptData.status}
              </div>
            </div>

            <div style={styles.receiptHighlight}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Reference Number</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontWeight: '700' }}>
                  {receiptData.referenceNumber}
                </span>
              </div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>{receiptData.date}</span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Account Number</span>
              <span style={{ ...styles.receiptValue, fontFamily: 'monospace' }}>
                {receiptData.accountNumber}
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Cryptocurrency</span>
              <span style={styles.receiptValue}>
                {receiptData.cryptoType} ({receiptData.cryptoSymbol})
              </span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Network</span>
              <span style={styles.receiptValue}>{receiptData.network}</span>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Wallet Address</span>
              <span style={{ 
                ...styles.receiptValue, 
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                wordBreak: 'break-all'
              }}>
                {receiptData.walletAddress}
              </span>
            </div>

            <div style={{
              borderTop: '2px solid #e5e7eb',
              marginTop: '1rem',
              paddingTop: '1rem'
            }}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Deposit Amount</span>
                <span style={styles.receiptValue}>{receiptData.amount}</span>
              </div>

              {receiptData.fee && parseFloat(receiptData.fee.replace(/[$,]/g, '')) > 0 && (
                <div style={styles.receiptRow}>
                  <span style={{ ...styles.receiptLabel, color: '#dc2626' }}>Network Fee</span>
                  <span style={{ ...styles.receiptValue, color: '#dc2626' }}>
                    -{receiptData.fee}
                  </span>
                </div>
              )}

              <div style={{
                ...styles.receiptRow,
                borderTop: '2px solid #e5e7eb',
                paddingTop: '0.75rem',
                marginTop: '0.5rem'
              }}>
                <span style={{ ...styles.receiptLabel, fontSize: '1rem', fontWeight: '700' }}>
                  Net Amount Credited
                </span>
                <span style={{ ...styles.receiptValue, fontSize: '1.25rem', fontWeight: '700', color: '#059669' }}>
                  {receiptData.netAmount}
                </span>
              </div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Confirmations Required</span>
              <span style={styles.receiptValue}>{receiptData.confirmations}</span>
            </div>

            <div style={styles.receiptButtons}>
              <button
                onClick={printReceipt}
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#1e40af',
                  color: 'white'
                }}
              >
                🖨️ Print
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#f3f4f6',
                  color: '#1e293b'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Receipt Modal - Using the new Success Modal */}
      {showSuccessModal && receiptData && (
        <div style={styles.successOverlay} onClick={() => setShowSuccessModal(false)}>
          <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Deposit Submitted Successfully!</h2>
            <p style={styles.successMessage}>
              Your cryptocurrency deposit has been received and is awaiting blockchain confirmation.
            </p>

            {/* Receipt Details */}
            <div style={styles.successInfoBox}>
              <h3 style={styles.receiptSectionTitle}>📋 Deposit Receipt</h3>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Reference Number:</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontWeight: '700' }}>
                  {receiptData.referenceNumber}
                </span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Date & Time:</span>
                <span style={styles.receiptValue}>{receiptData.date}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Account:</span>
                <span style={styles.receiptValue}>{receiptData.accountNumber}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Cryptocurrency:</span>
                <span style={styles.receiptValue}>{receiptData.cryptoType}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Network:</span>
                <span style={styles.receiptValue}>{receiptData.network}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Deposit Amount:</span>
                <span style={styles.receiptValue}>{receiptData.amount}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Network Fee:</span>
                <span style={styles.receiptValue}>{receiptData.fee}</span>
              </div>
              <div style={{...styles.receiptRow, borderTop: '2px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem'}}>
                <span style={{...styles.receiptLabel, fontWeight: '700', fontSize: '1rem'}}>You Will Receive:</span>
                <span style={{...styles.receiptValue, fontWeight: '700', fontSize: '1.25rem', color: '#059669'}}>{receiptData.netAmount}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Status:</span>
                <span style={{...styles.receiptValue, color: '#f59e0b', fontWeight: '600'}}>{receiptData.status}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Required Confirmations:</span>
                <span style={styles.receiptValue}>{receiptData.confirmations}</span>
              </div>
            </div>

            <div style={styles.successSteps}>
              <h3 style={styles.stepsTitle}>📧 Email Confirmation Sent</h3>
              <p style={{fontSize: '0.95rem', color: '#4a5568', lineHeight: '1.6', margin: 0}}>
                A confirmation email has been sent to your registered email address with all deposit details. 
                You'll receive another email once your deposit is confirmed on the blockchain (typically 15-60 minutes).
              </p>
            </div>

            <div style={styles.successButtons}>
              <button 
                onClick={() => router.push('/dashboard')} 
                style={styles.dashboardButton}
                onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'}
                onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'}
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => setShowSuccessModal(false)} 
                style={styles.closeButton}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}