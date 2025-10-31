
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
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Loading your loans...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <h1 style={styles.title}>My Loans</h1>
            <p style={styles.subtitle}>Manage your loan portfolio</p>
          </div>
          <Link href="/loan/apply" style={styles.applyButton}>
            + Apply for Loan
          </Link>
        </div>
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

      <div style={styles.main}>
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
          <>
            {/* Loan Summary Cards */}
            <div style={styles.summarySection}>
              <h2 style={styles.sectionTitle}>Loan Summary</h2>
              <div style={styles.summaryCards}>
                {loans.map(loan => {
                  const monthlyPayment = calculateMonthlyPayment(loan);
                  const remainingBalance = loan.remaining_balance || 0;

                  return (
                    <div 
                      key={loan.id} 
                      style={styles.loanSummaryCard}
                      onClick={() => {
                        setSelectedLoan(loan);
                        setActiveTab('overview');
                      }}
                    >
                      <div style={styles.loanCardHeader}>
                        <div style={styles.loanTypeSection}>
                          <span style={styles.loanIcon}>
                            {loan.loan_type === 'personal' ? '👤' : 
                             loan.loan_type === 'auto' ? '🚗' : 
                             loan.loan_type === 'home' ? '🏠' : 
                             loan.loan_type === 'business' ? '💼' : '💰'}
                          </span>
                          <div>
                            <h3 style={styles.loanTypeName}>
                              {loan.loan_type?.replace('_', ' ').toUpperCase()} Loan
                            </h3>
                            <p style={styles.loanDate}>
                              Applied: {new Date(loan.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div
                          style={{
                            ...styles.statusBadge,
                            backgroundColor: getStatusColor(loan.status)
                          }}
                        >
                          {getStatusLabel(loan.status)}
                        </div>
                      </div>

                      <div style={styles.loanCardBody}>
                        <div style={styles.loanDetailRow}>
                          <span style={styles.detailLabel}>Principal Amount</span>
                          <span style={styles.detailValue}>${parseFloat(loan.principal).toLocaleString()}</span>
                        </div>
                        
                        {loan.status === 'active' && (
                          <>
                            <div style={styles.loanDetailRow}>
                              <span style={styles.detailLabel}>Remaining Balance</span>
                              <span style={{...styles.detailValue, color: '#10b981'}}>
                                ${parseFloat(remainingBalance).toLocaleString()}
                              </span>
                            </div>
                            <div style={styles.loanDetailRow}>
                              <span style={styles.detailLabel}>Monthly Payment</span>
                              <span style={styles.detailValue}>${monthlyPayment.toFixed(2)}</span>
                            </div>
                            <div style={styles.loanDetailRow}>
                              <span style={styles.detailLabel}>Next Payment</span>
                              <span style={styles.detailValue}>
                                {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}

                        {loan.is_late && (
                          <div style={styles.warningBadge}>
                            ⚠️ Payment Overdue
                          </div>
                        )}
                      </div>

                      {loan.status === 'active' && (
                        <div style={styles.loanCardActions}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentModal(loan);
                            }}
                            style={styles.primaryActionButton}
                          >
                            Make Payment
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLoan(loan);
                              setActiveTab('overview');
                            }}
                            style={styles.secondaryActionButton}
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Loan View */}
            {selectedLoan && (
              <div style={styles.detailsSection}>
                <div style={styles.detailsHeader}>
                  <h2 style={styles.sectionTitle}>
                    {selectedLoan.loan_type?.replace('_', ' ').toUpperCase()} Loan Details
                  </h2>
                  {selectedLoan.status === 'active' && (
                    <button
                      onClick={() => {
                        setEarlyPayoffModal(selectedLoan);
                        fetchEarlyPayoffData(selectedLoan.id);
                      }}
                      style={styles.earlyPayoffButton}
                    >
                      Early Payoff
                    </button>
                  )}
                </div>

                <div style={styles.tabs}>
                  <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'overview' ? styles.tabActive : {})
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
                          ...(activeTab === 'amortization' ? styles.tabActive : {})
                        }}
                      >
                        Schedule
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        style={{
                          ...styles.tab,
                          ...(activeTab === 'history' ? styles.tabActive : {})
                        }}
                      >
                        History
                      </button>
                      <button
                        onClick={() => setActiveTab('autopay')}
                        style={{
                          ...styles.tab,
                          ...(activeTab === 'autopay' ? styles.tabActive : {})
                        }}
                      >
                        Auto-Pay
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
          </>
        )}
      </div>

      {/* Payment Modal */}
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

      {/* Early Payoff Modal */}
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
                      <span style={{fontSize: '1.1rem', fontWeight: '700'}}>Early Payoff Amount:</span>
                      <strong style={{fontSize: '1.5rem', color: '#10b981'}}>
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
              <div style={styles.loadingText}>Loading early payoff details...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f7f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '2rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  },
  loadingSpinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #1a365d',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '1rem',
    color: '#64748b',
    textAlign: 'center'
  },
  header: {
    background: '#1a365d',
    color: 'white',
    padding: '1.5rem 1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  headerLeft: {
    flex: 1
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '700',
    margin: '0 0 0.25rem 0'
  },
  subtitle: {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    color: '#bfdbfe',
    margin: 0
  },
  applyButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#fff',
    background: '#10b981',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem 1rem'
  },
  errorAlert: {
    maxWidth: '1200px',
    margin: '1rem auto',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '0.9rem'
  },
  successAlert: {
    maxWidth: '1200px',
    margin: '1rem auto',
    padding: '1rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid '#dcfce7',
    borderRadius: '8px',
    color: '#10b981',
    fontSize: '0.9rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(2rem, 5vw, 4rem) 1rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: 'clamp(3rem, 8vw, 4rem)',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  emptyText: {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    color: '#6b7280',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    display: 'inline-block',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    borderRadius: '8px',
    textDecoration: 'none'
  },
  summarySection: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
    gap: '1rem'
  },
  loanSummaryCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  loanCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  loanTypeSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1
  },
  loanIcon: {
    fontSize: '1.75rem'
  },
  loanTypeName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  loanDate: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0'
  },
  statusBadge: {
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap'
  },
  loanCardBody: {
    marginBottom: '1rem'
  },
  loanDetailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    fontSize: '0.875rem',
    borderBottom: '1px solid #f3f4f6'
  },
  detailLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  detailValue: {
    color: '#1f2937',
    fontWeight: '600'
  },
  warningBadge: {
    marginTop: '0.75rem',
    padding: '0.5rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '6px',
    color: '#ef4444',
    fontSize: '0.875rem',
    fontWeight: '600',
    textAlign: 'center'
  },
  loanCardActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem'
  },
  primaryActionButton: {
    flex: 1,
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  secondaryActionButton: {
    flex: 1,
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1a365d',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  earlyPayoffButton: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '1.5rem',
    gap: '0.5rem',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  tab: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#6b7280',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    color: '#10b981',
    borderBottomColor: '#10b981'
  },
  tabContent: {
    minHeight: '200px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
    gap: '1rem'
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: '700',
    color: '#1f2937'
  },
  purposeText: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.6',
    marginTop: '0.5rem'
  },
  warningCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-start',
    color: '#ef4444',
    fontSize: '0.875rem'
  },
  warningIcon: {
    fontSize: '1.25rem',
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
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  modalLoanInfo: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    lineHeight: '1.8'
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
    fontSize: '1rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box'
  },
  quickActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap'
  },
  quickButton: {
    flex: 1,
    minWidth: '120px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  modalButtons: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
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
    marginBottom: '1.5rem'
  },
  earlyPayoffDesc: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  earlyPayoffGrid: {
    backgroundColor: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  payoffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    fontSize: '0.875rem',
    color: '#374151',
    gap: '1rem'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '0.75rem 0'
  },
  savingsBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '6px',
    padding: '0.75rem',
    marginTop: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#10b981',
    fontWeight: '600',
    fontSize: '0.875rem'
  },
  savingsIcon: {
    fontSize: '1.25rem'
  }
};

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}
