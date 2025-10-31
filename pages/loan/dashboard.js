import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import AmortizationSchedule from '../../components/loan/AmortizationSchedule';
import AutoPaymentManager from '../../components/loan/AutoPaymentManager';
import PaymentHistory from '../../components/loan/PaymentHistory';

function LoanDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentModal, setPaymentModal] = useState(null);
  const [earlyPayoffModal, setEarlyPayoffModal] = useState(null);
  const [earlyPayoffData, setEarlyPayoffData] = useState(null);
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
        if (data.loans && data.loans.length > 0 && !selectedLoan) {
          setSelectedLoan(data.loans[0]);
        }
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

  const calculateMonthlyPayment = (loan) => {
    if (loan.monthly_payment_amount) {
      return parseFloat(loan.monthly_payment_amount);
    }

    const monthlyRate = loan.interest_rate / 100 / 12;
    const numPayments = loan.term_months;

    if (monthlyRate === 0) {
      return loan.principal / numPayments;
    }

    const monthlyPayment = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment;
  };

  const fetchEarlyPayoffData = async (loanId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/loan/early-payoff?loan_id=${loanId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setEarlyPayoffData(data);
      }
    } catch (err) {
      console.error('Error fetching early payoff data:', err);
    }
  };

  const handleEarlyPayoff = async () => {
    if (!earlyPayoffModal) return;

    setPaymentLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/loan/early-payoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: earlyPayoffModal.id,
          execute: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Loan paid off successfully! You saved $${data.payoff_details.discount_received.toLocaleString()} with early payoff.`);
        setEarlyPayoffModal(null);
        setEarlyPayoffData(null);
        await fetchUserLoans();
      } else {
        setError(data.error || 'Failed to process early payoff');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while processing early payoff');
    } finally {
      setPaymentLoading(false);
    }
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
          <p style={styles.subtitle}>Comprehensive loan management and tracking</p>
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
        <div style={styles.dashboardLayout}>
          <div style={styles.loansList}>
            <h2 style={styles.sectionTitle}>Your Loans</h2>
            {loans.map(loan => {
              const monthlyPayment = calculateMonthlyPayment(loan);
              const remainingBalance = loan.remaining_balance || 0;
              const isSelected = selectedLoan?.id === loan.id;

              return (
                <div 
                  key={loan.id} 
                  style={{
                    ...styles.loanCard,
                    border: isSelected ? '2px solid #10b981' : '1px solid #e5e7eb',
                    backgroundColor: isSelected ? '#f0fdf4' : '#fff'
                  }}
                  onClick={() => {
                    setSelectedLoan(loan);
                    setActiveTab('overview');
                  }}
                >
                  <div style={styles.loanCardHeader}>
                    <h3 style={styles.loanType}>
                      {loan.loan_type?.replace('_', ' ').toUpperCase()}
                    </h3>
                    <div
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(loan.status)
                      }}
                    >
                      {getStatusLabel(loan.status)}
                    </div>
                  </div>
                  <div style={styles.loanCardDetails}>
                    <div style={styles.loanCardRow}>
                      <span>Principal:</span>
                      <strong>${parseFloat(loan.principal).toLocaleString()}</strong>
                    </div>
                    {loan.status === 'active' && (
                      <div style={styles.loanCardRow}>
                        <span>Remaining:</span>
                        <strong style={{color: '#10b981'}}>${parseFloat(remainingBalance).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedLoan && (
            <div style={styles.loanDetails}>
              <div style={styles.loanDetailHeader}>
                <div>
                  <h2 style={styles.loanDetailTitle}>
                    {selectedLoan.loan_type?.replace('_', ' ').toUpperCase()} Loan
                  </h2>
                  <p style={styles.loanDetailSubtitle}>
                    Applied: {new Date(selectedLoan.created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedLoan.status === 'active' && (
                  <div style={styles.actionButtons}>
                    <button
                      onClick={() => setPaymentModal(selectedLoan)}
                      style={{...styles.actionButton, backgroundColor: '#10b981'}}
                    >
                      Make Payment
                    </button>
                    <button
                      onClick={() => {
                        setEarlyPayoffModal(selectedLoan);
                        fetchEarlyPayoffData(selectedLoan.id);
                      }}
                      style={{...styles.actionButton, backgroundColor: '#3b82f6'}}
                    >
                      Early Payoff
                    </button>
                  </div>
                )}
              </div>

              <div style={styles.tabs}>
                <button
                  onClick={() => setActiveTab('overview')}
                  style={{
                    ...styles.tab,
                    borderBottom: activeTab === 'overview' ? '3px solid #10b981' : 'none',
                    color: activeTab === 'overview' ? '#10b981' : '#6b7280'
                  }}
                >
                  Overview
                </button>
                {selectedLoan.status === 'active' && (
                  <>
                    <button
                      onClick={() => setActiveTab('amortization')}
                      style={{
                        ...styles.tab,
                        borderBottom: activeTab === 'amortization' ? '3px solid #10b981' : 'none',
                        color: activeTab === 'amortization' ? '#10b981' : '#6b7280'
                      }}
                    >
                      Payment Schedule
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      style={{
                        ...styles.tab,
                        borderBottom: activeTab === 'history' ? '3px solid #10b981' : 'none',
                        color: activeTab === 'history' ? '#10b981' : '#6b7280'
                      }}
                    >
                      Payment History
                    </button>
                    <button
                      onClick={() => setActiveTab('autopay')}
                      style={{
                        ...styles.tab,
                        borderBottom: activeTab === 'autopay' ? '3px solid #10b981' : 'none',
                        color: activeTab === 'autopay' ? '#10b981' : '#6b7280'
                      }}
                    >
                      Auto-Payment
                    </button>
                  </>
                )}
              </div>

              <div style={styles.tabContent}>
                {activeTab === 'overview' && (
                  <div style={styles.overviewGrid}>
                    <div style={styles.infoCard}>
                      <div style={styles.infoLabel}>Principal Amount</div>
                      <div style={styles.infoValue}>${parseFloat(selectedLoan.principal).toLocaleString()}</div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoLabel}>Interest Rate</div>
                      <div style={styles.infoValue}>{selectedLoan.interest_rate}% APR</div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoLabel}>Loan Term</div>
                      <div style={styles.infoValue}>{selectedLoan.term_months} months</div>
                    </div>
                    <div style={styles.infoCard}>
                      <div style={styles.infoLabel}>Monthly Payment</div>
                      <div style={styles.infoValue}>${calculateMonthlyPayment(selectedLoan).toFixed(2)}</div>
                    </div>
                    
                    {selectedLoan.status === 'active' && (
                      <>
                        <div style={styles.infoCard}>
                          <div style={styles.infoLabel}>Remaining Balance</div>
                          <div style={{...styles.infoValue, color: '#10b981'}}>
                            ${parseFloat(selectedLoan.remaining_balance || 0).toLocaleString()}
                          </div>
                        </div>
                        <div style={styles.infoCard}>
                          <div style={styles.infoLabel}>Next Payment Date</div>
                          <div style={styles.infoValue}>
                            {selectedLoan.next_payment_date ? new Date(selectedLoan.next_payment_date).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <div style={styles.infoCard}>
                          <div style={styles.infoLabel}>Payments Made</div>
                          <div style={styles.infoValue}>
                            {selectedLoan.payments_made || 0} of {selectedLoan.term_months}
                          </div>
                        </div>
                        <div style={styles.infoCard}>
                          <div style={styles.infoLabel}>Auto-Payment</div>
                          <div style={styles.infoValue}>
                            {selectedLoan.auto_payment_enabled ? (
                              <span style={{color: '#10b981'}}>✓ Enabled</span>
                            ) : (
                              <span style={{color: '#6b7280'}}>Disabled</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {selectedLoan.purpose && (
                      <div style={{...styles.infoCard, gridColumn: '1 / -1'}}>
                        <div style={styles.infoLabel}>Loan Purpose</div>
                        <div style={styles.purposeText}>{selectedLoan.purpose}</div>
                      </div>
                    )}

                    {selectedLoan.is_late && (
                      <div style={{...styles.warningCard, gridColumn: '1 / -1'}}>
                        <span style={styles.warningIcon}>⚠️</span>
                        <div>
                          <strong>Late Payment Notice:</strong> Your loan payment is overdue. 
                          {selectedLoan.late_fee_amount > 0 && (
                            <span> A late fee of ${parseFloat(selectedLoan.late_fee_amount).toFixed(2)} has been applied.</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'amortization' && selectedLoan.status === 'active' && (
                  <AmortizationSchedule loanId={selectedLoan.id} />
                )}

                {activeTab === 'history' && selectedLoan.status === 'active' && (
                  <PaymentHistory loanId={selectedLoan.id} />
                )}

                {activeTab === 'autopay' && selectedLoan.status === 'active' && (
                  <AutoPaymentManager loan={selectedLoan} />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {paymentModal && (
        <div style={styles.modalOverlay} onClick={() => setPaymentModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Make Loan Payment</h2>
            <div style={styles.modalLoanInfo}>
              <p><strong>Loan Type:</strong> {paymentModal.loan_type?.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Monthly Payment:</strong> ${calculateMonthlyPayment(paymentModal).toFixed(2)}</p>
              <p><strong>Remaining Balance:</strong> ${parseFloat(paymentModal.remaining_balance || 0).toFixed(2)}</p>
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
              <div style={styles.quickActions}>
                <button
                  onClick={() => setPaymentAmount(calculateMonthlyPayment(paymentModal).toFixed(2))}
                  style={styles.quickButton}
                >
                  Monthly Payment
                </button>
                <button
                  onClick={() => setPaymentAmount(parseFloat(paymentModal.remaining_balance).toFixed(2))}
                  style={styles.quickButton}
                >
                  Full Balance
                </button>
              </div>
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

      {earlyPayoffModal && (
        <div style={styles.modalOverlay} onClick={() => {
          setEarlyPayoffModal(null);
          setEarlyPayoffData(null);
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>Early Loan Payoff</h2>
            
            {earlyPayoffData ? (
              <>
                <div style={styles.earlyPayoffInfo}>
                  <p style={styles.earlyPayoffDesc}>
                    Pay off your loan early and save on interest! Get a 2% discount on your remaining balance.
                  </p>
                  
                  <div style={styles.earlyPayoffGrid}>
                    <div style={styles.payoffRow}>
                      <span>Current Balance:</span>
                      <strong>${earlyPayoffData.early_payoff.current_balance.toLocaleString()}</strong>
                    </div>
                    <div style={styles.payoffRow}>
                      <span>Early Payoff Discount (2%):</span>
                      <strong style={{color: '#10b981'}}>-${earlyPayoffData.early_payoff.discount_amount.toLocaleString()}</strong>
                    </div>
                    <div style={styles.divider}></div>
                    <div style={styles.payoffRow}>
                      <span style={{fontSize: '18px', fontWeight: '700'}}>Early Payoff Amount:</span>
                      <strong style={{fontSize: '24px', color: '#10b981'}}>
                        ${earlyPayoffData.early_payoff.early_payoff_amount.toLocaleString()}
                      </strong>
                    </div>
                    <div style={styles.savingsBox}>
                      <span style={styles.savingsIcon}>💰</span>
                      <span>You'll save ${earlyPayoffData.early_payoff.interest_saved.toLocaleString()} in interest!</span>
                    </div>
                  </div>
                </div>

                <div style={styles.modalButtons}>
                  <button
                    onClick={() => {
                      setEarlyPayoffModal(null);
                      setEarlyPayoffData(null);
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEarlyPayoff}
                    disabled={paymentLoading}
                    style={{
                      ...styles.submitButton,
                      ...(paymentLoading ? styles.submitButtonDisabled : {})
                    }}
                  >
                    {paymentLoading ? 'Processing...' : 'Pay Off Loan'}
                  </button>
                </div>
              </>
            ) : (
              <div style={styles.loading}>Loading early payoff details...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
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
    color: '#1f2937',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
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
    color: '#6b7280'
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#ef4444'
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#10b981'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '10px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '30px'
  },
  emptyButton: {
    display: 'inline-block',
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    borderRadius: '8px',
    textDecoration: 'none'
  },
  dashboardLayout: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '30px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr'
    }
  },
  loansList: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: 'fit-content'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  loanCard: {
    padding: '16px',
    marginBottom: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  loanCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  loanType: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff'
  },
  loanCardDetails: {
    fontSize: '14px'
  },
  loanCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
    color: '#6b7280'
  },
  loanDetails: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  loanDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  loanDetailTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  loanDetailSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
    gap: '24px',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '12px 0',
    fontSize: '15px',
    fontWeight: '600',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabContent: {
    minHeight: '300px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937'
  },
  purposeText: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.6',
    marginTop: '8px'
  },
  warningCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    color: '#ef4444'
  },
  warningIcon: {
    fontSize: '20px',
    flexShrink: 0
  },
  modalOverlay: {
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
    padding: '20px'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '20px'
  },
  modalLoanInfo: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    lineHeight: '1.8'
  },
  formGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  quickActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px'
  },
  quickButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  earlyPayoffInfo: {
    marginBottom: '24px'
  },
  earlyPayoffDesc: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  earlyPayoffGrid: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  payoffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    fontSize: '15px',
    color: '#374151'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '12px 0'
  },
  savingsBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '6px',
    padding: '12px',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#10b981',
    fontWeight: '600'
  },
  savingsIcon: {
    fontSize: '20px'
  }
};

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}
