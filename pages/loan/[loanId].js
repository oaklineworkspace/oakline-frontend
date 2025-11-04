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
    payment_type: 'manual' // Default to manual
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 768px) {
        .loan-detail-tabs {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .loan-detail-tabs button {
          white-space: nowrap;
          min-width: 100px;
        }
        .loan-detail-header {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 1rem !important;
        }
        .loan-detail-actions {
          width: 100%;
          flex-direction: column !important;
        }
        .loan-detail-actions button {
          width: 100% !important;
        }
      }
      @media (max-width: 414px) {
        .loan-detail-modal {
          padding: 1rem !important;
          margin: 0.5rem !important;
          max-height: 90vh !important;
          overflow-y: auto !important;
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
  const [uploadProofModal, setUploadProofModal] = useState(false);
  const [proofFile, setProofFile] = useState(null);

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

      const { data, error } = await supabase
        .from('loans')
        .select(`
          *,
          deposit_transactions(id, amount, status, created_at, tx_hash, network)
        `)
        .eq('id', loanId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error fetching loan details:", error);
        showToast('Failed to fetch loan details', 'error');
        router.push('/loan');
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
          console.log("Initiating crypto payment...");
          showToast('Redirecting to crypto payment gateway...', 'info');
          setTimeout(() => {
              setProcessing(false);
              setPaymentModal(false);
              showToast('Crypto payment initiated. Please complete it on the gateway.', 'success');
              fetchLoanDetails();
          }, 2000);
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

  const handleUploadProof = async () => {
    if (!proofFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      showToast('File size must be less than 5MB', 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(proofFile.type)) {
      showToast('Only JPG, PNG, and PDF files are allowed', 'error');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('loan_id', loanId);

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/user/upload-deposit-proof', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Proof uploaded successfully!', 'success');
        setUploadProofModal(false);
        setProofFile(null);
        fetchLoanDetails();
      } else {
        showToast(data.error || 'Failed to upload proof', 'error');
      }
    } catch (err) {
      console.error('Error uploading proof:', err);
      showToast('An error occurred while uploading proof', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending_deposit: { color: '#FFA500', bg: '#FFF3CD', text: 'Pending Deposit' },
      under_review: { color: '#007BFF', bg: '#D1ECF1', text: 'Under Review' },
      approved: { color: '#28A745', bg: '#D4EDDA', text: 'Approved' },
      active: { color: '#28A745', bg: '#D4EDDA', text: 'Active' },
      rejected: { color: '#DC3545', bg: '#F8D7DA', text: 'Rejected' },
      completed: { color: '#6C757D', bg: '#E2E3E5', text: 'Completed' }
    };

    const badge = badges[status] || { color: '#6C757D', bg: '#E2E3E5', text: status };

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
      personal: '👤 Personal Loan',
      home_mortgage: '🏠 Home Mortgage',
      auto_loan: '🚗 Auto Loan',
      business: '🏢 Business Loan',
      student: '🎓 Student Loan',
      home_equity: '🏡 Home Equity Loan'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading loan details...</p>
      </div>
    );
  }

  if (!loan) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2>Loan not found</h2>
          <Link href="/loan" style={styles.backButton}>← Back to Loans</Link>
        </div>
      </div>
    );
  }

  const monthlyPayment = calculateMonthlyPayment(loan);
  const totalInterest = (monthlyPayment * loan.term_months) - parseFloat(loan.principal);
  const depositRequired = parseFloat(loan.deposit_required || 0);
  const isDepositPaid = loan.deposit_transactions && loan.deposit_transactions.some(tx => tx.status === 'completed');
  const depositTransaction = loan.deposit_transactions && loan.deposit_transactions.find(tx => tx.status === 'completed');


  return (
    <div style={styles.container}>
      <div style={styles.header} className="loan-detail-header">
        <div>
          <Link href="/loan" style={styles.backLink}>← Back to Loans</Link>
          <h1 style={styles.title}>{getLoanTypeLabel(loan.loan_type)}</h1>
          <p style={styles.subtitle}>Reference: {loan.loan_reference || loan.id.slice(0, 12)}</p>
        </div>
        {getStatusBadge(loan.status)}
      </div>

      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#DC3545' : toast.type === 'success' ? '#28A745' : '#007BFF'
        }}>
          {toast.message}
        </div>
      )}

      {depositRequired > 0 && loan.status === 'pending_deposit' && !isDepositPaid && (
        <div style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FDE68A',
          borderLeft: '4px solid #D9770E',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <strong style={{ color: '#92400E', fontSize: '16px' }}>
              <span style={{ marginRight: '8px' }}>🏦</span> 10% Deposit Required
            </strong>
            <p style={{ color: '#92400E', margin: '8px 0 0 0', lineHeight: '1.6' }}>
              A deposit of ${depositRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })} is required to proceed with your loan application.
            </p>
            {loan.deposit_method && (
              <p style={{ color: '#92400E', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                Selected method: <strong>{loan.deposit_method.toUpperCase()}</strong>
              </p>
            )}
          </div>
          <Link href={`/loan/deposit-crypto?loan_id=${loan.id}&amount=${depositRequired}`} style={{
            backgroundColor: '#D9770E',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            fontSize: '14px'
          }}>
            Deposit Now
          </Link>
        </div>
      )}

      {depositRequired > 0 && loan.deposit_status === 'pending' && !loan.deposit_paid && loan.status === 'pending' && (
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fde68a',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px'
        }}>
          <strong style={{ color: '#92400e', fontSize: '16px' }}>⏳ Deposit Submitted - Awaiting Confirmation</strong>
          <p style={{ color: '#92400e', margin: '8px 0 0 0', lineHeight: '1.6' }}>
            Your 10% deposit has been submitted{loan.deposit_date ? ` on ${new Date(loan.deposit_date).toLocaleDateString()}` : ''} and is being verified by our Loan Department.
            Your loan application will proceed to review once the deposit is confirmed. This typically takes 1-3 business days.
          </p>
        </div>
      )}

      {loan.deposit_paid && loan.deposit_status === 'completed' && (loan.status === 'pending' || loan.status === 'under_review') && (
        <div style={{
          backgroundColor: '#d1fae5',
          border: '1px solid #a7f3d0',
          borderLeft: '4px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px'
        }}>
          <strong style={{ color: '#065f46', fontSize: '16px' }}>✅ Deposit Confirmed - Under Review</strong>
          <p style={{ color: '#047857', margin: '8px 0 0 0', lineHeight: '1.6' }}>
            Your ${parseFloat(loan.deposit_amount || depositRequired).toLocaleString()} deposit has been confirmed by our Loan Department.
            Your loan application is now under review and you will receive a decision within 24-48 hours.
          </p>
        </div>
      )}

      <div style={styles.tabs} className="loan-detail-tabs">
        <button
          style={activeTab === 'overview' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={activeTab === 'payments' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('payments')}
        >
          Payment History
        </button>
        <button
          style={activeTab === 'schedule' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('schedule')}
        >
          Amortization Schedule
        </button>
        <button
          style={activeTab === 'auto-pay' ? { ...styles.tab, ...styles.activeTab } : styles.tab}
          onClick={() => setActiveTab('auto-pay')}
        >
          Auto-Payment
        </button>
      </div>

      {activeTab === 'overview' && (
        <div style={styles.content}>
          <div style={styles.infoGrid}>
            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Principal Amount</div>
              <div style={styles.infoValue}>
                ${parseFloat(loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Remaining Balance</div>
              <div style={{ ...styles.infoValue, color: '#DC3545' }}>
                ${parseFloat(loan.remaining_balance || loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Interest Rate</div>
              <div style={styles.infoValue}>{parseFloat(loan.interest_rate).toFixed(2)}% APR</div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Monthly Payment</div>
              <div style={styles.infoValue}>
                ${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Term</div>
              <div style={styles.infoValue}>{loan.term_months} months</div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Total Interest</div>
              <div style={styles.infoValue}>
                ${totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div style={styles.infoCard}>
              <div style={styles.infoLabel}>Application Date</div>
              <div style={styles.infoValue}>
                {new Date(loan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

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

          {loan.purpose && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Loan Purpose</h3>
              <p style={styles.sectionText}>{loan.purpose}</p>
            </div>
          )}

          {loan.status === 'active' && (
            <div style={styles.actionButtons} className="loan-detail-actions">
              <button onClick={() => {
                  setPaymentForm(prev => ({...prev, payment_type: 'manual'}));
                  setPaymentModal(true);
                }}
                style={styles.primaryButton}>
                Make Payment
              </button>
              <button onClick={() => setUploadProofModal(true)} style={styles.secondaryButton}>
                Upload Payment Proof
              </button>
            </div>
          )}

          {documents.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Documents</h3>
              <div style={styles.documentsList}>
                {documents.map((doc, index) => (
                  <div key={index} style={styles.documentItem}>
                    <span>📄 {doc.name || `Document ${index + 1}`}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={styles.downloadLink}>
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
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

      {paymentModal && (
        <div style={styles.modal} onClick={() => setPaymentModal(false)}>
          <div style={styles.modalContent} className="loan-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Make Loan Payment</h2>

            <div style={styles.formGroup}>
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
                Monthly payment: ${monthlyPayment.toFixed(2)} |
                Remaining balance: ${parseFloat(loan.remaining_balance || loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Method</label>
              <select
                value={paymentForm.payment_type}
                onChange={(e) => {
                  setPaymentForm({ ...paymentForm, payment_type: e.target.value, account_id: '' });
                }}
                style={styles.select}
              >
                <option value="manual">Manual Bank Transfer</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>

            {paymentForm.payment_type === 'manual' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Pay from Account</label>
                <select
                  value={paymentForm.account_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_id: e.target.value })}
                  style={styles.select}
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type} - {account.account_number} (Balance: ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
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
                {processing ? 'Processing...' : paymentForm.payment_type === 'crypto' ? 'Continue to Crypto Payment' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadProofModal && (
        <div style={styles.modal} onClick={() => setUploadProofModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Upload Payment Proof</h2>
            <p style={styles.modalText}>
              Upload proof of your payment (transaction hash, receipt, etc.)
            </p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select File (JPG, PNG, or PDF, max 5MB)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setProofFile(e.target.files[0])}
                style={styles.fileInput}
              />
              {proofFile && (
                <small style={styles.helperText}>
                  Selected: {proofFile.name} ({(proofFile.size / 1024 / 1024).toFixed(2)} MB)
                </small>
              )}
            </div>

            <div style={styles.modalActions}>
              <button onClick={() => setUploadProofModal(false)} style={styles.cancelButton} disabled={processing}>
                Cancel
              </button>
              <button onClick={handleUploadProof} style={styles.submitButton} disabled={processing || !proofFile}>
                {processing ? 'Uploading...' : 'Upload Proof'}
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'clamp(1rem, 3vw, 2.5rem) clamp(0.75rem, 3vw, 1.25rem)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    width: '100%',
    boxSizing: 'border-box'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    margin: '0 auto 20px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007BFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
  },
  backLink: {
    color: '#007BFF',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '12px',
    display: 'inline-block',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    fontFamily: 'monospace',
    margin: 0,
  },
  statusBadge: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
    fontWeight: '500',
  },
  depositBanner: {
    backgroundColor: '#FFF3CD',
    borderLeft: '4px solid #FFA500',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  depositBannerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '20px',
  },
  depositBannerText: {
    margin: '8px 0 0 0',
    color: '#666',
  },
  depositNowButton: {
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
  infoBanner: {
    backgroundColor: '#D1ECF1',
    borderLeft: '4px solid #17A2B8',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  successBanner: {
    backgroundColor: '#D4EDDA',
    borderLeft: '4px solid #28A745',
    padding: '16px 20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid #e0e0e0',
    marginBottom: '30px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.3s ease',
  },
  activeTab: {
    color: '#007BFF',
    borderBottomColor: '#007BFF',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))',
    gap: 'clamp(0.75rem, 2vw, 1.25rem)',
    marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
  },
  infoCard: {
    padding: 'clamp(0.75rem, 2vw, 1.25rem)',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  },
  infoLabel: {
    fontSize: 'clamp(0.7rem, 2vw, 0.8125rem)',
    color: '#666',
    fontWeight: '500',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  infoValue: {
    fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
    fontWeight: '700',
    color: '#333',
    wordBreak: 'break-word',
  },
  section: {
    marginTop: '30px',
    paddingTop: '30px',
    borderTop: '1px solid #e0e0e0',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
  },
  sectionText: {
    fontSize: '15px',
    color: '#666',
    lineHeight: '1.6',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '30px',
    flexDirection: 'column',
    '@media (min-width: 600px)': {
      flexDirection: 'row'
    }
  },
  primaryButton: {
    flex: 1,
    width: '100%',
    backgroundColor: '#28A745',
    color: 'white',
    padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.75rem)',
    borderRadius: '8px',
    border: 'none',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  secondaryButton: {
    flex: 1,
    width: '100%',
    backgroundColor: 'white',
    color: '#007BFF',
    padding: 'clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.75rem)',
    borderRadius: '8px',
    border: '2px solid #007BFF',
    fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  documentsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  documentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
  },
  downloadLink: {
    color: '#007BFF',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '14px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
    marginBottom: '8px',
  },
  modalText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '24px',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
  },
  helperText: {
    display: 'block',
    marginTop: '6px',
    fontSize: '13px',
    color: '#666',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '30px',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'white',
    color: '#666',
    padding: '12px 24px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  backButton: {
    display: 'inline-block',
    marginTop: '20px',
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
  },
  notesText: {
    fontSize: '0.85rem',
    color: '#78350f',
    lineHeight: '1.6'
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderLeft: '4px solid #f59e0b',
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '20px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  }
};