import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AmortizationSchedule({ loanId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (loanId) {
      fetchAmortizationSchedule();
    }
  }, [loanId]);

  const fetchAmortizationSchedule = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`/api/loan/amortization?loan_id=${loanId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setScheduleData(data);
      } else {
        setError(data.error || 'Failed to fetch amortization schedule');
      }
    } catch (err) {
      console.error('Error fetching amortization schedule:', err);
      setError('An error occurred while fetching the schedule');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading amortization schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  if (!scheduleData) {
    return null;
  }

  const { loan_details, amortization_schedule } = scheduleData;
  const displayedSchedule = showAll ? amortization_schedule : amortization_schedule.slice(0, 12);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Amortization Schedule</h2>
        <p style={styles.subtitle}>Complete payment breakdown for your {loan_details.loan_type} loan</p>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Principal Amount</div>
          <div style={styles.summaryValue}>${loan_details.principal.toLocaleString()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Monthly Payment</div>
          <div style={styles.summaryValue}>${loan_details.monthly_payment.toLocaleString()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Interest</div>
          <div style={styles.summaryValue}>${loan_details.total_interest.toLocaleString()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Amount</div>
          <div style={styles.summaryValue}>${loan_details.total_amount.toLocaleString()}</div>
        </div>
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span>Payment Progress: {loan_details.payments_made} of {loan_details.term_months} payments</span>
          <span>{((loan_details.payments_made / loan_details.term_months) * 100).toFixed(1)}%</span>
        </div>
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${(loan_details.payments_made / loan_details.term_months) * 100}%`
          }}></div>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Payment Date</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Principal</th>
              <th style={styles.th}>Interest</th>
              <th style={styles.th}>Balance</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedSchedule.map((payment) => (
              <tr 
                key={payment.payment_number} 
                style={{
                  ...styles.tableRow,
                  backgroundColor: payment.is_paid ? '#f0fdf4' : payment.status === 'overdue' ? '#fef2f2' : '#fff'
                }}
              >
                <td style={styles.td}>{payment.payment_number}</td>
                <td style={styles.td}>{new Date(payment.payment_date).toLocaleDateString()}</td>
                <td style={styles.td}>
                  ${payment.actual_payment ? payment.actual_payment.toLocaleString() : payment.scheduled_payment.toLocaleString()}
                </td>
                <td style={styles.td}>${payment.principal.toLocaleString()}</td>
                <td style={styles.td}>${payment.interest.toLocaleString()}</td>
                <td style={styles.td}>${payment.remaining_balance.toLocaleString()}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: payment.is_paid ? '#10b981' : payment.status === 'overdue' ? '#ef4444' : '#f59e0b'
                  }}>
                    {payment.is_paid ? 'Paid' : payment.status === 'overdue' ? 'Overdue' : 'Upcoming'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {amortization_schedule.length > 12 && (
        <div style={styles.showMoreContainer}>
          <button 
            onClick={() => setShowAll(!showAll)} 
            style={styles.showMoreButton}
          >
            {showAll ? 'Show Less' : `Show All ${amortization_schedule.length} Payments`}
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginTop: '20px'
  },
  header: {
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  summaryCard: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937'
  },
  progressSection: {
    marginBottom: '24px'
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '8px',
    fontWeight: '500'
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    fontSize: '13px'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb'
  },
  td: {
    padding: '12px',
    color: '#1f2937'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff'
  },
  showMoreContainer: {
    textAlign: 'center',
    marginTop: '20px'
  },
  showMoreButton: {
    padding: '10px 24px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  error: {
    textAlign: 'center',
    padding: '20px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    borderRadius: '8px'
  }
};
