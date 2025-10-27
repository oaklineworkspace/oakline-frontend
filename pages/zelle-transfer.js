
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function ZelleTransfer() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    from_account: '',
    to_contact: '',
    amount: '',
    memo: ''
  });

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      setUser(session.user);

      // Fetch user accounts
      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      setAccounts(userAccounts || []);

      if (userAccounts?.length > 0) {
        setForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      // Fetch Zelle contacts
      const { data: zelleContacts } = await supabase
        .from('zelle_contacts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      setContacts(zelleContacts || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setMessage('');

    try {
      const amount = parseFloat(form.amount);
      if (amount <= 0 || amount > 2500) {
        setMessage('Amount must be between $0.01 and $2,500');
        setSending(false);
        return;
      }

      // Validate recipient
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;

      if (!emailRegex.test(form.to_contact) && !phoneRegex.test(form.to_contact)) {
        setMessage('Please enter a valid email address or phone number');
        setSending(false);
        return;
      }

      // Check account balance
      const selectedAccount = accounts.find(acc => acc.id === form.from_account);
      if (amount > parseFloat(selectedAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setSending(false);
        return;
      }

      const response = await fetch('/api/zelle-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: user.id,
          sender_account_id: form.from_account,
          recipient_contact: form.to_contact,
          amount: amount,
          memo: form.memo || 'Zelle Transfer',
          transaction_type: 'send'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transaction failed');
      }

      setShowSuccess(true);
      setForm({ from_account: form.from_account, to_contact: '', amount: '', memo: '' });

      setTimeout(() => {
        setShowSuccess(false);
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error sending money:', error);
      setMessage(error.message || 'Error sending money. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Zelle Transfer - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
        </div>

        <div style={styles.content}>
          {showSuccess && (
            <div style={styles.successModal}>
              <div style={styles.successCheck}>✓</div>
              <h2 style={styles.successTitle}>Funds Sent Successfully!</h2>
              <p style={styles.successMessage}>Your Zelle payment has been processed</p>
            </div>
          )}

          <div style={styles.titleSection}>
            <div style={styles.zelleHeader}>
              <div style={styles.zelleLogo}>Z</div>
              <div>
                <h1 style={styles.title}>Send Money with Zelle®</h1>
                <p style={styles.subtitle}>Fast, safe, and easy</p>
              </div>
            </div>
          </div>

          {message && (
            <div style={styles.errorMessage}>{message}</div>
          )}

          {contacts.length > 0 && (
            <div style={styles.contactsSection}>
              <h3 style={styles.contactsTitle}>Recent Contacts</h3>
              <div style={styles.contactsGrid}>
                {contacts.slice(0, 4).map((contact) => (
                  <button
                    key={contact.id}
                    style={styles.contactCard}
                    onClick={() => setForm(prev => ({ ...prev, to_contact: contact.email || contact.phone }))}
                  >
                    <div style={styles.contactAvatar}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={styles.contactName}>{contact.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>From Account *</label>
              <select
                style={styles.select}
                value={form.from_account}
                onChange={(e) => setForm(prev => ({ ...prev, from_account: e.target.value }))}
                required
              >
                <option value="">Select account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>To (Email or Phone) *</label>
              <input
                type="text"
                style={styles.input}
                value={form.to_contact}
                onChange={(e) => setForm(prev => ({ ...prev, to_contact: e.target.value }))}
                placeholder="email@example.com or (555) 123-4567"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                style={styles.input}
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max="2500"
                required
              />
              <small style={styles.helperText}>Daily limit: $2,500</small>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>What's this for? (Optional)</label>
              <input
                type="text"
                style={styles.input}
                value={form.memo}
                onChange={(e) => setForm(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="Dinner, rent, etc."
                maxLength="100"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: sending ? 0.7 : 1,
                cursor: sending ? 'not-allowed' : 'pointer'
              }}
              disabled={sending}
            >
              {sending ? '🔄 Sending...' : `💸 Send ${formatCurrency(parseFloat(form.amount) || 0)} with Zelle`}
            </button>
          </form>

          <div style={styles.infoSection}>
            <h4 style={styles.infoTitle}>🔒 Zelle Safety Tips</h4>
            <ul style={styles.infoList}>
              <li>Only send money to people you know and trust</li>
              <li>Payments are typically delivered in minutes</li>
              <li>Payments can't be canceled once sent</li>
              <li>Verify recipient information before sending</li>
            </ul>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '50px'
  },
  header: {
    backgroundColor: '#1A3E6F',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(26, 62, 111, 0.25)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem'
  },
  content: {
    padding: '1.5rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  successModal: {
    backgroundColor: '#d1fae5',
    border: '2px solid #10b981',
    borderRadius: '16px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '2rem',
    animation: 'slideDown 0.3s ease'
  },
  successCheck: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    fontWeight: 'bold'
  },
  successTitle: {
    color: '#065f46',
    fontSize: '1.5rem',
    marginBottom: '0.5rem'
  },
  successMessage: {
    color: '#047857',
    fontSize: '1rem'
  },
  titleSection: {
    marginBottom: '1.5rem'
  },
  zelleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  zelleLogo: {
    width: '60px',
    height: '60px',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    fontWeight: 'bold'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#64748b',
    margin: 0
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    border: '2px solid #fca5a5'
  },
  contactsSection: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  contactsTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  contactsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '1rem'
  },
  contactCard: {
    background: 'none',
    border: '2px solid #e2e8f0',
    padding: '1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center'
  },
  contactAvatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #059669 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 0.5rem',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  contactName: {
    fontSize: '0.85rem',
    color: '#1e293b',
    fontWeight: '500'
  },
  form: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1.25rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    backgroundColor: 'white'
  },
  helperText: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.25rem',
    display: 'block'
  },
  submitButton: {
    width: '100%',
    padding: '1.125rem',
    backgroundColor: '#1A3E6F',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '1rem',
    boxShadow: '0 6px 20px rgba(26, 62, 111, 0.3)'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1A3E6F',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '0.85rem'
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
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A3E6F',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  }
};
