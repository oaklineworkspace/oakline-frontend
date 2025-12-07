
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function MakePaymentContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { loanId } = router.query;

  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [networkFeePercent, setNetworkFeePercent] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedLoanWallet, setSelectedLoanWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showCryptoDetails, setShowCryptoDetails] = useState(false);
  const [paymentProof, setPaymentProof] = useState({ txHash: '', proofFile: null });
  const [submittingProof, setSubmittingProof] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    account_id: '',
    payment_type: 'manual',
    crypto_type: '',
    network_type: ''
  });

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
    }
  }, [user, loanId]);

  const fetchLoanDetails = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        router.push('/login');
        return;
      }

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .eq('user_id', user.id)
        .single();

      if (loanError || !loanData) {
        showToast('Loan not found', 'error');
        router.push('/loans');
        return;
      }

      if (loanData.status !== 'active' && loanData.status !== 'approved') {
        showToast('Can only make payments on active loans', 'error');
        router.push(`/loan/${loanId}`);
        return;
      }

      setLoan(loanData);
      
      const monthlyPayment = calculateMonthlyPayment(loanData);
      setPaymentForm(prev => ({
        ...prev,
        amount: monthlyPayment.toFixed(2)
      }));
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

      const selectedWallet = loanWallets[Math.floor(Math.random() * loanWallets.length)];
      setWalletAddress(selectedWallet.wallet_address);
      setSelectedLoanWallet(selectedWallet);
      setShowCryptoDetails(true);
    } catch (error) {
      console.error('Error fetching wallet:', error);
      showToast('Error loading wallet. Please try again.', 'error');
    } finally {
      setLoadingWallet(false);
    }
  };

  const handlePaymentCryptoChange = (crypto) => {
    setPaymentForm({ ...paymentForm, crypto_type: crypto, network_type: '' });
    setAvailableNetworks([]);
    setWalletAddress('');
    setSelectedLoanWallet(null);
    setShowCryptoDetails(false);
  };

  const handlePaymentNetworkChange = async (network) => {
    setPaymentForm({ ...paymentForm, network_type: network });
    const selectedNetwork = availableNetworks.find(n => n.value === network);
    if (selectedNetwork) {
      setNetworkFeePercent(selectedNetwork.fee || 0);
    }
    await fetchLoanCryptoWallets(paymentForm.crypto_type, network);
  };

  useEffect(() => {
    if (paymentForm.crypto_type) {
      fetchPaymentNetworks(paymentForm.crypto_type);
    }
  }, [paymentForm.crypto_type]);

  const calculatedFee = paymentForm.amount ? (parseFloat(paymentForm.amount) * networkFeePercent / 100) : 0;
  const totalAmountWithFee = paymentForm.amount ? (parseFloat(paymentForm.amount) + calculatedFee) : 0;

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

      if (paymentForm.payment_type === 'crypto') {
        if (!paymentForm.crypto_type || !paymentForm.network_type) {
          showToast('Please select cryptocurrency and network', 'error');
          setProcessing(false);
          return;
        }
        if (!walletAddress || !selectedLoanWallet) {
          showToast('Wallet address not loaded. Please try again.', 'error');
          setProcessing(false);
          return;
        }
        // Crypto payment will be handled in the crypto details section
        setProcessing(false);
        return;
      }

      if (!paymentForm.account_id) {
        showToast('Please select an account', 'error');
        setProcessing(false);
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
        const paymentMethod = paymentForm.payment_type === 'crypto' ? 'crypto' : 'balance';
        let successUrl = `/loan/payment-success?reference=${data.payment.reference_number}&amount=${data.payment.amount}&loan_id=${loanId}&payment_method=${paymentMethod}`;
        
        if (paymentMethod === 'balance' && data.payment.account_number) {
          successUrl += `&account_number=${data.payment.account_number}`;
        } else if (paymentMethod === 'crypto') {
          successUrl += `&crypto_type=${paymentForm.crypto_type}&network_type=${paymentForm.network_type}`;
        }
        
        router.push(successUrl);
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
        setTimeout(() => {
          router.push(`/loan/${loanId}`);
        }, 2000);
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

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading payment details...</p>
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href={`/loan/${loanId}`} style={styles.backLink}>← Back to Loan Details</Link>
        <h1 style={styles.title}>Make Loan Payment</h1>
      </div>

      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#DC3545' : toast.type === 'success' ? '#28A745' : '#007BFF'
        }}>
          {toast.message}
        </div>
      )}

      <div style={styles.content}>
        {/* Loan Summary */}
        <div style={styles.loanSummary}>
          <h2 style={styles.sectionTitle}>Loan Summary</h2>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Remaining Balance:</span>
              <span style={styles.summaryValue}>${parseFloat(loan.remaining_balance || loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Monthly Payment:</span>
              <span style={styles.summaryValue}>${monthlyPayment.toFixed(2)}</span>
            </div>
            <div style={styles.summaryItem}>
              <span style={styles.summaryLabel}>Interest Rate:</span>
              <span style={styles.summaryValue}>{loan.interest_rate}% APR</span>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div style={styles.section}>
          <label style={styles.label}>Payment Amount ($)</label>
          <input
            type="number"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            placeholder="0.00"
            step="0.01"
            min="0"
            max={loan.remaining_balance}
            style={styles.input}
          />
          <small style={styles.helperText}>
            Suggested: ${monthlyPayment.toFixed(2)} | Maximum: ${parseFloat(loan.remaining_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </small>
        </div>

        {/* Payment Method Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Select Payment Method</h2>
          <div style={styles.paymentMethodGrid}>
            <button
              onClick={() => setPaymentForm({ ...paymentForm, payment_type: 'manual' })}
              style={{
                ...styles.paymentMethodButton,
                ...(paymentForm.payment_type === 'manual' ? styles.paymentMethodButtonActive : {})
              }}
            >
              <div style={styles.paymentMethodIcon}>🏦</div>
              <div style={styles.paymentMethodLabel}>Bank Transfer</div>
              <div style={styles.paymentMethodDesc}>Pay from your linked account</div>
            </button>
            <button
              onClick={() => setPaymentForm({ ...paymentForm, payment_type: 'crypto', account_id: '' })}
              style={{
                ...styles.paymentMethodButton,
                ...(paymentForm.payment_type === 'crypto' ? styles.paymentMethodButtonActive : {})
              }}
            >
              <div style={styles.paymentMethodIcon}>🪙</div>
              <div style={styles.paymentMethodLabel}>Cryptocurrency</div>
              <div style={styles.paymentMethodDesc}>Pay with crypto</div>
            </button>
          </div>
        </div>

        {/* Bank Transfer Form */}
        {paymentForm.payment_type === 'manual' && (
          <div style={styles.section}>
            <label style={styles.label}>Select Account</label>
            <select
              value={paymentForm.account_id}
              onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
              style={styles.select}
            >
              <option value="">Choose an account...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_type} - {account.account_number} (${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Crypto Payment Form */}
        {paymentForm.payment_type === 'crypto' && (
          <div>
            <div style={styles.section}>
              <h3 style={styles.subsectionTitle}>Select Cryptocurrency</h3>
              <div style={styles.cryptoGrid}>
                {cryptoTypes.map(crypto => (
                  <div
                    key={crypto.value}
                    onClick={() => handlePaymentCryptoChange(crypto.value)}
                    style={{
                      ...styles.cryptoButton,
                      ...(paymentForm.crypto_type === crypto.value ? styles.cryptoButtonActive : {})
                    }}
                  >
                    <div style={styles.cryptoIcon}>{crypto.icon}</div>
                    <div style={styles.cryptoLabel}>{crypto.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {paymentForm.crypto_type && (
              <div style={styles.section}>
                <h3 style={styles.subsectionTitle}>Select Network</h3>
                {loadingNetworks ? (
                  <div style={styles.loadingText}>Loading networks...</div>
                ) : availableNetworks.length === 0 ? (
                  <div style={styles.errorBox}>No networks available</div>
                ) : (
                  <div style={styles.networkGrid}>
                    {availableNetworks.map(network => (
                      <div
                        key={network.value}
                        onClick={() => handlePaymentNetworkChange(network.value)}
                        style={{
                          ...styles.networkButton,
                          ...(paymentForm.network_type === network.value ? styles.networkButtonActive : {})
                        }}
                      >
                        <div style={styles.networkHeader}>
                          <span>{network.icon}</span>
                          <span style={styles.networkLabel}>{network.label}</span>
                        </div>
                        <div style={styles.networkDetails}>
                          <div>{network.confirmations} confirmations</div>
                          {network.fee > 0 && <div style={styles.networkFee}>Fee: {network.fee}%</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {showCryptoDetails && (
              <div style={styles.cryptoDetailsSection}>
                <div style={styles.amountSummary}>
                  <div style={styles.amountRow}>
                    <span>Payment Amount:</span>
                    <span style={styles.amountValue}>${parseFloat(paymentForm.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={styles.amountRow}>
                    <span>Network Fee ({networkFeePercent}%):</span>
                    <span style={styles.amountValue}>${calculatedFee.toFixed(2)}</span>
                  </div>
                  <div style={{...styles.amountRow, ...styles.totalRow}}>
                    <span>Total to Send:</span>
                    <span style={styles.totalValue}>${totalAmountWithFee.toFixed(2)}</span>
                  </div>
                </div>

                {loadingWallet ? (
                  <div style={styles.loadingText}>Loading wallet address...</div>
                ) : (
                  <>
                    <div style={styles.walletBox}>
                      <div style={styles.walletHeader}>
                        <div style={styles.walletCrypto}>{paymentForm.crypto_type} ({paymentForm.network_type})</div>
                        <div style={styles.walletLabel}>Wallet Address:</div>
                        <div style={styles.walletAddress}>{walletAddress}</div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(walletAddress);
                            showToast('Wallet address copied!', 'success');
                          }}
                          style={styles.copyButton}
                        >
                          📋 Copy Address
                        </button>
                        {selectedLoanWallet?.memo && (
                          <div style={styles.memoSection}>
                            <div style={styles.memoLabel}>Memo/Tag (if required):</div>
                            <div style={styles.memoValue}>{selectedLoanWallet.memo}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={styles.warningBox}>
                      <strong>⚠️ Important:</strong>
                      <ul style={styles.warningList}>
                        <li>Send exactly <strong>${totalAmountWithFee.toFixed(2)}</strong> worth of {paymentForm.crypto_type}</li>
                        <li>Use only the <strong>{paymentForm.network_type}</strong> network</li>
                        <li>Double-check the wallet address before sending</li>
                        <li>After sending, submit your transaction hash below</li>
                      </ul>
                    </div>

                    <div style={styles.section}>
                      <label style={styles.label}>Transaction Hash (Optional)</label>
                      <input
                        type="text"
                        value={paymentProof.txHash}
                        onChange={(e) => setPaymentProof({...paymentProof, txHash: e.target.value})}
                        placeholder="Enter your transaction hash"
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.section}>
                      <label style={styles.label}>Payment Proof (Optional)</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setPaymentProof({...paymentProof, proofFile: e.target.files[0]})}
                        style={styles.fileInput}
                      />
                      <small style={styles.helperText}>
                        Upload a screenshot or PDF of your payment confirmation
                      </small>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            onClick={() => router.push(`/loan/${loanId}`)}
            style={styles.cancelButton}
            disabled={processing || submittingProof}
          >
            Cancel
          </button>
          <button
            onClick={paymentForm.payment_type === 'crypto' && showCryptoDetails ? handleSubmitCryptoPayment : handleMakePayment}
            disabled={processing || submittingProof || (!paymentForm.account_id && paymentForm.payment_type === 'manual') || (paymentForm.payment_type === 'crypto' && (!showCryptoDetails || (!paymentProof.txHash && !paymentProof.proofFile)))}
            style={{
              ...styles.submitButton,
              opacity: (processing || submittingProof || (!paymentForm.account_id && paymentForm.payment_type === 'manual') || (paymentForm.payment_type === 'crypto' && (!showCryptoDetails || (!paymentProof.txHash && !paymentProof.proofFile)))) ? 0.5 : 1
            }}
          >
            {processing || submittingProof ? 'Processing...' : paymentForm.payment_type === 'crypto' && showCryptoDetails ? 'Submit Payment Proof' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MakePayment() {
  return (
    <ProtectedRoute>
      <MakePaymentContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007BFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    marginBottom: '2rem'
  },
  backLink: {
    color: '#007BFF',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '1rem',
    display: 'inline-block'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0'
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  loanSummary: {
    backgroundColor: '#f0fdf4',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '1px solid #86efac'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#059669'
  },
  section: {
    marginBottom: '2rem'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    fontSize: '14px'
  },
  helperText: {
    display: 'block',
    marginTop: '0.5rem',
    fontSize: '13px',
    color: '#666'
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  paymentMethodButton: {
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  paymentMethodButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  paymentMethodIcon: {
    fontSize: '48px',
    marginBottom: '0.5rem'
  },
  paymentMethodLabel: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  paymentMethodDesc: {
    fontSize: '14px',
    color: '#64748b'
  },
  cryptoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '0.75rem'
  },
  cryptoButton: {
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s'
  },
  cryptoButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  cryptoIcon: {
    fontSize: '32px',
    marginBottom: '0.5rem'
  },
  cryptoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  networkGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  networkButton: {
    padding: '1rem',
    borderRadius: '12px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  networkButtonActive: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  networkHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  networkLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e293b'
  },
  networkDetails: {
    fontSize: '13px',
    color: '#64748b'
  },
  networkFee: {
    color: '#10b981',
    fontWeight: '600'
  },
  cryptoDetailsSection: {
    marginTop: '2rem'
  },
  amountSummary: {
    backgroundColor: '#ecfdf5',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    fontSize: '15px',
    color: '#065f46'
  },
  amountValue: {
    fontWeight: '600'
  },
  totalRow: {
    paddingTop: '0.75rem',
    borderTop: '1px solid #86efac',
    fontSize: '16px',
    fontWeight: '700'
  },
  totalValue: {
    fontSize: '18px',
    color: '#047857'
  },
  walletBox: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    color: '#fff'
  },
  walletHeader: {
    textAlign: 'center'
  },
  walletCrypto: {
    fontSize: '12px',
    opacity: '0.9',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '1rem'
  },
  walletLabel: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  walletAddress: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '12px',
    borderRadius: '8px',
    wordBreak: 'break-all',
    fontSize: '14px',
    fontFamily: 'monospace',
    marginBottom: '1rem'
  },
  copyButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600'
  },
  memoSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.2)'
  },
  memoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  memoValue: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '8px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '14px'
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  warningList: {
    margin: '0.5rem 0',
    paddingLeft: '1.5rem',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.6'
  },
  actionButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    color: '#666',
    padding: '14px 24px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '14px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    color: 'white',
    padding: '16px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    zIndex: 1000,
    fontWeight: '500'
  },
  loadingText: {
    textAlign: 'center',
    padding: '2rem',
    color: '#64748b'
  },
  errorBox: {
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    color: '#991b1b'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  backButton: {
    display: 'inline-block',
    marginTop: '20px',
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600'
  }
};
