import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import AmortizationSchedule from '../../components/loan/AmortizationSchedule';
import PaymentHistory from '../../components/loan/PaymentHistory';
import AutoPaymentManager from '../../components/loan/AutoPaymentManager';

function LoanDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState([]);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEarlyPayoffModal, setShowEarlyPayoffModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [earlyPayoffAmount, setEarlyPayoffAmount] = useState('');
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowed: 0,
    totalPaid: 0,
    remainingBalance: 0,
    nextPaymentDue: null,
    nextPaymentAmount: 0
  });

  // Utility functions for prepayment calculations
  const getMonthsSinceLoanStart = (disbursedDate) => {
    if (!disbursedDate) return 0;
    const start = new Date(disbursedDate);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + 
                       (now.getMonth() - start.getMonth());
    return Math.max(0, monthsDiff);
  };

  const calculatePaymentStatus = (loan) => {
    if (!loan) return { monthsAhead: 0, isAhead: false, isBehind: false, isOnTrack: true };
    
    const paymentsMade = loan.payments_made || 0;
    const monthsSinceLoanStart = getMonthsSinceLoanStart(loan.disbursed_at || loan.approved_at || loan.created_at);
    const monthsAhead = paymentsMade - monthsSinceLoanStart;
    
    return {
      monthsAhead,
      isAhead: monthsAhead > 0,
      isBehind: monthsAhead < 0,
      isOnTrack: monthsAhead === 0
    };
  };

  useEffect(() => {
    if (user) {
      fetchUserLoans();
      fetchUserAccounts();
    }
  }, [user]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 768px) {
        .loan-stats-grid {
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
        }
        .loan-overview-grid {
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
        }
        .loan-info-grid {
          grid-template-columns: 1fr !important;
          gap: 0.75rem !important;
        }
        .loan-selector {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 0.75rem !important;
        }
        .loan-selector-select {
          min-width: 100% !important;
          width: 100% !important;
        }
        .loan-actions {
          flex-direction: column !important;
          gap: 0.75rem !important;
        }
        .loan-quick-actions {
          flex-direction: column !important;
          gap: 0.75rem !important;
        }
        .loan-action-button,
        .loan-primary-action-button,
        .loan-secondary-action-button {
          min-width: 100% !important;
          width: 100% !important;
        }
        .loan-overview-header {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 1rem !important;
        }
        .loan-overview-title {
          font-size: 1.25rem !important;
        }
        .loan-hero-title {
          font-size: 1.5rem !important;
        }
        .loan-stat-card {
          padding: 1rem !important;
        }
        .loan-stat-value {
          font-size: 1.25rem !important;
        }
        .loan-overview-card,
        .loan-tab-content {
          padding: 1rem !important;
        }
        .loan-modal-content {
          padding: 1rem !important;
          margin: 0.5rem !important;
          width: calc(100% - 1rem) !important;
        }
      }
      @media (max-width: 480px) {
        .loan-hero-title {
          font-size: 1.25rem !important;
        }
        .loan-stat-icon {
          font-size: 2rem !important;
        }
        .loan-stat-value {
          font-size: 1.1rem !important;
        }
        .loan-overview-card {
          padding: 0.75rem !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const fetchUserLoans = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/loan/get-loans', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.loans) {
        // Ensure all numeric fields are properly parsed
        const parsedLoans = data.loans.map(loan => ({
          ...loan,
          principal: parseFloat(loan.principal || 0),
          remaining_balance: parseFloat(loan.remaining_balance || 0),
          monthly_payment_amount: parseFloat(loan.monthly_payment_amount || 0),
          total_amount: parseFloat(loan.total_amount || 0),
          interest_rate: parseFloat(loan.interest_rate || 0),
          late_fee_amount: parseFloat(loan.late_fee_amount || 0),
          deposit_required: parseFloat(loan.deposit_required || 0),
          deposit_amount: parseFloat(loan.deposit_amount || 0)
        }));
        setLoans(parsedLoans);

        // Calculate comprehensive stats
        const totalBorrowed = data.loans.reduce((sum, loan) => 
          sum + parseFloat(loan.principal || 0), 0
        );
        const totalPaid = data.loans.reduce((sum, loan) => 
          sum + (parseFloat(loan.principal || 0) - parseFloat(loan.remaining_balance || 0)), 0
        );
        const remainingBalance = data.loans.reduce((sum, loan) => 
          sum + parseFloat(loan.remaining_balance || 0), 0
        );
        const activeLoans = data.loans.filter(loan => 
          loan.status === 'active' || loan.status === 'approved'
        ).length;

        // Find next payment due - only for loans with remaining balance
        const activeLoansWithPayments = data.loans.filter(loan => {
          const hasBalance = parseFloat(loan.remaining_balance || 0) > 0.01;
          const isActiveLoan = loan.status === 'active' || loan.status === 'approved';
          const hasNextPayment = loan.next_payment_date && loan.next_payment_date !== null;
          return isActiveLoan && hasBalance && hasNextPayment;
        });
        
        const nextPayment = activeLoansWithPayments.length > 0
          ? activeLoansWithPayments.reduce((earliest, loan) => {
              if (!earliest) return loan;
              const currentDate = new Date(loan.next_payment_date);
              const earliestDate = new Date(earliest.next_payment_date);
              return currentDate < earliestDate ? loan : earliest;
            }, null)
          : null;

        setStats({
          totalLoans: data.loans.length,
          activeLoans,
          totalBorrowed,
          totalPaid,
          remainingBalance,
          nextPaymentDue: nextPayment?.next_payment_date,
          nextPaymentAmount: nextPayment?.monthly_payment_amount || 0
        });

        if (data.loans.length > 0 && !selectedLoan) {
          setSelectedLoan(data.loans[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('Failed to load loans');
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

  const handleMakePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (!selectedAccount) {
      setError('Please select a payment account');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch('/api/loan/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: selectedLoan.id,
          amount: parseFloat(paymentAmount),
          account_id: selectedAccount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Payment processed successfully!');
        setShowPaymentModal(false);
        setPaymentAmount('');
        fetchUserLoans();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Payment failed');
      }
    } catch (err) {
      setError('An error occurred while processing payment');
    } finally {
      setLoading(false);
    }
  };

  const handleEarlyPayoff = async () => {
    if (!earlyPayoffAmount || parseFloat(earlyPayoffAmount) <= 0) {
      setError('Please enter a valid payoff amount');
      return;
    }

    setLoading(true);
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
          loan_id: selectedLoan.id,
          payoff_amount: parseFloat(earlyPayoffAmount),
          account_id: selectedAccount
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Loan paid off successfully!');
        setShowEarlyPayoffModal(false);
        setEarlyPayoffAmount('');
        fetchUserLoans();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Early payoff failed');
      }
    } catch (err) {
      setError('An error occurred while processing early payoff');
    } finally {
      setLoading(false);
    }
  };

  const downloadLoanStatement = (loan) => {
    const statement = `
OAKLINE BANK - LOAN STATEMENT
===============================

Loan ID: ${loan.id}
Loan Type: ${loan.loan_type}
Original Amount: $${parseFloat(loan.principal).toLocaleString()}
Current Balance: $${parseFloat(loan.remaining_balance).toLocaleString()}
Interest Rate: ${loan.interest_rate}% APR
Monthly Payment: $${parseFloat(loan.monthly_payment_amount).toLocaleString()}
Term: ${loan.term_months} months
Status: ${loan.status}
Application Date: ${new Date(loan.created_at).toLocaleDateString()}
${loan.next_payment_date ? `Next Payment Due: ${new Date(loan.next_payment_date).toLocaleDateString()}` : ''}

Generated: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([statement], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_statement_${loan.id.substring(0, 8)}.txt`;
    a.click();
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#f59e0b',
      'awaiting_approval': '#3b82f6',
      'approved': '#10b981',
      'active': '#059669',
      'rejected': '#ef4444',
      'closed': '#6b7280',
      'paid_off': '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const getDaysUntilPayment = (date) => {
    if (!date) return null;
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading && loans.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <div style={styles.loadingText}>Loading your loans...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Loan Management Dashboard</h1>
          <p style={styles.heroSubtitle}>
            Manage all your loans, make payments, and track your progress
          </p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Alerts */}
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

        {/* Stats Dashboard */}
        <div style={styles.statsGrid} className="loan-stats-grid">
          <div style={styles.statCard} className="loan-stat-card">
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Loans</div>
              <div style={styles.statValue} className="loan-stat-value">{stats.totalLoans}</div>
              <div style={styles.statSubtext}>{stats.activeLoans} active</div>
            </div>
          </div>

          <div style={styles.statCard} className="loan-stat-card">
            <div style={styles.statIcon}>💰</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Borrowed</div>
              <div style={styles.statValue} className="loan-stat-value">${stats.totalBorrowed.toLocaleString()}</div>
              <div style={styles.statSubtext}>All time</div>
            </div>
          </div>

          <div style={styles.statCard} className="loan-stat-card">
            <div style={styles.statIcon}>📈</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Total Paid</div>
              <div style={styles.statValue} className="loan-stat-value">${stats.totalPaid.toLocaleString()}</div>
              <div style={styles.statSubtext}>Principal reduction</div>
            </div>
          </div>

          <div style={styles.statCard} className="loan-stat-card">
            <div style={styles.statIcon}>💳</div>
            <div style={styles.statContent}>
              <div style={styles.statLabel}>Remaining Balance</div>
              <div style={styles.statValue} className="loan-stat-value">${stats.remainingBalance.toLocaleString()}</div>
              <div style={styles.statSubtext}>Across all loans</div>
            </div>
          </div>

          {stats.nextPaymentDue && stats.remainingBalance > 0 && (
            <div style={{...styles.statCard, gridColumn: 'span 2'}} className="loan-stat-card">
              <div style={styles.statIcon}>📅</div>
              <div style={styles.statContent}>
                <div style={styles.statLabel}>Next Payment Due</div>
                <div style={styles.statValue} className="loan-stat-value">
                  {new Date(stats.nextPaymentDue).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={styles.statSubtext}>
                  ${stats.nextPaymentAmount.toLocaleString()} • {getDaysUntilPayment(stats.nextPaymentDue)} days
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={styles.quickActions} className="loan-quick-actions">
          <Link href="/loan/apply" style={styles.actionButton} className="loan-action-button">
            ➕ Apply for New Loan
          </Link>
          <button onClick={() => selectedLoan && setShowPaymentModal(true)} style={styles.actionButtonSecondary} className="loan-action-button">
            💳 Make Payment
          </button>
          <button onClick={() => selectedLoan && downloadLoanStatement(selectedLoan)} style={styles.actionButtonSecondary} className="loan-action-button">
            📥 Download Statement
          </button>
        </div>

        {loans.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h2 style={styles.emptyTitle}>No Active Loans</h2>
            <p style={styles.emptyText}>
              You don't have any loans yet. Apply for a loan to get started!
            </p>
            <Link href="/loan/apply" style={styles.emptyButton}>
              Apply for a Loan
            </Link>
          </div>
        ) : (
          <>
            {/* Loan Selector */}
            <div style={styles.loanSelector} className="loan-selector">
              <label style={styles.loanSelectorLabel}>Select Loan:</label>
              <select
                value={selectedLoan?.id || ''}
                onChange={(e) => setSelectedLoan(loans.find(l => l.id === e.target.value))}
                style={styles.loanSelectorSelect}
                className="loan-selector-select"
              >
                {loans.map((loan) => (
                  <option key={loan.id} value={loan.id}>
                    {loan.loan_type.replace(/_/g, ' ').toUpperCase()} - ${parseFloat(loan.principal).toLocaleString()} ({loan.status})
                  </option>
                ))}
              </select>
            </div>

            {selectedLoan && (
              <>
                {/* Loan Overview Card */}
                <div style={styles.overviewCard} className="loan-overview-card">
                  <div style={styles.overviewHeader} className="loan-overview-header">
                    <div style={styles.overviewHeaderLeft}>
                      <h2 style={styles.overviewTitle} className="loan-overview-title">
                        {selectedLoan.loan_type.replace(/_/g, ' ').toUpperCase()}
                      </h2>
                      <div style={styles.loanId}>ID: {selectedLoan.id.substring(0, 8)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {selectedLoan.is_late && (
                        <div style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '700'
                        }}>
                          ⚠️ LATE
                        </div>
                      )}
                      {selectedLoan.auto_payment_enabled && (
                        <div style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '700'
                        }}>
                          🤖 AUTO-PAY
                        </div>
                      )}
                      <div
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(selectedLoan.status)
                        }}
                      >
                        {selectedLoan.status.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Prepayment Status Badge */}
                  {(() => {
                    const paymentStatus = calculatePaymentStatus(selectedLoan);
                    return paymentStatus.isAhead && (
                      <div style={{
                        backgroundColor: '#d1fae5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{ fontSize: '24px' }}>✓</span>
                        <div>
                          <div style={{ fontWeight: '700', color: '#065f46', fontSize: '16px' }}>
                            {paymentStatus.monthsAhead} Month{paymentStatus.monthsAhead !== 1 ? 's' : ''} Paid Ahead
                          </div>
                          <div style={{ fontSize: '14px', color: '#059669', marginTop: '4px' }}>
                            You're ahead of schedule on your loan payments!
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div style={styles.overviewGrid} className="loan-overview-grid">
                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Original Amount</div>
                      <div style={styles.overviewValue}>
                        ${parseFloat(selectedLoan.principal).toLocaleString()}
                      </div>
                    </div>

                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Current Balance</div>
                      <div style={{...styles.overviewValue, color: '#10b981'}}>
                        ${parseFloat(selectedLoan.remaining_balance || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Interest Rate</div>
                      <div style={styles.overviewValue}>{selectedLoan.interest_rate}% APR</div>
                    </div>

                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Monthly Payment</div>
                      <div style={styles.overviewValue}>
                        ${parseFloat(selectedLoan.monthly_payment_amount || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Term</div>
                      <div style={styles.overviewValue}>{selectedLoan.term_months} months</div>
                    </div>

                    <div style={styles.overviewItem}>
                      <div style={styles.overviewLabel}>Payments Made</div>
                      <div style={styles.overviewValue}>
                        {selectedLoan.payments_made || 0} / {selectedLoan.term_months}
                      </div>
                    </div>

                    {parseFloat(selectedLoan.late_fee_amount || 0) > 0 && (
                      <div style={styles.overviewItem}>
                        <div style={styles.overviewLabel}>Late Fees</div>
                        <div style={{...styles.overviewValue, color: '#dc2626'}}>
                          ${parseFloat(selectedLoan.late_fee_amount).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {selectedLoan.next_payment_date && parseFloat(selectedLoan.remaining_balance || 0) > 0.01 && (
                      <div style={styles.overviewItem}>
                        <div style={styles.overviewLabel}>Next Payment Due</div>
                        <div style={{...styles.overviewValue, color: '#1e40af'}}>
                          {new Date(selectedLoan.next_payment_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    )}

                    {parseFloat(selectedLoan.remaining_balance || 0) <= 0.01 && selectedLoan.status === 'active' && (
                      <div style={{...styles.overviewItem, gridColumn: 'span 2'}}>
                        <div style={{
                          backgroundColor: '#d1fae5',
                          padding: '12px',
                          borderRadius: '8px',
                          textAlign: 'center',
                          color: '#065f46',
                          fontWeight: '700',
                          fontSize: '16px'
                        }}>
                          🎉 Loan Fully Paid! No more payments required.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(selectedLoan.status === 'active' || selectedLoan.status === 'approved') && (
                    <div style={styles.progressSection}>
                      <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>Loan Progress</span>
                        <span style={styles.progressText}>
                          {((selectedLoan.payments_made / selectedLoan.term_months) * 100).toFixed(1)}% Complete
                        </span>
                      </div>
                      <div style={styles.progressBar}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${(selectedLoan.payments_made / selectedLoan.term_months) * 100}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Loan Actions */}
                  <div style={styles.loanActions} className="loan-actions">
                    {(selectedLoan.status === 'active' || selectedLoan.status === 'approved') && (
                      <>
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          style={styles.primaryActionButton}
                          className="loan-primary-action-button"
                        >
                          💳 Make Payment
                        </button>
                        <button
                          onClick={() => setShowEarlyPayoffModal(true)}
                          style={styles.secondaryActionButton}
                          className="loan-secondary-action-button"
                        >
                          ⚡ Pay Off Early
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => downloadLoanStatement(selectedLoan)}
                      style={styles.secondaryActionButton}
                      className="loan-secondary-action-button"
                    >
                      📥 Download Statement
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={styles.tabs}>
                  <button
                    onClick={() => setActiveTab('overview')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'overview' ? styles.tabActive : {})
                    }}
                  >
                    📊 Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'schedule' ? styles.tabActive : {})
                    }}
                  >
                    📅 Payment Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'history' ? styles.tabActive : {})
                    }}
                  >
                    💳 Payment History
                  </button>
                  <button
                    onClick={() => setActiveTab('autopay')}
                    style={{
                      ...styles.tab,
                      ...(activeTab === 'autopay' ? styles.tabActive : {})
                    }}
                  >
                    ⚙️ Auto-Pay
                  </button>
                </div>

                {/* Tab Content */}
                <div style={styles.tabContent} className="loan-tab-content">
                  {activeTab === 'overview' && (
                    <div style={styles.overviewTab}>
                      <div style={styles.infoSection}>
                        <h3 style={styles.infoSectionTitle}>Loan Details</h3>
                        <div style={styles.infoGrid} className="loan-info-grid">
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Application Date:</span>
                            <span style={styles.infoValue}>
                              {new Date(selectedLoan.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {selectedLoan.approved_at && (
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Approval Date:</span>
                              <span style={styles.infoValue}>
                                {new Date(selectedLoan.approved_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {selectedLoan.next_payment_date && parseFloat(selectedLoan.remaining_balance || 0) > 0.01 && (
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Next Payment Due:</span>
                              <span style={{...styles.infoValue, color: '#1e40af', fontWeight: '700'}}>
                                {new Date(selectedLoan.next_payment_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </div>
                          )}
                          {parseFloat(selectedLoan.remaining_balance || 0) <= 0.01 && selectedLoan.status === 'active' && (
                            <div style={styles.infoItem}>
                              <span style={styles.infoLabel}>Payment Status:</span>
                              <span style={{...styles.infoValue, color: '#10b981', fontWeight: '700'}}>
                                ✅ Fully Paid - No Payments Due
                              </span>
                            </div>
                          )}
                          {(() => {
                            const paymentStatus = calculatePaymentStatus(selectedLoan);
                            if (paymentStatus.isAhead) {
                              return (
                                <div style={styles.infoItem}>
                                  <span style={styles.infoLabel}>Payment Status:</span>
                                  <span style={{...styles.infoValue, color: '#059669', fontWeight: '700'}}>
                                    ✓ {paymentStatus.monthsAhead} Month{paymentStatus.monthsAhead !== 1 ? 's' : ''} Ahead
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Purpose:</span>
                            <span style={styles.infoValue}>{selectedLoan.purpose || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {selectedLoan.auto_payment_enabled && (
                        <div style={styles.autoPayBadge}>
                          🤖 Auto-Payment Enabled
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'schedule' && selectedLoan && selectedLoan.id && (
                    <AmortizationSchedule loanId={selectedLoan.id} />
                  )}

                  {activeTab === 'history' && (
                    <PaymentHistory loanId={selectedLoan.id} />
                  )}

                  {activeTab === 'autopay' && (
                    <AutoPaymentManager loan={selectedLoan} />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPaymentModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="loan-modal-content">
            <h2 style={styles.modalTitle}>Make a Payment</h2>

            <div style={styles.modalLoanInfo}>
              <div>Loan: {selectedLoan?.loan_type.replace(/_/g, ' ').toUpperCase()}</div>
              <div>Current Balance: ${parseFloat(selectedLoan?.remaining_balance || 0).toLocaleString()}</div>
              <div>Minimum Payment: ${parseFloat(selectedLoan?.monthly_payment_amount || 0).toLocaleString()}</div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Amount</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                min={selectedLoan?.monthly_payment_amount}
                step="0.01"
                style={styles.input}
              />
              <div style={styles.quickActions}>
                <button
                  onClick={() => setPaymentAmount(selectedLoan?.monthly_payment_amount)}
                  style={styles.quickButton}
                >
                  Minimum
                </button>
                <button
                  onClick={() => setPaymentAmount(parseFloat(selectedLoan?.monthly_payment_amount || 0) * 2)}
                  style={styles.quickButton}
                >
                  2x Minimum
                </button>
                <button
                  onClick={() => setPaymentAmount(selectedLoan?.remaining_balance)}
                  style={styles.quickButton}
                >
                  Full Balance
                </button>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.input}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_type.toUpperCase()} - ****{account.account_number.slice(-4)}
                    (${parseFloat(account.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleMakePayment}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Payoff Modal */}
      {showEarlyPayoffModal && (
        <div style={styles.modalOverlay} onClick={() => setShowEarlyPayoffModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} className="loan-modal-content">
            <h2 style={styles.modalTitle}>Early Loan Payoff</h2>

            <div style={styles.modalLoanInfo}>
              <div>Remaining Balance: ${parseFloat(selectedLoan?.remaining_balance || 0).toLocaleString()}</div>
              <div>Early Payoff Amount: ${parseFloat(selectedLoan?.remaining_balance || 0).toLocaleString()}</div>
              <div style={{color: '#10b981', fontWeight: '700'}}>
                ✓ No prepayment penalty
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payoff Amount</label>
              <input
                type="number"
                value={earlyPayoffAmount}
                onChange={(e) => setEarlyPayoffAmount(e.target.value)}
                placeholder={selectedLoan?.remaining_balance}
                step="0.01"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                style={styles.input}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_type.toUpperCase()} - ****{account.account_number.slice(-4)}
                    (${parseFloat(account.balance).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.warningNotice}>
              ⚠️ This will pay off your loan in full and close the account.
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowEarlyPayoffModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleEarlyPayoff}
                disabled={loading}
                style={styles.confirmButton}
              >
                {loading ? 'Processing...' : 'Confirm Payoff'}
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
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  hero: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '4rem 1.5rem',
    textAlign: 'center',
    color: '#fff',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3rem)',
    fontWeight: '800',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    lineHeight: '1.2'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    opacity: '0.95',
    lineHeight: '1.6'
  },
  mainContent: {
    maxWidth: '1400px',
    margin: '-2.5rem auto 0',
    padding: '0 1.5rem 4rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '1.5rem'
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '6px solid #f3f4f6',
    borderTop: '6px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '1.125rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderLeft: '4px solid #ef4444',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderLeft: '4px solid #10b981',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  alertIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  alertTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    marginBottom: '0.25rem',
    display: 'block'
  },
  alertMessage: {
    fontSize: '0.875rem',
    margin: 0,
    color: '#4b5563'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  },
  statIcon: {
    fontSize: '3rem',
    flexShrink: 0
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  statSubtext: {
    fontSize: '0.875rem',
    color: '#9ca3af'
  },
  quickActions: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    border: 'none',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)',
    transition: 'all 0.2s'
  },
  actionButtonSecondary: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e40af',
    backgroundColor: '#fff',
    border: '2px solid #1e40af',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '5rem 3rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: '5rem',
    marginBottom: '1.5rem'
  },
  emptyTitle: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '1rem'
  },
  emptyText: {
    fontSize: '1.125rem',
    color: '#6b7280',
    marginBottom: '2rem',
    maxWidth: '500px',
    margin: '0 auto 2rem'
  },
  emptyButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    border: 'none',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  loanSelector: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  loanSelectorLabel: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1f2937'
  },
  loanSelectorSelect: {
    flex: 1,
    minWidth: '300px',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  overviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  overviewHeaderLeft: {
    flex: 1
  },
  overviewTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  loanId: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontFamily: 'monospace'
  },
  statusBadge: {
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  overviewItem: {
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  overviewLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  overviewValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1f2937'
  },
  progressSection: {
    padding: '1.5rem',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    marginBottom: '2rem'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem'
  },
  progressLabel: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1e40af'
  },
  progressText: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#1e40af'
  },
  progressBar: {
    width: '100%',
    height: '14px',
    backgroundColor: '#dbeafe',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)',
    borderRadius: '8px',
    transition: 'width 0.5s ease'
  },
  loanActions: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  primaryActionButton: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'all 0.2s'
  },
  secondaryActionButton: {
    flex: 1,
    minWidth: '200px',
    padding: '1rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e40af',
    backgroundColor: '#fff',
    border: '2px solid #1e40af',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0',
    borderBottom: '2px solid #e5e7eb',
    overflowX: 'auto'
  },
  tab: {
    padding: '1rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    color: '#1e40af',
    borderBottomColor: '#1e40af'
  },
  tabContent: {
    backgroundColor: '#fff',
    borderRadius: '0 0 16px 16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  overviewTab: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  infoSection: {
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px'
  },
  infoSectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '1.5rem'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem',
    backgroundColor: '#fff',
    borderRadius: '8px'
  },
  infoLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  infoValue: {
    fontSize: '0.875rem',
    color: '#1f2937',
    fontWeight: '700'
  },
  autoPayBadge: {
    padding: '1rem',
    backgroundColor: '#d1fae5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    color: '#059669',
    fontSize: '1rem',
    fontWeight: '700',
    textAlign: 'center'
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
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: '1.5rem'
  },
  modalLoanInfo: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
    fontSize: '0.875rem',
    lineHeight: '2'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    fontSize: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    boxSizing: 'border-box'
  },
  quickButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e40af',
    backgroundColor: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  warningNotice: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem',
    color: '#92400e',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#4b5563',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  }
};

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}