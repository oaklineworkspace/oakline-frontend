
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function BillPay() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [payees, setPayees] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedPayee, setSelectedPayee] = useState('');
  const [newPayee, setNewPayee] = useState({
    name: '',
    address: '',
    phone: '',
    accountNumber: ''
  });
  const [paymentData, setPaymentData] = useState({
    amount: '',
    memo: '',
    scheduledDate: new Date().toISOString().split('T')[0]
  });
  const [showAddPayee, setShowAddPayee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
      await fetchUserData(user);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    }
  };

  const fetchUserData = async (user) => {
    try {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .or(`user_id.eq.${user.id},user_email.eq.${user.email},email.eq.${user.email}`)
        .in('account_type', ['checking', 'savings']);

      if (accountsData && accountsData.length > 0) {
        setAccounts(accountsData);
        setSelectedAccount(accountsData[0].id.toString());
      }

      // Initialize common payees
      setPayees([
        { id: 'electric', name: 'Electric Company', category: 'Utilities' },
        { id: 'gas', name: 'Gas Company', category: 'Utilities' },
        { id: 'water', name: 'Water Department', category: 'Utilities' },
        { id: 'internet', name: 'Internet Provider', category: 'Utilities' },
        { id: 'phone', name: 'Phone Company', category: 'Utilities' },
        { id: 'credit_card', name: 'Credit Card Payment', category: 'Credit Cards' },
        { id: 'mortgage', name: 'Mortgage Company', category: 'Loans' },
        { id: 'insurance', name: 'Insurance Company', category: 'Insurance' }
      ]);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleAddPayee = () => {
    if (!newPayee.name) {
      setMessage('Please enter payee name');
      return;
    }

    const payeeId = `custom_${Date.now()}`;
    const newPayeeData = {
      id: payeeId,
      name: newPayee.name,
      category: 'Custom',
      address: newPayee.address,
      phone: newPayee.phone,
      accountNumber: newPayee.accountNumber
    };

    setPayees([...payees, newPayeeData]);
    setSelectedPayee(payeeId);
    setShowAddPayee(false);
    setNewPayee({ name: '', address: '', phone: '', accountNumber: '' });
    setMessage('✅ Payee added successfully');
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (!selectedAccount || !selectedPayee || !paymentData.amount) {
      setMessage('Please fill all required fields');
      return;
    }

    if (parseFloat(paymentData.amount) <= 0) {
      setMessage('Amount must be greater than 0');
      return;
    }

    setLoading(true);

    try {
      const selectedAccountData = accounts.find(acc => acc.id.toString() === selectedAccount);
      const selectedPayeeData = payees.find(p => p.id === selectedPayee);
      
      // Create bill payment transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            user_email: user.email,
            account_id: selectedAccount,
            account_type: selectedAccountData?.account_type || 'checking',
            amount: -parseFloat(paymentData.amount), // Negative for payment
            transaction_type: 'bill_payment',
            description: `Bill Payment to ${selectedPayeeData?.name}${paymentData.memo ? ` - ${paymentData.memo}` : ''}`,
            status: 'pending',
            category: 'bill_payment',
            created_at: new Date(paymentData.scheduledDate).toISOString(),
            metadata: {
              payee: selectedPayeeData?.name,
              scheduledDate: paymentData.scheduledDate,
              memo: paymentData.memo
            }
          }
        ])
        .select()
        .single();

      if (transactionError) throw transactionError;

      setMessage(`✅ Bill payment scheduled successfully! Payment of $${paymentData.amount} to ${selectedPayeeData?.name} will be processed on ${paymentData.scheduledDate}.`);
      
      // Reset form
      setPaymentData({
        amount: '',
        memo: '',
        scheduledDate: new Date().toISOString().split('T')[0]
      });
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (error) {
      console.error('Error processing payment:', error);
      setMessage('❌ Error processing payment. Please try again.');
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/" style={styles.logoContainer}>
          <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
          <span style={styles.logoText}>Oakline Bank</span>
        </Link>
        <div style={styles.headerInfo}>
          <div style={styles.routingInfo}>Routing Number: 075915826</div>
          <Link href="/dashboard" style={styles.backButton}>← Back to Dashboard</Link>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>🧾 Bill Pay</h1>
          <p style={styles.subtitle}>Pay your bills securely and on time</p>
        </div>

        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>💡 Bill Pay Features</h3>
          <div style={styles.featureGrid}>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📅</span>
              <span>Schedule Future Payments</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🔄</span>
              <span>Set Recurring Payments</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>📧</span>
              <span>Email Confirmations</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureIcon}>🔒</span>
              <span>Secure Processing</span>
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
            color: message.includes('✅') ? '#155724' : '#721c24',
            borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handlePayment} style={styles.form}>
          <h3 style={styles.formTitle}>Pay a Bill</h3>

          <div style={styles.formGroup}>
            <label style={styles.label}>Pay From Account *</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              style={styles.select}
              required
            >
              <option value="">Select Account</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.account_name || account.account_type?.replace('_', ' ')?.toUpperCase()} - 
                  ****{account.account_number?.slice(-4)} - 
                  {formatCurrency(account.balance || 0)}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Pay To *</label>
            <div style={styles.payeeSection}>
              <select
                value={selectedPayee}
                onChange={(e) => setSelectedPayee(e.target.value)}
                style={styles.select}
                required
              >
                <option value="">Select Payee</option>
                {payees.map(payee => (
                  <option key={payee.id} value={payee.id}>
                    {payee.name} {payee.category && `(${payee.category})`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowAddPayee(!showAddPayee)}
                style={styles.addPayeeButton}
              >
                + Add New Payee
              </button>
            </div>
          </div>

          {showAddPayee && (
            <div style={styles.addPayeeForm}>
              <h4 style={styles.addPayeeTitle}>Add New Payee</h4>
              <div style={styles.payeeGrid}>
                <input
                  type="text"
                  placeholder="Payee Name *"
                  value={newPayee.name}
                  onChange={(e) => setNewPayee({...newPayee, name: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={newPayee.address}
                  onChange={(e) => setNewPayee({...newPayee, address: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={newPayee.phone}
                  onChange={(e) => setNewPayee({...newPayee, phone: e.target.value})}
                  style={styles.input}
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={newPayee.accountNumber}
                  onChange={(e) => setNewPayee({...newPayee, accountNumber: e.target.value})}
                  style={styles.input}
                />
              </div>
              <div style={styles.payeeActions}>
                <button type="button" onClick={handleAddPayee} style={styles.savePayeeButton}>
                  Save Payee
                </button>
                <button type="button" onClick={() => setShowAddPayee(false)} style={styles.cancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                style={styles.input}
                placeholder="0.00"
                required
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Payment Date *</label>
              <input
                type="date"
                value={paymentData.scheduledDate}
                onChange={(e) => setPaymentData({...paymentData, scheduledDate: e.target.value})}
                style={styles.input}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Memo (Optional)</label>
            <input
              type="text"
              value={paymentData.memo}
              onChange={(e) => setPaymentData({...paymentData, memo: e.target.value})}
              style={styles.input}
              placeholder="Payment reference or notes"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '🔄 Processing...' : '💳 Schedule Payment'}
          </button>
        </form>

        <div style={styles.securityNote}>
          <h4 style={styles.securityTitle}>🔒 Security Information</h4>
          <ul style={styles.securityList}>
            <li>All bill payments are processed securely through encrypted channels</li>
            <li>Payments scheduled after 3 PM may be processed the next business day</li>
            <li>You can cancel or modify scheduled payments up to 1 business day before the payment date</li>
            <li>Confirmation emails will be sent for all successful payments</li>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1e40af',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'white'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  headerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem'
  },
  routingInfo: {
    fontSize: '0.9rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: '0.5rem 1rem',
    borderRadius: '6px'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    border: '1px solid rgba(255,255,255,0.3)'
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '2rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b'
  },
  infoCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '16px',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  infoTitle: {
    color: '#1e40af',
    marginBottom: '1.5rem',
    fontSize: '1.2rem'
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px'
  },
  featureIcon: {
    fontSize: '1.2rem'
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '16px',
    marginBottom: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  formTitle: {
    color: '#1e40af',
    marginBottom: '1.5rem',
    fontSize: '1.3rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr'
    }
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
    fontSize: '1rem',
    backgroundColor: 'white',
    boxSizing: 'border-box'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  payeeSection: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'end',
    flexWrap: 'wrap'
  },
  addPayeeButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    whiteSpace: 'nowrap'
  },
  addPayeeForm: {
    backgroundColor: '#f8fafc',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    border: '2px solid #e2e8f0'
  },
  addPayeeTitle: {
    color: '#374151',
    marginBottom: '1rem',
    fontSize: '1rem'
  },
  payeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem'
  },
  payeeActions: {
    display: 'flex',
    gap: '1rem'
  },
  savePayeeButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
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
    marginBottom: '2rem',
    fontSize: '0.9rem'
  },
  securityNote: {
    backgroundColor: '#fffbeb',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '2px solid #fbbf24'
  },
  securityTitle: {
    color: '#92400e',
    marginBottom: '1rem',
    fontSize: '1rem'
  },
  securityList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#92400e',
    lineHeight: '1.6'
  }
};
