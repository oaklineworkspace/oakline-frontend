import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserLoans();
    }
  }, [user]);

  const fetchUserLoans = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/loan/get-loans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setLoans(data.loans || []);
      } else {
        setError(data.error || 'Failed to fetch loans');
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('An error occurred while fetching your loans');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalDue = (loan) => {
    const monthlyRate = loan.interest_rate / 100 / 12;
    const numPayments = loan.term_months;

    if (monthlyRate === 0) {
      return loan.principal;
    }

    const monthlyPayment = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment * numPayments;
  };

  const calculateMonthlyPayment = (loan) => {
    const monthlyRate = loan.interest_rate / 100 / 12;
    const numPayments = loan.term_months;

    if (monthlyRate === 0) {
      return loan.principal / numPayments;
    }

    const monthlyPayment = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment;
  };

  const handlePayment = async () => {
    if (!paymentModal || !paymentAmount) return;

    setPaymentLoading(true);
    setError('');
    setSuccess('');

    try {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        setError('Payment amount must be greater than 0');
        setPaymentLoading(false);
        return;
      }

      if (amount > paymentModal.remaining_balance) {
        setError('Payment amount cannot exceed remaining balance');
        setPaymentLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setPaymentLoading(false);
        return;
      }

      const response = await fetch('/api/loan/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: paymentModal.id,
          amount
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      setSuccess('Payment processed successfully!');
      setPaymentModal(null);
      setPaymentAmount('');
      await fetchUserLoans();

    } catch (err) {
      setError(err.message || 'An error occurred while processing payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#3b82f6',
      rejected: '#ef4444',
      active: '#10b981',
      closed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading your loans...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>My Loans</h1>
          <p style={styles.subtitle}>Manage and track your loan applications</p>
        </div>
        <Link href="/loan/apply" style={styles.applyButton}>
          Apply for New Loan
        </Link>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <strong>Success!</strong> {success}
        </div>
      )}

      {loans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>💼</div>
          <h3 style={styles.emptyTitle}>No Loans Yet</h3>
          <p style={styles.emptyText}>You haven't applied for any loans. Get started by applying for a loan.</p>
          <Link href="/loan/apply" style={styles.emptyButton}>
            Apply for a Loan
          </Link>
        </div>
      ) : (
        <div style={styles.loansGrid}>
          {loans.map(loan => {
            const totalDue = calculateTotalDue(loan);
            const monthlyPayment = calculateMonthlyPayment(loan);
            const remainingBalance = loan.remaining_balance || totalDue;

            return (
              <div key={loan.id} style={styles.loanCard}>
                <div style={styles.loanHeader}>
                  <div>
                    <h3 style={styles.loanType}>
                      {loan.loan_type?.replace('_', ' ').toUpperCase()}
                    </h3>
                    <p style={styles.loanDate}>
                      Applied: {new Date(loan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(loan.status) + '20',
                      color: getStatusColor(loan.status)
                    }}
                  >
                    {getStatusLabel(loan.status)}
                  </div>
                </div>

                <div style={styles.loanDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Principal Amount:</span>
                    <span style={styles.detailValue}>${loan.principal.toLocaleString()}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Interest Rate:</span>
                    <span style={styles.detailValue}>{loan.interest_rate}% APR</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Term:</span>
                    <span style={styles.detailValue}>{loan.term_months} months</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Monthly Payment:</span>
                    <span style={styles.detailValue}>${monthlyPayment.toFixed(2)}</span>
                  </div>

                  {loan.status === 'active' && (
                    <>
                      <div style={styles.divider}></div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Total Due:</span>
                        <span style={styles.detailValueBold}>${totalDue.toFixed(2)}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Remaining Balance:</span>
                        <span style={{...styles.detailValueBold, color: '#10b981'}}>
                          ${remainingBalance.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  {loan.purpose && (
                    <>
                      <div style={styles.divider}></div>
                      <div style={styles.purposeSection}>
                        <span style={styles.detailLabel}>Purpose:</span>
                        <p style={styles.purposeText}>{loan.purpose}</p>
                      </div>
                    </>
                  )}
                </div>

                {loan.status === 'active' && (
                  <button
                    onClick={() => setPaymentModal(loan)}
                    style={styles.paymentButton}
                  >
                    Make Payment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {paymentModal && (
        <div style={styles.modalOverlay} onClick={() => setPaymentModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Make Loan Payment</h2>
            <div style={styles.modalLoanInfo}>
              <p><strong>Loan Type:</strong> {paymentModal.loan_type?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Remaining Balance:</strong> ${paymentModal.remaining_balance?.toFixed(2)}</p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                min="0.01"
                max={paymentModal.remaining_balance}
                step="0.01"
                style={styles.input}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                onClick={() => {
                  setPaymentModal(null);
                  setPaymentAmount('');
                  setError('');
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={paymentLoading || !paymentAmount}
                style={{
                  ...styles.submitButton,
                  ...(paymentLoading || !paymentAmount ? styles.submitButtonDisabled : {})
                }}
              >
                {paymentLoading ? 'Processing...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '40px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '5px'
  },
  applyButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    display: 'inline-block'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  successAlert: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#059669'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px'
  },
  emptyButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    display: 'inline-block',
    cursor: 'pointer'
  },
  loansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.3s, box-shadow 0.3s'
  },
  loanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  loanType: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '5px'
  },
  loanDate: {
    fontSize: '13px',
    color: '#999',
    marginTop: '5px'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600'
  },
  loanDetails: {
    marginBottom: '20px'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: '14px',
    color: '#1a1a1a',
    fontWeight: '600'
  },
  detailValueBold: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '700'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '15px 0'
  },
  purposeSection: {
    marginTop: '10px'
  },
  purposeText: {
    fontSize: '14px',
    color: '#4b5563',
    marginTop: '5px',
    lineHeight: '1.6'
  },
  paymentButton: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '20px'
  },
  modalLoanInfo: {
    backgroundColor: '#f9fafb',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  modalButtons: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#fff',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitButton: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  }
};

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}
