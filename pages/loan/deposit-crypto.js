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
    crypto_type: 'BTC',
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
  const [proofFile, setProofFile] = useState(null);
  const [proofPath, setProofPath] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

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
    { value: 'Bitcoin', label: 'Bitcoin', icon: '₿', color: '#F7931A', symbol: 'BTC' },
    { value: 'Tether USD', label: 'Tether', icon: '₮', color: '#26A17B', symbol: 'USDT' },
    { value: 'Ethereum', label: 'Ethereum', icon: 'Ξ', color: '#627EEA', symbol: 'ETH' },
    { value: 'BNB', label: 'Binance Coin', icon: 'B', color: '#F3BA2F', symbol: 'BNB' },
    { value: 'USD Coin', label: 'USD Coin', icon: '$', color: '#007AFF', symbol: 'USDC' }
  ];

  useEffect(() => {
    if (user && loan_id) {
      fetchLoanDetails();
      setupRealtimeSubscription();
    }

    return () => {
      supabase.channel(`loan-deposit-${loan_id}`).unsubscribe();
    };
  }, [user, loan_id]);

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
          console.log('Loan updated:', payload);
          if (payload.new) {
            setLoanDetails(payload.new);

            if (payload.new.deposit_status === 'completed') {
              setMessage('Your deposit has been confirmed by our Loan Department!');
              setMessageType('success');
            }

            if (payload.new.status === 'under_review') {
              setMessage('Your deposit has been received and your loan is now under review by the Loan Department.');
              setMessageType('success');
            }

            if (payload.new.status === 'approved') {
              setMessage('Great news! Your loan has been approved by the Loan Department!');
              setMessageType('success');
              setTimeout(() => {
                router.push('/loan/dashboard');
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    return channel;
  };

  useEffect(() => {
    if (amount) {
      setDepositForm(prev => ({ ...prev, amount }));
    }
  }, [amount]);

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
      setAvailableNetworks([]);
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
    setWalletAddress('');
    setSelectedLoanWallet(null);
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
        console.error('Error fetching crypto asset:', assetError);
        setMessage(`Crypto asset configuration not found for ${depositForm.crypto_type} on ${depositForm.network_type}. Please contact support.`);
        setMessageType('error');
        return;
      }

      // Fetch active loan wallets for this crypto asset
      const { data: loanWallets, error: loanWalletError } = await supabase
        .from('loan_crypto_wallets')
        .select('id, wallet_address, memo')
        .eq('crypto_asset_id', cryptoAsset.id)
        .eq('status', 'active')
        .eq('purpose', 'loan_requirement');

      if (loanWalletError) {
        console.error('Error fetching loan wallets:', loanWalletError);
        setMessage('Error loading loan wallet. Please contact support.');
        setMessageType('error');
        return;
      }

      if (!loanWallets || loanWallets.length === 0) {
        setMessage(`No available loan wallet for ${depositForm.crypto_type} on ${depositForm.network_type}. Please try another payment method or contact support.`);
        setMessageType('error');
        return;
      }

      // Pick a random wallet for load distribution
      const randomWallet = loanWallets[Math.floor(Math.random() * loanWallets.length)];
      setWalletAddress(randomWallet.wallet_address);
      setSelectedLoanWallet(randomWallet);
      setMessage('');
      setMessageType('');
    } catch (error) {
      console.error('Error fetching loan wallet:', error);
      setMessage('Error loading loan wallet. Please try again or contact support.');
      setMessageType('error');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleCryptoChange = (crypto) => {
    setDepositForm({
      ...depositForm,
      crypto_type: crypto,
      network_type: ''
    });
    setWalletAddress('');
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
  };

  const handleNextStep = () => {
    setMessage('');
    setMessageType('');

    if (currentStep === 1) {
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
      if (selectedNetwork && calculatedNetAmount < selectedNetwork.minDeposit) {
        setMessage(`After network fees, your net amount ($${calculatedNetAmount.toFixed(2)}) is below the minimum deposit of ${selectedNetwork.minDeposit} ${depositForm.crypto_type}. Please increase your deposit amount to cover the fee.`);
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

  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Please upload a PNG, JPG, or PDF file');
      setMessageType('error');
      return;
    }

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
    setMessage('');
    setMessageType('');

    if (!txHash || txHash.trim().length < 10) {
      setMessage('Please enter a valid transaction hash');
      setMessageType('error');
      setSubmitting(false);
      return;
    }

    try {
      // Check if deposit already submitted for this loan
      const { data: existingDeposit, error: depositCheckError } = await supabase
        .from('crypto_deposits')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('purpose', 'loan_requirement')
        .contains('metadata', { loan_id: loan_id })
        .in('status', ['pending', 'processing', 'completed', 'confirmed', 'awaiting_confirmations'])
        .single();

      if (existingDeposit && !depositCheckError) {
        throw new Error('You have already submitted a deposit for this loan. Please wait for confirmation.');
      }

      // Get treasury account
      const { data: treasuryAccount, error: treasuryError } = await supabase
        .from('accounts')
        .select('id')
        .eq('account_number', '9900000001')
        .eq('account_type', 'treasury')
        .single();

      if (treasuryError || !treasuryAccount) {
        throw new Error('Treasury account not found. Please contact support.');
      }

      // Validate loan wallet is selected
      if (!selectedLoanWallet || !selectedLoanWallet.id) {
        throw new Error('No loan wallet selected. Please try again or contact support.');
      }

      // Get the crypto_asset_id for this crypto_type and network_type
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

      // Create crypto deposit record with purpose = 'loan_requirement'
      const { data: depositData, error: depositError } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_id: treasuryAccount.id,
          crypto_asset_id: cryptoAsset.id,
          loan_wallet_id: selectedLoanWallet.id,
          amount: parseFloat(depositForm.amount),
          fee: parseFloat(calculatedFee.toFixed(2)),
          net_amount: parseFloat(calculatedNetAmount.toFixed(2)),
          approved_amount: 0,
          status: 'pending',
          purpose: 'loan_requirement',
          tx_hash: txHash.trim(),
          metadata: {
            treasury_deposit: true,
            loan_id: loan_id,
            loan_wallet_address: walletAddress,
            deposit_source: 'loan_deposit_page',
            fee_percent: networkFeePercent,
            proof_path: proofPath || null
          }
        }])
        .select()
        .single();

      if (depositError) {
        throw new Error(depositError.message || 'Deposit submission failed');
      }

      // Check current loan status before updating
      const { data: currentLoan, error: loanFetchError } = await supabase
        .from('loans')
        .select('deposit_paid, deposit_status')
        .eq('id', loan_id)
        .single();

      if (loanFetchError) {
        console.error('Error fetching loan:', loanFetchError);
      }

      // Prevent duplicate submissions
      if (currentLoan && (currentLoan.deposit_paid || currentLoan.deposit_status === 'pending')) {
        throw new Error('Deposit already submitted for this loan.');
      }

      // Update loan status and deposit information
      const { error: loanUpdateError } = await supabase
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

      if (loanUpdateError) {
        console.error('Error updating loan:', loanUpdateError);
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Loan Deposit Submitted - Pending Verification',
          message: `Your 10% loan deposit of $${parseFloat(depositForm.amount).toLocaleString()} (${depositForm.crypto_type} on ${depositForm.network_type}) has been submitted to our treasury. Our team will verify your deposit on the blockchain. Once confirmed, your loan application will proceed to review. This typically takes 1-3 business days.`,
          read: false
        }]);

      setMessage('Loan deposit submitted successfully! Your deposit is now pending admin verification on the blockchain. Once our team confirms your deposit, your loan application will proceed to review. You will receive a notification when verification is complete.');
      setMessageType('success');

      setTimeout(() => {
        router.push('/loan/dashboard');
      }, 4000);

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage(error.message || 'Deposit submission failed. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
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
    treasuryText: {
      fontSize: '0.95rem',
      color: '#1e40af',
      lineHeight: '1.6'
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
    cryptoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    },
    cryptoCard: {
      padding: '1rem',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center'
    },
    networkGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem'
    },
    networkCard: {
      padding: '1rem',
      borderRadius: '12px',
      border: '2px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.2s'
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
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
      paddingBottom: '1rem',
      borderBottom: '1px solid #eee'
    },
    summaryLabel: {
      fontSize: '1rem',
      color: '#334155',
      fontWeight: '500'
    },
    summaryValue: {
      fontSize: '1rem',
      color: '#1e293b',
      fontWeight: '600'
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

        {/* Updated Treasury Banner */}
        <div style={styles.treasuryBanner}>
          <div style={styles.treasuryTitle}>🏦 Direct Treasury Deposit</div>
          <p style={styles.treasuryText}>
            You're depositing your 10% loan collateral directly to Oakline Bank's secure treasury system. This deposit will be safely held in our custodial account and applied to your loan once approved by our underwriting team.
          </p>
        </div>

        {currentStep === 1 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Select Cryptocurrency</h2>
            <div style={styles.cryptoGrid}>
              {cryptoTypes.map(crypto => (
                <div
                  key={crypto.value}
                  onClick={() => handleCryptoChange(crypto.value)}
                  style={{
                    ...styles.cryptoCard,
                    borderColor: depositForm.crypto_type === crypto.value ? '#10b981' : '#e5e7eb',
                    backgroundColor: depositForm.crypto_type === crypto.value ? '#f0fdf4' : '#fff'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{crypto.icon}</div>
                  <div style={{ fontWeight: '600' }}>{crypto.label}</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{crypto.value}</div>
                </div>
              ))}
            </div>

            {depositForm.crypto_type && (
              <>
                <h2 style={styles.sectionTitle}>Select Network</h2>
                {loadingNetworks ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
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
                          borderColor: depositForm.network_type === network.value ? '#10b981' : '#e5e7eb',
                          backgroundColor: depositForm.network_type === network.value ? '#f0fdf4' : '#fff'
                        }}
                      >
                        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                          {network.icon} {network.label}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {network.confirmations} confirmations
                        </div>
                        {network.fee > 0 && (
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                            Fee: {network.fee}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
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

        {currentStep === 2 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Send Payment</h2>
            {loadingWallet ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>Loading wallet...</div>
            ) : walletAddress && selectedLoanWallet ? (
              <>
                <div style={{ 
                  backgroundColor: '#eff6ff', 
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.9rem', color: '#1e40af', margin: 0 }}>
                    ⚠️ This is a dedicated loan deposit wallet. Do not use this address for general deposits.
                  </p>
                </div>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <QRCode value={walletAddress} size={200} />
                </div>
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '8px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  marginBottom: '1rem'
                }}>
                  {walletAddress}
                </div>
                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  style={{ ...styles.button, ...styles.primaryButton, marginBottom: '1rem' }}
                >
                  📋 Copy Address
                </button>

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
                    If you don't have crypto yet, you can purchase it from these trusted exchanges:
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    flexWrap: 'wrap'
                  }}>
                    <a
                      href="https://www.coinbase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.button,
                        backgroundColor: '#1652f0',
                        color: 'white',
                        padding: '0.65rem 1.2rem',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        flex: '0 1 auto'
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
                        padding: '0.65rem 1.2rem',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        flex: '0 1 auto'
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
                        padding: '0.65rem 1.2rem',
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        flex: '0 1 auto'
                      }}
                    >
                      🟪 Kraken
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
                    style={{ ...styles.button, ...styles.secondaryButton }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    I've Sent Payment →
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ 
                  backgroundColor: '#fef2f2',
                  border: '2px solid #ef4444',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ fontSize: '1.1rem', color: '#991b1b', fontWeight: '600', marginBottom: '0.5rem' }}>
                    ⚠️ No Loan Wallet Available
                  </p>
                  <p style={{ color: '#991b1b', margin: 0 }}>
                    There are currently no active loan wallets for {depositForm.crypto_type} on {depositForm.network_type}. 
                    Please try another payment method or contact our support team.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{ ...styles.button, ...styles.secondaryButton }}
                  >
                    ← Try Different Network
                  </button>
                  <button
                    onClick={() => router.push('/loan/deposit-confirmation?loan_id=' + loan_id + '&amount=' + amount)}
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    Try Another Payment Method
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Confirm Payment</h2>
            <div style={{ marginBottom: '2rem' }}>
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
                <span style={styles.summaryValue}>${parseFloat(depositForm.amount).toLocaleString()}</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={{...styles.summaryLabel, color: '#dc2626'}}>
                  Network Fee ({networkFeePercent}%)
                </span>
                <span style={{...styles.summaryValue, color: '#dc2626'}}>
                  -${calculatedFee.toFixed(2)}
                </span>
              </div>
              <div style={{
                ...styles.summaryRow,
                borderTop: '2px solid #e5e7eb',
                paddingTop: '0.75rem',
                marginTop: '0.5rem'
              }}>
                <span style={{...styles.summaryLabel, fontSize: '1rem', fontWeight: '700'}}>
                  You Will Receive
                </span>
                <span style={{...styles.summaryValue, fontSize: '1.25rem', fontWeight: '700', color: '#059669'}}>
                  ${calculatedNetAmount.toFixed(2)}
                </span>
              </div>
              <div style={{...styles.summaryRow, marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb'}}>
                <span style={styles.summaryLabel}>Cryptocurrency</span>
                <span style={styles.summaryValue}>
                  {getSelectedCrypto().label} ({getSelectedCrypto().symbol})
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Network</span>
                <span style={styles.summaryValue}>{getSelectedNetwork()?.label}</span>
              </div>
              <div style={styles.summaryRow} >
                <span style={styles.summaryLabel}>Destination</span>
                <span style={styles.summaryValue}>Oakline Bank Treasury</span>
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
                📝 Transaction Verification (Required)
              </h4>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Transaction Hash / ID <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  Enter the transaction hash from your wallet (also called TX ID or Transaction ID)
                </p>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x... or bc1... (varies by blockchain)"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    border: txHash.length > 0 && txHash.length < 10 ? '2px solid #dc2626' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                {txHash.length > 0 && txHash.length < 10 && (
                  <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Transaction hash is too short
                  </p>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  Proof of Payment (Optional)
                </label>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#64748b',
                  marginBottom: '0.5rem'
                }}>
                  Upload a screenshot of your transaction (PNG, JPG, or PDF, max 5MB)
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

            <div style={styles.buttonGroup}>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={submitting}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                ← Back
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                style={{ 
                  ...styles.button, 
                  ...styles.primaryButton,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Processing...' : 'Confirm Payment'}
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