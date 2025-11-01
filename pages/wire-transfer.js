import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

// Dummy RecentTransfers component for demonstration purposes
const RecentTransfers = ({ user, isMobile }) => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransfers = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data } = await supabase
          .from('wire_transfers') // Assuming this is the correct table for transfers
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5); // Limiting to recent ones
        setTransfers(data || []);
      } catch (error) {
        console.error('Error fetching recent transfers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, [user]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading) return <div style={styles.historyCard}><p style={styles.emptyText}>Loading recent transfers...</p></div>;
  if (transfers.length === 0) return <div style={styles.historyCard}><p style={styles.emptyText}>No recent transfers found.</p></div>;

  return (
    <div style={styles.historyCard}>
      <h3 style={styles.sectionTitle}>Recent Transfers</h3>
      <div style={styles.historyList}>
        {transfers.map(wire => (
          <div key={wire.id} style={styles.historyItem}>
            <div style={styles.historyInfo}>
              <div style={styles.historyName}>{wire.beneficiary_name}</div>
              <div style={styles.historyBank}>{wire.beneficiary_bank}</div>
              <div style={styles.historyDate}>
                {new Date(wire.created_at).toLocaleDateString()}
              </div>
            </div>
            <div style={styles.historyRight}>
              <div style={styles.historyAmount}>{formatCurrency(wire.amount)}</div>
              <div style={{
                ...styles.historyStatus,
                color: wire.status === 'completed' ? '#059669' :
                       wire.status === 'pending' ? '#ea580c' : '#dc2626'
              }}>
                {wire.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default function WireTransferPage() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [wireTransfers, setWireTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const router = useRouter();

  const [wireForm, setWireForm] = useState({
    from_account: '',
    beneficiary_name: '',
    beneficiary_bank: '',
    routing_number: '',
    account_number: '',
    swift_code: '',
    amount: '',
    memo: '',
    phone_number: '' // Added for apply.js related change
  });

  // Check for isMobile based on screen width or user agent if needed
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setWireForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      const { data: wires } = await supabase
        .from('wire_transfers')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setWireTransfers(wires || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!wireForm.from_account || !wireForm.beneficiary_name || !wireForm.beneficiary_bank ||
        !wireForm.routing_number || !wireForm.account_number || !wireForm.amount) {
      setMessage('❌ Please fill in all required fields');
      return;
    }
    setStep(2);
  };

  const sendVerificationCode = async () => {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer'
        })
      });

      if (!response.ok) throw new Error('Failed to send code');

      setShowVerificationModal(true);
      setMessage('✅ Verification code sent to your email');
    } catch (error) {
      setMessage('❌ Error sending verification code');
    }
  };

  const completeWireTransfer = async () => {
    if (verificationCode !== sentCode) {
      setMessage('❌ Invalid verification code');
      return;
    }

    setLoading(true);
    try {
      const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
      const amount = parseFloat(wireForm.amount);

      if (amount > parseFloat(selectedAccount.balance)) {
        setMessage('❌ Insufficient funds');
        setLoading(false);
        return;
      }

      // Create wire transfer record
      const { data: wireTransfer, error: wireError } = await supabase
        .from('wire_transfers')
        .insert([{
          user_id: user.id,
          from_account_id: wireForm.from_account,
          beneficiary_name: wireForm.beneficiary_name,
          beneficiary_bank: wireForm.beneficiary_bank,
          routing_number: wireForm.routing_number,
          account_number: wireForm.account_number,
          swift_code: wireForm.swift_code || null,
          amount: amount,
          memo: wireForm.memo,
          status: 'completed',
          reference_number: `WIRE${Date.now()}${Math.floor(Math.random() * 10000)}`
        }])
        .select()
        .single();

      if (wireError) throw wireError;

      // Deduct from sender account
      const balanceBefore = parseFloat(selectedAccount.balance);
      const newBalance = balanceBefore - amount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wireForm.from_account);

      // Create transaction record
      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account,
        type: 'debit',
        amount: amount,
        description: `Wire transfer to ${wireForm.beneficiary_name} - ${wireForm.beneficiary_bank}`,
        status: 'completed',
        reference: wireTransfer.reference_number,
        balance_before: balanceBefore,
        balance_after: newBalance
      }]);

      // Create notification
      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'wire_transfer',
        title: 'Wire Transfer Completed',
        message: `You sent ${formatCurrency(amount)} to ${wireForm.beneficiary_name} via wire transfer`
      }]);

      setMessage('✅ Wire transfer completed successfully!');
      setShowVerificationModal(false);
      setStep(1);
      setWireForm({
        from_account: wireForm.from_account,
        beneficiary_name: '',
        beneficiary_bank: '',
        routing_number: '',
        account_number: '',
        swift_code: '',
        amount: '',
        memo: '',
        phone_number: '' // Reset phone number
      });
      setVerificationCode('');
      setSentCode('');

      setTimeout(() => {
        checkUserAndLoadData();
      }, 1000);

    } catch (error) {
      setMessage(`❌ ${error.message}`);
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

  if (loading && !user) {
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
        <title>Wire Transfer - Oakline Bank</title>
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
          <div style={styles.titleSection}>
            <h1 style={styles.title}>🌐 Wire Transfer</h1>
            <p style={styles.subtitle}>Send money domestically or internationally</p>
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

          {/* Progress Steps */}
          <div style={styles.steps}>
            <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepLabel}>Details</div>
            </div>
            <div style={styles.stepLine}></div>
            <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepLabel}>Review</div>
            </div>
            <div style={styles.stepLine}></div>
            <div style={{ ...styles.stepItem, ...(step >= 3 ? styles.stepActive : {}) }}>
              <div style={styles.stepNumber}>3</div>
              <div style={styles.stepLabel}>Verify</div>
            </div>
          </div>

          {/* Step 1: Wire Details */}
          {step === 1 && (
            <div style={styles.formCard}>
              <h3 style={styles.sectionTitle}>Wire Transfer Details</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>From Account *</label>
                <select
                  style={styles.select}
                  value={wireForm.from_account}
                  onChange={(e) => setWireForm(prev => ({ ...prev, from_account: e.target.value }))}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Beneficiary Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_name}
                  onChange={(e) => setWireForm(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Beneficiary Bank *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_bank}
                  onChange={(e) => setWireForm(prev => ({ ...prev, beneficiary_bank: e.target.value }))}
                  placeholder="Bank of America"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Routing Number *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.routing_number}
                    onChange={(e) => setWireForm(prev => ({ ...prev, routing_number: e.target.value }))}
                    placeholder="123456789"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Number *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.account_number}
                    onChange={(e) => setWireForm(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SWIFT Code (International)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.swift_code}
                    onChange={(e) => setWireForm(prev => ({ ...prev, swift_code: e.target.value }))}
                    placeholder="BOFAUS3N"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount *</label>
                  <input
                    type="text" // Changed to text to accept any number format
                    style={styles.input}
                    value={wireForm.amount}
                    onChange={(e) => setWireForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.memo}
                  onChange={(e) => setWireForm(prev => ({ ...prev, memo: e.target.value }))}
                  placeholder="Payment for invoice #1234"
                />
              </div>

              {/* Phone Number Input for apply.js related change (assuming it's relevant here) */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Phone Number (for verification)</label>
                <input
                  type="text" // Changed to text to accept any number format
                  style={styles.input}
                  value={wireForm.phone_number}
                  onChange={(e) => setWireForm(prev => ({ ...prev, phone_number: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <button
                style={styles.primaryButton}
                onClick={handleNext}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
              >
                Continue to Review →
              </button>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div style={styles.formCard}>
              <h3 style={styles.sectionTitle}>Review Wire Transfer</h3>

              <div style={styles.reviewSection}>
                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>From Account:</span>
                  <span style={styles.reviewValue}>
                    {accounts.find(acc => acc.id === wireForm.from_account)?.account_type?.toUpperCase()} -
                    ****{accounts.find(acc => acc.id === wireForm.from_account)?.account_number?.slice(-4)}
                  </span>
                </div>

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Beneficiary:</span>
                  <span style={styles.reviewValue}>{wireForm.beneficiary_name}</span>
                </div>

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Bank:</span>
                  <span style={styles.reviewValue}>{wireForm.beneficiary_bank}</span>
                </div>

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Routing Number:</span>
                  <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                </div>

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Account Number:</span>
                  <span style={styles.reviewValue}>****{wireForm.account_number.slice(-4)}</span>
                </div>

                {wireForm.swift_code && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>SWIFT Code:</span>
                    <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                  </div>
                )}

                <div style={styles.reviewRow}>
                  <span style={styles.reviewLabel}>Amount:</span>
                  <span style={styles.reviewValue}>{formatCurrency(wireForm.amount)}</span>
                </div>

                {wireForm.memo && (
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Memo:</span>
                    <span style={styles.reviewValue}>{wireForm.memo}</span>
                  </div>
                )}
              </div>

              <div style={styles.buttonRow}>
                <button style={styles.backButton} onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button
                  style={styles.primaryButton}
                  onClick={sendVerificationCode}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
                >
                  Send Verification Code
                </button>
              </div>
            </div>
          )}

          {/* Wire Transfer History - This section will now be below RecentTransfers */}
          <div style={styles.historyCard}>
            <h3 style={styles.sectionTitle}>Wire Transfer History</h3>
            {wireTransfers.length === 0 ? (
              <p style={styles.emptyText}>No wire transfers yet</p>
            ) : (
              <div style={styles.historyList}>
                {wireTransfers.map(wire => (
                  <div key={wire.id} style={styles.historyItem}>
                    <div style={styles.historyInfo}>
                      <div style={styles.historyName}>{wire.beneficiary_name}</div>
                      <div style={styles.historyBank}>{wire.beneficiary_bank}</div>
                      <div style={styles.historyDate}>
                        {new Date(wire.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={styles.historyRight}>
                      <div style={styles.historyAmount}>{formatCurrency(wire.amount)}</div>
                      <div style={{
                        ...styles.historyStatus,
                        color: wire.status === 'completed' ? '#059669' :
                               wire.status === 'pending' ? '#ea580c' : '#dc2626'
                      }}>
                        {wire.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Transfers Component - Moved to the bottom */}
        <RecentTransfers user={user} isMobile={isMobile} />

        {/* Verification Modal */}
        {showVerificationModal && (
          <div style={styles.modalOverlay} onClick={() => setShowVerificationModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Enter Verification Code</h2>
              <p style={styles.modalText}>We sent a 6-digit code to {user.email}</p>
              <input
                type="text"
                style={styles.verificationInput}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="000000"
                maxLength="6"
              />
              <div style={styles.modalButtons}>
                <button style={styles.cancelButton} onClick={() => setShowVerificationModal(false)}>
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={completeWireTransfer}
                  disabled={loading}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#1e3a8a')}
                  onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#1e40af')}
                >
                  {loading ? 'Processing...' : 'Complete Transfer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#0a1a2f',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(10, 26, 47, 0.25)'
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
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)'
  },
  content: {
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid'
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2rem',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: 0.5
  },
  stepActive: {
    opacity: 1
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#d4af37',
    color: '#0a1a2f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  stepLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  stepLine: {
    width: '80px',
    height: '2px',
    backgroundColor: '#e2e8f0',
    margin: '0 1rem'
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem',
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '1rem'
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
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: 'white'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem'
  },
  reviewSection: {
    marginBottom: '2rem'
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  reviewLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  reviewValue: {
    fontSize: '0.9rem',
    color: '#0a1a2f',
    fontWeight: '600'
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginTop: '2rem' // Add margin to separate from form card
  },
  historyList: {
    display: 'grid',
    gap: '1rem'
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0'
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  historyName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  historyBank: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  historyDate: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  historyRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  historyAmount: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#0a1a2f'
  },
  historyStatus: {
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: '2rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1rem'
  },
  modalText: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  verificationInput: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1.5rem',
    textAlign: 'center',
    letterSpacing: '0.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    boxSizing: 'border-box'
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem'
  },
  cancelButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#f1f5f9',
    color: '#0a1a2f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  confirmButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)'
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
    borderTop: '3px solid #0a1a2f',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  }
};