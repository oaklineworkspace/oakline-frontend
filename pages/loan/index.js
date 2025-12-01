import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    loanType: 'all',
    search: ''
  });
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [existingLoans, setExistingLoans] = useState([]);

  useEffect(() => {
    if (user) {
      fetchUserLoans();
      subscribeToLoanUpdates();
    }

    return () => {
      // Ensure channel is unsubscribed if component unmounts
      try {
        supabase.channel('loans').unsubscribe();
        supabase.channel('crypto_deposits_loans').unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing from channels:", error);
      }
    };
  }, [user]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 768px) {
        .loan-index-filters {
          grid-template-columns: 1fr !important;
        }
        .loan-index-grid {
          grid-template-columns: 1fr !important;
        }
        .loan-index-header {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 1rem !important;
        }
        .loan-index-apply-button {
          width: 100% !important;
        }
        .loan-card-actions {
          flex-direction: column !important;
          gap: 0.5rem !important;
        }
        .loan-detail {
          flex-wrap: wrap !important;
          gap: 0.5rem !important;
        }
        .loan-label, .loan-value {
          width: 100% !important;
          text-align: right !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [loans, filters]);

  const fetchUserLoans = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
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
        showToast(data.error || 'Failed to fetch loans', 'error');
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      showToast('An error occurred while fetching your loans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToLoanUpdates = () => {
    const channel = supabase
      .channel('loans')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'loans',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Loan update received:', payload);
          fetchUserLoans();
        }
      )
      .subscribe();

    const cryptoChannel = supabase
      .channel('crypto_deposits_loans')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crypto_deposits',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new.purpose === 'loan_requirement') {
            console.log('Loan deposit update received:', payload);
            fetchUserLoans();
          }
        }
      )
      .subscribe();

    // Return cleanup functions for channels
    return () => {
      supabase.channel('loans').unsubscribe();
      supabase.channel('crypto_deposits_loans').unsubscribe();
    };
  };

  const applyFilters = () => {
    let filtered = [...loans];

    if (filters.status !== 'all') {
      filtered = filtered.filter(loan => loan.status === filters.status);
    }

    if (filters.loanType !== 'all') {
      filtered = filtered.filter(loan => loan.loan_type === filters.loanType);
    }

    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(loan =>
        loan.loan_reference?.toLowerCase().includes(searchLower) ||
        loan.loan_type?.toLowerCase().includes(searchLower) ||
        loan.purpose?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLoans(filtered);
  };

  const calculateMonthlyPayment = (loan) => {
    if (loan.monthly_payment_amount) {
      return parseFloat(loan.monthly_payment_amount);
    }

    const principal = parseFloat(loan.principal);
    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const numPayments = parseInt(loan.term_months);

    if (isNaN(principal) || isNaN(monthlyRate) || isNaN(numPayments)) {
      return 0; // Return 0 or handle error appropriately
    }

    if (monthlyRate === 0) {
      return numPayments > 0 ? principal / numPayments : principal;
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return isNaN(monthlyPayment) ? 0 : monthlyPayment;
  };

  const calculateNextPaymentDate = (loan) => {
    if (loan.next_payment_date) {
      return new Date(loan.next_payment_date);
    }

    const startDate = loan.start_date ? new Date(loan.start_date) : loan.created_at ? new Date(loan.created_at) : new Date();
    const nextDate = new Date(startDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: '#FFA500', bg: '#FFF3CD', text: 'Pending' },
      approved: { color: '#28A745', bg: '#D4EDDA', text: 'Approved' },
      active: { color: '#007BFF', bg: '#D1ECF1', text: 'Active' },
      rejected: { color: '#DC3545', bg: '#F8D7DA', text: 'Rejected' },
      closed: { color: '#6C757D', bg: '#E2E3E5', text: 'Closed' },
      completed: { color: '#28A745', bg: '#D4EDDA', text: 'Completed' }
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

  const getDepositStatusMessage = (loan) => {
    const depositRequired = parseFloat(loan.deposit_required || 0);

    if (depositRequired <= 0) {
      return null;
    }

    // Check if there are actual deposit transactions
    const hasDepositTransactions = loan.deposit_transactions && Array.isArray(loan.deposit_transactions) && loan.deposit_transactions.length > 0;

    // Show deposit verified if deposit is paid and completed
    if (loan.deposit_paid && loan.deposit_status === 'completed') {
      return (
        <div style={{ ...styles.depositMessage, ...styles.depositCompleted }}>
          ✓ Deposit verified (${depositRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
        </div>
      );
    }

    // Show deposit submitted ONLY if there are actual deposit transactions AND status is pending
    if (hasDepositTransactions && loan.deposit_status === 'pending' && !loan.deposit_paid && loan.status === 'pending') {
      return (
        <div style={{ ...styles.depositMessage, ...styles.depositPending }}>
          ⏳ Deposit submitted — pending admin confirmation
        </div>
      );
    }

    // Show deposit required only if loan is pending, no deposits submitted, and deposit hasn't been paid
    if (loan.status === 'pending' && !hasDepositTransactions && !loan.deposit_paid) {
      return (
        <div style={{ ...styles.depositMessage, ...styles.depositRequired }}>
          ⚠️ 10% deposit required: ${depositRequired.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <Link href={`/loan/deposit-crypto?loan_id=${loan.id}&amount=${depositRequired}`} style={styles.depositButton}>
            Deposit Now
          </Link>
        </div>
      );
    }

    return null;
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

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan' },
    { value: 'home_mortgage', label: 'Home Mortgage' },
    { value: 'auto_loan', label: 'Auto Loan' },
    { value: 'business', label: 'Business Loan' },
    { value: 'student', label: 'Student Loan' },
    { value: 'home_equity', label: 'Home Equity Loan' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', justifyContent: 'center'}}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={{height: '50px', width: 'auto'}} />
            <div style={{textAlign: 'left'}}>
              <div style={{fontSize: '14px', opacity: '0.9'}}>Oakline Bank</div>
              <div style={{fontSize: '20px', fontWeight: '700'}}>Loan Management</div>
            </div>
          </div>
          <h1 style={styles.heroTitle}>Manage Your Loans</h1>
          <p style={styles.heroSubtitle}>Processing your application: Submit 10% deposit → Instant disbursement to your account</p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Processing Info Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderLeft: '4px solid #047857',
          padding: '20px 24px',
          borderRadius: '12px',
          marginBottom: '32px',
          fontSize: '15px',
          color: '#ffffff',
          lineHeight: '1.8',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
        }}>
          <strong style={{fontSize: '16px', display: 'block', marginBottom: '8px'}}>💡 Loan Processing Timeline</strong>
          <div>Your application is being processed. Once you submit and we verify your 10% security deposit, your complete loan amount will be credited instantly to your account.</div>
        </div>

        <div style={styles.topSection}>
          <Link href="/loan/apply" style={styles.applyButton} className="loan-index-apply-button">
            ➕ Apply for New Loan
          </Link>
        </div>

      {toast.show && (
        <div style={{
          ...styles.toast,
          backgroundColor: toast.type === 'error' ? '#DC3545' : toast.type === 'success' ? '#28A745' : '#007BFF'
        }}>
          {toast.message}
        </div>
      )}

      <div style={styles.filtersContainer} className="loan-index-filters">
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={styles.select}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Loan Type</label>
          <select
            value={filters.loanType}
            onChange={(e) => setFilters({ ...filters, loanType: e.target.value })}
            style={styles.select}
          >
            <option value="all">All Types</option>
            {loanTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Search</label>
          <input
            type="text"
            placeholder="Search by reference or purpose..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={styles.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p>Loading your loans...</p>
        </div>
      ) : filteredLoans.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <h3 style={styles.emptyTitle}>
            {loans.length === 0 ? 'No Loans Yet' : 'No Matching Loans'}
          </h3>
          <p style={styles.emptyText}>
            {loans.length === 0
              ? 'You haven\'t applied for any loans yet. Get started by applying for a loan today!'
              : 'Try adjusting your filters to see more results.'}
          </p>
          {loans.length === 0 && (
            <Link href="/loan/apply" style={styles.emptyButton}>
              Apply for a Loan
            </Link>
          )}
        </div>
      ) : (
        <div style={styles.loansGrid} className="loan-index-grid">
          {filteredLoans.map(loan => {
            const monthlyPayment = calculateMonthlyPayment(loan);
            const nextPaymentDate = calculateNextPaymentDate(loan);
            const remainingBalance = parseFloat(loan.remaining_balance || loan.principal);

            return (
              <div key={loan.id} style={styles.loanCard}>
                <div style={styles.loanCardHeader}>
                  <div>
                    <div style={styles.loanType}>{getLoanTypeLabel(loan.loan_type)}</div>
                    <div style={styles.loanReference}>Ref: {loan.loan_reference || loan.id.slice(0, 8)}</div>
                  </div>
                  {getStatusBadge(loan.status)}
                </div>

                <div style={styles.loanCardBody}>
                  <div style={styles.loanDetail}>
                    <span style={styles.loanLabel}>Principal Amount:</span>
                    <span style={styles.loanValue}>
                      ${parseFloat(loan.principal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={styles.loanDetail}>
                    <span style={styles.loanLabel}>Remaining Balance:</span>
                    <span style={{ ...styles.loanValue, color: '#DC3545', fontWeight: '600' }}>
                      ${remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={styles.loanDetail}>
                    <span style={styles.loanLabel}>Interest Rate:</span>
                    <span style={styles.loanValue}>{parseFloat(loan.interest_rate).toFixed(2)}% APR</span>
                  </div>

                  <div style={styles.loanDetail}>
                    <span style={styles.loanLabel}>Monthly Payment:</span>
                    <span style={styles.loanValue}>
                      ${monthlyPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={styles.loanDetail}>
                    <span style={styles.loanLabel}>Term:</span>
                    <span style={styles.loanValue}>{loan.term_months} months</span>
                  </div>

                  {loan.status === 'active' && (
                    <div style={styles.loanDetail}>
                      <span style={styles.loanLabel}>Next Payment:</span>
                      <span style={styles.loanValue}>
                        {nextPaymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  <div style={styles.depositAlertWrapper}>
                    {getDepositStatusMessage(loan)}
                  </div>

                  <div style={styles.loanCardActions}>
                    <Link href={`/loan/${loan.id}`} style={styles.viewButton}>
                      View Details
                    </Link>
                    {loan.status === 'active' && (
                      <Link href={`/loan/${loan.id}?action=payment`} style={styles.payButton}>
                        Make Payment
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredLoans.length > 0 && (
        <div style={styles.summary}>
          <p style={styles.summaryText}>
            Showing {filteredLoans.length} of {loans.length} total loans
          </p>
        </div>
      )}
      </div>
    </div>
  );
}

export default function LoanDashboard() {
  return (
    <ProtectedRoute>
      <LoanDashboardContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '700',
    marginBottom: '16px',
    letterSpacing: '-0.5px'
  },
  heroSubtitle: {
    fontSize: '18px',
    lineHeight: '1.6',
    opacity: '0.95'
  },
  mainContent: {
    maxWidth: '1200px',
    margin: '-40px auto 0',
    padding: '0 20px 60px'
  },
  topSection: {
    display: 'flex',
    marginBottom: '40px'
  },
  applyButton: {
    backgroundColor: '#10b981',
    color: 'white',
    padding: '16px 32px',
    borderRadius: '12px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    display: 'inline-block'
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
  filtersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
  },
  select: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border 0.2s'
  },
  searchInput: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    transition: 'border 0.2s'
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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  emptyButton: {
    display: 'inline-block',
    backgroundColor: '#007BFF',
    color: 'white',
    padding: '12px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '16px',
  },
  loansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column'
  },
  loanCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8fafc'
  },
  loanType: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '6px',
  },
  loanReference: {
    fontSize: '12px',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  statusBadge: {
    padding: '8px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  loanCardBody: {
    padding: '24px',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column'
  },
  loanDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  loanLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  loanValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b'
  },
  depositAlertWrapper: {
    marginTop: '16px',
    marginBottom: '16px'
  },
  depositMessage: {
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '0',
    marginBottom: '0',
    border: '2px solid'
  },
  depositRequired: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderColor: '#ef4444',
  },
  depositPending: {
    backgroundColor: '#fffbeb',
    color: '#92400e',
    borderColor: '#f59e0b',
  },
  depositCompleted: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderColor: '#10b981',
  },
  depositButton: {
    display: 'inline-block',
    marginLeft: '12px',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
  },
  loanCardActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    marginBottom: '0',
    paddingTop: '20px',
    borderTop: '1px solid #f3f4f6'
  },
  viewButton: {
    flex: 1,
    textAlign: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    backgroundColor: '#f0fdf4',
    color: '#059669',
    border: '2px solid #d1fae5',
    transition: 'all 0.2s'
  },
  payButton: {
    flex: 1,
    textAlign: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    backgroundColor: '#10b981',
    color: 'white',
    border: '2px solid #10b981',
    transition: 'all 0.2s'
  },
  summary: {
    textAlign: 'center',
    padding: '24px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  summaryText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
};