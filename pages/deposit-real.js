import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function DepositForm() {
  const stripe = useStripe();
  const elements = useElements();
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
  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    description: ''
  });

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchAccounts(user);
    } catch (err) {
      console.error('Error checking user:', err);
      setError('Failed to load user data. Please log in again.');
      setMessage('Failed to load user data. Please log in again.');
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (user) => {
    try {
      setError('');

      // First try direct user_id match (most reliable)
      let accountsData = [];
      
      const { data: accountsByUserId, error: userIdError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (accountsByUserId && accountsByUserId.length > 0) {
        accountsData = accountsByUserId;
      } else {
        // Try to get user's application to find linked accounts
        const { data: userApplication, error: appError } = await supabase
          .from('applications')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userApplication && !appError) {
          // Try to find accounts linked to the application
          const { data: accountsByAppId, error: error1 } = await supabase
            .from('accounts')
            .select('*')
            .eq('application_id', userApplication.id)
            .eq('status', 'active')
            .order('created_at', { ascending: true });

          if (accountsByAppId && accountsByAppId.length > 0) {
            // Validate these accounts belong to current user
            const validAccounts = accountsByAppId.filter(account => {
              return account.email === user.email || account.user_email === user.email;
            });
            accountsData = validAccounts;
          }
        }
      }

      setAccounts(accountsData);
      if (accountsData && accountsData.length > 0) {
        setSelectedAccount(accountsData[0].id);
      } else {
        setMessage('No accounts found. Please contact support or apply for an account first.');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setError('Unable to load accounts. Please try again.');
      setMessage('Unable to load accounts. Please try again.');
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
    const filename = `${userId}/${accountId}/${file.name}`;
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

    if (!stripe || !elements) {
      setMessage('Stripe not loaded. Please wait.');
      return;
    }

    if (!selectedAccount) {
      setError('Please select an account.');
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount < 1) {
      setError('Please enter a valid deposit amount greater than $1.00.');
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

      // Upload checks first
      const frontPath = await uploadFile(checkFront, user.id, selectedAccount);
      const backPath = await uploadFile(checkBack, user.id, selectedAccount);

      // Create Stripe payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(depositAmount * 100), // Stripe expects amount in cents
          accountId: selectedAccount,
          userId: user.id,
          userEmail: user.email,
          description: `Mobile deposit for ${account.account_name || selectedAccount}`,
          frontImagePath: frontPath,
          backImagePath: backPath,
        })
      });

      const { clientSecret, error: stripeError } = await response.json();

      if (stripeError) {
        throw new Error(stripeError);
      }

      // Confirm payment with Stripe
      const { error: stripeConfirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            email: user.email,
          },
        }
      });

      if (stripeConfirmError) {
        throw stripeConfirmError;
      }

      setMessage('Deposit successful! Your account will be updated shortly.');
      setAccounts([]); // Clear accounts to force refetch
      setSelectedAccount('');
      setAmount('');
      setCheckFront(null);
      setCheckBack(null);
      setFrontPreview('');
      setBackPreview('');
      // Refresh accounts after successful deposit
      setTimeout(() => {
        fetchAccounts(user);
      }, 2000);

    } catch (err) {
      console.error('Error processing deposit:', err);
      setError(err.message || 'Failed to process deposit. Please check your details and try again.');
      setMessage('Failed to process deposit. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading your information...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Make a Mobile Deposit</h1>
          <p style={styles.subtitle}>Deposit your check securely</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Select Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setError(''); // Clear error when account changes
              }}
              required
              style={styles.select}
            >
              <option value="">Choose an account...</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name || account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} (Balance: ${parseFloat(account.balance || 0).toFixed(2)})
                </option>
              ))}
            </select>
            {!accounts.length && !loading && <p style={styles.noAccountsMessage}>No accounts found. Please apply for an account first.</p>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Deposit Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="1.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(''); // Clear error when amount changes
              }}
              required
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Upload Check Front</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'front')}
              style={styles.fileInput}
            />
            {frontPreview && (
              <img src={frontPreview} alt="Check Front Preview" style={styles.previewImage} />
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Upload Check Back</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, 'back')}
              style={styles.fileInput}
            />
            {backPreview && (
              <img src={backPreview} alt="Check Back Preview" style={styles.previewImage} />
            )}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Payment Information</label>
            <div style={styles.cardElement}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!stripe || loading || !selectedAccount || !amount || !checkFront || !checkBack}
            style={{
              ...styles.button,
              opacity: (!stripe || loading || !selectedAccount || !amount || !checkFront || !checkBack) ? 0.6 : 1,
              cursor: (!stripe || loading || !selectedAccount || !amount || !checkFront || !checkBack) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing...' : `Deposit $${amount || '0.00'}`}
          </button>
        </form>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.includes('successful') ? '#d1fae5' : '#fee2e2',
            color: message.includes('successful') ? '#059669' : '#dc2626'
          }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{
            ...styles.message,
            backgroundColor: '#fee2e2',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}

        <div style={styles.securityNote}>
          <p>🔒 Your payment information is secured by Stripe and never stored on our servers.</p>
        </div>
      </div>
    </div>
  );
}

export default function DepositReal() {
  return (
    <Elements stripe={stripePromise}>
      <DepositForm />
    </Elements>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    maxWidth: '500px',
    width: '100%'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '16px',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  field: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  input: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    backgroundColor: 'white'
  },
  cardElement: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: 'white'
  },
  button: {
    padding: '16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '600',
    marginTop: '10px'
  },
  message: {
    padding: '12px',
    borderRadius: '6px',
    marginTop: '20px',
    fontSize: '14px',
    textAlign: 'center'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#64748b'
  },
  securityNote: {
    marginTop: '20px',
    padding: '12px',
    backgroundColor: '#f1f5f9',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#475569',
    textAlign: 'center'
  },
  fileInput: {
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    cursor: 'pointer'
  },
  previewImage: {
    maxWidth: '100%',
    height: '100px',
    objectFit: 'cover',
    marginTop: '10px',
    borderRadius: '4px',
    border: '1px solid #e5e7eb'
  },
  noAccountsMessage: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '5px'
  }
};