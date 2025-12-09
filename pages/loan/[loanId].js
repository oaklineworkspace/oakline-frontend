import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import PaymentHistory from '../../components/loan/PaymentHistory';
import Amortization from '../../components/loan/AmortizationSchedule';
import AutoPaymentManager from '../../components/loan/AutoPaymentManager';

function LoanDetailContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { loanId, action } = router.query;

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    account_id: '',
    payment_type: 'manual'
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 768px) {
        .loan-detail-header-top {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 1rem !important;
        }
        .loan-detail-tabs {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .loan-detail-tabs button {
          white-space: nowrap;
          min-width: 100px;
        }
        .loan-info-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [accounts, setAccounts] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [documents, setDocuments] = useState([]);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkFeePercent, setNetworkFeePercent] = useState(0);
  const calculatedFee = paymentForm.amount ? (parseFloat(paymentForm.amount) * networkFeePercent / 100) : 0;
  const totalAmountWithFee = paymentForm.amount ? (parseFloat(paymentForm.amount) + calculatedFee) : 0;

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
    if (user && loanId) {
      fetchLoanDetails();
      fetchUserAccounts();
      subscribeToLoanUpdates();
    }

    return () => {
      const channel = supabase.channel('loan_updates');
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, loanId]);

  useEffect(() => {
    if (action === 'payment' && loan) {
      setPaymentModal(true);
      setPaymentForm({
        ...paymentForm,
        amount: calculateMonthlyPayment(loan).toFixed(2)
      });
    }
  }, [action, loan]);

  const fetchLoanDetails = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .eq('user_id', user.id)
        .single();

      if (loanError) {
        throw loanError;
      }

      const { data: deposits, error: depositsError } = await supabase
        .from('crypto_deposits')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'loan_requirement')
        .order('created_at', { ascending: false });

      const data = {
        ...loanData,
        deposit_transactions: depositsError ? [] : (deposits || [])
      };

      const error = null;

      if (error) {
        console.error("Error fetching loan details:", error);
        showToast('Failed to fetch loan details', 'error');
        router.push('/loans');
        return;
      }

      setLoan(data);

      if (data.documents && Array.isArray(data.documents)) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Error fetching loan details:', err);
      showToast('An error occurred while fetching loan details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('balance', { ascending: false });

      if (!error && data) {
        setAccounts(data);
        if (data.length > 0) {
          setPaymentForm(prev => ({ ...prev, account_id: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const subscribeToLoanUpdates = () => {
    supabase
      .channel('loan_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loans',
          filter: `id=eq.${loanId}`
        },
        (payload) => {
          console.log('Loan update received:', payload);
          setLoan(prevLoan => ({ ...prevLoan, ...payload.new }));
        }
      )
      .subscribe();
  };

  const calculateMonthlyPayment = (loanData) => {
    if (!loanData) return 0;
    if (loanData.monthly_payment_amount) {
      return parseFloat(loanData.monthly_payment_amount);
    }

    const principal = parseFloat(loanData.principal);
    const monthlyRate = parseFloat(loanData.interest_rate) / 100 / 12;
    const numPayments = parseInt(loanData.term_months);

    if (monthlyRate === 0) {
      return principal / numPayments;
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment;
  };

  const [walletAddress, setWalletAddress] = useState('');
  const [selectedLoanWallet, setSelectedLoanWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [cryptoPaymentModal, setCryptoPaymentModal] = useState(false);
  const [paymentProof, setPaymentProof] = useState({ txHash: '', proofFile: null });
  const [submittingProof, setSubmittingProof] = useState(false);

  const handlePaymentCryptoChange = (crypto) => {
    setPaymentForm({ ...paymentForm, crypto_type: crypto, network_type: '' });
    setAvailableNetworks([]);
    setWalletAddress('');
    setSelectedLoanWallet(null);
  };

  const handlePaymentNetworkChange = async (network) => {
    setPaymentForm({ ...paymentForm, network_type: network });
    const selectedNetwork = availableNetworks.find(n => n.value === network);
    if (selectedNetwork) {
      setNetworkFeePercent(selectedNetwork.fee || 0);
    }
    await fetchLoanCryptoWallets(paymentForm.crypto_type, network);
  };

  const fetchLoanCryptoWallets = async (cryptoType, networkType) => {
    if (!cryptoType || !networkType) {
      setWalletAddress('');
      setSelectedLoanWallet(null);
      return;
    }

    setLoadingWallet(true);
    try {
      const { data: cryptoAsset } = await supabase
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', cryptoType)
        .eq('network_type', networkType)
        .eq('status', 'active')
        .single();

      if (!cryptoAsset) {
        showToast('Crypto asset configuration not found. Please contact support.', 'error');
        return;
      }

      const { data: loanWallets, error } = await supabase
        .from('loan_crypto_wallets')
        .select('id, wallet_address, memo')
        .eq('crypto_asset_id', cryptoAsset.id)
        .eq('status', 'active')
        .eq('purpose', 'loan_requirement');

      if (error || !loanWallets || loanWallets.length === 0) {
        showToast('No available loan wallet. Please try another payment method.', 'error');
        return;
      }

      const { data: depositPayment } = await supabase
        .from('loan_payments')
        .select('metadata')
        .eq('loan_id', loanId)
        .eq('is_deposit', true)
        .eq('deposit_method', 'crypto')
        .single();

      let selectedWallet;
      if (depositPayment?.metadata?.loan_wallet_address) {
        selectedWallet = loanWallets.find(w => w.wallet_address === depositPayment.metadata.loan_wallet_address);
      }

      if (!selectedWallet) {
        selectedWallet = loanWallets[Math.floor(Math.random() * loanWallets.length)];
      }

      setWalletAddress(selectedWallet.wallet_address);
      setSelectedLoanWallet(selectedWallet);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      showToast('Error loading wallet. Please try again.', 'error');
    } finally {
      setLoadingWallet(false);
    }
  };

  const fetchPaymentNetworks = async (cryptoType) => {
    if (!cryptoType) {
      setAvailableNetworks([]);
      return;
    }

    setLoadingNetworks(true);
    try {
      const { data: cryptoAssets, error } = await supabase
        .from('crypto_assets')
        .select('network_type, confirmations_required, deposit_fee_percent')
        .eq('crypto_type', cryptoType)
        .eq('status', 'active')
        .order('network_type');

      if (!error && cryptoAssets && cryptoAssets.length > 0) {
        const networks = cryptoAssets.map(asset => ({
          value: asset.network_type,
          label: asset.network_type,
          confirmations: asset.confirmations_required || 3,
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

  useEffect(() => {
    if (paymentForm.crypto_type) {
      fetchPaymentNetworks(paymentForm.crypto_type);
    }
  }, [paymentForm.crypto_type]);

  const handleMakePayment = async () => {
    setProcessing(true);
    try {
      const amount = parseFloat(paymentForm.amount);

      if (!amount || amount <= 0) {
        showToast('Please enter a valid payment amount', 'error');
        setProcessing(false);
        return;
      }

      if (amount > parseFloat(loan.remaining_balance)) {
        showToast('Payment amount cannot exceed remaining balance', 'error');
        setProcessing(false);
        return;
      }

      if (!paymentForm.account_id && paymentForm.payment_type !== 'crypto') {
        showToast('Please select an account', 'error');
        setProcessing(false);
        return;
      }

      if (paymentForm.payment_type === 'crypto') {
        if (!paymentForm.crypto_type) {
          showToast('Please select a cryptocurrency', 'error');
          setProcessing(false);
          return;
        }
        if (!paymentForm.network_type) {
          showToast('Please select a network', 'error');
          setProcessing(false);
          return;
        }
        if (!walletAddress || !selectedLoanWallet) {
          showToast('Wallet address not loaded. Please try again.', 'error');
          setProcessing(false);
          return;
        }

        setProcessing(false);
        setPaymentModal(false);
        setCryptoPaymentModal(true);
        return;
      }

      const selectedAccount = accounts.find(acc => acc.id === paymentForm.account_id);
      if (!selectedAccount || parseFloat(selectedAccount.balance) < amount) {
        showToast('Insufficient funds in selected account', 'error');
        setProcessing(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        setProcessing(false);
        return;
      }

      const response = await fetch('/api/user/make-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: loanId,
          account_id: paymentForm.account_id,
          amount: amount,
          payment_type: paymentForm.payment_type
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/loan/payment-success?reference=${data.payment.reference_number}&amount=${data.payment.amount}&loan_id=${loanId}`);
      } else {
        showToast(data.error || 'Failed to process payment', 'error');
      }
    } catch (err) {
      console.error('Error processing payment:', err);
      showToast('An error occurred while processing payment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const handleSubmitCryptoPayment = async () => {
    if (!paymentProof.txHash && !paymentProof.proofFile) {
      showToast('Please provide transaction hash or upload payment proof', 'error');
      return;
    }

    setSubmittingProof(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        setSubmittingProof(false);
        return;
      }

      let proofPath = null;
      if (paymentProof.proofFile) {
        const fileExt = paymentProof.proofFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('crypto_deposit_proofs')
          .upload(fileName, paymentProof.proofFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          showToast('Failed to upload proof file', 'error');
          setSubmittingProof(false);
          return;
        }
        proofPath = uploadData.path;
      }

      const response = await fetch('/api/loan/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: loanId,
          amount: parseFloat(paymentForm.amount),
          payment_method: 'crypto',
          crypto_data: {
            crypto_type: paymentForm.crypto_type,
            network_type: paymentForm.network_type,
            tx_hash: paymentProof.txHash || null,
            proof_path: proofPath,
            wallet_address: walletAddress,
            wallet_id: selectedLoanWallet.id,
            fee: calculatedFee
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Crypto payment submitted successfully. Pending verification.', 'success');
        setCryptoPaymentModal(false);
        setPaymentProof({ txHash: '', proofFile: null });
        fetchLoanDetails();
      } else {
        showToast(data.error || 'Failed to submit crypto payment', 'error');
      }
    } catch (err) {
      console.error('Error submitting crypto payment:', err);
      showToast('An error occurred while submitting payment', 'error');
    } finally {
      setSubmittingProof(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: '#f59e0b', bg: '#fef3c7', text: 'Pending' },
      pending_deposit: { color: '#f59e0b', bg: '#fef3c7', text: 'Pending Deposit' },
      under_review: { color: '#3b82f6', bg: '#dbeafe', text: 'Under Review' },
      approved: { color: '#10b981', bg: '#d1fae5', text: 'Approved' },
      active: { color: '#059669', bg: '#d1fae5', text: 'Active' },
      rejected: { color: '#ef4444', bg: '#fee2e2', text: 'Rejected' },
      completed: { color: '#6b7280', bg: '#f3f4f6', text: 'Completed' },
      paid: { color: '#059669', bg: '#d1fae5', text: 'Paid' },
      closed: { color: '#6b7280', bg: '#f3f4f6', text: 'Closed' }
    };

    const badge = badges[status] || { color: '#6b7280', bg: '#f3f4f6', text: status };

    return (
      <span style={{
        ...styles.statusBadge,
        color: badge.color,
        backgroundColor: badge.bg
      }}>
        {badge.text}
      </span>
    );
  };

  const getLoanTypeLabel = (type) => {
    const types = {
      personal: 'Personal Loan',
      personal_loan: 'Personal Loan',
      home_mortgage: 'Home Mortgage',
      auto_loan: 'Auto Loan',
      auto: 'Auto Loan',
      business: 'Business Loan',
      business_loan: 'Business Loan',
      student: 'Student Loan',
      student_loan: 'Student Loan',
      home_equity: 'Home Equity Loan',
      home_equity_loan: 'Home Equity Loan'
    };
    return types[type] || type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Loan';
  };

  const getLoanTypeIcon = (type) => {
    const icons = {
      personal: '👤',
      personal_loan: '👤',
      home_mortgage: '🏠',
      auto_loan: '🚗',
      auto: '🚗',
      business: '🏢',
      business_loan: '🏢',
      student: '🎓',
      student_loan: '🎓',
      home_equity: '🏡',
      home_equity_loan: '🏡'
    };
    return icons[type] || '💰';
  };

  const remainingBalance = parseFloat(loan?.remaining_balance || 0);
  const principal = parseFloat(loan?.principal || 0);
  const isFullyPaid = remainingBalance <= 0.50 || loan?.status === 'paid' || loan?.status === 'closed' || (principal > 0 && remainingBalance <= principal * 0.001);
  const progressPercent = isFullyPaid ? 100 : (loan?.term_months ? ((loan.payments_made || 0) / loan.term_months) * 100 : 0);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading loan details...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>Loan not found</h2>
          <Link href="/loans" style={styles.backButton}>← Back to Loans</Link>
        </div>
      </div>
    );
  }

  const monthlyPayment = calculateMonthlyPayment(loan);
  const totalInterest = (monthlyPayment * loan.term_months) - parseFloat(loan.principal);
  const depositRequired = parseFloat(loan.deposit_required || 0);
  const hasDepositTransactions = loan.deposit_transactions && Array.isArray(loan.deposit_transactions) && loan.deposit_transactions.length > 0;
  const isDepositPaid = hasDepositTransactions && loan.deposit_transactions.some(tx => tx.status === 'completed');

  return (
    <div style={styles.container}>
      {/* Professional Header */}
      <div style={styles.professionalHeader}>
        <div style={styles.headerTop} className="loan-detail-header-top">
          <div style={styles.headerLeft}>
            <Link href="/loans" style={styles.backLink}>
              <span style={styles.backArrow}>←</span> Back to Loans
            </Link>
            <div style={styles.headerTitleSection}>
              <div style={styles.loanIconLarge}>{getLoanTypeIcon(loan.loan_type)}</div>
              <div>
                <h1 style={styles.headerTitle}>{getLoanTypeLabel(loan.loan_type)}</h1>
                <p style={styles.headerReference}>Ref: {loan.loan_reference || loan.id.slice(0, 12)}</p>
              </div>
            </div>
          </div>
          <div style={styles.headerRight}>
            {getStatusBadge(loan.status)}
          </div>
        </div>

        {/* Key Stats Row */}
        <div style={styles.headerStatsRow}>
          <div style={styles.headerStat}>
            <div style={styles.headerStatLabel}>Loan Amount</div>
            <div style={styles.headerStatValue}>${parseFloat(loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={styles.headerStat}>
            <div style={styles.headerStatLabel}>Remaining Balance</div>
            <div style={{...styles.headerStatValue, color: isFullyPaid ? '#10b981' : '#ef4444'}}>
              ${parseFloat(loan.remaining_balance || loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={styles.headerStat}>
            <div style={styles.headerStatLabel}>Monthly Payment</div>
            <div style={styles.headerStatValue}>${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style={styles.headerStat}>
            <div style={styles.headerStatLabel}>Interest Rate</div>
            <div style={styles.headerStatValue}>{parseFloat(loan.interest_rate).toFixed(1)}% APR</div>
          </div>
        </div>
      </div>

      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : '#3b82f6'
        }}>
          {toast.message}
        </div>
      )}

      {/* Deposit Status Banners */}
      {depositRequired > 0 && loan.status === 'pending_deposit' && !isDepositPaid && (
        <div style={styles.depositBanner}>
          <div style={styles.bannerIcon}>⏳</div>
          <div style={styles.bannerContent}>
            <strong style={styles.bannerTitle}>Loan Ready for Activation</strong>
            <p style={styles.bannerText}>
              Submit your 10% security deposit (${depositRequired.toLocaleString()}) to activate and disburse your loan.
            </p>
            <Link href={`/loan/deposit-crypto?loan_id=${loan.id}&amount=${depositRequired}`} style={styles.bannerButton}>
              Complete Deposit Now →
            </Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs} className="loan-detail-tabs">
        <button
          style={activeTab === 'overview' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          style={activeTab === 'payments' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('payments')}
        >
          💳 Payments
        </button>
        <button
          style={activeTab === 'schedule' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('schedule')}
        >
          📅 Schedule
        </button>
        <button
          style={activeTab === 'auto-pay' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('auto-pay')}
        >
          🔄 Auto-Pay
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'overview' && (
        <div style={styles.content}>
          {/* Progress Section */}
          {(loan.status === 'active' || loan.status === 'approved') && (
            <div style={styles.progressCard}>
              <div style={styles.progressHeader}>
                <div>
                  <div style={styles.progressLabel}>Loan Progress</div>
                  <div style={styles.progressSubtext}>
                    {isFullyPaid ? (
                      <span style={{color: '#059669', fontWeight: '700'}}>✓ Fully Paid</span>
                    ) : (
                      `${loan.payments_made || 0} of ${loan.term_months} payments completed`
                    )}
                  </div>
                </div>
                <div style={styles.progressPercent}>{progressPercent.toFixed(1)}%</div>
              </div>
              <div style={styles.progressBarContainer}>
                <div style={{...styles.progressBarFill, width: `${progressPercent}%`, background: isFullyPaid ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)'}}></div>
              </div>
            </div>
          )}

          {/* Loan Details Grid */}
          <div style={styles.infoGrid} className="loan-info-grid">
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Loan Term</div>
              <div style={styles.infoValue}>{loan.term_months} months</div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Total Interest</div>
              <div style={styles.infoValue}>${totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Payments Made</div>
              <div style={styles.infoValue}>{loan.payments_made || 0} / {loan.term_months}</div>
            </div>

            {loan.next_payment_date && !isFullyPaid && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Next Payment Due</div>
                <div style={{...styles.infoValue, color: '#3b82f6'}}>
                  {new Date(loan.next_payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}

            {loan.approved_at && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Approved Date</div>
                <div style={styles.infoValue}>
                  {new Date(loan.approved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}

            {loan.disbursed_at && (
              <div style={styles.infoCard}>
                <div style={styles.infoLabel}>Disbursed Date</div>
                <div style={styles.infoValue}>
                  {new Date(loan.disbursed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            )}
          </div>

          {/* Loan Purpose */}
          {loan.purpose && (
            <div style={styles.purposeSection}>
              <h3 style={styles.sectionTitle}>Loan Purpose</h3>
              <p style={styles.purposeText}>{loan.purpose}</p>
            </div>
          )}

          {/* Action Buttons */}
          {(loan.status === 'active' || loan.status === 'approved') && !isFullyPaid && (
            <div style={styles.actionButtons}>
              <button
                onClick={() => setPaymentModal(true)}
                style={styles.primaryActionButton}
              >
                💳 Make Payment
              </button>
              <Link href={`/loan/make-payment?loanId=${loan.id}`} style={styles.secondaryActionButton}>
                View Payment Options
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div style={styles.content}>
          <PaymentHistory loanId={loanId} />
        </div>
      )}

      {activeTab === 'schedule' && (
        <div style={styles.content}>
          <Amortization loanId={loanId} />
        </div>
      )}

      {activeTab === 'auto-pay' && (
        <div style={styles.content}>
          <AutoPaymentManager loanId={loanId} />
        </div>
      )}

      {/* Payment Modal (keeping existing modal code) */}
      {paymentModal && (
        <div style={styles.modal} onClick={() => setPaymentModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Make Loan Payment</h2>
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Amount ($)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, amount: parseFloat(loan.monthly_payment_amount || 0).toFixed(2) })}
                  style={styles.quickFillButton}
                  type="button"
                >
                  Monthly (${parseFloat(loan.monthly_payment_amount || 0).toFixed(2)})
                </button>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, amount: parseFloat(loan.remaining_balance).toFixed(2) })}
                  style={{...styles.quickFillButton, backgroundColor: '#10b981', color: '#fff', border: '2px solid #10b981'}}
                  type="button"
                >
                  💰 Full Amount (${parseFloat(loan.remaining_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </button>
              </div>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                style={styles.input}
              />
              <small style={styles.helperText}>
                Monthly payment: ${monthlyPayment.toFixed(2)} | Remaining: ${parseFloat(loan.remaining_balance || loan.principal).toLocaleString()}
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Method</label>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, payment_type: 'manual' })}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: paymentForm.payment_type === 'manual' ? '#10b981' : '#e5e7eb',
                    color: paymentForm.payment_type === 'manual' ? '#fff' : '#1f2937'
                  }}
                >
                  🏦 Bank Transfer
                </button>
                <button
                  onClick={() => setPaymentForm({ ...paymentForm, payment_type: 'crypto', account_id: '' })}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: paymentForm.payment_type === 'crypto' ? '#10b981' : '#e5e7eb',
                    color: paymentForm.payment_type === 'crypto' ? '#fff' : '#1f2937'
                  }}
                >
                  🪙 Crypto
                </button>
              </div>
            </div>

            {paymentForm.payment_type === 'manual' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Pay from Account</label>
                <select
                  value={paymentForm.account_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                  style={styles.select}
                >
                  <option value="">Select an account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type} - {account.account_number} (${parseFloat(account.balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={styles.modalActions}>
              <button onClick={() => setPaymentModal(false)} style={styles.cancelButton} disabled={processing}>
                Cancel
              </button>
              <button
                onClick={handleMakePayment}
                disabled={processing}
                style={styles.submitButton}
              >
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoanDetail() {
  return (
    <ProtectedRoute>
      <LoanDetailContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '2rem'
  },

  // Professional Header Styles
  professionalHeader: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    color: '#fff',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(30, 58, 138, 0.3)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1.5rem'
  },
  headerLeft: {
    flex: 1
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'rgba(255, 255, 255, 0.9)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: '500',
    marginBottom: '1rem',
    transition: 'color 0.2s'
  },
  backArrow: {
    fontSize: '1.2rem'
  },
  headerTitleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  loanIconLarge: {
    fontSize: '3rem',
    width: '70px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)'
  },
  headerTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    margin: '0 0 0.25rem 0',
    color: '#fff',
    letterSpacing: '-0.5px'
  },
  headerReference: {
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'monospace',
    margin: 0
  },
  headerRight: {
    display: 'flex',
    alignItems: 'flex-start'
  },
  statusBadge: {
    padding: '0.75rem 1.5rem',
    borderRadius: '20px',
    fontSize: '0.875rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  },
  headerStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1.5rem',
    marginTop: '1.5rem'
  },
  headerStat: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '1rem',
    borderRadius: '12px',
    textAlign: 'center'
  },
  headerStatLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem',
    fontWeight: '600'
  },
  headerStatValue: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#fff'
  },

  // Loading States
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '500'
  },

  // Toast Notification
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    color: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    zIndex: 1000,
    fontWeight: '600',
    fontSize: '0.95rem'
  },

  // Banner Styles
  depositBanner: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '16px',
    padding: '1.5rem',
    margin: '2rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
  },
  bannerIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  bannerContent: {
    flex: 1
  },
  bannerTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#065f46',
    marginBottom: '0.5rem',
    display: 'block'
  },
  bannerText: {
    fontSize: '0.95rem',
    color: '#047857',
    lineHeight: '1.6',
    margin: '0 0 1rem 0'
  },
  bannerButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.95rem',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0 2rem',
    backgroundColor: '#fff',
    borderBottom: '2px solid #e5e7eb',
    overflowX: 'auto'
  },
  tab: {
    padding: '1rem 1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#64748b',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6'
  },

  // Content Area
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },

  // Progress Card
  progressCard: {
    backgroundColor: '#eff6ff',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid #dbeafe'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  progressLabel: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  progressSubtext: {
    fontSize: '0.875rem',
    color: '#3b82f6',
    marginTop: '0.25rem'
  },
  progressPercent: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#1e40af'
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: '#dbeafe',
    borderRadius: '6px',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.5s ease'
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  infoCard: {
    padding: '1.25rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  infoValue: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#1f2937'
  },

  // Purpose Section
  purposeSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid #e5e7eb'
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  purposeText: {
    fontSize: '0.95rem',
    color: '#4b5563',
    lineHeight: '1.6'
  },

  // Action Buttons
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  primaryActionButton: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  secondaryActionButton: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#3b82f6',
    backgroundColor: '#fff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'inline-block',
    transition: 'all 0.3s'
  },

  // Modal Styles
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  quickFillButton: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1f2937',
    backgroundColor: '#e5e7eb',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '1rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  helperText: {
    display: 'block',
    marginTop: '0.5rem',
    fontSize: '0.8rem',
    color: '#6b7280'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem'
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  backButton: {
    display: 'inline-block',
    marginTop: '1.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600'
  }
};