
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
        .eq('account_number', '7500310001')
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
            You're depositing your 10% loan collateral directly to Oakline Bank Treasury (Account: 7500310001) for loan processing.
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
              <p><strong>Destination:</strong> Oakline Bank Treasury (7500310001)</p>
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
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const QRCode = dynamic(() => import('react-qr-code').then(mod => mod.default || mod), { ssr: false });

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function LoanCryptoDeposit() {
  const [user, setUser] = useState(null);
  const [loanDetails, setLoanDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { loan_id, amount } = router.query;

  const [depositForm, setDepositForm] = useState({
    crypto_type: 'BTC',
    network_type: '',
    amount: ''
  });

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
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    if (amount) {
      setDepositForm(prev => ({ ...prev, amount }));
    }
  }, [amount]);

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

      if (loan_id) {
        const { data: loan, error } = await supabase
          .from('loans')
          .select('*')
          .eq('id', loan_id)
          .eq('user_id', session.user.id)
          .single();

        if (!error && loan) {
          setLoanDetails(loan);
        }
      }
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
      const { data: wallets, error: walletError } = await supabase
        .from('user_crypto_wallets')
        .select('crypto_type, network_type, wallet_address')
        .eq('user_id', user.id);

      if (walletError) {
        console.error('Error fetching user wallets:', walletError);
        setMessage('Error loading wallet information. Please contact support.');
        setMessageType('error');
        return;
      }

      if (wallets && wallets.length > 0) {
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

      if (adminError) {
        console.error('Error fetching admin wallets:', adminError);
      }

      if (adminWallets && adminWallets.length > 0) {
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
      setMessage('Unexpected error loading wallet. Please try again.');
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
        .eq('account_number', '9900000001')
        .single();

      if (treasuryError || !treasuryAccount) {
        throw new Error('Treasury account not found');
      }

      // Create crypto deposit record tagged for loan requirement
      const { data, error } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_id: treasuryAccount.id,
          crypto_type: depositForm.crypto_type,
          network_type: depositForm.network_type,
          wallet_address: walletAddress,
          amount: parseFloat(depositForm.amount),
          status: 'pending',
          purpose: 'loan_requirement',
          metadata: { loan_id: loan_id }
        }])
        .select()
        .single();

      if (error) {
        console.error('Deposit insertion error:', error);
        throw new Error(error.message || 'Deposit submission failed');
      }

      if (!data || !data.id) {
        throw new Error('Failed to create deposit record');
      }

      // Update loan status to deposit_pending_approval
      if (loan_id) {
        await supabase
          .from('loans')
          .update({
            status: 'deposit_pending_approval',
            deposit_method: 'crypto',
            updated_at: new Date().toISOString()
          })
          .eq('id', loan_id);
      }

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
        purpose: 'Loan Requirement Deposit',
        treasuryAccount: '9900000001',
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
    return networkConfigs[depositForm.crypto_type] || [];
  };

  const getSelectedNetwork = () => {
    return getAvailableNetworks().find(n => n.value === depositForm.network_type);
  };

  const printReceipt = () => {
    window.print();
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
    loanInfoCard: {
      backgroundColor: '#eff6ff',
      border: '2px solid #bfdbfe',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    },
    loanInfoTitle: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: '1rem'
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
          <title>Loan Deposit - Oakline Bank</title>
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
        <title>Loan Collateral Deposit - Oakline Bank</title>
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
          <Link href="/loan/dashboard" style={styles.backButton}>
            ← Back to Loan Dashboard
          </Link>
        </div>
      </div>

      <main style={styles.main}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>Loan Requirement Deposit</h1>
          <p style={styles.welcomeSubtitle}>
            You're depositing your 10% loan collateral directly to Oakline Bank Treasury for loan processing.
          </p>
        </div>

        <div style={styles.loanInfoCard}>
          <h3 style={styles.loanInfoTitle}>💼 Important Information</h3>
          <p style={{ fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.5rem' }}>
            <strong>Deposit Destination:</strong> Treasury Account (9900000001)
          </p>
          <p style={{ fontSize: '0.95rem', color: '#1e40af', marginBottom: '0.5rem' }}>
            <strong>Purpose:</strong> Loan Requirement (10% Collateral)
          </p>
          <p style={{ fontSize: '0.95rem', color: '#1e40af' }}>
            <strong>Required Amount:</strong> {amount ? formatCurrency(amount) : 'N/A'}
          </p>
        </div>

        <div style={styles.progressSteps}>
          {[
            { num: 1, label: 'Deposit Details' },
            { num: 2, label: 'Send Payment' },
            { num: 3, label: 'Confirm' }
          ].map((step) => (
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
            <h2 style={styles.sectionTitle}>Select Cryptocurrency & Network</h2>

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

            {depositForm.crypto_type && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Network</label>
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
                    </div>
                  ))}
                </div>
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
                  readOnly={!!amount}
                />
              </div>
            </div>

            <div style={styles.buttonGroup}>
              <button
                onClick={handleNextStep}
                style={{
                  ...styles.button,
                  ...styles.primaryButton
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
                        padding: '0.75rem 1.5rem'
                      }}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                </div>

                <div style={styles.warningBox}>
                  <div style={styles.warningContent}>
                    <div style={styles.warningIcon}>⚠️</div>
                    <div>
                      <h3 style={styles.warningTitle}>Important Instructions</h3>
                      <ul style={styles.warningList}>
                        <li><strong>This deposit goes directly to Treasury Account (9900000001)</strong></li>
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
                Please confirm that you have sent the cryptocurrency payment. Once confirmed, we will begin processing your loan deposit.
              </p>
            </div>

            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Deposit Summary</h3>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Destination Account</span>
                <span style={{
                  ...styles.summaryValue,
                  fontFamily: 'monospace',
                  color: '#059669'
                }}>
                  Treasury (9900000001)
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Purpose</span>
                <span style={styles.summaryValue}>
                  Loan Requirement (10% Collateral)
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
          </div>
        )}
      </main>

      {showReceipt && receiptData && (
        <div style={styles.receiptOverlay}>
          <div style={styles.receipt} className="receipt-print">
            <div style={styles.receiptHeader}>
              <h2 style={styles.receiptTitle}>Loan Deposit Receipt</h2>
              <p style={styles.receiptSubtitle}>Oakline Bank - Treasury Deposit</p>
              <div style={styles.receiptSuccessBadge}>
                ✓ Loan Deposit Submitted Successfully
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
                <span style={styles.receiptLabel}>Date & Time</span>
                <span style={styles.receiptValue}>{receiptData.date}</span>
              </div>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Purpose</span>
                <span style={styles.receiptValue}>{receiptData.purpose}</span>
              </div>
            </div>

            <div style={styles.receiptHighlight}>
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Treasury Account</span>
                <span style={{ ...styles.receiptValue, fontFamily: 'monospace', color: '#059669' }}>
                  {receiptData.treasuryAccount}
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
              backgroundColor: '#eff6ff',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #bfdbfe'
            }}>
              <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, lineHeight: '1.6' }}>
                <strong>🏦 Next Steps:</strong> Your deposit will be verified and your loan application will be marked as "deposit_pending_approval". You will receive an email notification once your deposit is confirmed and your loan enters the review process.
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
                  router.push('/loan/dashboard');
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
