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

  const networkConfigs = {
    USDT: [
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.005, icon: '🟡' },
      { value: 'TRC20', label: 'TRON (TRC20)', confirmations: 20, minDeposit: 0.005, icon: '🔴' },
      { value: 'ERC20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: 0.005, icon: '⚪' }
    ],
    ETH: [
      { value: 'ERC20', label: 'Ethereum (ERC20)', confirmations: 6, minDeposit: 0.00005, icon: '⚪' },
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.00005, icon: '🟡' }
    ],
    BNB: [
      { value: 'BEP20', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.0005, icon: '🟡' }
    ],
    BTC: [
      { value: 'Bitcoin Mainnet', label: 'Bitcoin Mainnet', confirmations: 1, minDeposit: 0.0001, icon: '🟠' },
      { value: 'BSC (BEP20)', label: 'BSC (BEP20)', confirmations: 60, minDeposit: 0.0001, icon: '🟡' }
    ]
  };

  const cryptoTypes = [
    { value: 'BTC', label: 'Bitcoin', icon: '₿', color: '#F7931A' },
    { value: 'USDT', label: 'Tether', icon: '₮', color: '#26A17B' },
    { value: 'ETH', label: 'Ethereum', icon: 'Ξ', color: '#627EEA' },
    { value: 'BNB', label: 'Binance Coin', icon: 'B', color: '#F3BA2F' }
  ];

  useEffect(() => {
    if (user && loan_id) {
      fetchLoanDetails();
    }
  }, [user, loan_id]);

  useEffect(() => {
    if (amount) {
      setDepositForm(prev => ({ ...prev, amount }));
    }
  }, [amount]);

  useEffect(() => {
    if (depositForm.crypto_type && depositForm.network_type && currentStep >= 2) {
      fetchWalletAddress();
    }
  }, [depositForm.crypto_type, depositForm.network_type, currentStep]);

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
    try {
      const { data: wallets, error: walletError } = await supabase
        .from('user_crypto_wallets')
        .select('crypto_type, network_type, wallet_address')
        .eq('user_id', user.id);

      if (!walletError && wallets && wallets.length > 0) {
        const matchingWallet = wallets.find(w => 
          w.crypto_type === depositForm.crypto_type && 
          w.network_type === depositForm.network_type
        );

        if (matchingWallet && matchingWallet.wallet_address) {
          setWalletAddress(matchingWallet.wallet_address);
          return;
        }
      }

      const { data: adminWallets, error: adminError } = await supabase
        .from('admin_assigned_wallets')
        .select('crypto_type, network_type, wallet_address')
        .eq('user_id', user.id);

      if (!adminError && adminWallets && adminWallets.length > 0) {
        const matchingAdminWallet = adminWallets.find(w => 
          w.crypto_type === depositForm.crypto_type && 
          w.network_type === depositForm.network_type
        );

        if (matchingAdminWallet && matchingAdminWallet.wallet_address) {
          setWalletAddress(matchingAdminWallet.wallet_address);
        }
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setMessage('Error loading wallet. Please try again.');
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
      // Get treasury account
      const { data: treasuryAccount, error: treasuryError } = await supabase
        .from('accounts')
        .select('id')
        .eq('account_number', '9900000001') // Corrected account number
        .single();

      if (treasuryError || !treasuryAccount) {
        throw new Error('Treasury account not found. Please contact support.');
      }

      // Create crypto deposit record with purpose = 'loan_requirement'
      const { data: depositData, error: depositError } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_id: treasuryAccount.id,
          crypto_type: depositForm.crypto_type,
          network_type: depositForm.network_type,
          wallet_address: walletAddress,
          amount: parseFloat(depositForm.amount),
          status: 'pending',
          metadata: {
            purpose: 'loan_requirement',
            loan_id: loan_id,
            treasury_deposit: true
          }
        }])
        .select()
        .single();

      if (depositError) {
        throw new Error(depositError.message || 'Deposit submission failed');
      }

      // Update loan status to deposit_pending_approval
      const { error: loanUpdateError } = await supabase
        .from('loans')
        .update({
          deposit_method: 'crypto',
          status: 'deposit_pending_approval',
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
          title: 'Loan Collateral Deposit Submitted',
          message: `Your 10% loan collateral deposit of $${parseFloat(depositForm.amount).toLocaleString()} has been submitted. Your loan will be reviewed after deposit confirmation.`,
          read: false
        }]);

      setMessage('Deposit submitted successfully! Your loan will be reviewed after confirmation.');
      setMessageType('success');

      setTimeout(() => {
        router.push('/loan/dashboard');
      }, 3000);

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
    return networkConfigs[depositForm.crypto_type] || [];
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

        <div style={styles.treasuryBanner}>
          <div style={styles.treasuryTitle}>🏦 Direct Treasury Deposit</div>
          <p style={styles.treasuryText}>
            You're depositing your 10% loan collateral directly to Oakline Bank Treasury (Account: 9900000001) for loan processing.
            This deposit will be securely held and applied to your loan once approved.
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
                    </div>
                  ))}
                </div>
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
            ) : walletAddress ? (
              <>
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
                <p>No wallet assigned. Please contact support.</p>
                <button
                  onClick={() => setCurrentStep(1)}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  ← Go Back
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Confirm Payment</h2>
            <div style={{ marginBottom: '2rem' }}>
              <p><strong>Amount:</strong> ${parseFloat(depositForm.amount).toLocaleString()}</p>
              <p><strong>Cryptocurrency:</strong> {getSelectedCrypto()?.label}</p>
              <p><strong>Network:</strong> {getSelectedNetwork()?.label}</p>
              <p><strong>Destination:</strong> Oakline Bank Treasury (9900000001)</p>
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