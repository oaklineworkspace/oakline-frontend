import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function LoansOverviewContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    totalBorrowed: 0,
    totalRemaining: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserLoans();
    }
  }, [user]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media (max-width: 768px) {
        .loans-stats-grid {
          grid-template-columns: 1fr !important;
        }
        .loans-grid {
          grid-template-columns: 1fr !important;
        }
        .loans-action-section {
          flex-direction: column !important;
        }
        .loans-action-button {
          width: 100% !important;
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
        setLoans(data.loans);
        
        // Calculate stats
        const totalBorrowed = data.loans.reduce((sum, loan) => sum + parseFloat(loan.principal || 0), 0);
        const totalRemaining = data.loans.reduce((sum, loan) => sum + parseFloat(loan.remaining_balance || 0), 0);
        const activeLoans = data.loans.filter(loan => loan.status === 'active' || loan.status === 'approved').length;
        
        setStats({
          totalLoans: data.loans.length,
          activeLoans,
          totalBorrowed,
          totalRemaining
        });
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
      'awaiting_approval': { color: '#3b82f6', bg: '#dbeafe', label: 'Under Review' },
      'approved': { color: '#10b981', bg: '#d1fae5', label: 'Approved' },
      'active': { color: '#059669', bg: '#d1fae5', label: 'Active' },
      'rejected': { color: '#ef4444', bg: '#fee2e2', label: 'Rejected' },
      'closed': { color: '#6b7280', bg: '#f3f4f6', label: 'Closed' }
    };
    
    const config = statusConfig[status] || statusConfig['pending'];
    
    return (
      <span style={{
        backgroundColor: config.bg,
        color: config.color,
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '600'
      }}>
        {config.label}
      </span>
    );
  };

  const formatLoanType = (type) => {
    const types = {
      'personal': '👤 Personal Loan',
      'home_mortgage': '🏠 Home Mortgage',
      'auto_loan': '🚗 Auto Loan',
      'business': '🏢 Business Loan',
      'student': '🎓 Student Loan',
      'home_equity': '🏡 Home Equity'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>⏳</div>
        <p style={styles.loadingText}>Loading your loans...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>My Loans</h1>
          <p style={styles.heroSubtitle}>
            Manage all your loan applications and active loans in one place
          </p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {/* Stats Cards */}
        <div style={styles.statsGrid} className="loans-stats-grid">
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statValue}>{stats.totalLoans}</div>
            <div style={styles.statLabel}>Total Loans</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div style={styles.statValue}>{stats.activeLoans}</div>
            <div style={styles.statLabel}>Active Loans</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>💵</div>
            <div style={styles.statValue}>${stats.totalBorrowed.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Borrowed</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📈</div>
            <div style={styles.statValue}>${stats.totalRemaining.toLocaleString()}</div>
            <div style={styles.statLabel}>Total Remaining</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionSection} className="loans-action-section">
          <Link href="/loan/apply" style={styles.primaryButton} className="loans-action-button">
            ➕ Apply for New Loan
          </Link>
          <Link href="/loan/dashboard" style={styles.secondaryButton} className="loans-action-button">
            📊 View Dashboard
          </Link>
        </div>

        {/* Loans List */}
        {loans.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📋</div>
            <h2 style={styles.emptyTitle}>No Loans Yet</h2>
            <p style={styles.emptyText}>
              You haven't applied for any loans yet. Start your application today!
            </p>
            <Link href="/loan/apply" style={styles.emptyButton}>
              Apply for a Loan
            </Link>
          </div>
        ) : (
          <div style={styles.loansSection}>
            <h2 style={styles.sectionTitle}>Your Loans</h2>
            <div style={styles.loansGrid} className="loans-grid">
              {loans.map((loan) => (
                <div key={loan.id} style={styles.loanCard}>
                  <div style={styles.loanHeader}>
                    <div>
                      <h3 style={styles.loanTitle}>{formatLoanType(loan.loan_type)}</h3>
                      <p style={styles.loanDate}>
                        Applied: {new Date(loan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(loan.status)}
                  </div>

                  <div style={styles.loanDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Principal Amount:</span>
                      <span style={styles.detailValue}>${parseFloat(loan.principal).toLocaleString()}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Interest Rate:</span>
                      <span style={styles.detailValue}>{loan.interest_rate}% APR</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Term:</span>
                      <span style={styles.detailValue}>{loan.term_months} months</span>
                    </div>
                    {loan.monthly_payment_amount > 0 && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Monthly Payment:</span>
                        <span style={styles.detailValue}>
                          ${parseFloat(loan.monthly_payment_amount).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {(loan.status === 'active' || loan.status === 'approved') && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Remaining Balance:</span>
                        <span style={{...styles.detailValue, color: '#10b981', fontWeight: '700'}}>
                          ${parseFloat(loan.remaining_balance || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {loan.deposit_required && loan.deposit_required > 0 && (
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Required Deposit (10%):</span>
                        <span style={{
                          ...styles.detailValue, 
                          color: (loan.deposit_status === 'completed' || loan.deposit_paid === true) ? '#10b981' : 
                                 (loan.deposit_status === 'pending') ? '#f59e0b' : '#ef4444',
                          fontWeight: '700'
                        }}>
                          {(loan.deposit_status === 'completed' || loan.deposit_paid === true) ? (
                            `$${parseFloat(loan.deposit_amount || loan.deposit_required).toLocaleString()} ✓ Paid & Confirmed`
                          ) : loan.deposit_status === 'pending' ? (
                            `$${parseFloat(loan.deposit_amount || loan.deposit_required).toLocaleString()} ⏳ Pending Admin Review`
                          ) : (
                            `$${parseFloat(loan.deposit_required).toLocaleString()} ⚠️ Payment Required`
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={styles.loanActions}>
                    {loan.status === 'pending' && loan.deposit_required > 0 && loan.deposit_status !== 'completed' && loan.deposit_status !== 'pending' && !loan.deposit_paid && (
                      <Link 
                        href={`/loan/deposit-crypto?loan_id=${loan.id}&amount=${loan.deposit_required}`}
                        style={styles.actionButton}
                      >
                        💰 Complete 10% Deposit (${parseFloat(loan.deposit_required).toLocaleString()})
                      </Link>
                    )}
                    {loan.deposit_required > 0 && (loan.deposit_status === 'pending' || loan.deposit_paid) && loan.deposit_status !== 'completed' && loan.status === 'pending' && (
                      <div style={{
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#92400e',
                        marginBottom: '12px'
                      }}>
                        ⏳ Deposit submitted{loan.deposit_date ? ` on ${new Date(loan.deposit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}. Awaiting Loan Department verification.
                      </div>
                    )}
                    {loan.deposit_paid && loan.deposit_status === 'completed' && (loan.status === 'pending' || loan.status === 'under_review') && (
                      <div style={{
                        backgroundColor: '#d1fae5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#065f46',
                        marginBottom: '12px'
                      }}>
                        ✅ Deposit confirmed! Loan under review by Loan Department.
                      </div>
                    )}
                    {((loan.deposit_status === 'completed' || loan.deposit_paid) && loan.status === 'pending') && (
                      <div style={{
                        backgroundColor: '#d1fae5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#065f46',
                        marginBottom: '12px'
                      }}>
                        ✅ 10% Deposit confirmed{loan.deposit_date ? ` on ${new Date(loan.deposit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}! Your loan is under review for final approval.
                      </div>
                    )}
                    {loan.deposit_status === 'completed' && (loan.status === 'approved' || loan.status === 'active') && (
                      <div style={{
                        backgroundColor: '#d1fae5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#065f46',
                        marginBottom: '12px'
                      }}>
                        ✅ Loan approved and active{loan.approved_at ? ` since ${new Date(loan.approved_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` : ''}! Funds have been disbursed to your account.
                      </div>
                    )}
                    {(loan.status === 'active' || loan.status === 'approved') && (
                      <Link href="/loan/dashboard" style={styles.actionButton}>
                        💳 Make Payment
                      </Link>
                    )}
                    <Link href="/loan/dashboard" style={styles.viewButton}>
                      👁️ View Details
                    </Link>
                  </div>

                  {loan.purpose && (
                    <div style={styles.purposeSection}>
                      <div style={styles.purposeLabel}>Purpose:</div>
                      <div style={styles.purposeText}>{loan.purpose}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '20px',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '18px',
    color: '#64748b'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  },
  statIcon: {
    fontSize: '36px',
    marginBottom: '12px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500'
  },
  actionSection: {
    display: 'flex',
    gap: '16px',
    marginBottom: '40px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  secondaryButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#fff',
    border: '2px solid #059669',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    transition: 'all 0.2s'
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '80px 40px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '24px'
  },
  emptyTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  emptyText: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '32px',
    maxWidth: '400px',
    margin: '0 auto 32px'
  },
  emptyButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'inline-block',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  loansSection: {
    marginTop: '40px'
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '24px'
  },
  loansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '24px'
  },
  loanCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  loanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e5e7eb'
  },
  loanTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '6px'
  },
  loanDate: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0
  },
  loanDetails: {
    marginBottom: '24px'
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
    color: '#1e293b',
    fontWeight: '600'
  },
  loanActions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  actionButton: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '10px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
  },
  viewButton: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#059669',
    backgroundColor: '#f0fdf4',
    border: '2px solid #d1fae5',
    borderRadius: '10px',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block'
  },
  purposeSection: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '16px'
  },
  purposeLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  },
  purposeText: {
    fontSize: '14px',
    color: '#1e293b',
    lineHeight: '1.6'
  }
};

export default function LoansOverview() {
  return (
    <ProtectedRoute>
      <LoansOverviewContent />
    </ProtectedRoute>
  );
}
