
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function SetupTransactionPin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasPin, setHasPin] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: ''
  });

  const [showPins, setShowPins] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await checkExistingPin(user.id);
    } catch (error) {
      console.error('Error checking user:', error);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingPin = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transaction_pin')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setHasPin(!!data?.transaction_pin);
    } catch (error) {
      console.error('Error checking PIN:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      // Validation
      if (hasPin && !formData.currentPin) {
        throw new Error('Please enter your current PIN');
      }

      if (!formData.newPin) {
        throw new Error('Please enter a new PIN');
      }

      if (formData.newPin.length !== 4 && formData.newPin.length !== 6) {
        throw new Error('PIN must be 4 or 6 digits');
      }

      if (!/^\d+$/.test(formData.newPin)) {
        throw new Error('PIN must contain only numbers');
      }

      if (formData.newPin !== formData.confirmPin) {
        throw new Error('PINs do not match');
      }

      if (hasPin && formData.currentPin === formData.newPin) {
        throw new Error('New PIN must be different from current PIN');
      }

      // Call API to set/update PIN
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/setup-transaction-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          currentPin: hasPin ? formData.currentPin : null,
          newPin: formData.newPin
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set transaction PIN');
      }

      setMessage(hasPin ? 'Transaction PIN updated successfully!' : 'Transaction PIN created successfully!');
      setFormData({ currentPin: '', newPin: '', confirmPin: '' });
      setHasPin(true);

      // Redirect after success
      setTimeout(() => {
        router.push('/security');
      }, 2000);

    } catch (error) {
      console.error('Error setting PIN:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    // Only allow digits and limit length to 6
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, [field]: sanitized }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h1 style={styles.title}>
            {hasPin ? 'Change Transaction PIN' : 'Setup Transaction PIN'}
          </h1>
          <button 
            style={styles.menuButton}
            onClick={() => router.push('/main-menu')}
          >
            ☰
          </button>
        </div>
        <button 
          style={styles.backButton}
          onClick={() => router.push('/security')}
        >
          ← Back to Security
        </button>
      </div>

      {message && (
        <div style={styles.successMessage}>{message}</div>
      )}

      {error && (
        <div style={styles.errorMessage}>{error}</div>
      )}

      {/* Info Card */}
      <div style={styles.infoCard}>
        <div style={styles.infoIcon}>🔐</div>
        <div>
          <h3 style={styles.infoTitle}>Transaction PIN Security</h3>
          <p style={styles.infoText}>
            Your transaction PIN is required to authorize all wire transfers, large transactions, 
            and other sensitive operations. This adds an extra layer of security to your account.
          </p>
        </div>
      </div>

      {/* PIN Setup Form */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>
          {hasPin ? 'Update Your PIN' : 'Create Your PIN'}
        </h2>

        <form onSubmit={handleSubmit}>
          {hasPin && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Current PIN *</label>
              <div style={styles.pinInputWrapper}>
                <input
                  type={showPins.current ? 'text' : 'password'}
                  maxLength={6}
                  value={formData.currentPin}
                  onChange={(e) => handleChange('currentPin', e.target.value)}
                  style={styles.pinInput}
                  placeholder="Enter current PIN"
                  required={hasPin}
                />
                <button
                  type="button"
                  onClick={() => setShowPins(prev => ({ ...prev, current: !prev.current }))}
                  style={styles.toggleButton}
                >
                  {showPins.current ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>New PIN *</label>
            <div style={styles.pinInputWrapper}>
              <input
                type={showPins.new ? 'text' : 'password'}
                maxLength={6}
                value={formData.newPin}
                onChange={(e) => handleChange('newPin', e.target.value)}
                style={styles.pinInput}
                placeholder="Enter 4 or 6 digit PIN"
                required
              />
              <button
                type="button"
                onClick={() => setShowPins(prev => ({ ...prev, new: !prev.new }))}
                style={styles.toggleButton}
              >
                {showPins.new ? '🙈' : '👁️'}
              </button>
            </div>
            <p style={styles.hint}>Must be 4 or 6 digits (numbers only)</p>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm New PIN *</label>
            <div style={styles.pinInputWrapper}>
              <input
                type={showPins.confirm ? 'text' : 'password'}
                maxLength={6}
                value={formData.confirmPin}
                onChange={(e) => handleChange('confirmPin', e.target.value)}
                style={styles.pinInput}
                placeholder="Re-enter new PIN"
                required
              />
              <button
                type="button"
                onClick={() => setShowPins(prev => ({ ...prev, confirm: !prev.confirm }))}
                style={styles.toggleButton}
              >
                {showPins.confirm ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={styles.requirements}>
            <p style={styles.requirementsTitle}>PIN Requirements:</p>
            <ul style={styles.requirementsList}>
              <li style={formData.newPin.length === 4 || formData.newPin.length === 6 ? styles.valid : styles.invalid}>
                {formData.newPin.length === 4 || formData.newPin.length === 6 ? '✓' : '○'} Must be 4 or 6 digits
              </li>
              <li style={/^\d+$/.test(formData.newPin) && formData.newPin ? styles.valid : styles.invalid}>
                {/^\d+$/.test(formData.newPin) && formData.newPin ? '✓' : '○'} Numbers only
              </li>
              <li style={formData.newPin === formData.confirmPin && formData.newPin ? styles.valid : styles.invalid}>
                {formData.newPin === formData.confirmPin && formData.newPin ? '✓' : '○'} PINs match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={submitting ? styles.submitButtonDisabled : styles.submitButton}
          >
            {submitting ? 'Setting up...' : (hasPin ? 'Update PIN' : 'Create PIN')}
          </button>
        </form>
      </div>

      {/* Security Tips */}
      <div style={styles.tipsCard}>
        <h3 style={styles.tipsTitle}>🛡️ Security Tips</h3>
        <ul style={styles.tipsList}>
          <li>Never share your transaction PIN with anyone</li>
          <li>Don't use easily guessable PINs (like 1234 or your birthday)</li>
          <li>Change your PIN regularly</li>
          <li>Don't write down your PIN</li>
          <li>Contact support immediately if you suspect unauthorized access</li>
        </ul>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  menuButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    color: '#64748b'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '15px'
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    border: '2px solid #16a34a',
    color: '#166534',
    padding: '15px 20px',
    borderRadius: '12px',
    margin: '20px',
    fontSize: '15px',
    fontWeight: '500'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    border: '2px solid #dc2626',
    color: '#dc2626',
    padding: '15px 20px',
    borderRadius: '12px',
    margin: '20px',
    fontSize: '15px',
    fontWeight: '500'
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    border: '2px solid #bfdbfe',
    margin: '20px',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  infoIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  infoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    margin: '0 0 8px 0'
  },
  infoText: {
    fontSize: '14px',
    color: '#1e3a8a',
    margin: 0,
    lineHeight: '1.5'
  },
  card: {
    backgroundColor: 'white',
    margin: '20px',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #e2e8f0'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#1e40af',
    fontSize: '14px'
  },
  pinInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  pinInput: {
    width: '100%',
    padding: '12px 50px 12px 15px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '18px',
    fontWeight: '600',
    letterSpacing: '4px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    outline: 'none',
    backgroundColor: '#ffffff',
    color: '#1f2937'
  },
  toggleButton: {
    position: 'absolute',
    right: '15px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hint: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '6px',
    marginLeft: '4px'
  },
  requirements: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '20px'
  },
  requirementsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '10px'
  },
  requirementsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  valid: {
    color: '#16a34a',
    fontSize: '14px',
    marginBottom: '6px'
  },
  invalid: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '6px'
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
  },
  submitButtonDisabled: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#94a3b8',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'not-allowed',
    opacity: 0.7
  },
  tipsCard: {
    backgroundColor: '#fef3c7',
    border: '2px solid #fde047',
    margin: '20px',
    borderRadius: '12px',
    padding: '20px'
  },
  tipsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '12px'
  },
  tipsList: {
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.8',
    paddingLeft: '20px',
    margin: 0
  }
};
