import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function CheckDeposit() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const router = useRouter();

  const [depositForm, setDepositForm] = useState({
    account_id: '',
    amount: '',
    check_number: '',
    check_front_image: null,
    check_back_image: null,
    check_front_preview: null,
    check_back_preview: null
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
        .from('check_deposits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setDeposits(userDeposits || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e, side) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please upload a valid image file');
      setMessageType('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size must be less than 5MB');
      setMessageType('error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setDepositForm(prev => ({
          ...prev,
          check_front_image: reader.result,
          check_front_preview: reader.result
        }));
      } else {
        setDepositForm(prev => ({
          ...prev,
          check_back_image: reader.result,
          check_back_preview: reader.result
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    if (!depositForm.check_front_image || !depositForm.check_back_image) {
      setMessage('Please upload both front and back images of the check');
      setMessageType('error');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/check-deposit-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          account_id: depositForm.account_id,
          amount: parseFloat(depositForm.amount),
          check_number: depositForm.check_number || null,
          check_front_image: depositForm.check_front_image,
          check_back_image: depositForm.check_back_image
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deposit submission failed');
      }

      setReferenceNumber(result.reference_number);
      setShowSuccess(true);
      
      setDepositForm({
        account_id: depositForm.account_id,
        amount: '',
        check_number: '',
        check_front_image: null,
        check_back_image: null,
        check_front_preview: null,
        check_back_preview: null
      });

      await checkUserAndLoadData();

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage(error.message || 'Deposit submission failed. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a1f44',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '2rem'
    },
    header: {
      backgroundColor: '#1a365d',
      color: 'white',
      padding: '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderBottom: '3px solid #059669'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textDecoration: 'none',
      color: 'white'
    },
    logo: {
      height: '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: '1.6rem',
      fontWeight: '700'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    main: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '2rem 1.5rem'
    },
    welcomeSection: {
      marginBottom: '2rem',
      textAlign: 'center'
    },
    welcomeTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      fontSize: '0.95rem',
      color: '#cbd5e1'
    },
    contentSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #059669'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      boxSizing: 'border-box'
    },
    imageUploadContainer: {
      marginBottom: '1.5rem'
    },
    imageUploadBox: {
      border: '2px dashed #cbd5e1',
      borderRadius: '12px',
      padding: '2rem',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s',
      backgroundColor: '#f8fafc'
    },
    imagePreview: {
      width: '100%',
      maxHeight: '300px',
      objectFit: 'contain',
      borderRadius: '8px',
      marginTop: '1rem'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
    },
    messageBox: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      border: '2px solid'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      borderColor: '#fca5a5'
    },
    successMessage: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderColor: '#6ee7b7'
    },
    depositList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    depositItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    depositInfo: {
      flex: 1
    },
    depositAmount: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '0.25rem'
    },
    depositDate: {
      fontSize: '0.8rem',
      color: '#64748b'
    },
    depositStatus: {
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    successModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(10, 31, 68, 0.95)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    successContent: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '2.5rem',
      maxWidth: '500px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Check Deposit - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.logoText}>Oakline Bank</span>
            </Link>
            <Link href="/dashboard" style={styles.backButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        <main style={styles.main}>
          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>📸 Mobile Check Deposit</h1>
            <p style={styles.welcomeSubtitle}>Deposit checks instantly from your mobile device</p>
          </div>

          {showSuccess && (
            <div style={styles.successModal}>
              <div style={styles.successContent}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✓</div>
                <h2 style={{ color: '#059669', marginBottom: '1rem' }}>Deposit Submitted!</h2>
                <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>Reference: {referenceNumber}</p>
                <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '2rem' }}>
                  Your check deposit is being processed. Funds typically available within 1-2 business days.
                </p>
                <button
                  style={styles.submitButton}
                  onClick={() => setShowSuccess(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Deposit Information</h2>

            {message && (
              <div style={{...styles.messageBox, ...(messageType === 'error' ? styles.errorMessage : styles.successMessage)}}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit To Account *</label>
                <select
                  style={styles.select}
                  value={depositForm.account_id}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, account_id: e.target.value }))}
                  required
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={styles.label}>Amount (USD) *</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={depositForm.amount}
                    onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                <div>
                  <label style={styles.label}>Check Number (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={depositForm.check_number}
                    onChange={(e) => setDepositForm(prev => ({ ...prev, check_number: e.target.value }))}
                    placeholder="1234"
                  />
                </div>
              </div>

              <div style={styles.imageUploadContainer}>
                <label style={styles.label}>Check Front Image *</label>
                <div
                  style={styles.imageUploadBox}
                  onClick={() => document.getElementById('front-upload').click()}
                >
                  {depositForm.check_front_preview ? (
                    <img src={depositForm.check_front_preview} alt="Check Front" style={styles.imagePreview} />
                  ) : (
                    <>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                      <p style={{ color: '#64748b', marginBottom: '0.25rem' }}>Click to upload front of check</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>
                <input
                  id="front-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e, 'front')}
                />
              </div>

              <div style={styles.imageUploadContainer}>
                <label style={styles.label}>Check Back Image *</label>
                <div
                  style={styles.imageUploadBox}
                  onClick={() => document.getElementById('back-upload').click()}
                >
                  {depositForm.check_back_preview ? (
                    <img src={depositForm.check_back_preview} alt="Check Back" style={styles.imagePreview} />
                  ) : (
                    <>
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📄</div>
                      <p style={{ color: '#64748b', marginBottom: '0.25rem' }}>Click to upload back of check</p>
                      <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>
                <input
                  id="back-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleImageUpload(e, 'back')}
                />
              </div>

              <button
                type="submit"
                style={{...styles.submitButton, opacity: submitting ? 0.6 : 1}}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Deposit'}
              </button>
            </form>
          </div>

          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Recent Deposits</h2>
            {deposits.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                No deposits yet
              </p>
            ) : (
              <div style={styles.depositList}>
                {deposits.map(deposit => (
                  <div key={deposit.id} style={styles.depositItem}>
                    <div style={styles.depositInfo}>
                      <div style={styles.depositAmount}>{formatCurrency(deposit.amount)}</div>
                      <div style={deposits.depositDate}>
                        {new Date(deposit.created_at).toLocaleDateString()} at {new Date(deposit.created_at).toLocaleTimeString()}
                      </div>
                      {deposit.check_number && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Check #{deposit.check_number}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        ...styles.depositStatus,
                        backgroundColor: deposit.status === 'approved' ? '#d1fae5' :
                                       deposit.status === 'pending' ? '#fed7aa' :
                                       deposit.status === 'processing' ? '#dbeafe' : '#fee2e2',
                        color: getStatusColor(deposit.status)
                      }}
                    >
                      {deposit.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
