import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PaymentHistory({ loanId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (loanId) {
      fetchPaymentHistory();
    }
  }, [loanId]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`/api/loan/payment-history?loan_id=${loanId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setHistoryData(data);
      } else {
        setError(data.error || 'Failed to fetch payment history');
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError('An error occurred while fetching payment history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading payment history...</div>
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

  if (!historyData) {
    return null;
  }

  const { loan_info, payment_summary, payments } = historyData;
  
  const filteredPayments = filter === 'all' 
    ? payments 
    : payments.filter(p => p.status === filter);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Payment History</h2>
        <p style={styles.subtitle}>Detailed record of all loan payments</p>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Payments</div>
          <div style={styles.summaryValue}>{payment_summary.total_payments}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Total Paid</div>
          <div style={styles.summaryValue}>${payment_summary.total_paid.toLocaleString()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Principal Paid</div>
          <div style={styles.summaryValue}>${payment_summary.total_principal_paid.toLocaleString()}</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>Interest Paid</div>
          <div style={styles.summaryValue}>${payment_summary.total_interest_paid.toLocaleString()}</div>
        </div>
      </div>

      {payment_summary.total_late_fees > 0 && (
        <div style={styles.lateFeeWarning}>
          <span style={styles.warningIcon}>⚠️</span>
          <span>Total Late Fees Paid: ${payment_summary.total_late_fees.toLocaleString()}</span>
        </div>
      )}

      <div style={styles.filterSection}>
        <button 
          onClick={() => setFilter('all')} 
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'all' ? '#10b981' : '#e5e7eb',
            color: filter === 'all' ? '#fff' : '#6b7280'
          }}
        >
          All ({payment_summary.total_payments})
        </button>
        <button 
          onClick={() => setFilter('completed')} 
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'completed' ? '#10b981' : '#e5e7eb',
            color: filter === 'completed' ? '#fff' : '#6b7280'
          }}
        >
          Completed ({payment_summary.completed_payments})
        </button>
        <button 
          onClick={() => setFilter('pending')} 
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'pending' ? '#f59e0b' : '#e5e7eb',
            color: filter === 'pending' ? '#fff' : '#6b7280'
          }}
        >
          Pending ({payment_summary.pending_payments})
        </button>
        <button 
          onClick={() => setFilter('failed')} 
          style={{
            ...styles.filterButton,
            backgroundColor: filter === 'failed' ? '#ef4444' : '#e5e7eb',
            color: filter === 'failed' ? '#fff' : '#6b7280'
          }}
        >
          Failed ({payment_summary.failed_payments})
        </button>
      </div>

      {filteredPayments.length === 0 ? (
        <div style={styles.noPayments}>
          No {filter !== 'all' ? filter : ''} payments found.
        </div>
      ) : (
        <div style={styles.paymentsContainer}>
          {filteredPayments.map((payment) => (
            <div key={payment.id} style={styles.paymentCard}>
              <div style={styles.paymentHeader}>
                <div style={styles.paymentDate}>
                  {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div style={{
                  ...styles.paymentStatus,
                  backgroundColor: payment.status === 'completed' ? '#10b981' : 
                                 payment.status === 'pending' ? '#f59e0b' : '#ef4444'
                }}>
                  {payment.status.toUpperCase()}
                </div>
              </div>

              <div style={styles.paymentDetails}>
                <div style={styles.paymentRow}>
                  <span style={styles.paymentLabel}>Payment Amount</span>
                  <span style={styles.paymentAmount}>${payment.amount.toLocaleString()}</span>
                </div>

                {payment.principal_amount > 0 && (
                  <>
                    <div style={styles.paymentRow}>
                      <span style={styles.paymentLabel}>  └ Principal</span>
                      <span style={styles.paymentValue}>${payment.principal_amount.toLocaleString()}</span>
                    </div>
                    <div style={styles.paymentRow}>
                      <span style={styles.paymentLabel}>  └ Interest</span>
                      <span style={styles.paymentValue}>${payment.interest_amount.toLocaleString()}</span>
                    </div>
                  </>
                )}

                {payment.late_fee > 0 && (
                  <div style={styles.paymentRow}>
                    <span style={{...styles.paymentLabel, color: '#ef4444'}}>  └ Late Fee</span>
                    <span style={{...styles.paymentValue, color: '#ef4444'}}>${payment.late_fee.toLocaleString()}</span>
                  </div>
                )}

                <div style={styles.divider}></div>

                <div style={styles.paymentRow}>
                  <span style={styles.paymentLabel}>Balance After Payment</span>
                  <span style={styles.paymentValue}>${payment.balance_after.toLocaleString()}</span>
                </div>

                {payment.payment_type && (
                  <div style={styles.paymentRow}>
                    <span style={styles.paymentLabel}>Payment Type</span>
                    <span style={styles.paymentTypeBox}>
                      {payment.payment_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                )}

                {payment.reference_number && (
                  <div style={styles.paymentRow}>
                    <span style={styles.paymentLabel}>Reference</span>
                    <span style={styles.referenceNumber}>{payment.reference_number.substring(0, 16)}...</span>
                  </div>
                )}

                {payment.notes && (
                  <div style={styles.notesBox}>
                    <div style={styles.notesLabel}>Notes:</div>
                    <div style={styles.notesText}>{payment.notes}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
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
  lateFeeWarning: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ef4444',
    fontWeight: '600'
  },
  warningIcon: {
    fontSize: '18px'
  },
  filterSection: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  noPayments: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px'
  },
  paymentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  paymentCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden'
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  paymentDate: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937'
  },
  paymentStatus: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.5px'
  },
  paymentDetails: {
    padding: '16px'
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '14px'
  },
  paymentLabel: {
    color: '#6b7280',
    fontWeight: '500'
  },
  paymentAmount: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#1f2937'
  },
  paymentValue: {
    fontWeight: '600',
    color: '#374151'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '12px 0'
  },
  paymentTypeBox: {
    backgroundColor: '#f3f4f6',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    color: '#4b5563'
  },
  referenceNumber: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#6b7280'
  },
  notesBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fffbeb',
    borderRadius: '6px',
    border: '1px solid #fde68a'
  },
  notesLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '4px'
  },
  notesText: {
    fontSize: '13px',
    color: '#78350f',
    lineHeight: '1.5'
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
