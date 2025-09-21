import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function Transfer() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccountNumber, setToAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transferType, setTransferType] = useState('internal');
  const [transferDetails, setTransferDetails] = useState({
    recipient_name: '',
    recipient_email: '',
    memo: '',
    routing_number: '',
    bank_name: '',
    swift_code: '',
    country: '',
    purpose: '',
    recipient_address: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (!userProfile?.application_id) return;

    // Real-time subscription for account updates
    const subscription = supabase
      .channel('public:accounts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `application_id=eq.${userProfile.application_id}` },
        (payload) => {
          const updatedAccount = payload.new;
          setAccounts(prevAccounts =>
            prevAccounts.map(acc => (acc.id === updatedAccount.id ? updatedAccount : acc))
          );

          if (updatedAccount.status === 'pending' && !pendingAccounts.find(a => a.id === updatedAccount.id)) {
            setPendingAccounts(prev => [...prev, updatedAccount]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userProfile]);

  const checkUserAndFetchData = async () => {
    try {
      setPageLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.push('/login');
        return;
      }

      setUser(session.user);

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (!profileError && profile) setUserProfile(profile);

      await fetchAccounts(session.user, profile);
    } catch (error) {
      console.error(error);
      setMessage('Error loading user data.');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchAccounts = async (user, profile) => {
    try {
      let accountsData = [];
      let pendingData = [];

      if (profile?.application_id) {
        const { data: accs } = await supabase
          .from('accounts')
          .select('*')
          .eq('application_id', profile.application_id);

        if (accs?.length > 0) {
          accountsData = accs.filter(acc => acc.status === 'active');
          pendingData = accs.filter(acc => acc.status === 'pending');
        }
      }

      setAccounts(accountsData);
      setPendingAccounts(pendingData);
      if (accountsData[0]) setFromAccount(accountsData[0].id.toString());
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransferDetailsChange = (field, value) => {
    setTransferDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const selectedAccount = accounts.find(acc => acc.id.toString() === fromAccount);
    const transferAmount = parseFloat(amount);

    if (!fromAccount || !toAccountNumber || !amount || transferAmount <= 0) {
      setMessage('Please select accounts and enter a valid amount.');
      return false;
    }

    if (transferAmount > parseFloat(selectedAccount?.balance || 0)) {
      setMessage('Insufficient funds.');
      return false;
    }

    if (transferAmount > 25000 && transferType !== 'internal') {
      setMessage('Transfers over $25,000 require verification.');
      return false;
    }

    switch (transferType) {
      case 'domestic_external':
        if (!transferDetails.recipient_name || !transferDetails.routing_number || !transferDetails.bank_name) return false;
        break;
      case 'international':
        if (!transferDetails.recipient_name || !transferDetails.swift_code || !transferDetails.country || !transferDetails.purpose) return false;
        break;
      default: break;
    }

    return true;
  };

  const calculateFee = () => {
    const amt = parseFloat(amount) || 0;
    if (transferType === 'internal') return 0;
    if (transferType === 'domestic_external') return amt > 1000 ? 5 : 2;
    if (transferType === 'international') return 30;
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const selectedAccount = accounts.find(acc => acc.id.toString() === fromAccount);
      const transferAmount = parseFloat(amount);
      const fee = calculateFee();
      const total = transferAmount + fee;

      if (total > parseFloat(selectedAccount?.balance || 0)) {
        setMessage(`Insufficient funds including fees.`);
        setLoading(false);
        return;
      }

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: parseInt(fromAccount),
        amount: -transferAmount,
        type: 'transfer_out',
        description: `${transferType.toUpperCase()} transfer to ${toAccountNumber} - ${transferDetails.recipient_name}`,
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

      // Optimistic update
      setAccounts(prev => prev.map(acc =>
        acc.id.toString() === fromAccount
          ? { ...acc, balance: parseFloat(acc.balance) - total }
          : acc
      ));

      setMessage(`✅ Transfer of $${transferAmount.toFixed(2)} successful! Fee: $${fee.toFixed(2)}`);
      setAmount('');
      setToAccountNumber('');
      setTransferDetails({
        recipient_name: '', recipient_email: '', memo: '', routing_number: '',
        bank_name: '', swift_code: '', country: '', purpose: '', recipient_address: ''
      });

      setTimeout(() => router.push('/dashboard'), 3000);

    } catch (error) {
      console.error(error);
      setMessage('Error processing transfer.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const renderTransferFields = () => {
    switch (transferType) {
      case 'internal':
        return (
          <>
            <div style={styles.formGroup}>
              <label>Recipient Name *</label>
              <input type="text" style={styles.input} value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Memo</label>
              <input type="text" style={styles.input} value={transferDetails.memo}
                onChange={(e) => handleTransferDetailsChange('memo', e.target.value)} />
            </div>
          </>
        );
      case 'domestic_external':
        return (
          <>
            <div style={styles.formGroup}>
              <label>Recipient Name *</label>
              <input type="text" style={styles.input} value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Bank Name *</label>
              <input type="text" style={styles.input} value={transferDetails.bank_name}
                onChange={(e) => handleTransferDetailsChange('bank_name', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Routing Number *</label>
              <input type="text" style={styles.input} value={transferDetails.routing_number}
                onChange={(e) => handleTransferDetailsChange('routing_number', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Memo</label>
              <input type="text" style={styles.input} value={transferDetails.memo}
                onChange={(e) => handleTransferDetailsChange('memo', e.target.value)} />
            </div>
          </>
        );
      case 'international':
        return (
          <>
            <div style={styles.formGroup}>
              <label>Recipient Name *</label>
              <input type="text" style={styles.input} value={transferDetails.recipient_name}
                onChange={(e) => handleTransferDetailsChange('recipient_name', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Country *</label>
              <input type="text" style={styles.input} value={transferDetails.country}
                onChange={(e) => handleTransferDetailsChange('country', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>SWIFT Code *</label>
              <input type="text" style={styles.input} value={transferDetails.swift_code}
                onChange={(e) => handleTransferDetailsChange('swift_code', e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label>Purpose *</label>
              <select style={styles.select} value={transferDetails.purpose}
                onChange={(e) => handleTransferDetailsChange('purpose', e.target.value)} required>
                <option value="">Select purpose</option>
                <option value="family_support">Family Support</option>
                <option value="education">Education</option>
                <option value="business">Business</option>
                <option value="investment">Investment</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label>Recipient Address</label>
              <textarea style={styles.input} value={transferDetails.recipient_address}
                onChange={(e) => handleTransferDetailsChange('recipient_address', e.target.value)} />
            </div>
          </>
        );
      default: return null;
    }
  };

  if (pageLoading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Loading...</p>;

  if (!user) return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <p>Please log in to access transfers.</p>
      <Link href="/login">Go to Login</Link>
    </div>
  );

  const selectedAccount = accounts.find(acc => acc.id.toString() === fromAccount);
  const fee = calculateFee();
  const totalAmount = (parseFloat(amount) || 0) + fee;

  return (
    <>
      <Head>
        <title>Transfer Funds - Oakline Bank</title>
      </Head>

      <div style={styles.container}>
        <h1>💸 Transfer Funds</h1>
        {message && <div style={{ margin: '1rem 0', color: message.includes('✅') ? 'green' : 'red' }}>{message}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label>From Account *</label>
            <select value={fromAccount} style={styles.select} onChange={e => setFromAccount(e.target.value)} required>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>Transfer Type *</label>
            <select value={transferType} style={styles.select} onChange={e => setTransferType(e.target.value)}>
              <option value="internal">Internal</option>
              <option value="domestic_external">Domestic</option>
              <option value="international">International</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>To Account Number *</label>
            <input type="text" value={toAccountNumber} style={styles.input} onChange={e => setToAccountNumber(e.target.value)} required />
          </div>

          <div style={styles.formGroup}>
            <label>Amount ($) *</label>
            <input type="number" value={amount} style={styles.input} onChange={e => setAmount(e.target.value)} required />
          </div>

          <div>{renderTransferFields()}</div>

          {fee > 0 && <p>Fee: {formatCurrency(fee)} | Total: {formatCurrency(totalAmount)}</p>}

          <button type="submit" style={styles.submitButton} disabled={loading}>
            {loading ? 'Processing...' : `Transfer ${formatCurrency(parseFloat(amount) || 0)}`}
          </button>
        </form>
      </div>
    </>
  );
}

const styles = {
  container: { maxWidth: '600px', margin: '2rem auto', padding: '1rem', fontFamily: 'Arial, sans-serif' },
  form: { background: '#f9f9f9', padding: '1rem', borderRadius: '12px' },
  formGroup: { marginBottom: '1rem' },
  input: { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' },
  select: { width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #ccc' },
  submitButton: { padding: '0.75rem 1rem', backgroundColor: '#1e40af', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }
};
