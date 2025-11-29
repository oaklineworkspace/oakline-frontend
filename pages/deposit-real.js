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
      .from('documents')
      .upload(`checks/${fileName}`, file, { upsert: true });

    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(`checks/${fileName}`);
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
        <div style={styles.headerContent}>
          <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
            ← Back to Dashboard
          </button>
          <h1 style={styles.title}>📸 Mobile Check Deposit</h1>
        </div>
      </div>

      <div style={styles.content}>
        {message && (
          <div style={{ ...styles.message, ...styles[messageType] }}>
            {message}
          </div>
        )}

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
            style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Submitting...' : 'Submit Check Deposit'}
          </button>
        </form>

        <div style={styles.guidelines}>
          <h3 style={{ color: '#1e40af', marginTop: 0 }}>📋 Tips for Success:</h3>
          <ul>
            <li>Sign the back of the check</li>
            <li>Place check on dark, contrasting background</li>
            <li>Ensure all text is clearly visible</li>
            <li>Photos must be JPEG, PNG, or HEIC format</li>
            <li>Maximum 10MB per image</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '1.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
    color: '#1e293b'
  },
  content: {
    maxWidth: '600px',
    margin: '2rem auto',
    padding: '0 1rem'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  success: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac'
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5'
  },
  info: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #93c5fd'
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  },
  hint: {
    fontSize: '0.75rem',
    color: '#64748b',
    marginTop: '0.25rem'
  },
  fileInput: {
    display: 'block',
    padding: '1rem',
    border: '2px solid #cbd5e1',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#f9fafb',
    fontWeight: '600',
    color: '#3b82f6',
    transition: 'all 0.2s'
  },
  preview: {
    maxWidth: '100%',
    maxHeight: '200px',
    marginTop: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0'
  },
  button: {
    width: '100%',
    padding: '0.875rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  guidelines: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  }
};

export default function DepositReal() {
  return (
    <ProtectedRoute>
      <DepositRealContent />
    </ProtectedRoute>
  );
}
