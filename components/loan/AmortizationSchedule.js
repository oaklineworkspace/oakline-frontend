
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AmortizationSchedule({ loanId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [viewMode, setViewMode] = useState('upcoming'); // upcoming, all, paid

  useEffect(() => {
    if (loanId) {
      fetchSchedule();
    }
  }, [loanId]);

  const fetchSchedule = async () => {
    if (!loanId) {
      setError('Invalid loan ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/loan/amortization?loan_id=${loanId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch schedule' }));
        setError(errorData.error || 'Failed to fetch amortization schedule');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setScheduleData(data);
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('An error occurred while fetching the schedule');
    } finally {
      setLoading(false);
    }
  };

  const downloadSchedule = () => {
    if (!scheduleData) return;
    
    const csvContent = [
      ['Payment #', 'Date', 'Payment Amount', 'Principal', 'Interest', 'Remaining Balance', 'Status'].join(','),
      ...scheduleData.schedule.map(s => [
        s.payment_number,
        new Date(s.payment_date).toLocaleDateString(),
        s.payment_amount.toFixed(2),
        s.principal_amount.toFixed(2),
        s.interest_amount.toFixed(2),
        s.remaining_balance.toFixed(2),
        s.is_paid ? 'Paid' : 'Upcoming'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amortization_schedule_${loanId.substring(0, 8)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>Loading payment schedule...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorText}>{error}</div>
          <button onClick={fetchSchedule} style={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!scheduleData) {
    return null;
  }

  const { loan_details, schedule, summary } = scheduleData;
  
  let filteredSchedule = schedule;
  if (viewMode === 'upcoming') {
    filteredSchedule = schedule.filter(s => !s.is_paid);
  } else if (viewMode === 'paid') {
    filteredSchedule = schedule.filter(s => s.is_paid);
  }

  const progressPercent = ((loan_details.payments_made / loan_details.term_months) * 100).toFixed(1);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📊 Payment Schedule</h2>
          <p style={styles.subtitle}>Detailed amortization schedule for your loan</p>
        </div>
        <button onClick={downloadSchedule} style={styles.downloadButton}>
          📥 Download Schedule
        </button>
      </div>

      {/* Progress Section */}
      <div style={styles.progressCard}>
        <div style={styles.progressHeader}>
          <div style={styles.progressInfo}>
            <div style={styles.progressLabel}>Loan Progress</div>
            <div style={styles.progressStats}>
              {loan_details.payments_made} of {loan_details.term_months} payments completed
            </div>
          </div>
          <div style={styles.progressPercent}>{progressPercent}%</div>
        </div>
        <div style={styles.progressBarContainer}>
          <div style={{...styles.progressBarFill, width: `${progressPercent}%`}}></div>
        </div>
        <div style={styles.progressMilestones}>
          <div style={styles.milestone}>
            <div style={styles.milestoneIcon}>🚀</div>
            <div style={styles.milestoneLabel}>Started</div>
          </div>
          <div style={{...styles.milestone, opacity: progressPercent >= 25 ? 1 : 0.3}}>
            <div style={styles.milestoneIcon}>📈</div>
            <div style={styles.milestoneLabel}>25%</div>
          </div>
          <div style={{...styles.milestone, opacity: progressPercent >= 50 ? 1 : 0.3}}>
            <div style={styles.milestoneIcon}>🎯</div>
            <div style={styles.milestoneLabel}>Halfway</div>
          </div>
          <div style={{...styles.milestone, opacity: progressPercent >= 75 ? 1 : 0.3}}>
            <div style={styles.milestoneIcon}>🏃</div>
            <div style={styles.milestoneLabel}>75%</div>
          </div>
          <div style={{...styles.milestone, opacity: progressPercent >= 100 ? 1 : 0.3}}>
            <div style={styles.milestoneIcon}>🎉</div>
            <div style={styles.milestoneLabel}>Complete</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💰</div>
          <div>
            <div style={styles.summaryLabel}>Total Interest</div>
            <div style={styles.summaryValue}>${summary.total_interest.toLocaleString()}</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💸</div>
          <div>
            <div style={styles.summaryLabel}>Total Payments</div>
            <div style={styles.summaryValue}>${summary.total_payments.toLocaleString()}</div>
          </div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📅</div>
          <div>
            <div style={styles.summaryLabel}>Payments Remaining</div>
            <div style={styles.summaryValue}>{loan_details.term_months - loan_details.payments_made}</div>
          </div>
        </div>
      </div>

      {/* View Mode Filters */}
      <div style={styles.viewModeContainer}>
        <button
          onClick={() => setViewMode('upcoming')}
          style={{
            ...styles.viewModeButton,
            ...(viewMode === 'upcoming' ? styles.viewModeButtonActive : {})
          }}
        >
          📅 Upcoming ({schedule.filter(s => !s.is_paid).length})
        </button>
        <button
          onClick={() => setViewMode('paid')}
          style={{
            ...styles.viewModeButton,
            ...(viewMode === 'paid' ? styles.viewModeButtonActive : {})
          }}
        >
          ✓ Paid ({schedule.filter(s => s.is_paid).length})
        </button>
        <button
          onClick={() => setViewMode('all')}
          style={{
            ...styles.viewModeButton,
            ...(viewMode === 'all' ? styles.viewModeButtonActive : {})
          }}
        >
          📋 All ({schedule.length})
        </button>
      </div>

      {/* Schedule Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeaderRow}>
              <th style={styles.tableHeader}>#</th>
              <th style={styles.tableHeader}>Date</th>
              <th style={styles.tableHeader}>Payment</th>
              <th style={styles.tableHeader}>Principal</th>
              <th style={styles.tableHeader}>Interest</th>
              <th style={styles.tableHeader}>Balance</th>
              <th style={styles.tableHeader}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredSchedule.map((payment, index) => {
              const isNextPayment = !payment.is_paid && index === 0 && viewMode === 'upcoming';
              
              return (
                <tr 
                  key={payment.payment_number} 
                  style={{
                    ...styles.tableRow,
                    ...(payment.is_paid ? styles.tableRowPaid : {}),
                    ...(isNextPayment ? styles.tableRowNext : {})
                  }}
                >
                  <td style={styles.tableCell}>
                    <div style={styles.paymentNumber}>
                      {payment.payment_number}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.dateCell}>
                      {new Date(payment.payment_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                      {isNextPayment && (
                        <span style={styles.nextBadge}>Next</span>
                      )}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.amountCell}>
                      ${payment.payment_amount.toLocaleString()}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.principalCell}>
                      ${payment.principal_amount.toLocaleString()}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.interestCell}>
                      ${payment.interest_amount.toLocaleString()}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    <div style={styles.balanceCell}>
                      ${payment.remaining_balance.toLocaleString()}
                    </div>
                  </td>
                  <td style={styles.tableCell}>
                    {payment.is_paid ? (
                      <span style={styles.statusPaid}>✓ Paid</span>
                    ) : (
                      <span style={styles.statusUpcoming}>Upcoming</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredSchedule.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <p style={styles.emptyText}>
            {viewMode === 'paid' 
              ? 'No payments have been made yet.'
              : viewMode === 'upcoming'
              ? 'No upcoming payments.'
              : 'No schedule data available.'}
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#1f2937',
    margin: '0 0 0.5rem 0'
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#6b7280',
    margin: 0
  },
  downloadButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    gap: '1rem'
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '1rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  errorBox: {
    textAlign: 'center',
    padding: '3rem 2rem',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fee2e2'
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  errorText: {
    fontSize: '1rem',
    color: '#dc2626',
    marginBottom: '1.5rem'
  },
  retryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer'
  },
  progressCard: {
    padding: '1.5rem',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #dbeafe',
    marginBottom: '2rem'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  progressInfo: {
    flex: 1
  },
  progressLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  progressStats: {
    fontSize: '0.9rem',
    color: '#3b82f6'
  },
  progressPercent: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1e40af'
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: '#dbeafe',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '1.5rem'
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)',
    borderRadius: '6px',
    transition: 'width 0.5s ease'
  },
  progressMilestones: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  milestone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    transition: 'opacity 0.3s'
  },
  milestoneIcon: {
    fontSize: '1.5rem'
  },
  milestoneLabel: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#1e40af'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.25rem',
    marginBottom: '2rem'
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  summaryIcon: {
    fontSize: '2.5rem',
    flexShrink: 0
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '0.25rem'
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: '#1f2937'
  },
  viewModeContainer: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    flexWrap: 'wrap'
  },
  viewModeButton: {
    flex: 1,
    minWidth: '120px',
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#6b7280',
    transition: 'all 0.2s'
  },
  viewModeButtonActive: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeaderRow: {
    backgroundColor: '#f9fafb'
  },
  tableHeader: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e5e7eb'
  },
  tableRow: {
    transition: 'background-color 0.2s'
  },
  tableRowPaid: {
    backgroundColor: '#f0fdf4'
  },
  tableRowNext: {
    backgroundColor: '#fffbeb',
    borderLeft: '4px solid #f59e0b'
  },
  tableCell: {
    padding: '1rem',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.85rem'
  },
  paymentNumber: {
    fontWeight: '700',
    color: '#1f2937'
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#374151'
  },
  nextBadge: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: '700'
  },
  amountCell: {
    fontWeight: '700',
    color: '#1f2937'
  },
  principalCell: {
    color: '#059669',
    fontWeight: '600'
  },
  interestCell: {
    color: '#dc2626',
    fontWeight: '600'
  },
  balanceCell: {
    color: '#6b7280',
    fontWeight: '600'
  },
  statusPaid: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#d1fae5',
    color: '#059669',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  statusUpcoming: {
    padding: '0.375rem 0.75rem',
    backgroundColor: '#e0e7ff',
    color: '#4f46e5',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 2rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  emptyText: {
    fontSize: '0.95rem',
    color: '#6b7280'
  }
};
