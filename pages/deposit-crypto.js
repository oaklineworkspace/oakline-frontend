
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import QRCode from 'react-qr-code';

export default function CryptoDeposit() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  const [depositForm, setDepositForm] = useState({
    account_id: '',
    account_number: '',
    crypto_type: 'BTC',
    network_type: '',
    amount: ''
  });

  // Network configurations per crypto
  const networkConfigs = {
    USDT: [
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.005, icon: '🟡' },
      { value: 'TRC20', label: 'TRON (TRC20)', confirmations: 20, minDeposit: 0.005, icon: '🔴' },
      { value: 'ERC20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: 0.005, icon: '⚪' },
      { value: 'SOL', label: 'Solana (SOL)', confirmations: 200, minDeposit: 0.005, icon: '🟣' },
      { value: 'TON', label: 'TON (The Open Network)', confirmations: 1, minDeposit: 0.005, icon: '🔵' }
    ],
    ETH: [
      { value: 'ERC20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: 0.00005, icon: '⚪' },
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.00005, icon: '🟡' },
      { value: 'ARBITRUM', label: 'Arbitrum One', confirmations: 120, minDeposit: 0.000001, icon: '🔵' },
      { value: 'BASE', label: 'Base Mainnet', confirmations: 30, minDeposit: 0.000001, icon: '🔷' }
    ],
    BNB: [
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.0005, icon: '🟡' }
    ],
    BTC: [
      { value: 'BITCOIN', label: 'Bitcoin Mainnet', confirmations: 1, minDeposit: 0.0001, icon: '🟠' },
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.0001, icon: '🟡' }
    ]
  };

  const cryptoTypes = [
    { value: 'BTC', label: 'Bitcoin', icon: '₿', color: '#F7931A' },
    { value: 'USDT', label: 'Tether', icon: '₮', color: '#26A17B' },
    { value: 'ETH', label: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
    { value: 'BNB', label: 'Binance Coin', icon: 'B', color: '#F3BA2F' }
  ];

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    if (user && depositForm.crypto_type && depositForm.network_type && currentStep >= 2) {
      fetchWalletAddress();
    }
  }, [depositForm.crypto_type, depositForm.network_type, user, currentStep]);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: userAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at');
      
      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
      }
      
      setAccounts(userAccounts || []);
      if (userAccounts && userAccounts.length > 0) {
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
    try {
      const { data, error } = await supabase
        .from('user_crypto_wallets')
        .select('wallet_address')
        .eq('user_id', user.id)
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching wallet:', error);
      } else if (data) {
        setWalletAddress(data.wallet_address);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
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
      network_type: '' // Reset network when crypto changes
    });
    setWalletAddress('');
  };

  const handleNetworkChange = (network) => {
    setDepositForm({
      ...depositForm,
      network_type: network
    });
    setWalletAddress('');
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
      
      const selectedNetwork = getAvailableNetworks().find(n => n.value === depositForm.network_type);
      if (selectedNetwork && parseFloat(depositForm.amount) < selectedNetwork.minDeposit) {
        setMessage(`Minimum deposit amount is ${selectedNetwork.minDeposit} ${depositForm.crypto_type}`);
        setMessageType('error');
        return;
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
      const { data, error } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_number: depositForm.account_number,
          crypto_type: depositForm.crypto_type,
          network_type: depositForm.network_type,
          wallet_address: walletAddress,
          amount: parseFloat(depositForm.amount),
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Deposit submission failed');
      }

      setMessage('Your deposit is now being processed. You will receive a notification once it has been confirmed.');
      setMessageType('success');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

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
    setMessage('Wallet address copied to clipboard!');
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
    return networkConfigs[depositForm.crypto_type] || [];
  };

  const getSelectedNetwork = () => {
    return getAvailableNetworks().find(n => n.value === depositForm.network_type);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #e0e0e0',
            borderTop: '4px solid #0066cc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p style={{ color: '#666', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Crypto Deposit - Oakline Bank</title>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </Head>

      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f7fa',
        padding: '20px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '30px' }}>
            <Link href="/dashboard" style={{ 
              color: '#0066cc', 
              textDecoration: 'none', 
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              ← Back to Dashboard
            </Link>
          </div>

          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            overflow: 'hidden'
          }}>
            {/* Page Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #0052a3 100%)',
              padding: '40px 40px 30px',
              color: '#fff'
            }}>
              <h1 style={{ 
                fontSize: '32px', 
                margin: '0 0 10px 0',
                fontWeight: '700'
              }}>
                Add Funds via Cryptocurrency
              </h1>
              <p style={{ 
                fontSize: '16px', 
                margin: 0,
                opacity: 0.95
              }}>
                Securely add money to your Oakline Bank account using cryptocurrency
              </p>
            </div>

            {/* Progress Steps */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '30px 40px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#fafbfc'
            }}>
              {[
                { num: 1, label: 'Deposit Details' },
                { num: 2, label: 'Send Payment' },
                { num: 3, label: 'Confirm' }
              ].map((step, index) => (
                <div key={step.num} style={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  {index < 2 && (
                    <div style={{
                      position: 'absolute',
                      top: '15px',
                      left: '50%',
                      right: '-50%',
                      height: '2px',
                      backgroundColor: currentStep > step.num ? '#0066cc' : '#e5e7eb',
                      zIndex: 0
                    }} />
                  )}
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: currentStep >= step.num ? '#0066cc' : '#e5e7eb',
                    color: currentStep >= step.num ? '#fff' : '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    position: 'relative',
                    zIndex: 1,
                    marginBottom: '8px'
                  }}>
                    {currentStep > step.num ? '✓' : step.num}
                  </div>
                  <span style={{
                    fontSize: '13px',
                    color: currentStep >= step.num ? '#1a1a1a' : '#999',
                    fontWeight: currentStep === step.num ? '600' : '400',
                    textAlign: 'center'
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Message Display */}
            {message && (
              <div style={{
                padding: '16px 40px',
                backgroundColor: 
                  messageType === 'error' ? '#fef2f2' : 
                  messageType === 'success' ? '#f0fdf4' : '#eff6ff',
                borderBottom: `3px solid ${
                  messageType === 'error' ? '#dc2626' : 
                  messageType === 'success' ? '#16a34a' : '#0066cc'
                }`
              }}>
                <p style={{
                  margin: 0,
                  color: messageType === 'error' ? '#991b1b' : 
                         messageType === 'success' ? '#166534' : '#1e40af',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {message}
                </p>
              </div>
            )}

            {/* Content Area */}
            <div style={{ padding: '40px' }}>
              {/* Step 1: Deposit Details */}
              {currentStep === 1 && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <h2 style={{ 
                    fontSize: '22px', 
                    marginBottom: '30px', 
                    color: '#1a1a1a',
                    fontWeight: '600'
                  }}>
                    Enter Deposit Information
                  </h2>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Select Account
                    </label>
                    <select
                      value={depositForm.account_id}
                      onChange={handleAccountChange}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                        fontSize: '15px',
                        backgroundColor: '#fff',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
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

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Cryptocurrency Type
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '12px'
                    }}>
                      {cryptoTypes.map(crypto => (
                        <div
                          key={crypto.value}
                          onClick={() => handleCryptoChange(crypto.value)}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: `2px solid ${depositForm.crypto_type === crypto.value ? crypto.color : '#e5e7eb'}`,
                            backgroundColor: depositForm.crypto_type === crypto.value ? `${crypto.color}10` : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: crypto.color,
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: '700'
                          }}>
                            {crypto.icon}
                          </div>
                          <div>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#1a1a1a',
                              fontSize: '15px'
                            }}>
                              {crypto.label}
                            </div>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280'
                            }}>
                              {crypto.value}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {depositForm.crypto_type && (
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '10px', 
                        fontWeight: '600', 
                        color: '#374151',
                        fontSize: '14px'
                      }}>
                        Select Network
                      </label>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px'
                      }}>
                        {getAvailableNetworks().map(network => (
                          <div
                            key={network.value}
                            onClick={() => handleNetworkChange(network.value)}
                            style={{
                              padding: '14px',
                              borderRadius: '8px',
                              border: `2px solid ${depositForm.network_type === network.value ? '#0066cc' : '#e5e7eb'}`,
                              backgroundColor: depositForm.network_type === network.value ? '#eff6ff' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '18px' }}>{network.icon}</span>
                              <div style={{ 
                                fontWeight: '600', 
                                color: '#1a1a1a',
                                fontSize: '14px'
                              }}>
                                {network.label}
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '26px' }}>
                              {network.confirmations} confirmations
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginLeft: '26px' }}>
                              Min: {network.minDeposit} {depositForm.crypto_type}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '10px', 
                      fontWeight: '600', 
                      color: '#374151',
                      fontSize: '14px'
                    }}>
                      Amount (USD)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '18px',
                        color: '#6b7280',
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
                          width: '100%',
                          padding: '14px 16px 14px 36px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          fontSize: '16px',
                          backgroundColor: '#fff',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        required
                      />
                    </div>
                    {depositForm.network_type && getSelectedNetwork() && (
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                        Minimum deposit: {getSelectedNetwork().minDeposit} {depositForm.crypto_type} • 
                        {getSelectedNetwork().confirmations} network confirmations required
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleNextStep}
                    disabled={accounts.length === 0}
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: accounts.length === 0 ? '#d1d5db' : '#0066cc',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: accounts.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: accounts.length === 0 ? 'none' : '0 2px 8px rgba(0,102,204,0.2)'
                    }}
                  >
                    Continue to Payment
                  </button>
                </div>
              )}

              {/* Step 2: Show Wallet & Instructions */}
              {currentStep === 2 && (
                <div style={{ maxWidth: '700px', margin: '0 auto' }}>
                  <h2 style={{ 
                    fontSize: '22px', 
                    marginBottom: '10px', 
                    color: '#1a1a1a',
                    fontWeight: '600'
                  }}>
                    Send {getSelectedCrypto().label} Payment
                  </h2>
                  <p style={{ 
                    color: '#6b7280', 
                    marginBottom: '30px',
                    fontSize: '15px'
                  }}>
                    Send exactly <strong style={{ color: '#1a1a1a' }}>{formatCurrency(depositForm.amount)}</strong> worth of {getSelectedCrypto().value} via <strong>{getSelectedNetwork()?.label}</strong>
                  </p>

                  {loadingWallet ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        border: '3px solid #e0e0e0',
                        borderTop: '3px solid #0066cc',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                      }} />
                      Loading wallet address...
                    </div>
                  ) : walletAddress ? (
                    <div>
                      <div style={{
                        backgroundColor: '#f9fafb',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          marginBottom: '20px'
                        }}>
                          <div style={{
                            padding: '16px',
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            <QRCode value={walletAddress} size={220} />
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                          <p style={{ 
                            fontSize: '13px', 
                            color: '#6b7280',
                            marginBottom: '8px',
                            fontWeight: '500'
                          }}>
                            {getSelectedNetwork()?.label} WALLET ADDRESS
                          </p>
                          <div style={{
                            padding: '14px 16px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            color: '#1a1a1a',
                            marginBottom: '12px'
                          }}>
                            {walletAddress}
                          </div>
                          <button
                            onClick={() => copyToClipboard(walletAddress)}
                            style={{
                              padding: '10px 24px',
                              backgroundColor: '#fff',
                              color: '#0066cc',
                              border: '2px solid #0066cc',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            📋 Copy Address
                          </button>
                        </div>
                      </div>

                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '24px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          gap: '12px',
                          alignItems: 'flex-start'
                        }}>
                          <div style={{ fontSize: '24px' }}>⚠️</div>
                          <div>
                            <h3 style={{ 
                              margin: '0 0 12px 0', 
                              fontSize: '16px',
                              color: '#92400e',
                              fontWeight: '600'
                            }}>
                              Important Instructions
                            </h3>
                            <ul style={{ 
                              margin: 0, 
                              paddingLeft: '20px',
                              color: '#92400e',
                              fontSize: '14px',
                              lineHeight: '1.6'
                            }}>
                              <li><strong>Make sure you deposit on the {getSelectedNetwork()?.label} network</strong></li>
                              <li>Deposits on the wrong chain may be permanently lost</li>
                              <li>Send only {getSelectedCrypto().value} to this address</li>
                              <li>Minimum deposit: {getSelectedNetwork()?.minDeposit} {depositForm.crypto_type}</li>
                              <li>Required confirmations: {getSelectedNetwork()?.confirmations}</li>
                              <li>Once sent, click "I've Sent the Payment" below</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        gap: '12px'
                      }}>
                        <button
                          onClick={() => setCurrentStep(1)}
                          style={{
                            flex: 1,
                            padding: '16px',
                            backgroundColor: '#fff',
                            color: '#6b7280',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          ← Back
                        </button>
                        <button
                          onClick={handleNextStep}
                          style={{
                            flex: 2,
                            padding: '16px',
                            backgroundColor: '#0066cc',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(0,102,204,0.2)'
                          }}
                        >
                          I've Sent the Payment →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '60px 40px',
                      textAlign: 'center',
                      backgroundColor: '#fffbeb',
                      borderRadius: '12px',
                      border: '2px solid #fbbf24'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                      <h3 style={{ 
                        color: '#92400e', 
                        fontWeight: '600',
                        fontSize: '18px',
                        marginBottom: '12px'
                      }}>
                        No Wallet Assigned for This Network
                      </h3>
                      <p style={{ 
                        color: '#92400e', 
                        fontSize: '15px',
                        marginBottom: '24px',
                        maxWidth: '400px',
                        margin: '0 auto 24px'
                      }}>
                        You don't have a {getSelectedCrypto().value} wallet assigned for {getSelectedNetwork()?.label} yet. Please contact our support team to get one assigned.
                      </p>
                      <button
                        onClick={() => setCurrentStep(1)}
                        style={{
                          padding: '12px 24px',
                          backgroundColor: '#fff',
                          color: '#92400e',
                          border: '2px solid #fbbf24',
                          borderRadius: '6px',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ← Go Back
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirm Payment */}
              {currentStep === 3 && (
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px',
                    backgroundColor: '#ecfdf5',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    fontSize: '40px'
                  }}>
                    ✓
                  </div>
                  
                  <h2 style={{ 
                    fontSize: '24px', 
                    marginBottom: '12px', 
                    color: '#1a1a1a',
                    fontWeight: '600'
                  }}>
                    Confirm Your Payment
                  </h2>
                  <p style={{ 
                    color: '#6b7280', 
                    marginBottom: '30px',
                    fontSize: '15px',
                    lineHeight: '1.6'
                  }}>
                    Please confirm that you have sent the cryptocurrency payment to the provided wallet address. Once confirmed, we will begin processing your deposit.
                  </p>

                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '32px',
                    textAlign: 'left'
                  }}>
                    <h3 style={{ 
                      fontSize: '14px',
                      color: '#6b7280',
                      fontWeight: '600',
                      marginBottom: '16px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Deposit Summary
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '15px' }}>Account</span>
                      <span style={{ 
                        color: '#1a1a1a', 
                        fontWeight: '600',
                        fontFamily: 'monospace',
                        fontSize: '15px'
                      }}>
                        {depositForm.account_number}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '15px' }}>Cryptocurrency</span>
                      <span style={{ 
                        color: '#1a1a1a', 
                        fontWeight: '600',
                        fontSize: '15px'
                      }}>
                        {getSelectedCrypto().label} ({getSelectedCrypto().value})
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '15px' }}>Network</span>
                      <span style={{ 
                        color: '#1a1a1a', 
                        fontWeight: '600',
                        fontSize: '15px'
                      }}>
                        {getSelectedNetwork()?.label}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '15px' }}>Amount</span>
                      <span style={{ 
                        color: '#1a1a1a', 
                        fontWeight: '700',
                        fontSize: '18px'
                      }}>
                        {formatCurrency(depositForm.amount)}
                      </span>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '12px'
                  }}>
                    <button
                      onClick={() => setCurrentStep(2)}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: '16px',
                        backgroundColor: '#fff',
                        color: '#6b7280',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: submitting ? 0.5 : 1
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleConfirmPayment}
                      disabled={submitting}
                      style={{
                        flex: 2,
                        padding: '16px',
                        backgroundColor: submitting ? '#d1d5db' : '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: submitting ? 'none' : '0 2px 8px rgba(16,185,129,0.2)'
                      }}
                    >
                      {submitting ? 'Processing...' : 'Confirm Payment'}
                    </button>
                  </div>

                  <p style={{
                    marginTop: '20px',
                    fontSize: '13px',
                    color: '#9ca3af',
                    fontStyle: 'italic'
                  }}>
                    Processing typically takes {getSelectedNetwork()?.confirmations} confirmations (varies by network congestion)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Deposits */}
          {deposits.length > 0 && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              marginTop: '30px',
              padding: '30px'
            }}>
              <h2 style={{ 
                fontSize: '20px', 
                marginBottom: '20px', 
                color: '#1a1a1a',
                fontWeight: '600'
              }}>
                Recent Deposits
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Date
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Crypto
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Network
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Account
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'right', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Amount
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'center', 
                        color: '#6b7280', 
                        fontWeight: '600',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit) => (
                      <tr key={deposit.id} style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#374151' }}>
                          {formatDate(deposit.created_at)}
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                          {deposit.crypto_type}
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                          {deposit.network_type || 'N/A'}
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          fontSize: '14px', 
                          fontFamily: 'monospace',
                          color: '#6b7280'
                        }}>
                          {deposit.account_number}
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          fontSize: '15px', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          color: '#1a1a1a'
                        }}>
                          {formatCurrency(deposit.amount)}
                        </td>
                        <td style={{ padding: '16px', textAlign: 'center' }}>
                          <span style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            backgroundColor: 
                              deposit.status === 'pending' ? '#fef3c7' :
                              deposit.status === 'approved' ? '#d1fae5' :
                              '#fee2e2',
                            color:
                              deposit.status === 'pending' ? '#92400e' :
                              deposit.status === 'approved' ? '#065f46' :
                              '#991b1b'
                          }}>
                            {deposit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
