import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
      <div style={{ width: '20px', height: '20px', border: '3px solid #e5e7eb', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span>Processing your deposit...</span>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function SuccessReceipt({ depositAmount, depositMethod, cryptoType, txHash, onClose }) {
  const receiptDate = new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div style={{
      backgroundColor: '#f0fdf4',
      border: '2px solid #16a34a',
      borderRadius: '16px',
      padding: '2rem',
      textAlign: 'center',
      marginBottom: '2rem'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#166534', marginBottom: '1rem' }}>
        Deposit Submitted Successfully!
      </h2>
      <p style={{ color: '#166534', marginBottom: '2rem', lineHeight: '1.6' }}>
        Your 10% loan deposit has been submitted to Oakline Bank Treasury and is now pending verification.
      </p>
      
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #d1d5db',
        borderRadius: '12px',
        padding: '1.5rem',
        textAlign: 'left',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
          <span style={{ fontWeight: '600', color: '#64748b' }}>Deposit Amount:</span>
          <span style={{ fontWeight: '700', color: '#1e293b' }}>${parseFloat(depositAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        {depositMethod === 'crypto' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '600', color: '#64748b' }}>Payment Method:</span>
              <span style={{ fontWeight: '700', color: '#1e293b' }}>Cryptocurrency</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: '600', color: '#64748b' }}>Crypto Type:</span>
              <span style={{ fontWeight: '700', color: '#1e293b' }}>{cryptoType}</span>
            </div>
            {txHash && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: '600', color: '#64748b' }}>Transaction Hash:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e293b', wordBreak: 'break-all' }}>{txHash.substring(0, 20)}...</span>
              </div>
            )}
          </>
        )}
        
        {depositMethod === 'balance' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: '600', color: '#64748b' }}>Payment Method:</span>
            <span style={{ fontWeight: '700', color: '#1e293b' }}>Account Transfer</span>
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: '600', color: '#64748b' }}>Submitted:</span>
          <span style={{ fontWeight: '700', color: '#1e293b' }}>{receiptDate}</span>
        </div>
      </div>

      <div style={{
        backgroundColor: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '2rem',
        fontSize: '0.9rem',
        color: '#1e40af',
        lineHeight: '1.6'
      }}>
        ℹ️ Your deposit is now pending verification. Our Loan Department will verify your deposit on the blockchain. This typically takes 1-3 business days. You'll receive email notifications at each stage of the verification process.
      </div>

      <button
        onClick={onClose}
        style={{
          backgroundColor: '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Go to Loan Dashboard
      </button>
    </div>
  );
}

function LoanDetailsCard({ loanDetails, minDeposit }) {
  if (!loanDetails) return null;

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>📋 Loan Details</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Loan Amount</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#059669' }}>
            ${parseFloat(loanDetails.principal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Minimum 10% Deposit</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#10b981' }}>
            ${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Loan Term</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{loanDetails.term_months} months</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Interest Rate</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{parseFloat(loanDetails.interest_rate || 0).toFixed(2)}%</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Loan Type</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', textTransform: 'capitalize' }}>{loanDetails.loan_type}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Status</div>
          <div style={{ 
            fontSize: '1rem', 
            fontWeight: '700', 
            color: loanDetails.status === 'pending' ? '#d97706' : '#10b981',
            textTransform: 'capitalize'
          }}>
            {loanDetails.status}
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#ecfdf5',
        border: '2px solid #10b981',
        borderRadius: '12px',
        padding: '1.5rem',
        marginTop: '1.5rem',
        lineHeight: '1.8'
      }}>
        <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#059669', marginBottom: '0.75rem' }}>⏳ Loan Ready for Activation</div>
        <div style={{ fontSize: '0.95rem', color: '#1e7e34', marginBottom: '1rem' }}>
          Your application has been processed. To activate and disburse your loan, submit a 10% security deposit. Here's what you need to do:
        </div>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#1e5631' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>📋 Deposit Amount Required:</div>
          <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#059669', marginBottom: '0.75rem' }}>
            Base: ${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} + Network Fees
          </div>
          <div style={{ fontSize: '0.85rem', color: '#1e7e34' }}>Choose your crypto and network below to see the total including fees</div>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#1e7e34', marginBottom: '0.5rem' }}>
          <strong>📌 Step 1:</strong> Select your cryptocurrency and network
        </div>
        <div style={{ fontSize: '0.9rem', color: '#1e7e34', marginBottom: '0.5rem' }}>
          <strong>📌 Step 2:</strong> Send the exact total amount (base + network fee)
        </div>
        <div style={{ fontSize: '0.9rem', color: '#1e7e34', marginBottom: '0.5rem' }}>
          <strong>📌 Step 3:</strong> Upload your transaction hash or payment proof
        </div>
        <div style={{ fontSize: '0.9rem', color: '#1e7e34' }}>
          <strong>📌 Step 4:</strong> We'll verify and disburse your loan within hours
        </div>
      </div>
    </div>
  );
}

function LoanDepositCryptoContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { loan_id, account_id, deposit_type } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loanDetails, setLoanDetails] = useState(null);
  const [minDeposit, setMinDeposit] = useState(0.00);
  const [walletAddress, setWalletAddress] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [successReceipt, setSuccessReceipt] = useState(null);

  const [depositForm, setDepositForm] = useState({
    crypto_type: '',
    network_type: '',
    amount: ''
  });
  const [selectedLoanWallet, setSelectedLoanWallet] = useState(null);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkFeePercent, setNetworkFeePercent] = useState(0);
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [calculatedNetAmount, setCalculatedNetAmount] = useState(0);
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('crypto');
  const [userAccounts, setUserAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const networkSectionRef = useRef(null);
  const [submitModal, setSubmitModal] = useState({ show: false, status: 'loading', message: '' });

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
        } else if (account_id && deposit_type === 'account_opening') {
          fetchAccountOpeningFeeDetails();
          fetchUserAccounts();
        }
      }
    };
    
    checkVerification();
    return () => {
      supabase.channel(`loan-deposit-${loan_id}`).unsubscribe();
    };
  }, [user, loan_id, account_id]);

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
        const minDepositAmount = data.principal ? parseFloat(data.principal) * 0.1 : 0;
        setMinDeposit(minDepositAmount > 0 ? minDepositAmount : 0.00);
        setDepositForm(prev => ({ ...prev, amount: minDepositAmount > 0 ? minDepositAmount.toFixed(2) : '0.00' }));
      } else {
        console.error('Loan fetch error:', error);
        setMessage('Failed to load loan details. Please try again.');
        setMessageType('error');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching loan details:', err);
      setMessage('Error loading loan details.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountOpeningFeeDetails = async () => {
    try {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('opening_fee')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .single();

      if (!accountError && accountData) {
        const feeAmount = accountData.opening_fee || 0;
        setMinDeposit(feeAmount > 0 ? feeAmount : 50);
        setDepositForm(prev => ({ ...prev, amount: (feeAmount > 0 ? feeAmount : 50).toFixed(2) }));
        setLoanDetails({
          principal: feeAmount,
          id: account_id,
          loan_type: 'account_opening',
          term_months: 0,
          interest_rate: 0,
          status: 'pending',
          label: 'Account Opening Fee'
        });
      } else {
        const defaultFee = 50;
        setMinDeposit(defaultFee);
        setDepositForm(prev => ({ ...prev, amount: defaultFee.toFixed(2) }));
        setLoanDetails({
          principal: defaultFee,
          id: account_id,
          loan_type: 'account_opening',
          term_months: 0,
          interest_rate: 0,
          status: 'pending',
          label: 'Account Opening Fee'
        });
      }
    } catch (err) {
      console.error('Error fetching account opening fee:', err);
      const defaultFee = 50;
      setMinDeposit(defaultFee);
      setDepositForm(prev => ({ ...prev, amount: defaultFee.toFixed(2) }));
    } finally {
      setLoading(false);
    }
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
        // Don't auto-select - let users choose their network
      }
    } catch (error) {
      console.error('Error fetching networks:', error);
    } finally {
      setLoadingNetworks(false);
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
        setMessage('No available loan wallet. Please try another payment method.');
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
    const totalAmount = depositAmount + fee;
    setCalculatedFee(fee);
    setCalculatedNetAmount(Math.max(0, totalAmount));
  }, [depositForm.amount, networkFeePercent]);

  const handleCryptoChange = (crypto) => {
    setDepositForm({ ...depositForm, crypto_type: crypto, network_type: '' });
    setWalletAddress('');
    
    // Auto-scroll to network section after a short delay to allow rendering
    setTimeout(() => {
      if (networkSectionRef.current) {
        networkSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleNetworkChange = (network) => {
    setDepositForm({ ...depositForm, network_type: network });
    const selectedNetwork = availableNetworks.find(n => n.value === network);
    if (selectedNetwork) {
      const feePercent = selectedNetwork.fee || 0;
      setNetworkFeePercent(feePercent);
      // Auto-fill with just the base amount (fee will be calculated separately)
      setDepositForm(prev => ({ ...prev, amount: minDeposit.toFixed(2) }));
    }
    setWalletAddress('');
  };

  const handleNextStep = () => {
    setMessage('');
    if (currentStep === 1) {
      const currentAmount = parseFloat(depositForm.amount) || 0;
      if (currentAmount < minDeposit) {
        setMessage(`Deposit amount must be at least $${minDeposit.toFixed(2)} (10% of your loan)`);
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
        // Check that base deposit amount meets minimum
        if (currentAmount < minDeposit) {
          setMessage(`Deposit amount must be at least $${minDeposit.toFixed(2)}`);
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
        if (!accountData || accountData.balance < currentAmount) {
          setMessage('Insufficient balance in selected account');
          setMessageType('error');
          return;
        }
        setCurrentStep(3);
      }
    } else if (currentStep === 2 && paymentMethod === 'crypto') {
      if (!txHash && !proofFile) {
        setMessage('Please provide either a transaction hash or proof of payment file');
        setMessageType('error');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleConfirmPayment = async () => {
    setSubmitting(true);
    setSubmitModal({ show: true, status: 'loading', message: 'Processing your deposit...' });
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

        setSuccessReceipt({
          amount: depositAmount,
          method: 'balance'
        });
      } else {
        if (!txHash && !proofFile) {
          throw new Error('Please provide either a transaction hash or proof of payment file');
        }
        
        if (txHash && txHash.trim().length < 10) {
          throw new Error('Please enter a valid transaction hash (at least 10 characters)');
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

        const metadata = {
          treasury_deposit: true,
          loan_id: loan_id,
          loan_wallet_address: walletAddress,
          deposit_source: 'loan_deposit_page'
        };

        // Store proof file info if provided
        if (proofFile) {
          metadata.proof_file_name = proofFile.name;
          metadata.proof_file_size = proofFile.size;
          metadata.proof_file_type = proofFile.type;
          metadata.proof_file_submitted_at = new Date().toISOString();
        }

        const depositData = {
          user_id: user.id,
          account_id: treasuryAccount.id,
          crypto_asset_id: cryptoAsset.id,
          loan_wallet_id: selectedLoanWallet.id,
          amount: parseFloat(depositForm.amount),
          fee: parseFloat(calculatedFee.toFixed(2)),
          net_amount: parseFloat(calculatedNetAmount.toFixed(2)),
          status: 'pending',
          purpose: 'loan_requirement',
          metadata: metadata
        };

        // Only add tx_hash if it was provided
        if (txHash && txHash.trim()) {
          depositData.tx_hash = txHash.trim();
        }

        const { error: depositError } = await supabase
          .from('crypto_deposits')
          .insert([depositData]);

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

        setSubmitModal({ show: true, status: 'success', message: '✅ Deposit submitted successfully! Your loan will be activated within hours.' });
        setTimeout(() => {
          setSubmitModal({ show: false, status: 'loading', message: '' });
          setSuccessReceipt({
            amount: depositForm.amount,
            method: 'crypto',
            cryptoType: depositForm.crypto_type,
            txHash: txHash
          });
        }, 2500);
      }
    } catch (error) {
      console.error('Error:', error);
      setSubmitModal({ show: true, status: 'error', message: error.message || 'Submission failed. Please try again.' });
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard!');
    setMessageType('info');
    setTimeout(() => setMessage(''), 2000);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (successReceipt) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>Loan Deposit</h1>
        </div>
        <div style={{ maxWidth: '800px', margin: '-40px auto 0', padding: '0 20px 60px' }}>
          <SuccessReceipt
            depositAmount={successReceipt.amount}
            depositMethod={successReceipt.method}
            cryptoType={successReceipt.cryptoType}
            txHash={successReceipt.txHash}
            onClose={() => router.push('/loan/dashboard')}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        color: 'white',
        padding: '2rem 2rem 4rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem', margin: 0 }}>Loan Collateral Deposit</h1>
        <p style={{ fontSize: '0.95rem', opacity: '0.9', marginBottom: 0, fontWeight: '500' }}>Secure your loan with a 10% deposit</p>
      </div>

      <div style={{ maxWidth: '800px', margin: '-60px auto 0', padding: '0 20px 60px' }}>
        {message && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            fontWeight: '500',
            backgroundColor: messageType === 'error' ? '#fef2f2' : messageType === 'success' ? '#f0fdf4' : '#eff6ff',
            color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#166534' : '#1e40af',
            borderLeft: `4px solid ${messageType === 'error' ? '#dc2626' : messageType === 'success' ? '#16a34a' : '#1e40af'}`
          }}>
            {message}
          </div>
        )}

        {loanDetails && <LoanDetailsCard loanDetails={loanDetails} minDeposit={minDeposit} />}

        {currentStep === 1 && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' }}>Select Payment Method</h2>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPaymentMethod('crypto')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: paymentMethod === 'crypto' ? '#10b981' : '#e5e7eb',
                  color: paymentMethod === 'crypto' ? '#fff' : '#1f2937'
                }}
              >
                🪙 Pay with Crypto
              </button>
              <button
                onClick={() => setPaymentMethod('balance')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: paymentMethod === 'balance' ? '#10b981' : '#e5e7eb',
                  color: paymentMethod === 'balance' ? '#fff' : '#1f2937'
                }}
              >
                💰 Pay from Account
              </button>
            </div>

            {paymentMethod === 'crypto' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>Select Cryptocurrency</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                  {cryptoTypes.map(crypto => (
                    <div
                      key={crypto.value}
                      onClick={() => handleCryptoChange(crypto.value)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '12px',
                        border: depositForm.crypto_type === crypto.value ? '2px solid #10b981' : '2px solid #e5e7eb',
                        backgroundColor: depositForm.crypto_type === crypto.value ? '#f0fdf4' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{crypto.icon}</div>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{crypto.label}</div>
                    </div>
                  ))}
                </div>

                {depositForm.crypto_type && (
                  <div ref={networkSectionRef}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>Select Network</h3>
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
                            {network.fee > 0 && <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>Fee: {network.fee}%</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Deposit Amount (USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    min={isNaN(minDeposit) ? '0' : minDeposit}
                    value={depositForm.amount || minDeposit.toFixed(2)}
                    onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                    Minimum: ${minDeposit.toFixed(2)}
                  </div>
                  {networkFeePercent > 0 && depositForm.amount && (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                        <span style={{ color: '#334155' }}>Base Amount:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>${parseFloat(depositForm.amount).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.95rem', paddingBottom: '0.5rem', borderBottom: '1px solid #d1d5db' }}>
                        <span style={{ color: '#334155' }}>Network Fee ({networkFeePercent}%):</span>
                        <span style={{ fontWeight: '600', color: '#10b981' }}>${calculatedFee.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: '700' }}>
                        <span style={{ color: '#166534' }}>Total to Send:</span>
                        <span style={{ color: '#059669' }}>${calculatedNetAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'balance' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>Select Account</h3>
                <div style={{ marginBottom: '1.5rem' }}>
                  <select
                    value={selectedAccount || ''}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="">Choose an account...</option>
                    {userAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.account_type.toUpperCase()} - {account.account_number} (Balance: ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAccount && (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem'
                  }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>📋 Summary</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ color: '#64748b' }}>Required Deposit:</span>
                      <span style={{ fontWeight: '700', color: '#10b981' }}>${minDeposit.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ color: '#64748b' }}>Account Balance:</span>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>
                        ${parseFloat(userAccounts.find(a => a.id === selectedAccount)?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Loan Amount:</span>
                      <span style={{ fontWeight: '700', color: '#059669' }}>${parseFloat(loanDetails.principal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button
                onClick={() => router.push('/loan/dashboard')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  border: '2px solid #e2e8f0'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNextStep}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none'
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && paymentMethod === 'crypto' && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' }}>Send Cryptocurrency Payment</h2>
            {loadingWallet ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <LoadingSpinner />
              </div>
            ) : walletAddress ? (
              <div>
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  textAlign: 'center',
                  color: '#1e40af',
                  fontSize: '0.9rem'
                }}>
                  ⚠️ This is a dedicated loan deposit wallet. Do not use this address for general deposits.
                </div>


                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '8px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  lineHeight: '1.6'
                }}>
                  {walletAddress}
                </div>

                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '1rem'
                  }}
                >
                  Copy Address
                </button>

                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <p style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '1rem', marginTop: 0 }}>✓ Provide either a transaction hash OR upload proof of payment (both optional but at least one required)</p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Transaction Hash (Optional):</label>
                  <input
                    type="text"
                    placeholder="Paste your transaction hash here (starts with 0x or similar)"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                    The confirmation ID from your wallet after sending funds
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Proof of Payment (Optional):</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Upload a screenshot or receipt showing the transaction (JPEG, PNG, or PDF)
                  </div>
                  {proofFile && <div style={{ fontSize: '0.85rem', color: '#10b981', marginTop: '0.5rem' }}>✓ File selected: {proofFile.name}</div>}
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => setCurrentStep(1)}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: '#f8fafc',
                      color: '#64748b',
                      border: '2px solid #e2e8f0'
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: !txHash && !proofFile ? 'not-allowed' : 'pointer',
                      backgroundColor: !txHash && !proofFile ? '#d1d5db' : '#10b981',
                      color: 'white',
                      border: 'none',
                      opacity: !txHash && !proofFile ? 0.6 : 1
                    }}
                    disabled={!txHash && !proofFile}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#991b1b', backgroundColor: '#fef2f2', borderRadius: '12px' }}>
                Error loading wallet. Please try again.
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' }}>Confirm Deposit</h2>

            <div style={{
              backgroundColor: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <span style={{ fontWeight: '500', color: '#334155' }}>Payment Method:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{paymentMethod === 'crypto' ? '🪙 Cryptocurrency' : '💰 Account Transfer'}</span>
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
                <span style={{ fontWeight: '500', color: '#334155' }}>Deposit Amount:</span>
                <span style={{ fontWeight: '600', color: '#10b981', fontSize: '1.1rem' }}>${parseFloat(depositForm.amount || minDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {paymentMethod === 'crypto' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontWeight: '500', color: '#334155' }}>Proof of Payment:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>{proofFile ? `✓ ${proofFile.name}` : txHash ? '✓ Hash provided' : '—'}</span>
                </div>
              )}

              {paymentMethod === 'crypto' && walletAddress && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontWeight: '500', color: '#334155' }}>Wallet Address:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all', textAlign: 'right', flex: 1, paddingLeft: '1rem' }}>{walletAddress}</span>
                </div>
              )}

              {paymentMethod === 'crypto' && networkFeePercent > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Network Fee ({networkFeePercent}%):</span>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>${calculatedFee.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                    <span style={{ fontWeight: '500', color: '#334155' }}>Total Amount to Send (with fees):</span>
                    <span style={{ fontWeight: '600', color: '#059669', fontSize: '1.1rem' }}>${calculatedNetAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setCurrentStep(paymentMethod === 'crypto' ? 2 : 1)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  backgroundColor: '#f8fafc',
                  color: '#64748b',
                  border: '2px solid #e2e8f0',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                Back
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {submitting ? 'Processing...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        )}

        {submitModal.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '2rem',
              textAlign: 'center',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}>
              {submitModal.status === 'loading' && (
                <>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #10b981',
                    borderRadius: '50%',
                    margin: '0 auto 1rem',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <style jsx>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
                  <p style={{ fontSize: '1.1rem', color: '#1e293b', fontWeight: '600', margin: 0 }}>{submitModal.message}</p>
                </>
              )}

              {submitModal.status === 'success' && (
                <>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '2rem'
                  }}>✓</div>
                  <h2 style={{ fontSize: '1.4rem', color: '#166534', fontWeight: '700', margin: '0.5rem 0' }}>Success!</h2>
                  <p style={{ fontSize: '1rem', color: '#1e293b', margin: '1rem 0 0 0' }}>{submitModal.message}</p>
                </>
              )}

              {submitModal.status === 'error' && (
                <>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#fef2f2',
                    border: '2px solid #ef4444',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '2rem'
                  }}>✕</div>
                  <h2 style={{ fontSize: '1.4rem', color: '#991b1b', fontWeight: '700', margin: '0.5rem 0' }}>Error!</h2>
                  <p style={{ fontSize: '1rem', color: '#1e293b', margin: '1rem 0 1.5rem 0' }}>{submitModal.message}</p>
                  <button
                    onClick={() => setSubmitModal({ show: false, status: 'loading', message: '' })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Try Again
                  </button>
                </>
              )}
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
