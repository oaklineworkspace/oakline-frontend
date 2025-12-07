import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';

function PaymentSuccessContent() {
  const router = useRouter();
  const { reference, amount, loan_id } = router.query;
  const [currentTime] = useState(new Date());

  // Handle the redirect for the payment modal in the loan dashboard
  useEffect(() => {
    if (router.pathname === '/loan/dashboard' && router.query.showPaymentModal === 'true') {
      router.push(`/loan/${loan_id}?makePayment=true`);
    }
  }, [router, loan_id]);


  const printReceipt = () => {
    window.print();
  };

  // Extract payment method and account details from query parameters
  const { payment_method, account_number, crypto_payment_id } = router.query;

  return (
    <div style={styles.container}>
      <div style={styles.successCard}>
        <div style={styles.iconContainer}>
          <div style={styles.checkmark}>✓</div>
        </div>

        <h1 style={styles.title}>Payment Submitted Successfully!</h1>
        <p style={styles.subtitle}>
          Your loan payment has been received and is being processed. You will receive confirmation once the transaction is complete.
        </p>

        <div style={styles.receiptContainer}>
          <div style={styles.receiptHeader}>
            <h2 style={styles.receiptTitle}>Payment Receipt</h2>
            <p style={styles.receiptSubtitle}>Please save this for your records</p>
            {/* Optional: Add a logo here */}
            {/* <div style={styles.bankLogo}>
              <img src="/path/to/your/logo.png" alt="Bank Logo" style={{ maxWidth: '150px' }} />
            </div> */}
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Reference Number</span>
              <span style={styles.detailValue}>{reference}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Amount Paid</span>
              <span style={styles.detailValueAmount}>${parseFloat(amount || 0).toFixed(2)}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Date & Time</span>
              <span style={styles.detailValue}>
                {currentTime.toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'long'
                })}
              </span>
            </div>
             {payment_method && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Payment Method</span>
                <span style={styles.detailValue}>{payment_method}</span>
              </div>
            )}
            {payment_method === 'balance' && account_number && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Account Number</span>
                <span style={styles.detailValue}>**** **** **** {account_number.slice(-4)}</span>
              </div>
            )}
            {payment_method === 'crypto' && crypto_payment_id && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Crypto Transaction ID</span>
                <span style={styles.detailValue}>{crypto_payment_id}</span>
              </div>
            )}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Status</span>
              <span style={styles.statusPending}>
                Pending
              </span>
            </div>
          </div>

          <div style={styles.infoBoxGreen}>
            <p style={styles.infoTextGreen}>
              Your payment is being processed. You will receive an email confirmation once complete.
            </p>
          </div>

          <div style={styles.footerInfo}>
            <div style={styles.footerRow}>
              <span>Thank you for your payment!</span>
              <span>{loan_id ? `Loan ID: ${loan_id}` : ''}</span>
            </div>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={printReceipt} style={styles.printButton}>
            🖨️ Print Receipt
          </button>
          <Link href={`/loan/${loan_id}`} style={styles.viewButton}>
            View Loan Details
          </Link>
          <Link href="/loan/dashboard" style={styles.dashboardButton}>
            Go to Loan Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <ProtectedRoute>
      <PaymentSuccessContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  successCard: {
    maxWidth: '700px',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '3rem 2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  iconContainer: {
    marginBottom: '2rem'
  },
  checkmark: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    fontSize: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '800',
    color: '#1a365d',
    marginBottom: '1rem',
    letterSpacing: '-0.02em',
    lineHeight: '1.2'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    marginBottom: '2rem'
  },
  receiptContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '2rem',
    marginBottom: '2rem',
    textAlign: 'left',
    border: '2px solid #e2e8f0'
  },
  receiptHeader: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #e2e8f0',
    textAlign: 'center'
  },
  bankLogo: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  receiptTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  receiptSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '4px 0'
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    backgroundColor: 'white',
    borderRadius: '8px'
  },
  detailLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '600'
  },
  detailValue: {
    fontSize: '0.875rem',
    color: '#1a365d',
    fontWeight: '600',
    fontFamily: 'monospace',
    textAlign: 'right'
  },
  detailValueAmount: {
    fontSize: '1.5rem',
    color: '#10b981',
    fontWeight: '700'
  },
  statusPending: {
    fontSize: '0.875rem',
    color: '#f59e0b',
    fontWeight: '700',
    backgroundColor: '#fffbeb',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px'
  },
  statusCompleted: {
    fontSize: '0.875rem',
    color: '#10b981',
    fontWeight: '700',
    backgroundColor: '#d1fae5',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px'
  },
  infoBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  infoText: {
    fontSize: '0.875rem',
    color: '#92400e',
    margin: 0,
    lineHeight: '1.6'
  },
  infoBoxGreen: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  infoTextGreen: {
    fontSize: '0.875rem',
    color: '#065f46',
    margin: 0,
    lineHeight: '1.6'
  },
  footerInfo: {
    marginTop: '1.5rem',
    paddingTop: '1.5rem',
    borderTop: '2px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
    color: '#64748b'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  printButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a365d',
    backgroundColor: 'white',
    border: '2px solid #1a365d',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  viewButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%)',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'block',
    transition: 'all 0.2s'
  },
  dashboardButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1a365d',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    textDecoration: 'none',
    display: 'block',
    transition: 'all 0.2s'
  }
};