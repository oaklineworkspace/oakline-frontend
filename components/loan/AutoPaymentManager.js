import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AutoPaymentManager({ loan }) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [autoPaymentEnabled, setAutoPaymentEnabled] = useState(loan?.auto_payment_enabled || false);
  const [selectedAccount, setSelectedAccount] = useState(loan?.auto_payment_account_id || '');
  const [paymentDay, setPaymentDay] = useState(loan?.auto_payment_day || 1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUserAccounts();
  }, []);

  useEffect(() => {
    if (loan) {
      setAutoPaymentEnabled(loan.auto_payment_enabled || false);
      setSelectedAccount(loan.auto_payment_account_id || '');
      setPaymentDay(loan.auto_payment_day || 1);
    }
  }, [loan]);

  const fetchUserAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');

      if (!error && data) {
        setAccounts(data);
        if (data.length > 0 && !selectedAccount) {
          setSelectedAccount(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const handleToggleAutoPayment = async () => {
    if (!autoPaymentEnabled && !selectedAccount) {
      setError('Please select an account for auto-payment');
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

      const response = await fetch('/api/loan/auto-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_id: loan.id,
          enabled: !autoPaymentEnabled,
          account_id: selectedAccount,
          payment_day: paymentDay
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAutoPaymentEnabled(!autoPaymentEnabled);
        setSuccess(data.message);
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to update auto-payment settings');
      }
    } catch (err) {
      console.error('Error updating auto-payment:', err);
      setError('An error occurred while updating auto-payment');
    } finally {
      setLoading(false);
    }
  };

  if (!loan) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.icon}>⚙️</span>
          Auto-Payment Settings
        </h3>
        <div style={styles.statusBadge}>
          <span style={{
            ...styles.statusIndicator,
            backgroundColor: autoPaymentEnabled ? '#10b981' : '#6b7280'
          }}></span>
          {autoPaymentEnabled ? 'Active' : 'Inactive'}
        </div>
      </div>

      <div style={styles.description}>
        Set up automatic monthly payments to ensure you never miss a payment and avoid late fees.
      </div>

      {error && (
        <div style={styles.alert}>
          <span style={styles.alertIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <span style={styles.alertIcon}>✓</span>
          <span>{success}</span>
        </div>
      )}

      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Payment Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            disabled={autoPaymentEnabled || loading}
            style={styles.select}
          >
            <option value="">Select an account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_type.toUpperCase()} - ****{account.account_number.slice(-4)} 
                (${parseFloat(account.balance).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Payment Day (1-28)</label>
          <input
            type="number"
            min="1"
            max="28"
            value={paymentDay}
            onChange={(e) => setPaymentDay(parseInt(e.target.value))}
            disabled={autoPaymentEnabled || loading}
            style={styles.input}
          />
          <div style={styles.hint}>Day of the month when payment will be processed</div>
        </div>

        {autoPaymentEnabled && (
          <div style={styles.infoBox}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Monthly Payment:</span>
              <span style={styles.infoValue}>${parseFloat(loan.monthly_payment_amount || 0).toLocaleString()}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Next Payment:</span>
              <span style={styles.infoValue}>{loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleToggleAutoPayment}
          disabled={loading || (!selectedAccount && !autoPaymentEnabled)}
          style={{
            ...styles.button,
            backgroundColor: autoPaymentEnabled ? '#ef4444' : '#10b981',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : autoPaymentEnabled ? 'Disable Auto-Payment' : 'Enable Auto-Payment'}
        </button>
      </div>

      {autoPaymentEnabled && (
        <div style={styles.warningBox}>
          <span style={styles.warningIcon}>ℹ️</span>
          <div>
            <strong>Important:</strong> Ensure sufficient funds are available in your account on the payment date. 
            Failed auto-payments may result in late fees.
          </div>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  icon: {
    fontSize: '24px'
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%'
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#ef4444',
    fontSize: '14px'
  },
  successAlert: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #dcfce7',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#10b981',
    fontSize: '14px'
  },
  alertIcon: {
    fontSize: '18px'
  },
  form: {
    marginTop: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937'
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px'
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb'
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500'
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: '700'
  },
  button: {
    width: '100%',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '20px',
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: '1.5'
  },
  warningIcon: {
    fontSize: '18px',
    flexShrink: 0
  }
};
