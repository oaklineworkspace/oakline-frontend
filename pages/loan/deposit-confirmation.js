import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function DepositConfirmationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { loan_id, amount } = router.query;
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [depositMethod, setDepositMethod] = useState('balance');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loanDetails, setLoanDetails] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchUserAccounts();
      if (loan_id) {
        fetchLoanDetails();
        setupRealtimeSubscription();
      }
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, loan_id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`loan-${loan_id}`)
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

            if (payload.new.deposit_paid) {
              setSuccess('Deposit confirmed! Your loan application is now under review by the Loan Department.');
            }

            if (payload.new.status === 'under_review') {
              setSuccess('Your deposit has been received and your loan is now under review by the Loan Department.');
            }

            if (payload.new.status === 'approved' || payload.new.status === 'active') {
              setSuccess('Great news! Your loan has been approved by the Loan Department!');
              setTimeout(() => {
                router.push('/loan/dashboard');
              }, 2000);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return channel;
  };

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccount(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
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
        
        // Check if deposit already paid
        if (data.deposit_paid) {
          setSuccess('Your deposit has already been received. Your loan application is now under review by the Loan Department.');
        }
      }
    } catch (err) {
      console.error('Error fetching loan details:', err);
    }
  };

  const handleDepositFromBalance = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/loan/process-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id,
          account_id: selectedAccount,
          amount: parseFloat(amount),
          deposit_method: 'balance'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process deposit');
      }

      // Show success modal instead of inline message
      setSuccess('success');

    } catch (err) {
      setError(err.message || 'An error occurred while processing deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoDeposit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      // Directly redirect to the loan-specific crypto deposit page
      // No need to call API first - the deposit record will be created when user confirms payment
      router.push(`/loan/deposit-crypto?loan_id=${loan_id}&amount=${amount}`);

    } catch (err) {
      setError(err.message || 'An error occurred while initiating crypto deposit');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const hasSufficientBalance = selectedAccountData && parseFloat(selectedAccountData.balance) >= parseFloat(amount);

  // Success Modal Component
  if (success === 'success') {
    return (
      <div style={styles.successModalOverlay}>
        <div style={styles.successModalContent}>
          <div style={styles.successCheckmark}>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" stroke="#10b981" strokeWidth="4" fill="#f0fdf4"/>
              <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={styles.successModalTitle}>Deposit Successful!</h2>
          <p style={styles.successModalMessage}>
            Your loan deposit of <strong>${parseFloat(amount).toLocaleString()}</strong> has been processed successfully.
          </p>
          <div style={styles.successModalDetails}>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Transaction Status:</span>
              <span style={styles.successDetailValue}>✓ Completed</span>
            </div>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Processing Time:</span>
              <span style={styles.successDetailValue}>Instant</span>
            </div>
            <div style={styles.successDetailRow}>
              <span style={styles.successDetailLabel}>Next Step:</span>
              <span style={styles.successDetailValue}>Under Review</span>
            </div>
          </div>
          <div style={styles.successModalInfo}>
            <p style={styles.successInfoText}>
              <strong>What happens next?</strong>
            </p>
            <ul style={styles.successInfoList}>
              <li>Our Loan Department will review your application within 24-48 hours</li>
              <li>You'll receive a notification once your loan is approved</li>
              <li>Funds will be disbursed to your account upon approval</li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/loan/dashboard')}
            style={styles.successModalButton}
          >
            View Loan Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.heroIcon}>💰</div>
          <h1 style={styles.heroTitle}>Loan Deposit Confirmation</h1>
          <p style={styles.heroSubtitle}>
            Complete your required deposit to proceed with your loan application
          </p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {error && (
          <div style={styles.alert}>
            <span style={styles.alertIcon}>⚠️</span>
            <div>
              <strong style={styles.alertTitle}>Error</strong>
              <p style={styles.alertMessage}>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div style={styles.successAlert}>
            <span style={styles.alertIcon}>✅</span>
            <div>
              <strong style={styles.alertTitle}>Success</strong>
              <p style={styles.alertMessage}>{success}</p>
            </div>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Deposit Required</h2>
            <p style={styles.cardSubtitle}>Choose how you'd like to make your deposit</p>
          </div>

          <div style={styles.depositBox}>
            <div style={styles.depositRow}>
              <span style={styles.depositLabel}>Required Deposit Amount:</span>
              <span style={styles.depositAmount}>${parseFloat(amount).toLocaleString()}</span>
            </div>
            {loanDetails && (
              <div style={styles.depositRow}>
                <span style={styles.depositLabel}>Loan Amount:</span>
                <span style={styles.depositValue}>${parseFloat(loanDetails.principal).toLocaleString()}</span>
              </div>
            )}
          </div>

          {loanDetails && loanDetails.deposit_paid ? (
            <div style={styles.depositPaidNotice}>
              <div style={styles.depositPaidIcon}>✓</div>
              <div>
                <h3 style={styles.depositPaidTitle}>Deposit Received</h3>
                <p style={styles.depositPaidMessage}>
                  Your loan deposit has been successfully received and confirmed. 
                  Your application is now under review by our Loan Department.
                </p>
                <div style={styles.depositPaidDetails}>
                  <div style={styles.depositPaidRow}>
                    <span>Deposit Amount:</span>
                    <span>${parseFloat(loanDetails.deposit_amount || amount).toLocaleString()}</span>
                  </div>
                  <div style={styles.depositPaidRow}>
                    <span>Deposit Method:</span>
                    <span>{loanDetails.deposit_method === 'crypto' ? 'Cryptocurrency' : 'Account Balance'}</span>
                  </div>
                  <div style={styles.depositPaidRow}>
                    <span>Status:</span>
                    <span style={{color: '#10b981', fontWeight: '600'}}>Under Review</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.methodSection}>
              <h3 style={styles.methodTitle}>Select Deposit Method</h3>

              <div style={styles.methodGrid}>
                <div
                  onClick={() => setDepositMethod('balance')}
                  style={{
                    ...styles.methodCard,
                    ...(depositMethod === 'balance' ? styles.methodCardSelected : {})
                  }}
                >
                  <div style={styles.methodIcon}>💳</div>
                  <h4 style={styles.methodName}>Account Balance</h4>
                  <p style={styles.methodDesc}>Pay from your account balance</p>
                  {selectedAccountData && (
                    <div style={styles.methodBalance}>
                      Available: ${parseFloat(selectedAccountData.balance).toLocaleString()}
                    </div>
                  )}
                  {depositMethod === 'balance' && !hasSufficientBalance && (
                    <div style={styles.insufficientBadge}>Insufficient Balance</div>
                  )}
                </div>

                <div
                  onClick={() => setDepositMethod('crypto')}
                  style={{
                    ...styles.methodCard,
                    ...(depositMethod === 'crypto' ? styles.methodCardSelected : {})
                  }}
                >
                  <div style={styles.methodIcon}>₿</div>
                  <h4 style={styles.methodName}>Crypto Deposit</h4>
                  <p style={styles.methodDesc}>Pay with cryptocurrency</p>
                </div>
              </div>
            </div>
          )}

          {depositMethod === 'balance' && selectedAccountData && (
            <div style={styles.accountSection}>
              <label style={styles.label}>
                <span style={styles.labelText}>Select Account</span>
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.select}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_type.toUpperCase()} - ****{account.account_number.slice(-4)}
                    (${parseFloat(account.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {!loanDetails?.deposit_paid && (
            <div style={styles.actionSection}>
              <button
                onClick={() => router.push('/loan/apply')}
                style={styles.cancelButton}
                disabled={loading}
              >
                Back
              </button>
              {depositMethod === 'balance' ? (
                <button
                  onClick={handleDepositFromBalance}
                  disabled={loading || !hasSufficientBalance}
                  style={{
                    ...styles.submitButton,
                    ...((loading || !hasSufficientBalance) ? styles.submitButtonDisabled : {})
                  }}
                >
                  {loading ? 'Processing...' : 'Confirm Deposit'}
                </button>
              ) : (
                <button
                  onClick={handleCryptoDeposit}
                  style={styles.submitButton}
                >
                  Proceed to Crypto Deposit
                </button>
              )}
            </div>
          )}

          {loanDetails?.deposit_paid && (
            <div style={styles.actionSection}>
              <button
                onClick={() => router.push('/loan/dashboard')}
                style={styles.submitButton}
              >
                View Loan Dashboard
              </button>
            </div>
          )}
        </div>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>ℹ️ Important Information</h3>
          <ul style={styles.infoList}>
            <li>Your loan application will be reviewed after the deposit is confirmed</li>
            <li>The deposit amount will be applied to your loan once approved</li>
            <li>Processing time: 24-48 hours for balance deposits, 1-3 days for crypto</li>
            <li>You'll receive notifications about your application status</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  successModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '48px',
    maxWidth: '600px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideUp 0.4s ease-out'
  },
  successCheckmark: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center'
  },
  successModalTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px'
  },
  successModalMessage: {
    fontSize: '18px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: '1.6'
  },
  successModalDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    textAlign: 'left'
  },
  successDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  successDetailLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  successDetailValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: '600'
  },
  successModalInfo: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left'
  },
  successInfoText: {
    fontSize: '14px',
    color: '#1e293b',
    marginBottom: '12px'
  },
  successInfoList: {
    margin: '0',
    paddingLeft: '24px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: '2'
  },
  successModalButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.3s'
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hero: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroIcon: {
    fontSize: '48px',
    marginBottom: '20px'
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '700',
    marginBottom: '16px'
  },
  heroSubtitle: {
    fontSize: '18px',
    opacity: '0.95'
  },
  mainContent: {
    maxWidth: '800px',
    margin: '-40px auto 0',
    padding: '0 20px 60px'
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #ef4444',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderLeft: '4px solid #10b981',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  alertIcon: {
    fontSize: '24px'
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px'
  },
  alertMessage: {
    fontSize: '14px',
    margin: 0
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '32px',
    borderBottom: '1px solid #e5e7eb'
  },
  cardTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  cardSubtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0
  },
  depositBox: {
    backgroundColor: '#f0fdf4',
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb'
  },
  depositRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0'
  },
  depositLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  depositAmount: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#10b981'
  },
  depositValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  methodSection: {
    padding: '32px'
  },
  methodTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '20px'
  },
  methodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  methodCard: {
    padding: '24px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'center'
  },
  methodCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
  },
  methodIcon: {
    fontSize: '36px',
    marginBottom: '12px'
  },
  methodName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  methodDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0
  },
  methodBalance: {
    marginTop: '12px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#10b981'
  },
  insufficientBadge: {
    marginTop: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    padding: '4px 8px',
    borderRadius: '6px',
    display: 'inline-block'
  },
  accountSection: {
    padding: '0 32px 32px'
  },
  label: {
    display: 'block',
    marginBottom: '8px'
  },
  labelText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#fff'
  },
  actionSection: {
    padding: '24px 32px',
    backgroundColor: '#f8fafc',
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  submitButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  depositPaidNotice: {
    padding: '32px',
    backgroundColor: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '12px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start'
  },
  depositPaidIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    flexShrink: 0
  },
  depositPaidTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#065f46',
    margin: '0 0 8px 0'
  },
  depositPaidMessage: {
    fontSize: '15px',
    color: '#047857',
    margin: '0 0 20px 0',
    lineHeight: '1.6'
  },
  depositPaidDetails: {
    backgroundColor: '#fff',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #d1fae5'
  },
  depositPaidRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#1f2937',
    borderBottom: '1px solid #f3f4f6'
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    marginTop: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px'
  },
  infoList: {
    margin: 0,
    paddingLeft: '24px',
    color: '#4b5563',
    lineHeight: '1.8'
  }
};

export default function DepositConfirmation() {
  return (
    <ProtectedRoute>
      <DepositConfirmationContent />
    </ProtectedRoute>
  );
}