import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const QRCode = dynamic(() => import('react-qr-code'), { ssr: false });

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
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
        setMessage(`No networks available for ${depositForm.crypto_type}. Please contact support.`);
        setMessageType('error');
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
      const minDeposit = urlParams.get('min_deposit');

      if (accountId && minDeposit) {
        setFundingMode(true);
        setAccountMinDeposit(parseFloat(minDeposit));
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
      }

      setAccounts(userAccounts || []);
      
      // If funding mode, set the specific account
      if (accountId && userAccounts) {
        const targetAccount = userAccounts.find(acc => acc.id === accountId);
        if (targetAccount) {
          setDepositForm(prev => ({ 
            ...prev, 
            account_id: targetAccount.id,
            account_number: targetAccount.account_number 
          }));
          setAccountCurrentBalance(parseFloat(targetAccount.balance) || 0);
          setAccountMinDeposit(parseFloat(targetAccount.min_deposit) || parseFloat(minDeposit) || 0);
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
        networkType: depositForm.network_type 
      });

      // Query admin_assigned_wallets table
      const { data: adminWallets, error: adminError } = await supabase
        .from('admin_assigned_wallets')
        .select('crypto_type, network_type, wallet_address, memo')
        .eq('user_id', user.id)
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type);

      console.log('Admin wallets query result:', { adminWallets, adminError });

      if (adminError) {
        console.error('Error fetching admin wallets:', adminError);
        setMessage('Error loading wallet information. Please contact support.');
        setMessageType('error');
        return;
      }

      if (adminWallets && adminWallets.length > 0) {
        const wallet = adminWallets[0];
        if (wallet.wallet_address) {
          setWalletAddress(wallet.wallet_address);
          setMemo(wallet.memo || '');
          console.log('Wallet address found:', wallet.wallet_address, 'Memo:', wallet.memo);
          return;
        }
      }

      console.log('No wallet assigned for this crypto/network combination');
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
    setDepositForm({
      ...depositForm,
      crypto_type: crypto,
      network_type: ''
    });
    setWalletAddress('');
    setMemo('');
    setAvailableNetworks([]);
  };

  const handleNetworkChange = (network) => {
    setDepositForm({
      ...depositForm,
      network_type: network
    });
    setWalletAddress('');
    setMemo('');
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
        const depositAmount = parseFloat(depositForm.amount);
        
        if (remainingNeeded > 0 && depositAmount < remainingNeeded) {
          setMessage(`To activate your account, you need to deposit at least $${remainingNeeded.toLocaleString('en-US', { minimumFractionDigits: 2 })}. Current deposit amount is too low.`);
          setMessageType('error');
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

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    setMessage('');
    setMessageType('');

    try {
      // First, get the crypto_asset_id for this crypto_type and network_type
      const { data: cryptoAsset, error: assetError } = await supabase
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type)
        .eq('status', 'active')
        .single();

      if (assetError || !cryptoAsset) {
        throw new Error('Crypto asset configuration not found. Please contact support.');
      }

      const { data, error } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_id: depositForm.account_id,
          crypto_asset_id: cryptoAsset.id,
          amount: parseFloat(depositForm.amount),
          status: 'pending',
          purpose: 'general_deposit',
          metadata: {
            wallet_address: walletAddress,
            deposit_source: 'user_deposit_page'
          }
        }])
        .select()
        .single();

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
            cryptoType: getSelectedCrypto().label,
            networkType: getSelectedNetwork()?.label,
            amount: depositForm.amount,
            walletAddress: walletAddress,
            depositId: data.id,
            accountNumber: depositForm.account_number
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
        cryptoType: getSelectedCrypto().label,
        cryptoSymbol: depositForm.crypto_type,
        network: getSelectedNetwork()?.label,
        amount: formatCurrency(depositForm.amount),
        walletAddress: walletAddress,
        confirmations: getSelectedNetwork()?.confirmations,
        status: 'Pending Confirmation',
        transactionId: data.id
      };

      setReceiptData(receipt);
      setShowReceipt(true);

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage(error.message || 'Deposit submission failed. Please try again.');
      setMessageType('error');
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
      accountNumber: deposit.account_number,
      cryptoType: cryptoTypes.find(c => c.value === deposit.crypto_type)?.label || deposit.crypto_type,
      cryptoSymbol: depositForm.crypto_type, // Updated to use the value from depositForm for consistency
      network: deposit.network_type || 'N/A',
      amount: formatCurrency(deposit.amount),
      walletAddress: deposit.wallet_address || 'N/A',
      confirmations: networkConfigs[deposit.crypto_type]?.find(n => n.value === deposit.network_type)?.confirmations || 'N/A',
      status: deposit.status === 'pending' ? 'Pending Confirmation' : 
              deposit.status === 'approved' ? 'Approved & Credited' : 'Rejected',
      transactionId: deposit.id
    };

    setReceiptData(receipt);
    setShowReceipt(true);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1e40af',
      color: 'white',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
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
      padding: isMobile ? '1.5rem 1rem' : '2.5rem 2rem'
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
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      marginBottom: '2rem'
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
      transition: 'border-color 0.2s'
    },
    input: {
      width: '100%',
      padding: '0.875rem 1rem',
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      fontSize: '0.95rem',
      backgroundColor: '#fff',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    cryptoGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1rem'
    },
    cryptoCard: {
      padding: '1rem',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
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
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    },
    networkCard: {
      padding: '1rem',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s'
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
      padding: '1rem 2rem',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: 'none',
      flex: 1
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
            {fundingMode ? 'Fund Your Account via Cryptocurrency' : 'Add Funds via Cryptocurrency'}
          </h1>
          <p style={styles.welcomeSubtitle}>
            {fundingMode 
              ? 'Complete the minimum deposit requirement below to activate your account'
              : 'Add funds to your account balance using cryptocurrency'}
          </p>
        </div>

        {fundingMode && accountMinDeposit > 0 && (
          <div style={{
            maxWidth: '800px',
            margin: '0 auto 2rem',
            padding: '0 2rem'
          }}>
            <div style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #fde68a',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <span style={{ fontSize: '2rem' }}>💰</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1.2rem' }}>
                  Minimum Deposit Required for Account Activation
                </h3>
                <div style={{ fontSize: '1rem', color: '#92400e', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#fffbeb', borderRadius: '6px' }}>
                  <strong>Account Number:</strong> {depositForm.account_number || 'Loading...'}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '0.5rem' }}>
                  <strong>Minimum Deposit Required:</strong> ${accountMinDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#92400e', marginBottom: '0.5rem' }}>
                  <strong>Current Balance:</strong> ${accountCurrentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                {(accountMinDeposit - accountCurrentBalance) > 0 && (
                  <div style={{ fontSize: '1rem', color: '#dc2626', fontWeight: '600', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #fde68a' }}>
                    <strong>Amount Still Needed:</strong> ${(accountMinDeposit - accountCurrentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
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
              >
                {accounts.length === 0 && (
                  <option value="">No active accounts available</option>
                )}
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Cryptocurrency</label>
              <div style={styles.cryptoGrid}>
                {cryptoTypes.map(crypto => (
                  <div
                    key={crypto.value}
                    onClick={() => handleCryptoChange(crypto.value)}
                    style={{
                      ...styles.cryptoCard,
                      borderColor: depositForm.crypto_type === crypto.value ? '#1e40af' : '#e5e7eb',
                      backgroundColor: depositForm.crypto_type === crypto.value ? '#eff6ff' : '#fff'
                    }}
                  >
                    <div style={{
                      ...styles.cryptoIcon,
                      backgroundColor: crypto.color
                    }}>
                      {crypto.icon}
                    </div>
                    <div>
                      <div style={styles.cryptoName}>{crypto.label}</div>
                      <div style={styles.cryptoSymbol}>{crypto.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!depositForm.crypto_type ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#f0f9ff',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                color: '#1e40af',
                marginTop: '1rem'
              }}>
                ℹ️ Select a cryptocurrency above to continue
              </div>
            ) : (
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Network</label>
                {loadingNetworks ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    <div style={{ ...styles.spinner, margin: '0 auto 1rem' }} />
                    Loading available networks...
                  </div>
                ) : availableNetworks.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '12px',
                    color: '#991b1b'
                  }}>
                    No networks available for {depositForm.crypto_type}. Please contact support.
                  </div>
                ) : (
                  <div style={styles.networkGrid}>
                    {getAvailableNetworks().map(network => (
                      <div
                        key={network.value}
                        onClick={() => handleNetworkChange(network.value)}
                        style={{
                          ...styles.networkCard,
                          borderColor: depositForm.network_type === network.value ? '#1e40af' : '#e5e7eb',
                          backgroundColor: depositForm.network_type === network.value ? '#eff6ff' : '#fff'
                        }}
                      >
                        <div style={styles.networkHeader}>
                          <span style={styles.networkIcon}>{network.icon}</span>
                          <div style={styles.networkName}>{network.label}</div>
                        </div>
                        <div style={styles.networkInfo}>{network.confirmations} confirmations</div>
                        <div style={styles.networkInfo}>Min: {network.minDeposit} {depositForm.crypto_type}</div>
                        {network.fee > 0 && (
                          <div style={styles.networkInfo}>Fee: {network.fee}%</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={styles.formGroup}>
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
              {fundingMode && accountMinDeposit > 0 && (accountMinDeposit - accountCurrentBalance) > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setDepositForm({ ...depositForm, amount: (accountMinDeposit - accountCurrentBalance).toFixed(2) })}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#047857'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#059669'}
                  >
                    💡 Set Minimum Required: ${(accountMinDeposit - accountCurrentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </button>
                  <p style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.5rem', fontWeight: '500' }}>
                    ✓ Click to automatically fill the exact USD amount needed to activate your account
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
            <h2 style={styles.sectionTitle}>Send {getSelectedCrypto().label} Payment</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
              Send exactly <strong>{formatCurrency(depositForm.amount)}</strong> worth of {getSelectedCrypto().value} via <strong>{getSelectedNetwork()?.label}</strong>
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
                      {getSelectedNetwork()?.label} WALLET ADDRESS
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
                        <li><strong>Make sure you deposit on the {getSelectedNetwork()?.label} network</strong></li>
                        {memo && (
                          <li><strong style={{ color: '#dc2626' }}>YOU MUST INCLUDE THE MEMO/TAG OR YOUR DEPOSIT WILL BE LOST</strong></li>
                        )}
                        <li>Deposits on the wrong chain may be permanently lost</li>
                        <li>Send only {getSelectedCrypto().value} to this address</li>
                        <li>Minimum deposit: {getSelectedNetwork()?.minDeposit} {depositForm.crypto_type}</li>
                        <li>Required confirmations: {getSelectedNetwork()?.confirmations}</li>
                        {getSelectedNetwork()?.fee > 0 && (
                          <li>Network fee: {getSelectedNetwork()?.fee}%</li>
                        )}
                        <li>Once sent, click "I've Sent the Payment" below</li>
                      </ul>
                    </div>
                  </div>
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
                  You don't have a {getSelectedCrypto().value} wallet assigned for {getSelectedNetwork()?.label} yet. Please contact our support team.
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
                Please confirm that you have sent the cryptocurrency payment. Once confirmed, we will begin processing your deposit.
              </p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Deposit Summary</h3>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Account</span>
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
                  {getSelectedCrypto().label} ({getSelectedCrypto().value})
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Network</span>
                <span style={styles.summaryValue}>
                  {getSelectedNetwork()?.label}
                </span>
              </div>
              <div style={{
                ...styles.summaryRow,
                borderBottom: 'none'
              }}>
                <span style={styles.summaryLabel}>Amount</span>
                <span style={{
                  ...styles.summaryValue,
                  fontSize: '1.25rem',
                  fontWeight: '700'
                }}>
                  {formatCurrency(depositForm.amount)}
                </span>
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
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>

            <p style={{
              marginTop: '1.5rem',
              fontSize: '0.85rem',
              color: '#9ca3af',
              fontStyle: 'italic',
              textAlign: 'center'
            }}>
              Processing typically takes {getSelectedNetwork()?.confirmations} confirmations
            </p>
          </div>
        )}

        {deposits.length > 0 && (
          <div style={styles.contentCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={styles.sectionTitle}>Recent Deposits</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                💡 Click any row to view receipt
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.transactionsTable}>
                <thead style={styles.tableHeader}>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Crypto</th>
                    <th style={styles.th}>Network</th>
                    <th style={styles.th}>Account</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr 
                      key={deposit.id}
                      onClick={() => viewDepositReceipt(deposit)}
                      style={{ 
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={styles.td}>{formatDate(deposit.created_at)}</td>
                      <td style={{ ...styles.td, fontWeight: '600' }}>{deposit.crypto_type}</td>
                      <td style={{ ...styles.td, color: '#64748b' }}>{deposit.network_type || 'N/A'}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', color: '#64748b' }}>
                        {deposit.account_number}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600' }}>
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
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
                            {deposit.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDepositReceipt(deposit);
                            }}
                            style={{
                              padding: '0.4rem 0.8rem',
                              backgroundColor: '#1e40af',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Comprehensive Receipt Modal */}
      {showReceipt && receiptData && (
        <div style={styles.receiptOverlay}>
          <div style={styles.receipt} className="receipt-print">
            <div style={styles.receiptHeader}>
              <h2 style={styles.receiptTitle}>Cryptocurrency Deposit Receipt</h2>
              <p style={styles.receiptSubtitle}>Oakline Bank - Digital Asset Services</p>
              <div style={styles.receiptSuccessBadge}>
                ✓ Transaction Submitted Successfully
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Reference Number</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontWeight: '700' }}>
                  {receiptData.referenceNumber}
                </span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Transaction ID</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {receiptData.transactionId}
                </span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Date & Time</span>
                <span style={styles.receiptValue}>{receiptData.date}</span>
              </div>
            </div>

            <div style={styles.receiptHighlight}>
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
                <span style={styles.receiptLabel}>Amount (USD)</span>
                <span style={{ ...styles.receiptValue, fontSize: '1.25rem', color: '#059669' }}>
                  {receiptData.amount}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Deposit Address</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {receiptData.walletAddress}
                </span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Required Confirmations</span>
                <span style={styles.receiptValue}>{receiptData.confirmations}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Status</span>
                <span style={{ 
                  ...styles.receiptValue, 
                  color: '#f59e0b',
                  backgroundColor: '#fef3c7',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px'
                }}>
                  {receiptData.status}
                </span>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fef3c7',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #fbbf24'
            }}>
              <p style={{ fontSize: '0.85rem', color: '#92400e', margin: 0, lineHeight: '1.6' }}>
                <strong>⏱️ Processing Time:</strong> Your deposit will be credited to your account after {receiptData.confirmations} network confirmations. This typically takes 15-60 minutes depending on network congestion.
              </p>
            </div>

            <div style={{
              backgroundColor: '#eff6ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #bfdbfe'
            }}>
              <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
                <strong>📧 Email Confirmation:</strong> You will receive an email notification once your deposit has been confirmed and credited to your account.
              </p>
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
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => {
                  setShowReceipt(false);
                  router.push('/dashboard');
                }}
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#10b981',
                  color: 'white'
                }}
              >
                ✓ Done
              </button>
            </div>

            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
                This is an official receipt from Oakline Bank.<br />
                For support, contact us at support@theoaklinebank.com
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}