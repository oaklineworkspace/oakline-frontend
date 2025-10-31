
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

export default function DepositReal() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [checkFront, setCheckFront] = useState(null);
  const [checkBack, setCheckBack] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setPageLoading(true);
      setError('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);
      await fetchAccounts(session.user);
    } catch (err) {
      console.error('Error checking user:', err);
      setError('Failed to load user data. Please log in again.');
      router.push('/sign-in');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchAccounts = async (user) => {
    try {
      setError('');

      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (accountsError) throw accountsError;

      setAccounts(accountsData || []);
      if (accountsData && accountsData.length > 0) {
        setSelectedAccount(accountsData[0].id);
      } else {
        setMessage('No active accounts found. Please apply for an account first.');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Unable to load accounts. Please try again.');
    }
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (type === 'front') {
      setCheckFront(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setCheckBack(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const uploadFile = async (file, userId, accountId) => {
    const filename = `${userId}/${accountId}/${Date.now()}_${file.name}`;
    const filePath = `checks/${filename}`;

    const { error } = await supabase.storage.from('check-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      throw error;
    }
    return filePath;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedAccount) {
      setError('Please select an account.');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 1) {
      setError('Please enter a valid deposit amount greater than $1.00.');
      return;
    }

    if (depositAmount > 5000) {
      setError('Check deposits over $5,000 require manual review. Please visit a branch or contact support.');
      return;
    }

    if (!checkFront || !checkBack) {
      setError('Please upload both front and back images of the check.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const account = accounts.find(acc => acc.id === selectedAccount);
      if (!account) {
        throw new Error('Selected account not found.');
      }

      const frontPath = await uploadFile(checkFront, user.id, selectedAccount);
      const backPath = await uploadFile(checkBack, user.id, selectedAccount);

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/check-deposit-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          account_id: selectedAccount,
          amount: depositAmount,
          check_front_image: frontPath,
          check_back_image: backPath
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deposit submission failed');
      }

      setMessage(`✓ Check deposit submitted successfully! Reference: ${result.reference_number}. Your deposit will be reviewed within 1-2 business days.`);

      setSelectedAccount(accounts[0]?.id || '');
      setAmount('');
      setCheckFront(null);
      setCheckBack(null);
      setFrontPreview('');
      setBackPreview('');

      setTimeout(() => {
        fetchAccounts(user);
      }, 2000);

    } catch (err) {
      console.error('Error processing deposit:', err);
      setError(err.message || 'Failed to submit deposit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#ffffff',
      color: '#1e293b',
      padding: isMobile ? '1rem 1.5rem' : '1.5rem 3rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderBottom: '1px solid #e2e8f0'
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textDecoration: 'none',
      color: '#1e293b'
    },
    logo: {
      height: isMobile ? '40px' : '50px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.25rem' : '1.75rem',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #1e40af 0%, #059669 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.625rem 1rem' : '0.75rem 1.5rem',
      backgroundColor: '#1e40af',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '10px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '600',
      border: 'none',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)'
    },
    main: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '1.5rem 1rem' : '3rem 2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0'
    },
    titleSection: {
      textAlign: 'center',
      marginBottom: isMobile ? '1.5rem' : '2rem'
    },
    title: {
      fontSize: isMobile ? '1.75rem' : '2.5rem',
      fontWeight: '800',
      color: '#1e293b',
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em'
    },
    subtitle: {
      fontSize: isMobile ? '1rem' : '1.15rem',
      color: '#64748b',
      fontWeight: '400'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1.25rem' : '1.75rem'
    },
    formGroup: {
      marginBottom: '0'
    },
    label: {
      display: 'block',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      width: '100%',
      padding: isMobile ? '0.75rem' : '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: isMobile ? '0.875rem' : '1rem',
      backgroundColor: 'white',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      outline: 'none'
    },
    input: {
      width: '100%',
      padding: isMobile ? '0.75rem' : '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: isMobile ? '0.875rem' : '1rem',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      outline: 'none',
      backgroundColor: 'white'
    },
    fileInput: {
      width: '100%',
      padding: isMobile ? '0.75rem' : '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      fontSize: isMobile ? '0.875rem' : '1rem',
      outline: 'none',
      cursor: 'pointer',
      backgroundColor: 'white'
    },
    previewImage: {
      maxWidth: '100%',
      height: 'auto',
      maxHeight: '200px',
      objectFit: 'contain',
      marginTop: '1rem',
      borderRadius: '10px',
      border: '2px solid #e5e7eb'
    },
    submitButton: {
      width: '100%',
      padding: isMobile ? '1rem' : '1.25rem',
      backgroundColor: '#1e40af',
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    message: {
      padding: isMobile ? '1rem' : '1.25rem',
      borderRadius: '12px',
      marginTop: isMobile ? '1.25rem' : '1.75rem',
      fontSize: isMobile ? '0.875rem' : '1rem',
      fontWeight: '500',
      border: '2px solid'
    },
    securityNote: {
      marginTop: isMobile ? '1.5rem' : '2rem',
      padding: isMobile ? '1.25rem' : '1.5rem',
      backgroundColor: '#eff6ff',
      borderRadius: '12px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#1e40af',
      border: '2px solid #bfdbfe',
      lineHeight: '1.6'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    spinner: {
      width: '50px',
      height: '50px',
      border: '5px solid #e2e8f0',
      borderTop: '5px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingText: {
      marginTop: '1.5rem',
      color: '#64748b',
      fontSize: '1.1rem',
      fontWeight: '500'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading your accounts...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
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
          <div style={styles.card}>
            <div style={styles.titleSection}>
              <h1 style={styles.title}>📸 Mobile Check Deposit</h1>
              <p style={styles.subtitle}>Deposit checks securely and conveniently</p>
            </div>

            {message && (
              <div style={{
                ...styles.message,
                backgroundColor: message.includes('successful') ? '#d1fae5' : '#fee2e2',
                color: message.includes('successful') ? '#059669' : '#dc2626',
                borderColor: message.includes('successful') ? '#6ee7b7' : '#fca5a5'
              }}>
                {message}
              </div>
            )}

            {error && (
              <div style={{
                ...styles.message,
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderColor: '#fca5a5'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Select Account *</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => {
                    setSelectedAccount(e.target.value);
                    setError('');
                  }}
                  required
                  style={styles.select}
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                >
                  <option value="">Choose an account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} (Balance: {formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
                {!accounts.length && !pageLoading && (
                  <p style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: '0.5rem' }}>
                    No accounts found. Please apply for an account first.
                  </p>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Deposit Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  max="5000.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  required
                  style={styles.input}
                  placeholder="0.00"
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Upload Check Front *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'front')}
                  style={styles.fileInput}
                  required
                />
                {frontPreview && (
                  <img src={frontPreview} alt="Check Front Preview" style={styles.previewImage} />
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Upload Check Back *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'back')}
                  style={styles.fileInput}
                  required
                />
                {backPreview && (
                  <img src={backPreview} alt="Check Back Preview" style={styles.previewImage} />
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !selectedAccount || !amount || !checkFront || !checkBack}
                style={{
                  ...styles.submitButton,
                  opacity: (loading || !selectedAccount || !amount || !checkFront || !checkBack) ? 0.6 : 1,
                  cursor: (loading || !selectedAccount || !amount || !checkFront || !checkBack) ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={(e) => {
                  if (!loading && selectedAccount && amount && checkFront && checkBack) {
                    e.target.style.backgroundColor = '#1e3a8a';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && selectedAccount && amount && checkFront && checkBack) {
                    e.target.style.backgroundColor = '#1e40af';
                  }
                }}
              >
                {loading ? '🔄 Processing Deposit...' : `📥 Submit Check Deposit ${amount ? formatCurrency(amount) : ''}`}
              </button>
            </form>

            <div style={styles.securityNote}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>🔒 Secure & Encrypted</p>
              <p style={{ margin: '0' }}>Your check images are encrypted and securely stored. All deposits are reviewed for your protection.</p>
              <p style={{ marginTop: '0.75rem', fontSize: isMobile ? '0.8rem' : '0.9rem', margin: '0.75rem 0 0 0' }}>
                ✓ Deposits typically available within 1-2 business days
              </p>
            </div>
          </div>
        </main>

        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
