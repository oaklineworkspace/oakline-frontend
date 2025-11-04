import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function PaymentHistory({ loanId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

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

  const downloadStatement = () => {
    if (!historyData) return;

    const csvContent = [
      ['Date', 'Amount', 'Principal', 'Interest', 'Late Fee', 'Balance After', 'Status', 'Reference'].join(','),
      ...historyData.payments.map(p => [
        new Date(p.payment_date).toLocaleDateString(),
        p.amount,
        p.principal_amount || 0,
        p.interest_amount || 0,
        p.late_fee || 0,
        p.balance_after,
        p.status,
        p.reference_number || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loan_payment_history_${loanId.substring(0, 8)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <div style={styles.loadingText}>Loading payment history...</div>
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
          <button onClick={fetchPaymentHistory} style={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!historyData) {
    return null;
  }

  const { loan_info, payment_summary, payments } = historyData;

  let filteredPayments = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter);

  // Apply sorting
  if (sortBy === 'date_desc') {
    filteredPayments.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at));
  } else if (sortBy === 'date_asc') {
    filteredPayments.sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at));
  } else if (sortBy === 'amount_desc') {
    filteredPayments.sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
  } else if (sortBy === 'amount_asc') {
    filteredPayments.sort((a, b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>💳 Payment History</h2>
          <p style={styles.subtitle}>Complete record of all loan payments and transactions</p>
        </div>
        <button onClick={downloadStatement} style={styles.downloadButton}>
          📥 Download Statement
        </button>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📊</div>
          <div>
            <div style={styles.summaryLabel}>Total Payments</div>
            <div style={styles.summaryValue}>{payment_summary.total_payments}</div>
            <div style={styles.summarySubtext}>{payment_summary.completed_payments} completed</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💰</div>
          <div>
            <div style={styles.summaryLabel}>Total Paid</div>
            <div style={styles.summaryValue}>${parseFloat(payment_summary.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={styles.summarySubtext}>All time</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>📈</div>
          <div>
            <div style={styles.summaryLabel}>Principal Paid</div>
            <div style={styles.summaryValue}>${parseFloat(payment_summary.total_principal_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style={styles.summarySubtext}>Reducing balance</div>
          </div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryIcon}>💸</div>
          <div>
            <div style={styles.summaryLabel}>Interest Paid</div>
            <div style={styles.summaryValue}>${parseFloat(payment_summary.total_interest_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {payment_summary.total_late_fees > 0 && (
              <div style={{...styles.summarySubtext, color: '#ef4444'}}>
                +${parseFloat(payment_summary.total_late_fees || 0).toFixed(2)} late fees
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div style={styles.controlsContainer}>
        <div style={styles.filterSection}>
          <span style={styles.filterLabel}>Filter:</span>
          <div style={styles.filters}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterButton,
                ...(filter === 'all' ? styles.filterButtonActive : {})
              }}
            >
              All ({payment_summary.total_payments})
            </button>
            <button
              onClick={() => setFilter('completed')}
              style={{
                ...styles.filterButton,
                ...(filter === 'completed' ? styles.filterButtonActiveGreen : {})
              }}
            >
              ✓ Completed ({payment_summary.completed_payments})
            </button>
            <button
              onClick={() => setFilter('pending')}
              style={{
                ...styles.filterButton,
                ...(filter === 'pending' ? styles.filterButtonActiveYellow : {})
              }}
            >
              ⏳ Pending ({payment_summary.pending_payments})
            </button>
            {payment_summary.failed_payments > 0 && (
              <button
                onClick={() => setFilter('failed')}
                style={{
                  ...styles.filterButton,
                  ...(filter === 'failed' ? styles.filterButtonActiveRed : {})
                }}
              >
                ✗ Failed ({payment_summary.failed_payments})
              </button>
            )}
          </div>
        </div>

        <div style={styles.sortSection}>
          <span style={styles.filterLabel}>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.sortSelect}
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Payment List */}
      {filteredPayments.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3 style={styles.emptyTitle}>No {filter !== 'all' ? filter : ''} payments found</h3>
          <p style={styles.emptyText}>
            {filter !== 'all'
              ? 'Try selecting a different filter to view other payments.'
              : 'Payment history will appear here once you make your first payment.'}
          </p>
        </div>
      ) : (
        <div style={styles.paymentsContainer}>
          {filteredPayments.map((payment, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredPayments.length - 1;

            return (
              <div
                key={payment.id}
                style={{
                  ...styles.paymentCard,
                  ...(isFirst ? styles.paymentCardFirst : {}),
                  ...(isLast ? styles.paymentCardLast : {})
                }}
              >
                <div style={styles.paymentHeader}>
                  <div style={styles.paymentHeaderLeft}>
                    <div style={styles.paymentNumber}>#{filteredPayments.length - index}</div>
                    <div>
                      <div style={styles.paymentDate}>
                        {new Date(payment.payment_date || payment.created_at).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </div>
                      {payment.payment_type && (
                        <div style={styles.paymentTypeLabel}>
                          {payment.payment_type === 'auto_payment' ? '🤖 Auto Payment' :
                           payment.payment_type === 'early_payoff' ? '⚡ Early Payoff' :
                           payment.payment_type === 'late_fee' ? '⚠️ Late Fee' : '👤 Manual Payment'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{
                    ...styles.paymentStatus,
                    backgroundColor: payment.status === 'completed' ? '#d1fae5' :
                                   payment.status === 'pending' ? '#fef3c7' : '#fee2e2',
                    color: payment.status === 'completed' ? '#059669' :
                          payment.status === 'pending' ? '#d97706' : '#dc2626'
                  }}>
                    {payment.status === 'completed' ? '✓' :
                     payment.status === 'pending' ? '⏳' : '✗'} {payment.status.toUpperCase()}
                  </div>
                </div>

                <div style={styles.paymentBody}>
                  <div style={styles.amountSection}>
                    <div style={styles.mainAmount}>
                      <span style={styles.amountLabel}>Payment Amount</span>
                      <span style={styles.amountValue}>${parseFloat(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {(parseFloat(payment.principal_amount || 0) > 0 || parseFloat(payment.interest_amount || 0) > 0) && (
                    <div style={styles.breakdownSection}>
                      <div style={styles.breakdownTitle}>Payment Breakdown</div>
                      <div style={styles.breakdownGrid}>
                        <div style={styles.breakdownItem}>
                          <span style={styles.breakdownIcon}>💵</span>
                          <div>
                            <div style={styles.breakdownLabel}>Principal</div>
                            <div style={styles.breakdownValue}>${parseFloat(payment.principal_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                        <div style={styles.breakdownItem}>
                          <span style={styles.breakdownIcon}>📊</span>
                          <div>
                            <div style={styles.breakdownLabel}>Interest</div>
                            <div style={styles.breakdownValue}>${parseFloat(payment.interest_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </div>
                        {parseFloat(payment.late_fee || 0) > 0 && (
                          <div style={styles.breakdownItem}>
                            <span style={styles.breakdownIcon}>⚠️</span>
                            <div>
                              <div style={{...styles.breakdownLabel, color: '#ef4444'}}>Late Fee</div>
                              <div style={{...styles.breakdownValue, color: '#ef4444'}}>${parseFloat(payment.late_fee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={styles.balanceSection}>
                    <div style={styles.balanceItem}>
                      <span style={styles.balanceLabel}>Balance After Payment</span>
                      <span style={styles.balanceValue}>${parseFloat(payment.balance_after || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {payment.reference_number && (
                    <div style={styles.referenceSection}>
                      <span style={styles.referenceLabel}>Reference Number:</span>
                      <span
                        style={styles.referenceNumber}
                        onClick={() => {
                          navigator.clipboard.writeText(payment.reference_number);
                          alert('Reference number copied to clipboard!');
                        }}
                        title="Click to copy"
                      >
                        {payment.reference_number} 📋
                      </span>
                    </div>
                  )}

                  {payment.notes && (
                    <div style={styles.notesBox}>
                      <div style={styles.notesIcon}>📝</div>
                      <div>
                        <div style={styles.notesLabel}>Payment Notes</div>
                        <div style={styles.notesText}>{payment.notes}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
    border: '1px solid #e5e7eb',
    transition: 'all 0.2s'
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
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  summarySubtext: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },
  controlsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    flexWrap: 'wrap'
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  filterLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#374151'
  },
  filters: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    border: '2px solid #e5e7eb',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    color: '#6b7280'
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  filterButtonActiveGreen: {
    backgroundColor: '#10b981',
    color: 'white',
    borderColor: '#10b981'
  },
  filterButtonActiveYellow: {
    backgroundColor: '#f59e0b',
    color: 'white',
    borderColor: '#f59e0b'
  },
  filterButtonActiveRed: {
    backgroundColor: '#ef4444',
    color: 'white',
    borderColor: '#ef4444'
  },
  sortSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  sortSelect: {
    padding: '0.5rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#374151',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '2px dashed #e5e7eb'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem'
  },
  emptyText: {
    fontSize: '0.95rem',
    color: '#6b7280',
    maxWidth: '400px',
    margin: '0 auto'
  },
  paymentsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  },
  paymentCard: {
    border: '1px solid #e5e7eb',
    borderTop: 'none',
    overflow: 'hidden',
    transition: 'all 0.2s'
  },
  paymentCardFirst: {
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  paymentCardLast: {
    borderBottomLeftRadius: '12px',
    borderBottomRightRadius: '12px'
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  },
  paymentHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  paymentNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1e40af',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: '700',
    flexShrink: 0
  },
  paymentDate: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.25rem'
  },
  paymentTypeLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  paymentStatus: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: '700',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  },
  paymentBody: {
    padding: '1.5rem'
  },
  amountSection: {
    marginBottom: '1.5rem'
  },
  mainAmount: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    border: '1px solid #dbeafe'
  },
  amountLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#1e40af'
  },
  amountValue: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#1e40af'
  },
  breakdownSection: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px'
  },
  breakdownTitle: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  breakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '1rem'
  },
  breakdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  breakdownIcon: {
    fontSize: '1.5rem'
  },
  breakdownLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    fontWeight: '600'
  },
  breakdownValue: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1f2937'
  },
  balanceSection: {
    marginBottom: '1rem'
  },
  balanceItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem',
    backgroundColor: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #dcfce7'
  },
  balanceLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#059669'
  },
  balanceValue: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#059669'
  },
  referenceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '1rem'
  },
  referenceLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280'
  },
  referenceNumber: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: '#1e40af',
    fontWeight: '700',
    cursor: 'pointer',
    userSelect: 'all'
  },
  notesBox: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fde68a'
  },
  notesIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  notesLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#92400e',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  notesText: {
    fontSize: '0.85rem',
    color: '#78350f',
    lineHeight: '1.6'
  }
};