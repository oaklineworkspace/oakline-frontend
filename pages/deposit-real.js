import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function DepositRealContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [checkFront, setCheckFront] = useState(null);
  const [checkBack, setCheckBack] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', () => setIsMobile(window.innerWidth <= 768));
    return () => window.removeEventListener('resize', () => setIsMobile(window.innerWidth <= 768));
  }, []);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
      if (data?.length > 0) setSelectedAccount(data[0].id);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      showMessage('Failed to load accounts', 'error');
    }
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showMessage('Please upload a valid image (JPEG, PNG, or HEIC)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage('Image must be less than 10MB', 'error');
      return;
    }

    if (type === 'front') {
      setCheckFront(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setCheckBack(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file, type) => {
    const fileName = `${user.id}/${Date.now()}_${type}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('check-deposits')
      .upload(`${fileName}`, file, { upsert: true });

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('check-deposits')
      .getPublicUrl(`${fileName}`);
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!selectedAccount) {
      showMessage('Please select an account', 'error');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 1) {
      showMessage('Please enter a valid amount greater than $1.00', 'error');
      return;
    }

    if (depositAmount > 5000) {
      showMessage('Deposits over $5,000 require manual review', 'error');
      return;
    }

    if (!checkFront || !checkBack) {
      showMessage('Please upload both front and back images', 'error');
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Upload both images
      const frontUrl = await uploadFile(checkFront, 'front');
      const backUrl = await uploadFile(checkBack, 'back');

      // Call API to save deposit record
      const response = await fetch('/api/check-deposit-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          account_id: selectedAccount,
          amount: depositAmount,
          check_front_image: frontUrl,
          check_back_image: backUrl
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      showMessage(`✓ Check submitted successfully! Ref: ${result.reference_number}`, 'success');
      
      // Reset form
      setAmount('');
      setCheckFront(null);
      setCheckBack(null);
      setFrontPreview('');
      setBackPreview('');
      setSelectedAccount(accounts[0]?.id || '');

    } catch (error) {
      console.error('Error:', error);
      showMessage(error.message || 'Failed to submit check', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
          ← Back
        </button>
        <h1 style={styles.title}>📸 Mobile Check Deposit</h1>
      </div>

      <div style={styles.content}>
        {message && (
          <div style={{ ...styles.message, ...styles[messageType] }}>
            {message}
          </div>
        )}

        <div style={styles.mainCard}>
          <h2 style={styles.cardTitle}>Deposit Check Information</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Select Account *</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={styles.select}
              required
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_type} - ••••{acc.account_number.slice(-4)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Deposit Amount ($) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="1"
              max="5000"
              style={styles.input}
              required
            />
            <div style={styles.hint}>Maximum $5,000 per deposit</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Check Front Image *</label>
            <label style={styles.fileInput}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic"
                onChange={(e) => handleFileChange(e, 'front')}
                style={{ display: 'none' }}
                required
              />
              <span>{checkFront ? '✓ Front image uploaded' : 'Choose Image'}</span>
            </label>
            {frontPreview && <img src={frontPreview} alt="Front" style={styles.preview} />}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Check Back Image *</label>
            <label style={styles.fileInput}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic"
                onChange={(e) => handleFileChange(e, 'back')}
                style={{ display: 'none' }}
                required
              />
              <span>{checkBack ? '✓ Back image uploaded' : 'Choose Image'}</span>
            </label>
            {backPreview && <img src={backPreview} alt="Back" style={styles.preview} />}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.button, ...styles.submitButton, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Processing...' : '✓ Submit Check Deposit'}
          </button>
          </form>
        </div>

        <div style={styles.guidelines}>
          <h3 style={styles.guidelineTitle}>📋 Deposit Guidelines</h3>
          <ul style={styles.guidelineList}>
            <li><strong>Sign the back</strong> - Ensure check is endorsed on the back</li>
            <li><strong>Lighting</strong> - Use natural lighting to capture details clearly</li>
            <li><strong>Background</strong> - Place check on a dark, contrasting surface</li>
            <li><strong>Alignment</strong> - Ensure entire check is visible in frame</li>
            <li><strong>Image Quality</strong> - JPEG, PNG, or HEIC format (max 10MB each)</li>
            <li><strong>Amount Limit</strong> - Maximum $5,000 per deposit</li>
            <li><strong>Processing</strong> - Deposits typically process within 1-2 business days</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
    paddingTop: '2rem',
    paddingBottom: '4rem',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 1rem',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  backButton: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: 0,
    color: '#ffffff'
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 1rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    border: '1px solid'
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderColor: '#86efac'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderColor: '#fca5a5'
  },
  info: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderColor: '#93c5fd'
  },
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    border: '1px solid #059669',
    marginBottom: '2rem'
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #059669'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    display: 'block',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    letterSpacing: '-0.01em'
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    fontWeight: '500',
    color: '#1e293b'
  },
  select: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    fontWeight: '500',
    color: '#1e293b',
    cursor: 'pointer'
  },
  hint: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.375rem',
    fontWeight: '400'
  },
  fileInput: {
    display: 'block',
    padding: '1.5rem',
    border: '2px dashed #059669',
    borderRadius: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f0fdf4',
    fontWeight: '600',
    color: '#059669',
    transition: 'all 0.2s'
  },
  preview: {
    maxWidth: '100%',
    maxHeight: '250px',
    marginTop: '1rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  button: {
    padding: '1rem',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  submitButton: {
    backgroundColor: '#1e40af',
    color: 'white',
    width: '100%'
  },
  guidelines: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    border: '1px solid #059669'
  },
  guidelineTitle: {
    color: '#1a365d',
    marginTop: 0,
    marginBottom: '1rem',
    fontSize: '1.125rem',
    fontWeight: '700'
  },
  guidelineList: {
    color: '#4b5563',
    lineHeight: '1.8',
    fontSize: '0.9375rem'
  }
};

export default function DepositReal() {
  return (
    <ProtectedRoute>
      <DepositRealContent />
    </ProtectedRoute>
  );
}
