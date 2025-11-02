
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

  const getLoanProgress = (loan) => {
    if (!loan.term_months || !loan.payments_made) return 0;
    return Math.min(100, (loan.payments_made / loan.term_months) * 100);
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
            <h1 style={styles.title}>Loan Management Center</h1>
            <p style={styles.subtitle}>View, manage, and make payments on all your loans</p>
          </div>
          <Link href="/loan/apply" style={styles.applyButton}>
            + Apply for New Loan
          </Link>
        </div>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <strong>✓ Success!</strong> {success}
        </div>
      )}

      <div style={styles.main}>
        {loans.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💼</div>
            <h3 style={styles.emptyTitle}>No Active Loans</h3>
            <p style={styles.emptyText}>You haven't applied for any loans yet. Start your journey toward your financial goals today.</p>
            <Link href="/loan/apply" style={styles.emptyButton}>
              Apply for a Loan
            </Link>
          </div>
        ) : (
          <>
            {/* Portfolio Overview */}
            <div style={styles.portfolioSection}>
              <h2 style={styles.sectionTitle}>Portfolio Overview</h2>
              <div style={styles.portfolioCards}>
                <div style={styles.portfolioCard}>
                  <div style={styles.portfolioIcon}>💰</div>
                  <div style={styles.portfolioLabel}>Total Borrowed</div>
                  <div style={styles.portfolioValue}>
                    ${loans.reduce((sum, l) => sum + parseFloat(l.principal || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div style={styles.portfolioCard}>
                  <div style={styles.portfolioIcon}>📊</div>
                  <div style={styles.portfolioLabel}>Total Remaining</div>
                  <div style={styles.portfolioValue}>
                    ${loans.filter(l => l.status === 'active').reduce((sum, l) => sum + parseFloat(l.remaining_balance || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div style={styles.portfolioCard}>
                  <div style={styles.portfolioIcon}>🔢</div>
                  <div style={styles.portfolioLabel}>Active Loans</div>
                  <div style={styles.portfolioValue}>
                    {loans.filter(l => l.status === 'active').length}
                  </div>
                </div>
                <div style={styles.portfolioCard}>
                  <div style={styles.portfolioIcon}>💳</div>
                  <div style={styles.portfolioLabel}>Monthly Payments</div>
                  <div style={styles.portfolioValue}>
                    ${loans.filter(l => l.status === 'active').reduce((sum, l) => sum + calculateMonthlyPayment(l), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Cards */}
            <div style={styles.loansSection}>
              <h2 style={styles.sectionTitle}>My Loans</h2>
              <div style={styles.loanCards}>
                {loans.map(loan => {
                  const monthlyPayment = calculateMonthlyPayment(loan);
                  const remainingBalance = loan.remaining_balance || 0;
                  const progress = getLoanProgress(loan);

                  return (
                    <div 
                      key={loan.id} 
                      style={styles.loanCard}
                      onClick={() => {
                        setSelectedLoan(loan);
                        setActiveTab('overview');
                      }}
                    >
                      <div style={styles.loanCardHeader}>
                        <div style={styles.loanCardHeaderLeft}>
                          <span style={styles.loanIcon}>
                            {loan.loan_type === 'personal' ? '👤' : 
                             loan.loan_type === 'auto_loan' ? '🚗' : 
                             loan.loan_type === 'home_mortgage' ? '🏠' : 
                             loan.loan_type === 'business' ? '💼' : 
                             loan.loan_type === 'student' ? '🎓' : 
                             loan.loan_type === 'home_equity' ? '🏡' : '💰'}
                          </span>
                          <div>
                            <h3 style={styles.loanCardTitle}>
                              {loan.loan_type?.replace('_', ' ').toUpperCase()} Loan
                            </h3>
                            <p style={styles.loanCardDate}>
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
                        <div style={styles.loanRow}>
                          <span style={styles.loanLabel}>Loan Amount</span>
                          <span style={styles.loanValue}>${parseFloat(loan.principal).toLocaleString()}</span>
                        </div>
                        
                        {loan.deposit_required && loan.deposit_required > 0 && (
                          <div style={styles.loanRow}>
                            <span style={styles.loanLabel}>Deposit Required</span>
                            <span style={{...styles.loanValue, color: loan.deposit_paid ? '#10b981' : '#f59e0b'}}>
                              ${parseFloat(loan.deposit_required).toLocaleString()}
                              {loan.deposit_paid && ' ✓ Paid'}
                            </span>
                          </div>
                        )}
                        
                        {loan.status === 'active' && (
                          <>
                            <div style={styles.loanRow}>
                              <span style={styles.loanLabel}>Remaining Balance</span>
                              <span style={{...styles.loanValue, color: '#10b981', fontWeight: '700'}}>
                                ${parseFloat(remainingBalance).toLocaleString()}
                              </span>
                            </div>
                            <div style={styles.loanRow}>
                              <span style={styles.loanLabel}>Monthly Payment</span>
                              <span style={styles.loanValue}>${monthlyPayment.toFixed(2)}</span>
                            </div>
                            <div style={styles.loanRow}>
                              <span style={styles.loanLabel}>Interest Rate</span>
                              <span style={styles.loanValue}>{loan.interest_rate}% APR</span>
                            </div>
                            <div style={styles.loanRow}>
                              <span style={styles.loanLabel}>Next Payment</span>
                              <span style={styles.loanValue}>
                                {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div style={styles.progressSection}>
                              <div style={styles.progressHeader}>
                                <span style={styles.progressLabel}>Payment Progress</span>
                                <span style={styles.progressText}>{loan.payments_made || 0}/{loan.term_months}</span>
                              </div>
                              <div style={styles.progressBar}>
                                <div style={{...styles.progressFill, width: `${progress}%`}}></div>
                              </div>
                              <span style={styles.progressPercent}>{progress.toFixed(1)}% Complete</span>
                            </div>
                          </>
                        )}

                        {loan.status === 'pending' && !loan.deposit_paid && loan.deposit_required > 0 && (
                          <div style={styles.warningNotice}>
                            💰 Deposit Required: Please complete your ${parseFloat(loan.deposit_required).toLocaleString()} deposit to proceed with approval.
                          </div>
                        )}

                        {loan.status === 'pending' && loan.deposit_paid && (
                          <div style={styles.pendingNotice}>
                            ⏳ Your application is being reviewed. You'll receive a notification once approved.
                          </div>
                        )}

                        {loan.status === 'pending' && !loan.deposit_required && (
                          <div style={styles.pendingNotice}>
                            ⏳ Your application is being reviewed. You'll receive a notification once approved.
                          </div>
                        )}

                        {loan.status === 'rejected' && loan.rejection_reason && (
                          <div style={styles.rejectedNotice}>
                            ❌ Application was not approved: {loan.rejection_reason}
                          </div>
                        )}

                        {loan.is_late && (
                          <div style={styles.warningBadge}>
                            ⚠️ Payment Overdue - Late fee applied
                          </div>
                        )}

                        {loan.auto_payment_enabled && (
                          <div style={styles.autoPayBadge}>
                            ✓ Auto-Pay Enabled
                          </div>
                        )}
                      </div>

                      {loan.status === 'pending' && !loan.deposit_paid && loan.deposit_required > 0 && (
                        <div style={styles.loanCardActions}>
                          <Link
                            href={`/loan/deposit-confirmation?loan_id=${loan.id}&amount=${loan.deposit_required}`}
                            style={styles.primaryActionButton}
                            onClick={(e) => e.stopPropagation()}
                          >
                            💰 Complete Deposit
                          </Link>
                        </div>
                      )}

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
                  <div style={styles.detailsActions}>
                    {selectedLoan.status === 'active' && (
                      <button
                        onClick={() => {
                          setEarlyPayoffModal(selectedLoan);
                          fetchEarlyPayoffData(selectedLoan.id);
                        }}
                        style={styles.earlyPayoffButton}
                      >
                        💰 Early Payoff
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.tabs}>
                  <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'overview' ? styles.tabActive : {})
                    }}
                  >
                    📋 Overview
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
                        📊 Payment Schedule
                      </button>
                      <button
                        onClick={() => setActiveTab('history')}
                        style={{
                          ...styles.tab,
                          ...(activeTab === 'history' ? styles.tabActive : {})
                        }}
                      >
                        📜 Payment History
                      </button>
                      <button
                        onClick={() => setActiveTab('autopay')}
                        style={{
                          ...styles.tab,
                          ...(activeTab === 'autopay' ? styles.tabActive : {})
                        }}
                      >
                        ⚙️ Auto-Pay Settings
                      </button>
                    </>
                  )}
                </div>

                <div style={styles.tabContent}>
                  {activeTab === 'overview' && (
                    <div style={styles.overviewSection}>
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
                              <div style={styles.infoLabel}>Total Paid</div>
                              <div style={styles.infoValue}>
                                ${(parseFloat(selectedLoan.principal) - parseFloat(selectedLoan.remaining_balance || selectedLoan.principal)).toLocaleString()}
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
                              <div style={styles.infoLabel}>Auto-Payment Status</div>
                              <div style={styles.infoValue}>
                                {selectedLoan.auto_payment_enabled ? (
                                  <span style={{color: '#10b981'}}>✓ Enabled</span>
                                ) : (
                                  <span style={{color: '#6b7280'}}>Disabled</span>
                                )}
                              </div>
                            </div>
                            {selectedLoan.disbursed_at && (
                              <div style={styles.infoCard}>
                                <div style={styles.infoLabel}>Disbursement Date</div>
                                <div style={styles.infoValue}>
                                  {new Date(selectedLoan.disbursed_at).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {selectedLoan.purpose && (
                        <div style={styles.purposeSection}>
                          <div style={styles.purposeLabel}>Loan Purpose</div>
                          <div style={styles.purposeText}>{selectedLoan.purpose}</div>
                        </div>
                      )}

                      {selectedLoan.is_late && (
                        <div style={styles.warningCard}>
                          <span style={styles.warningIcon}>⚠️</span>
                          <div>
                            <strong>Late Payment Notice:</strong> Your loan payment is overdue. 
                            {selectedLoan.late_fee_amount > 0 && (
                              <span> A late fee of ${parseFloat(selectedLoan.late_fee_amount).toFixed(2)} has been applied.</span>
                            )}
                            <p style={{marginTop: '8px', marginBottom: 0}}>Please make a payment as soon as possible to avoid additional fees.</p>
                          </div>
                        </div>
                      )}

                      {selectedLoan.approval_notes && (
                        <div style={styles.infoSection}>
                          <div style={styles.infoSectionLabel}>Approval Notes</div>
                          <div style={styles.infoSectionText}>{selectedLoan.approval_notes}</div>
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
    background: 'linear-gradient(to bottom, #f0f9ff 0%, #f7f9fc 100%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '3rem'
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
    background: 'linear-gradient(135deg, #1a365d 0%, #0f172a 100%)',
    color: 'white',
    padding: '2rem 1rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  headerLeft: {
    flex: 1,
    minWidth: '250px'
  },
  title: {
    fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
    fontWeight: '800',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: 'clamp(0.9rem, 2vw, 1.05rem)',
    color: '#bfdbfe',
    margin: 0,
    fontWeight: '400'
  },
  applyButton: {
    padding: '0.875rem 1.75rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    whiteSpace: 'nowrap'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  errorAlert: {
    maxWidth: '1400px',
    margin: '1.5rem auto',
    padding: '1rem 1.25rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderLeft: '4px solid #ef4444',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '0.95rem'
  },
  successAlert: {
    maxWidth: '1400px',
    margin: '1.5rem auto',
    padding: '1rem 1.25rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderLeft: '4px solid #10b981',
    borderRadius: '10px',
    color: '#059669',
    fontSize: '0.95rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: 'clamp(3rem, 6vw, 5rem) 1.5rem',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: 'clamp(3.5rem, 10vw, 5rem)',
    marginBottom: '1.5rem'
  },
  emptyTitle: {
    fontSize: 'clamp(1.5rem, 3.5vw, 1.875rem)',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '0.75rem'
  },
  emptyText: {
    fontSize: 'clamp(0.95rem, 2vw, 1.05rem)',
    color: '#6b7280',
    marginBottom: '2rem',
    maxWidth: '500px',
    margin: '0 auto 2rem'
  },
  emptyButton: {
    display: 'inline-block',
    padding: '1rem 2.5rem',
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    borderRadius: '10px',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  portfolioSection: {
    marginBottom: '2.5rem'
  },
  sectionTitle: {
    fontSize: 'clamp(1.35rem, 3vw, 1.625rem)',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '1.25rem'
  },
  portfolioCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    gap: '1.25rem'
  },
  portfolioCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.75rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  portfolioIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem'
  },
  portfolioLabel: {
    fontSize: '0.85rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  portfolioValue: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: '800',
    color: '#1f2937'
  },
  loansSection: {
    marginBottom: '2.5rem'
  },
  loanCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 360px), 1fr))',
    gap: '1.5rem'
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  loanCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  loanCardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: '0'
  },
  loanIcon: {
    fontSize: '2rem',
    flexShrink: 0
  },
  loanCardTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    lineHeight: '1.3'
  },
  loanCardDate: {
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0'
  },
  statusBadge: {
    padding: '0.4rem 0.875rem',
    borderRadius: '14px',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  loanCardBody: {
    marginBottom: '1.25rem'
  },
  loanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.625rem 0',
    fontSize: '0.9rem',
    borderBottom: '1px solid #f3f4f6',
    gap: '1rem'
  },
  loanLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  loanValue: {
    color: '#1f2937',
    fontWeight: '700',
    textAlign: 'right'
  },
  progressSection: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem'
  },
  progressLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#374151'
  },
  progressText: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#1f2937'
  },
  progressBar: {
    width: '100%',
    height: '10px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '0.4rem'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    borderRadius: '6px',
    transition: 'width 0.5s ease'
  },
  progressPercent: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  pendingNotice: {
    marginTop: '1rem',
    padding: '0.875rem',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  rejectedNotice: {
    marginTop: '1rem',
    padding: '0.875rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  warningNotice: {
    marginTop: '1rem',
    padding: '0.875rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    color: '#92400e',
    fontSize: '0.85rem',
    fontWeight: '600'
  },
  warningBadge: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '0.85rem',
    fontWeight: '700',
    textAlign: 'center'
  },
  autoPayBadge: {
    marginTop: '0.75rem',
    padding: '0.625rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '8px',
    color: '#059669',
    fontSize: '0.8rem',
    fontWeight: '700',
    textAlign: 'center'
  },
  loanCardActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.25rem'
  },
  primaryActionButton: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  secondaryActionButton: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1a365d',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  detailsSection: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  detailsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.75rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  detailsActions: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  earlyPayoffButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabs: {
    display: 'flex',
    borderBottom: '2px solid #e5e7eb',
    marginBottom: '2rem',
    gap: '0.5rem',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  tab: {
    padding: '0.875rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#6b7280',
    background: 'none',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    color: '#10b981',
    borderBottomColor: '#10b981'
  },
  tabContent: {
    minHeight: '300px'
  },
  overviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))',
    gap: '1.25rem'
  },
  infoCard: {
    backgroundColor: '#f9fafb',
    padding: '1.25rem',
    borderRadius: '10px',
    border: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.625rem',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  infoValue: {
    fontSize: 'clamp(1.5rem, 3vw, 1.75rem)',
    fontWeight: '800',
    color: '#1f2937'
  },
  purposeSection: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '10px',
    border: '1px solid #e5e7eb'
  },
  purposeLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  purposeText: {
    fontSize: '0.95rem',
    color: '#374151',
    lineHeight: '1.7'
  },
  warningCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '10px',
    padding: '1.25rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    color: '#dc2626',
    fontSize: '0.9rem',
    lineHeight: '1.6'
  },
  warningIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  infoSection: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '1.25rem'
  },
  infoSectionLabel: {
    fontSize: '0.75rem',
    color: '#1e40af',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  infoSectionText: {
    fontSize: '0.95rem',
    color: '#1e3a8a',
    lineHeight: '1.7'
  },
  modalOverlay: {
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
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: 'clamp(1.75rem, 4vw, 2.5rem)',
    maxWidth: '550px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 1.75rem)',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '1.25rem'
  },
  modalLoanInfo: {
    backgroundColor: '#f9fafb',
    padding: '1.25rem',
    borderRadius: '10px',
    marginBottom: '1.75rem',
    fontSize: '0.9rem',
    lineHeight: '1.8'
  },
  formGroup: {
    marginBottom: '1.75rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '0.625rem'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  },
  quickActions: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    flexWrap: 'wrap'
  },
  quickButton: {
    flex: 1,
    minWidth: '140px',
    padding: '0.625rem 1rem',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#10b981',
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    flexWrap: 'wrap'
  },
  cancelButton: {
    padding: '0.875rem 1.75rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '0.875rem 1.75rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  earlyPayoffInfo: {
    marginBottom: '1.75rem'
  },
  earlyPayoffDesc: {
    fontSize: '0.9rem',
    color: '#6b7280',
    marginBottom: '1.25rem',
    lineHeight: '1.6'
  },
  earlyPayoffGrid: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '10px',
    border: '1px solid #e5e7eb'
  },
  payoffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.875rem 0',
    fontSize: '0.9rem',
    color: '#374151',
    gap: '1rem'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '1rem 0'
  },
  savingsBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#059669',
    fontWeight: '700',
    fontSize: '0.9rem'
  },
  savingsIcon: {
    fontSize: '1.5rem'
  }
};

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}
