import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function MobileDeposit() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const router = useRouter();

  const [depositForm, setDepositForm] = useState({
    account_id: '',
    amount: '',
    check_front_image: null,
    check_back_image: null,
    check_front_preview: null,
    check_back_preview: null,
    memo: ''
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      setUserProfile(profile);

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setDepositForm(prev => ({ ...prev, account_id: userAccounts[0].id }));
      }

      const { data: userDeposits } = await supabase
        .from('mobile_deposits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setDeposits(userDeposits || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload an image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (side === 'front') {
        setDepositForm(prev => ({
          ...prev,
          check_front_image: base64String,
          check_front_preview: base64String
        }));
      } else {
        setDepositForm(prev => ({
          ...prev,
          check_back_image: base64String,
          check_back_preview: base64String
        }));
      }
      setMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();

    if (!depositForm.account_id || !depositForm.amount || 
        !depositForm.check_front_image || !depositForm.check_back_image) {
      setMessage('Please fill in all required fields and upload both check images');
      return;
    }

    const amount = parseFloat(depositForm.amount);
    if (amount <= 0 || isNaN(amount)) {
      setMessage('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/mobile-deposit-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          account_id: depositForm.account_id,
          amount: depositForm.amount,
          check_front_image: depositForm.check_front_image,
          check_back_image: depositForm.check_back_image,
          memo: depositForm.memo
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit deposit');
      }

      setReferenceNumber(result.reference_number);
      setShowSuccess(true);
      setDepositForm({
        account_id: accounts[0]?.id || '',
        amount: '',
        check_front_image: null,
        check_back_image: null,
        check_front_preview: null,
        check_back_preview: null,
        memo: ''
      });
      
      if (frontInputRef.current) frontInputRef.current.value = '';
      if (backInputRef.current) backInputRef.current.value = '';

      await checkUserAndLoadData();

      setTimeout(() => setShowSuccess(false), 5000);

    } catch (error) {
      console.error('Error submitting deposit:', error);
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'deposited': return '#10b981';
      case 'pending':
      case 'under_review': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'deposited': return '✅';
      case 'pending':
      case 'under_review': return '🔍';
      case 'rejected': return '❌';
      default: return '📝';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading Mobile Deposit...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Mobile Check Deposit - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          <h1 style={styles.headerTitle}>Mobile Check Deposit</h1>
          <div style={styles.logoPlaceholder}>🏦</div>
        </div>

        <div style={styles.content}>
          {showSuccess && (
            <div style={styles.successBanner}>
              <div style={styles.successIcon}>✅</div>
              <div>
                <h3 style={styles.successTitle}>Deposit Submitted Successfully!</h3>
                <p style={styles.successText}>
                  Reference: <strong>{referenceNumber}</strong><br/>
                  Your deposit is now under review. You'll be notified within 1-2 business days.
                </p>
              </div>
            </div>
          )}

          {message && (
            <div style={styles.errorMessage}>
              {message}
            </div>
          )}

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Deposit a Check</h2>
            <p style={styles.subtitle}>
              Take photos of the front and back of your endorsed check
            </p>

            <form onSubmit={handleSubmitDeposit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit to Account *</label>
                <select
                  style={styles.select}
                  value={depositForm.account_id}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, account_id: e.target.value }))}
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type} - {acc.account_number} (${parseFloat(acc.balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  style={styles.input}
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
                <small style={styles.helperText}>Enter the exact amount shown on the check</small>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={depositForm.memo}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="e.g., Paycheck, Refund, etc."
                />
              </div>

              <div style={styles.imagesGrid}>
                <div style={styles.imageUploadSection}>
                  <label style={styles.imageLabel}>
                    Front of Check *
                  </label>
                  <div style={styles.uploadBox}>
                    {depositForm.check_front_preview ? (
                      <div style={styles.previewContainer}>
                        <img 
                          src={depositForm.check_front_preview} 
                          alt="Check front" 
                          style={styles.previewImage}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDepositForm(prev => ({ 
                              ...prev, 
                              check_front_image: null, 
                              check_front_preview: null 
                            }));
                            if (frontInputRef.current) frontInputRef.current.value = '';
                          }}
                          style={styles.removeButton}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={styles.uploadIcon}>📷</div>
                        <p style={styles.uploadText}>Click to upload front of check</p>
                        <input
                          ref={frontInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload(e, 'front')}
                          style={styles.fileInput}
                          required
                        />
                      </>
                    )}
                  </div>
                </div>

                <div style={styles.imageUploadSection}>
                  <label style={styles.imageLabel}>
                    Back of Check *
                  </label>
                  <div style={styles.uploadBox}>
                    {depositForm.check_back_preview ? (
                      <div style={styles.previewContainer}>
                        <img 
                          src={depositForm.check_back_preview} 
                          alt="Check back" 
                          style={styles.previewImage}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setDepositForm(prev => ({ 
                              ...prev, 
                              check_back_image: null, 
                              check_back_preview: null 
                            }));
                            if (backInputRef.current) backInputRef.current.value = '';
                          }}
                          style={styles.removeButton}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={styles.uploadIcon}>📷</div>
                        <p style={styles.uploadText}>Click to upload back of check</p>
                        <input
                          ref={backInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload(e, 'back')}
                          style={styles.fileInput}
                          required
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.tipsBox}>
                <h4 style={styles.tipsTitle}>📝 Tips for Best Results</h4>
                <ul style={styles.tipsList}>
                  <li>Endorse the back of the check before taking the photo</li>
                  <li>Place the check on a dark, solid background</li>
                  <li>Make sure all four corners of the check are visible</li>
                  <li>Ensure the image is clear and in focus</li>
                  <li>Use good lighting - avoid shadows and glare</li>
                </ul>
              </div>

              <button
                type="submit"
                style={styles.submitButton}
                disabled={submitting || !depositForm.check_front_image || !depositForm.check_back_image}
              >
                {submitting ? '⏳ Submitting...' : '✅ Submit Deposit'}
              </button>
            </form>
          </div>

          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Deposit History</h2>
            
            <div style={styles.depositList}>
              {deposits.map(deposit => (
                <div key={deposit.id} style={styles.depositItem}>
                  <div style={styles.depositLeft}>
                    <div style={styles.depositStatus}>
                      {getStatusIcon(deposit.status)} {deposit.status.replace('_', ' ').toUpperCase()}
                    </div>
                    <div style={styles.depositAmount}>
                      ${parseFloat(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={styles.depositDate}>
                      {new Date(deposit.created_at).toLocaleString()}
                    </div>
                    {deposit.reference_number && (
                      <div style={styles.depositRef}>Ref: {deposit.reference_number}</div>
                    )}
                    {deposit.rejection_reason && (
                      <div style={styles.rejectionReason}>
                        <strong>Reason:</strong> {deposit.rejection_reason}
                      </div>
                    )}
                  </div>
                  <div style={styles.depositRight}>
                    <div style={{
                      ...styles.depositBadge,
                      backgroundColor: getStatusColor(deposit.status) + '20',
                      color: getStatusColor(deposit.status)
                    }}>
                      {deposit.status}
                    </div>
                  </div>
                </div>
              ))}
              {deposits.length === 0 && (
                <p style={styles.emptyState}>No deposits yet. Submit your first check above!</p>
              )}
            </div>
          </div>

          <div style={styles.infoCard}>
            <h3 style={styles.infoTitle}>Important Information</h3>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>⏱️</div>
                <div>
                  <div style={styles.infoItemTitle}>Processing Time</div>
                  <div style={styles.infoItemText}>1-2 business days</div>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>💰</div>
                <div>
                  <div style={styles.infoItemTitle}>Daily Limit</div>
                  <div style={styles.infoItemText}>$5,000</div>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>📅</div>
                <div>
                  <div style={styles.infoItemTitle}>Monthly Limit</div>
                  <div style={styles.infoItemText}>$25,000</div>
                </div>
              </div>
              <div style={styles.infoItem}>
                <div style={styles.infoIcon}>🔒</div>
                <div>
                  <div style={styles.infoItemTitle}>Security</div>
                  <div style={styles.infoItemText}>Bank-level encryption</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    paddingBottom: '100px'
  },
  header: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2563eb 100%)',
    color: 'white',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '1.5rem'
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    animation: 'slideDown 0.3s ease'
  },
  successIcon: {
    fontSize: '2rem'
  },
  successTitle: {
    color: '#065f46',
    marginTop: 0,
    marginBottom: '0.5rem'
  },
  successText: {
    color: '#047857',
    margin: 0,
    fontSize: '0.95rem'
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '2px solid #fca5a5'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem'
  },
  cardTitle: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
    color: '#1e293b'
  },
  subtitle: {
    color: '#64748b',
    marginBottom: '2rem'
  },
  form: {
    marginTop: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  },
  helperText: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block'
  },
  imagesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  imageUploadSection: {
    width: '100%'
  },
  imageLabel: {
    display: 'block',
    marginBottom: '0.75rem',
    fontWeight: '600',
    color: '#374151',
    fontSize: '1rem'
  },
  uploadBox: {
    position: 'relative',
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '2rem 1rem',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  uploadIcon: {
    fontSize: '3rem',
    marginBottom: '0.75rem'
  },
  uploadText: {
    color: '#64748b',
    fontSize: '0.9rem',
    margin: 0
  },
  fileInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer'
  },
  previewContainer: {
    width: '100%',
    position: 'relative'
  },
  previewImage: {
    width: '100%',
    maxHeight: '250px',
    objectFit: 'contain',
    borderRadius: '8px'
  },
  removeButton: {
    marginTop: '0.75rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  tipsBox: {
    backgroundColor: '#dbeafe',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem'
  },
  tipsTitle: {
    color: '#1e40af',
    marginTop: 0,
    marginBottom: '0.75rem'
  },
  tipsList: {
    color: '#1e3a8a',
    fontSize: '0.9rem',
    lineHeight: '1.8',
    margin: 0,
    paddingLeft: '1.5rem'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  depositList: {
    marginTop: '1rem'
  },
  depositItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1.25rem',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '1px solid #e5e7eb'
  },
  depositLeft: {
    flex: 1
  },
  depositStatus: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem',
    fontSize: '1rem'
  },
  depositAmount: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '0.5rem'
  },
  depositDate: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginBottom: '0.25rem'
  },
  depositRef: {
    fontSize: '0.8rem',
    color: '#6366f1',
    fontFamily: 'monospace',
    marginTop: '0.5rem'
  },
  rejectionReason: {
    fontSize: '0.85rem',
    color: '#dc2626',
    marginTop: '0.5rem',
    backgroundColor: '#fee2e2',
    padding: '0.5rem',
    borderRadius: '4px'
  },
  depositRight: {
    textAlign: 'right'
  },
  depositBadge: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  emptyState: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '2rem',
    fontStyle: 'italic'
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  infoTitle: {
    fontSize: '1.25rem',
    marginBottom: '1.5rem',
    color: '#1e293b'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem'
  },
  infoItem: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  infoIcon: {
    fontSize: '2rem'
  },
  infoItemTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.25rem'
  },
  infoItemText: {
    color: '#64748b',
    fontSize: '0.9rem'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh'
  },
  spinner: {
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #1A3E6F',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  }
};
