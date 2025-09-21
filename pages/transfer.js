import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

// ---------- Reusable Components ----------
const MessageBox = ({ message }) => {
  if (!message) return null;
  const success = message.includes('✅');
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '8px',
      border: '2px solid',
      marginBottom: '1rem',
      fontSize: '0.9rem',
      backgroundColor: success ? '#d4edda' : '#f8d7da',
      borderColor: success ? '#c3e6cb' : '#f5c6cb',
      color: success ? '#155724' : '#721c24'
    }}>
      {message}
    </div>
  );
};

const PendingAccounts = ({ accounts }) => {
  if (!accounts || accounts.length === 0) return null;
  return (
    <div style={styles.pendingAccountsDisplay}>
      <h2 style={styles.pendingTitle}>Pending Accounts</h2>
      <div style={styles.pendingAccountsList}>
        {accounts.map(acc => (
          <div key={acc.id} style={styles.pendingAccountCard}>
            <p><strong>Type:</strong> {acc.account_type?.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Number:</strong> ****{acc.account_number?.slice(-4)}</p>
            <p style={styles.pendingStatus}>Status: Pending Approval</p>
          </div>
        ))}
      </div>
      <p style={styles.contactInfo}>Please wait for approval or contact support for assistance.</p>
    </div>
  );
};

const FormGroup = ({ label, children }) => (
  <div style={styles.formGroup}>
    <label style={styles.label}>{label}</label>
    {children}
  </div>
);

// ---------- Main Transfer Component ----------
export default function Transfer() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('internal');
  const [transferDetails, setTransferDetails] = useState({
    recipient_name: '', recipient_email: '', memo: '', routing_number: '',
    bank_name: '', swift_code: '', country: '', purpose: '', recipient_address: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  // ---------- Fetch User, Profile, and Accounts ----------
  useEffect(() => {
    const init = async () => {
      setPageLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return router.push('/login');
        setUser(session.user);

        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(profileData || null);

        // Fetch accounts
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('*')
          .or(`user_id.eq.${session.user.id},application_id.eq.${profileData?.application_id}`)
          .order('created_at', { ascending: true });

        const active = accountsData?.filter(a => a.status === 'active') || [];
        const pending = accountsData?.filter(a => a.status === 'pending') || [];
        setAccounts(active);
        setPendingAccounts(pending);
        if (active.length) setFromAccount(active[0].id.toString());
      } catch (err) {
        console.error(err);
        setMessage('Error loading data. Please refresh.');
      } finally {
        setPageLoading(false);
      }
    };
    init();
  }, [router]);

  // ---------- Handle Transfer Form ----------
  const handleTransferDetailsChange = (field, value) => {
    setTransferDetails(prev => ({ ...prev, [field]: value }));
  };

  const selectedAccountData = useMemo(() => accounts.find(a => a.id.toString() === fromAccount), [accounts, fromAccount]);
  const fee = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    switch (transferType) {
      case 'internal': return 0;
      case 'domestic_external': return amt > 1000 ? 5 : 2;
      case 'international': return 30;
      default: return 0;
    }
  }, [amount, transferType]);
  const totalAmount = useMemo(() => (parseFloat(amount) || 0) + fee, [amount, fee]);

  const validateForm = () => {
    const amt = parseFloat(amount);
    if (!fromAccount || !toAccountNumber || !amount || amt <= 0) return setMessage('Enter valid details.') || false;
    if (amt > parseFloat(selectedAccountData?.balance || 0)) return setMessage('Insufficient funds.') || false;
    if (amt > 25000 && transferType !== 'internal') return setMessage('External transfers > $25k need verification.') || false;

    // Transfer type-specific validation
    if (transferType === 'domestic_external' && (!transferDetails.recipient_name || !transferDetails.routing_number || !transferDetails.bank_name)) {
      return setMessage('Fill all domestic transfer fields.') || false;
    }
    if (transferType === 'international' && (!transferDetails.recipient_name || !transferDetails.swift_code || !transferDetails.country || !transferDetails.purpose)) {
      return setMessage('Fill all international transfer fields.') || false;
    }
    if (transferType === 'internal' && !transferDetails.recipient_name) {
      return setMessage('Recipient name required for internal transfers.') || false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setMessage('');

    try {
      const transferAmount = parseFloat(amount);
      // Create transaction record
      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: parseInt(fromAccount),
        amount: -transferAmount,
        type: 'transfer_out',
        description: `${transferType.toUpperCase()} transfer to ${toAccountNumber} - ${transferDetails.recipient_name} - ${transferDetails.memo || 'Transfer'}`,
        status: transferType === 'internal' ? 'completed' : 'pending',
        category: 'transfer',
        created_at: new Date().toISOString()
      }]);

      if (fee > 0) {
        await supabase.from('transactions').insert([{
          user_id: user.id,
          account_id: parseInt(fromAccount),
          amount: -fee,
          type: 'fee',
          description: `${transferType.toUpperCase()} transfer fee`,
          status: 'completed',
          category: 'fee',
          created_at: new Date().toISOString()
        }]);
      }

      setMessage(`✅ Transfer of $${transferAmount.toFixed(2)} successful! Fee: $${fee.toFixed(2)}`);
      setAmount(''); setToAccountNumber('');
      setTransferDetails({
        recipient_name: '', recipient_email: '', memo: '', routing_number: '',
        bank_name: '', swift_code: '', country: '', purpose: '', recipient_address: ''
      });

      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderTransferTypeFields = () => {
    switch (transferType) {
      case 'internal': return (
        <>
          <FormGroup label="Recipient Name *">
            <input type="text" value={transferDetails.recipient_name} onChange={e => handleTransferDetailsChange('recipient_name', e.target.value)} placeholder="Name for reference" required style={styles.input}/>
          </FormGroup>
          <FormGroup label="Memo (Optional)">
            <input type="text" value={transferDetails.memo} onChange={e => handleTransferDetailsChange('memo', e.target.value)} placeholder="Purpose" style={styles.input}/>
          </FormGroup>
        </>
      );
      case 'domestic_external': return (
        <>
          <FormGroup label="Recipient Name *">
            <input type="text" value={transferDetails.recipient_name} onChange={e => handleTransferDetailsChange('recipient_name', e.target.value)} placeholder="Full name" style={styles.input}/>
          </FormGroup>
          <FormGroup label="Bank Name *">
            <input type="text" value={transferDetails.bank_name} onChange={e => handleTransferDetailsChange('bank_name', e.target.value)} placeholder="Bank name" style={styles.input}/>
          </FormGroup>
          <FormGroup label="Routing Number *">
            <input type="text" value={transferDetails.routing_number} onChange={e => handleTransferDetailsChange('routing_number', e.target.value)} placeholder="123456789" maxLength={9} style={styles.input}/>
          </FormGroup>
          <FormGroup label="Memo (Optional)">
            <input type="text" value={transferDetails.memo} onChange={e => handleTransferDetailsChange('memo', e.target.value)} placeholder="Purpose" style={styles.input}/>
          </FormGroup>
        </>
      );
      case 'international': return (
        <>
          <FormGroup label="Recipient Name *">
            <input type="text" value={transferDetails.recipient_name} onChange={e => handleTransferDetailsChange('recipient_name', e.target.value)} placeholder="Full name" style={styles.input}/>
          </FormGroup>
          <FormGroup label="Country *">
            <input type="text" value={transferDetails.country} onChange={e => handleTransferDetailsChange('country', e.target.value)} placeholder="Destination country" style={styles.input}/>
          </FormGroup>
          <FormGroup label="SWIFT Code *">
            <input type="text" value={transferDetails.swift_code} onChange={e => handleTransferDetailsChange('swift_code', e.target.value)} placeholder="ABCDUS33XXX" style={styles.input}/>
          </FormGroup>
          <FormGroup label="Purpose *">
            <select value={transferDetails.purpose} onChange={e => handleTransferDetailsChange('purpose', e.target.value)} required style={styles.select}>
              <option value="">Select purpose</option>
              <option value="family_support">Family Support</option>
              <option value="education">Education</option>
              <option value="business">Business</option>
              <option value="investment">Investment</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Recipient Address">
            <textarea value={transferDetails.recipient_address} onChange={e => handleTransferDetailsChange('recipient_address', e.target.value)} style={{...styles.input, minHeight: '60px', resize: 'vertical'}}/>
          </FormGroup>
        </>
      );
      default: return null;
    }
  };

  if (pageLoading) return <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading...</p></div>;
  if (!user) return <div>Please log in. <Link href="/login">Login</Link></div>;

  return (
    <>
      <Head>
        <title>Transfer Funds - Oakline Bank</title>
      </Head>
      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/" style={styles.logoContainer}>🏦 Oakline Bank</Link>
          <div style={styles.headerInfo}>
            <span>Routing: 075915826</span>
            <Link href="/dashboard" style={styles.backButton}>← Back</Link>
          </div>
        </header>

        <main style={styles.content}>
          <h1>💸 Transfer Funds</h1>
          <MessageBox message={message} />
          <PendingAccounts accounts={pendingAccounts} />

          {accounts.length === 0 && !pendingAccounts.length && <p>No active accounts. Please apply.</p>}

          {accounts.length > 0 && (
            <form onSubmit={handleSubmit} style={styles.form}>
              <FormGroup label="From Account *">
                <select value={fromAccount} onChange={e => setFromAccount(e.target.value)} required style={styles.select}>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_type?.replace('_',' ').toUpperCase()} ****{acc.account_number?.slice(-4)} - ${acc.balance}</option>)}
                </select>
              </FormGroup>

              <FormGroup label="Transfer Type *">
                <select value={transferType} onChange={e => setTransferType(e.target.value)} style={styles.select}>
                  <option value="internal">Internal</option>
                  <option value="domestic_external">Domestic</option>
                  <option value="international">International</option>
                </select>
              </FormGroup>

              <FormGroup label="To Account Number *">
                <input type="text" value={toAccountNumber} onChange={e => setToAccountNumber(e.target.value)} placeholder="Recipient account number" style={styles.input}/>
              </FormGroup>

              <FormGroup label="Amount ($) *">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" step="0.01" max={selectedAccountData?.balance} style={styles.input}/>
              </FormGroup>

              {renderTransferTypeFields()}

              {fee > 0 && <p>Fee: ${fee} | Total: ${totalAmount}</p>}

              <button type="submit" disabled={loading} style={styles.submitButton}>
                {loading ? 'Processing...' : `Transfer $${amount || 0}`}
              </button>
            </form>
          )}
        </main>
      </div>
    </>
  );
}



