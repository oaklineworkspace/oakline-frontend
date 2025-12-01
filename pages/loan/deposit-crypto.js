import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import dynamic from 'next/dynamic';

const QRCode = dynamic(() => import('react-qr-code').then(mod => mod.default || mod), { ssr: false });

function LoanDepositCryptoContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { loan_id, amount } = router.query;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loanDetails, setLoanDetails] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const [depositForm, setDepositForm] = useState({
    crypto_type: 'Bitcoin',
    network_type: '',
    amount: amount || ''
  });
  const [selectedLoanWallet, setSelectedLoanWallet] = useState(null);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkFeePercent, setNetworkFeePercent] = useState(0);
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [calculatedNetAmount, setCalculatedNetAmount] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [userAccounts, setUserAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const cryptoTypes = [
    { value: 'Bitcoin', label: 'Bitcoin', icon: '₿' },
    { value: 'Ethereum', label: 'Ethereum', icon: 'Ξ' },
    { value: 'Tether USD', label: 'Tether', icon: '₮' },
    { value: 'BNB', label: 'Binance Coin', icon: 'B' },
    { value: 'USD Coin', label: 'USD Coin', icon: '$' },
    { value: 'Solana', label: 'Solana', icon: 'S' },
    { value: 'Cardano', label: 'Cardano', icon: 'A' },
    { value: 'Polygon', label: 'Polygon', icon: 'M' },
    { value: 'Avalanche', label: 'Avalanche', icon: 'A' },
    { value: 'Litecoin', label: 'Litecoin', icon: 'Ł' },
    { value: 'XRP', label: 'XRP', icon: 'X' },
    { value: 'TON', label: 'TON', icon: 'T' }
  ];

  const networkIconMap = {
    'Bitcoin': '🟠',
    'BNB Smart Chain (BEP20)': '🟡',
    'Ethereum (ERC20)': '⚪',
    'Arbitrum One': '🔵',
    'Optimism': '🔴',
    'Tron (TRC20)': '🔴',
    'Solana (SOL)': '🟣',
    'Polygon (MATIC)': '🟣',
    'Avalanche (C-Chain)': '🔴',
    'Litecoin': '⚪',
    'XRP Ledger': '🔵',
  };

  useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('requires_verification')
          .eq('id', user.id)
          .single();
        
        if (profile?.requires_verification) {
          router.push('/verify-identity');
          return;
        }
        
        if (loan_id) {
          fetchLoanDetails();
          fetchUserAccounts();
          setupRealtimeSubscription();
        }
      }
    };
    
    checkVerification();
    return () => {
      supabase.channel(`loan-deposit-${loan_id}`).unsubscribe();
    };
  }, [user, loan_id]);

  const fetchUserAccounts = async () => {
    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, account_number, account_type, balance')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && accounts) {
        setUserAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`loan-deposit-${loan_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loans',
          filter: `id=eq.${loan_id}`
        },
        (payload) => {
          if (payload.new && payload.new.status === 'approved') {
            setMessage('Great news! Your loan has been approved!');
            setMessageType('success');
            setTimeout(() => router.push('/loan/dashboard'), 2000);
          }
        }
      )
      .subscribe();
    return channel;
  };

  const fetchAvailableNetworks = async () => {
    if (!depositForm.crypto_type) {
      setAvailableNetworks([]);
      return;
    }

    setLoadingNetworks(true);
    try {
      const { data: cryptoAssets, error } = await supabase
        .from('crypto_assets')
        .select('network_type, confirmations_required, min_deposit, deposit_fee_percent')
        .eq('crypto_type', depositForm.crypto_type)
        .eq('status', 'active')
        .order('network_type');

      if (error) {
        console.error('Error fetching networks:', error);
        setAvailableNetworks([]);
      } else if (cryptoAssets && cryptoAssets.length > 0) {
        const networks = cryptoAssets.map(asset => ({
          value: asset.network_type,
          label: asset.network_type,
          confirmations: asset.confirmations_required || 3,
          minDeposit: asset.min_deposit || 0.001,
          fee: asset.deposit_fee_percent || 0,
          icon: networkIconMap[asset.network_type] || '🔹'
        }));
        setAvailableNetworks(networks);
      }
    } catch (error) {
      console.error('Error fetching networks:', error);
    } finally {
      setLoadingNetworks(false);
    }
  };

  const fetchLoanDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loan_id)
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setLoanDetails(data);
      }
    } catch (err) {
      console.error('Error fetching loan details:', err);
    }
  };

  const fetchWalletAddress = async () => {
    setLoadingWallet(true);
    try {
      const { data: cryptoAsset } = await supabase
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', depositForm.crypto_type)
        .eq('network_type', depositForm.network_type)
        .eq('status', 'active')
        .single();

      if (!cryptoAsset) {
        setMessage('Crypto asset configuration not found. Please contact support.');
        setMessageType('error');
        return;
      }

      const { data: loanWallets, error } = await supabase
        .from('loan_crypto_wallets')
        .select('id, wallet_address, memo')
        .eq('crypto_asset_id', cryptoAsset.id)
        .eq('status', 'active')
        .eq('purpose', 'loan_requirement');

      if (error || !loanWallets || loanWallets.length === 0) {
        setMessage('No available loan wallet. Please try another payment method or contact support.');
        setMessageType('error');
        return;
      }

      const randomWallet = loanWallets[Math.floor(Math.random() * loanWallets.length)];
      setWalletAddress(randomWallet.wallet_address);
      setSelectedLoanWallet(randomWallet);
      setMessage('');
      setMessageType('');
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setMessage('Error loading wallet. Please try again.');
      setMessageType('error');
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (depositForm.crypto_type) {
      fetchAvailableNetworks();
    }
  }, [depositForm.crypto_type]);

  useEffect(() => {
    if (depositForm.crypto_type && depositForm.network_type && currentStep >= 2) {
      fetchWalletAddress();
    }
  }, [depositForm.crypto_type, depositForm.network_type, currentStep]);

  useEffect(() => {
    const depositAmount = parseFloat(depositForm.amount) || 0;
    const feePercent = networkFeePercent || 0;
    const fee = depositAmount * (feePercent / 100);
    const netAmount = depositAmount - fee;
    setCalculatedFee(fee);
    setCalculatedNetAmount(Math.max(0, netAmount));
  }, [depositForm.amount, networkFeePercent]);

  const handleCryptoChange = (crypto) => {
    setDepositForm({ ...depositForm, crypto_type: crypto, network_type: '' });
    setWalletAddress('');
  };

  const handleNetworkChange = (network) => {
    setDepositForm({ ...depositForm, network_type: network });
    const selectedNetwork = availableNetworks.find(n => n.value === network);
    if (selectedNetwork) setNetworkFeePercent(selectedNetwork.fee || 0);
    setWalletAddress('');
  };

  const handleNextStep = () => {
    setMessage('');
    if (currentStep === 1) {
      if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
        setMessage('Please enter a valid deposit amount');
        setMessageType('error');
        return;
      }

      if (paymentMethod === 'crypto') {
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
        setCurrentStep(2);
      } else if (paymentMethod === 'balance') {
        if (!selectedAccount) {
          setMessage('Please select an account');
          setMessageType('error');
          return;
        }
        const accountData = userAccounts.find(a => a.id === selectedAccount);
        if (!accountData || accountData.balance < parseFloat(depositForm.amount)) {
          setMessage('Insufficient balance in selected account');
          setMessageType('error');
          return;
        }
        setCurrentStep(3);
      }
    } else if (currentStep === 2 && paymentMethod === 'crypto') {
      setCurrentStep(3);
    }
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    try {
      if (paymentMethod === 'balance') {
        const depositAmount = parseFloat(depositForm.amount);
        const accountData = userAccounts.find(a => a.id === selectedAccount);

        const { data: treasuryAccount, error: treasuryError } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_number', '9900000001')
          .eq('account_type', 'treasury')
          .single();

        if (treasuryError || !treasuryAccount) {
          throw new Error('Treasury account not found');
        }

        const { error: transferError } = await supabase
          .from('transactions')
          .insert([{
            user_id: user.id,
            from_account_id: selectedAccount,
            to_account_id: treasuryAccount.id,
            amount: depositAmount,
            transaction_type: 'debit',
            description: `Loan 10% Deposit - Loan ID: ${loan_id}`,
            status: 'completed',
            reference: `LOAN_DEPOSIT_${loan_id}`,
            balance_before: accountData.balance,
            balance_after: accountData.balance - depositAmount
          }]);

        if (transferError) throw new Error('Failed to process transfer');

        await supabase
          .from('loans')
          .update({
            deposit_method: 'balance',
            deposit_amount: depositAmount,
            deposit_date: new Date().toISOString(),
            deposit_status: 'completed',
            deposit_paid: true,
            status: 'under_review',
            updated_at: new Date().toISOString()
          })
          .eq('id', loan_id);

        await supabase
          .from('accounts')
          .update({ balance: accountData.balance - depositAmount })
          .eq('id', selectedAccount);

        setMessage('Deposit successful! Your loan is now under review.');
        setMessageType('success');
        setTimeout(() => router.push('/loan/dashboard'), 3000);
      } else {
        if (!txHash || txHash.trim().length < 10) {
          throw new Error('Please enter a valid transaction hash');
        }

        const { data: cryptoAsset } = await supabase
          .from('crypto_assets')
          .select('id')
          .eq('crypto_type', depositForm.crypto_type)
          .eq('network_type', depositForm.network_type)
          .eq('status', 'active')
          .single();

        if (!cryptoAsset) throw new Error('Crypto asset configuration not found');

        const { data: treasuryAccount } = await supabase
          .from('accounts')
          .select('id')
          .eq('account_number', '9900000001')
          .eq('account_type', 'treasury')
          .single();

        if (!treasuryAccount) throw new Error('Treasury account not found');

        const { error: depositError } = await supabase
          .from('crypto_deposits')
          .insert([{
            user_id: user.id,
            account_id: treasuryAccount.id,
            crypto_asset_id: cryptoAsset.id,
            loan_wallet_id: selectedLoanWallet.id,
            amount: parseFloat(depositForm.amount),
            fee: parseFloat(calculatedFee.toFixed(2)),
            net_amount: parseFloat(calculatedNetAmount.toFixed(2)),
            status: 'pending',
            purpose: 'loan_requirement',
            tx_hash: txHash.trim(),
            metadata: {
              treasury_deposit: true,
              loan_id: loan_id,
              loan_wallet_address: walletAddress,
              deposit_source: 'loan_deposit_page'
            }
          }]);

        if (depositError) throw new Error('Deposit submission failed');

        await supabase
          .from('loans')
          .update({
            deposit_method: 'crypto',
            deposit_amount: parseFloat(depositForm.amount),
            deposit_date: new Date().toISOString(),
            deposit_status: 'pending',
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', loan_id);

        setMessage('Deposit submitted! Your deposit is pending verification. This typically takes 1-3 business days.');
        setMessageType('success');
        setTimeout(() => router.push('/loan/dashboard'), 4000);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'Submission failed. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard!');
    setMessageType('info');
    setTimeout(() => setMessage(''), 2000);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      color: 'white',
      padding: '2rem',
      textAlign: 'center'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '1.1rem',
      opacity: '0.95'
    },
    main: {
      maxWidth: '800px',
      margin: '-40px auto 0',
      padding: '0 20px 60px'
    },
    alert: {
      padding: '1rem',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      fontSize: '0.95rem',
      fontWeight: '500'
    },
    treasuryBanner: {
      backgroundColor: '#eff6ff',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem',
      textAlign: 'center'
    },
    treasuryTitle: {
      fontSize: '1.2rem',
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: '0.5rem'
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: '1.4rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '1.5rem'
    },
    button: {
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      border: 'none',
      flex: 1
    },
    primaryButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    secondaryButton: {
      backgroundColor: '#f8fafc',
      color: '#64748b',
      border: '2px solid #e2e8f0'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Loan Collateral Deposit</h1>
        <p style={styles.subtitle}>Deposit your 10% loan requirement to Oakline Bank Treasury</p>
      </div>

      <div style={styles.main}>
        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: messageType === 'error' ? '#fef2f2' : messageType === 'success' ? '#f0fdf4' : '#eff6ff',
            color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#166534' : '#1e40af',
            borderLeft: `4px solid ${messageType === 'error' ? '#dc2626' : messageType === 'success' ? '#16a34a' : '#1e40af'}`
          }}>
            {message}
          </div>
        )}

        <div style={styles.treasuryBanner}>
          <div style={styles.treasuryTitle}>🏦 Direct Treasury Deposit</div>
          <p style={{ fontSize: '0.95rem', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
            You're depositing your 10% loan collateral directly to Oakline Bank's secure treasury system.
          </p>
        </div>

        {currentStep === 1 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Select Payment Method</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPaymentMethod('crypto')}
                style={{
                  ...styles.button,
                  backgroundColor: paymentMethod === 'crypto' ? '#10b981' : '#e5e7eb',
                  color: paymentMethod === 'crypto' ? '#fff' : '#1f2937'
                }}
              >
                🪙 Pay with Crypto
              </button>
              <button
                onClick={() => setPaymentMethod('balance')}
                style={{
                  ...styles.button,
                  backgroundColor: paymentMethod === 'balance' ? '#10b981' : '#e5e7eb',
                  color: paymentMethod === 'balance' ? '#fff' : '#1f2937'
                }}
              >
                💰 Pay from Account
              </button>
            </div>

            {paymentMethod === 'crypto' && (
              <div>
                <h2 style={styles.sectionTitle}>Select Cryptocurrency</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {cryptoTypes.map(crypto => (
                    <div
                      key={crypto.value}
                      onClick={() => handleCryptoChange(crypto.value)}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        border: depositForm.crypto_type === crypto.value ? '2px solid #10b981' : '2px solid #e5e7eb',
                        backgroundColor: depositForm.crypto_type === crypto.value ? '#f0fdf4' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{crypto.icon}</div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{crypto.label}</div>
                    </div>
                  ))}
                </div>

                {depositForm.crypto_type && (
                  <div>
                    <h2 style={styles.sectionTitle}>Select Network</h2>
                    {loadingNetworks ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading networks...</div>
                    ) : availableNetworks.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '12px', color: '#991b1b' }}>
                        No networks available
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                        {availableNetworks.map(network => (
                          <div
                            key={network.value}
                            onClick={() => handleNetworkChange(network.value)}
                            style={{
                              padding: '1rem',
                              borderRadius: '12px',
                              border: depositForm.network_type === network.value ? '2px solid #10b981' : '2px solid #e5e7eb',
                              backgroundColor: depositForm.network_type === network.value ? '#f0fdf4' : '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{network.icon} {network.label}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{network.confirmations} confirmations</div>
                            {network.fee > 0 && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Fee: {network.fee}%</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'balance' && (
              <div>
                <h2 style={styles.sectionTitle}>Select Account & Amount</h2>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Select Account:</label>
                  <select
                    value={selectedAccount || ''}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem' }}
                  >
                    <option value="">Choose an account...</option>
                    {userAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_type.toUpperCase()} - {account.account_number} (Balance: ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Deposit Amount:</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button
                onClick={() => router.push('/loan/dashboard')}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Cancel
              </button>
              <button
                onClick={handleNextStep}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && paymentMethod === 'crypto' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Send Payment</h2>
            {loadingWallet ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading wallet...</div>
            ) : walletAddress ? (
              <div>
                <div style={{ backgroundColor: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: '#1e40af', margin: 0 }}>⚠️ This is a dedicated loan deposit wallet. Do not use this address for general deposits.</p>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <QRCode value={walletAddress} size={200} />
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: '1rem' }}>
                  {walletAddress}
                </div>
                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  style={{ ...styles.button, ...styles.primaryButton, marginBottom: '1rem', width: '100%' }}
                >
                  Copy Address
                </button>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Transaction Hash:</label>
                  <input
                    type="text"
                    placeholder="Paste your transaction hash here"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={styles.buttonGroup}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{ ...styles.button, ...styles.secondaryButton }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    Verify →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#991b1b' }}>Error loading wallet. Please try again.</div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Confirm Deposit</h2>
            <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: '500', color: '#334155' }}>Payment Method:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{paymentMethod === 'crypto' ? 'Cryptocurrency' : 'Account Transfer'}</span>
              </div>
              {paymentMethod === 'crypto' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Cryptocurrency:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{depositForm.crypto_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Network:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{depositForm.network_type}</span>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: '500', color: '#334155' }}>Amount:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>${parseFloat(depositForm.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {paymentMethod === 'crypto' && calculatedFee > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Network Fee:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>${calculatedFee.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Net Amount:</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>${calculatedNetAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
            <div style={styles.buttonGroup}>
              <button
                onClick={() => setCurrentStep(paymentMethod === 'crypto' ? 2 : 1)}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                Back
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                style={{ ...styles.button, ...styles.primaryButton, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Processing...' : 'Confirm Deposit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoanDepositCrypto() {
  return (
    <ProtectedRoute>
      <LoanDepositCryptoContent />
    </ProtectedRoute>
  );
}