const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    gap: '0.5rem'
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
    fontSize: 'clamp(1.1rem, 4vw, 1.5rem)',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  routingInfo: {
    fontSize: '0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px'
  },
  backButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  content: {
    padding: '1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '1.5rem'
  },
  title: {
    fontSize: 'clamp(1.5rem, 6vw, 2rem)',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    color: '#64748b'
  },
  form: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginBottom: '1rem'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box'
  },
  detailsSection: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    border: '2px solid #e2e8f0'
  },
  sectionTitle: {
    color: '#1e40af',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  feeNotice: {
    backgroundColor: '#fff3cd',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem'
  },
  feeTitle: {
    color: '#92400e',
    marginBottom: '0.5rem',
    fontSize: '0.9rem'
  },
  submitButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  message: {
    padding: '1rem',
    borderRadius: '8px',
    border: '2px solid',
    marginBottom: '1rem',
    fontSize: '0.9rem'
  },
  infoSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1e40af',
    marginBottom: '0.75rem',
    fontSize: '1rem'
  },
  infoList: {
    margin: 0,
    paddingLeft: '1.2rem',
    color: '#374151',
    lineHeight: '1.6',
    fontSize: '0.85rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    maxWidth: '600px',
    margin: '0 auto'
  },
  emptyTitle: {
    fontSize: 'clamp(1.3rem, 5vw, 1.8rem)',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  emptyDesc: {
    fontSize: 'clamp(0.9rem, 3vw, 1rem)',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    display: 'inline-block',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: '500',
    fontSize: '16px',
    marginTop: '20px'
  },
  pendingAccountsDisplay: {
    marginTop: '2rem',
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  pendingTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  pendingAccountsList: {
    margin: '20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  pendingAccountCard: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'left'
  },
  pendingAccountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    fontSize: '14px'
  },
  pendingStatus: {
    color: '#856404',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  contactInfo: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
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
    borderTop: '3px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  },
  loginPrompt: {
    textAlign: 'center',
    padding: '2rem 1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    margin: '2rem auto',
    maxWidth: '400px'
  },
  loginTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  loginMessage: {
    color: '#64748b',
    margin: '0 0 1.5rem 0',
    fontSize: '1rem'
  },
  loginButton: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '500'
  }
};
