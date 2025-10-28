import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

export default function BillPay() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [billerName, setBillerName] = useState('');
  const [category, setCategory] = useState('utilities');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [memo, setMemo] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

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

      const [accountsRes, beneficiariesRes, paymentsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true }),
        supabase
          .from('beneficiaries')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('bill_payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        setAccounts(accountsRes.data);
        setSelectedAccount(accountsRes.data[0].id);
      }

      if (beneficiariesRes.data) {
        setBeneficiaries(beneficiariesRes.data);
      }

      if (paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const account = accounts.find(a => a.id === selectedAccount);
      if (!account) {
        throw new Error('Please select an account');
      }

      if (account.balance < paymentAmount) {
        throw new Error('Insufficient funds in selected account');
      }

      const finalBillerName = selectedBeneficiary 
        ? beneficiaries.find(b => b.id === selectedBeneficiary)?.name 
        : billerName;

      if (!finalBillerName) {
        throw new Error('Please provide a biller name or select a beneficiary');
      }

      const reference = `BP${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const newBalance = parseFloat(account.balance) - paymentAmount;

      const paymentData = {
        user_id: user.id,
        account_id: selectedAccount,
        beneficiary_id: selectedBeneficiary || null,
        biller_name: finalBillerName,
        category: category,
        amount: paymentAmount,
        due_date: dueDate || null,
        scheduled_date: scheduledDate || null,
        payment_status: scheduledDate ? 'pending' : 'completed',
        reference: reference
      };

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('bill_payments')
        .insert([paymentData])
        .select()
        .single();

      if (paymentError) throw paymentError;

      if (!scheduledDate) {
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', selectedAccount)
          .eq('user_id', user.id);

        if (updateError) {
          await supabase.from('bill_payments').delete().eq('id', paymentRecord.id);
          throw new Error('Failed to update account balance. Payment cancelled.');
        }
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: selectedAccount,
          type: 'bill_payment',
          amount: paymentAmount,
          description: `Bill Payment to ${finalBillerName} - ${category}${memo ? ' - ' + memo : ''}`,
          status: scheduledDate ? 'pending' : 'completed',
          reference: reference,
          balance_before: parseFloat(account.balance),
          balance_after: scheduledDate ? parseFloat(account.balance) : newBalance
        }]);

      if (transactionError) {
        if (!scheduledDate) {
          await supabase
            .from('accounts')
            .update({ balance: parseFloat(account.balance), updated_at: new Date().toISOString() })
            .eq('id', selectedAccount)
            .eq('user_id', user.id);
        }
        await supabase.from('bill_payments').delete().eq('id', paymentRecord.id);
        throw new Error('Failed to record transaction. Payment cancelled.');
      }

      const receipt = {
        reference: reference,
        date: new Date().toLocaleString(),
        billerName: finalBillerName,
        category: category,
        amount: paymentAmount,
        account: {
          type: account.account_type,
          number: account.account_number,
          balance: newBalance
        },
        status: scheduledDate ? 'Scheduled' : 'Completed',
        scheduledDate: scheduledDate ? new Date(scheduledDate).toLocaleDateString() : null,
        dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : null,
        memo: memo
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      
      setSelectedBeneficiary('');
      setBillerName('');
      setAmount('');
      setDueDate('');
      setScheduledDate('');
      setMemo('');

      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Payment failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      utilities: '💡',
      internet: '🌐',
      insurance: '🛡️',
      loan: '🏦',
      credit_card: '💳',
      other: '📄'
    };
    return icons[cat] || '📄';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      paddingTop: isMobile ? '1rem' : '2rem',
      paddingBottom: '4rem'
    },
    header: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: 'bold',
      color: 'white',
      textDecoration: 'none'
    },
    backButton: {
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2rem'
    },
    pageTitle: {
      fontSize: isMobile ? '1.5rem' : '2rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '2rem',
      textAlign: 'center'
    },
    contentGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: '2rem',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669'
    },
    cardTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    balanceInfo: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginTop: '1rem',
      border: '1px solid #e2e8f0'
    },
    balanceLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    balanceValue: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    submitButton: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    paymentsList: {
      maxHeight: '600px',
      overflowY: 'auto'
    },
    paymentItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    },
    paymentHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    paymentBiller: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    paymentAmount: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#059669'
    },
    paymentDetails: {
      fontSize: '0.8rem',
      color: '#64748b',
      marginTop: '0.5rem'
    },
    paymentStatus: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      marginTop: '0.5rem',
      color: 'white'
    },
    receiptModal: {
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
      padding: '1rem',
      backdropFilter: 'blur(8px)'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '2.5rem',
      maxWidth: '550px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      border: '2px solid #059669'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '3px solid #059669',
      paddingBottom: '1.5rem',
      marginBottom: '2rem',
      background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
      margin: '-2.5rem -2.5rem 2rem -2.5rem',
      padding: '2rem 2.5rem',
      borderRadius: '18px 18px 0 0',
      color: 'white'
    },
    receiptTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      marginBottom: '0.5rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.75rem 0',
      borderBottom: '1px solid #e2e8f0'
    },
    receiptLabel: {
      fontSize: '0.875rem',
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      fontSize: '0.875rem',
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    },
    receiptButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    receiptButton: {
      flex: 1,
      padding: '1rem',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
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
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.loadingContainer}>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Bill Pay - Oakline Bank</title>
        <meta name="description" content="Pay your bills securely" />
      </Head>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <header style={styles.header}>
          <a href="/dashboard" style={styles.logo}>🏦 Oakline Bank</a>
          <a href="/dashboard" style={styles.backButton}>← Back to Dashboard</a>
        </header>

        <main style={styles.main}>
          <h1 style={styles.pageTitle}>💳 Bill Pay</h1>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: messageType === 'error' ? '#fee2e2' : '#d1fae5',
              color: messageType === 'error' ? '#dc2626' : '#059669',
              borderColor: messageType === 'error' ? '#fca5a5' : '#6ee7b7'
            }}>
              {message}
            </div>
          )}

          {accounts.length === 0 ? (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏦</p>
                <h3 style={{ fontSize: '1.5rem', color: '#1e293b', marginBottom: '1rem' }}>No Active Accounts</h3>
                <p>You need an active account to pay bills. Please contact support.</p>
              </div>
            </div>
          ) : (
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Make a Payment</h2>
                <form onSubmit={handleSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>From Account *</label>
                    <select
                      style={styles.select}
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      required
                    >
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_type?.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Select Beneficiary (Optional)</label>
                    <select
                      style={styles.select}
                      value={selectedBeneficiary}
                      onChange={(e) => setSelectedBeneficiary(e.target.value)}
                    >
                      <option value="">-- Enter manually below --</option>
                      {beneficiaries.map(ben => (
                        <option key={ben.id} value={ben.id}>{ben.name}</option>
                      ))}
                    </select>
                  </div>

                  {!selectedBeneficiary && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Biller Name *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={billerName}
                        onChange={(e) => setBillerName(e.target.value)}
                        placeholder="e.g., Electric Company"
                        required={!selectedBeneficiary}
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Category</label>
                    <select
                      style={styles.select}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="utilities">💡 Utilities</option>
                      <option value="internet">🌐 Internet</option>
                      <option value="insurance">🛡️ Insurance</option>
                      <option value="loan">🏦 Loan</option>
                      <option value="credit_card">💳 Credit Card</option>
                      <option value="other">📄 Other</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Amount ($) *</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Due Date (Optional)</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Schedule Payment For (Optional)</label>
                    <input
                      type="date"
                      style={styles.input}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <small style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                      Leave blank to pay immediately
                    </small>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Memo (Optional)</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="Payment note"
                      maxLength="100"
                    />
                  </div>

                  {selectedAccount && (
                    <div style={styles.balanceInfo}>
                      <div style={styles.balanceLabel}>Available Balance</div>
                      <div style={styles.balanceValue}>
                        {formatCurrency(accounts.find(a => a.id === selectedAccount)?.balance || 0)}
                      </div>
                      {amount && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          Balance after payment: {formatCurrency(
                            parseFloat(accounts.find(a => a.id === selectedAccount)?.balance || 0) - parseFloat(amount || 0)
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{
                      ...styles.submitButton,
                      opacity: loading ? 0.7 : 1,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                    disabled={loading}
                  >
                    {loading ? '🔄 Processing...' : `💸 Pay ${formatCurrency(parseFloat(amount) || 0)}`}
                  </button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Payment History</h2>
                <div style={styles.paymentsList}>
                  {payments.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p style={{ fontSize: '2rem' }}>📋</p>
                      <p>No payment history yet</p>
                    </div>
                  ) : (
                    payments.map(payment => (
                      <div key={payment.id} style={styles.paymentItem}>
                        <div style={styles.paymentHeader}>
                          <div>
                            <div style={styles.paymentBiller}>
                              {getCategoryIcon(payment.category)} {payment.biller_name}
                            </div>
                            <div style={styles.paymentDetails}>
                              Ref: {payment.reference}
                            </div>
                            <div style={styles.paymentDetails}>
                              {new Date(payment.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={styles.paymentAmount}>
                              {formatCurrency(payment.amount)}
                            </div>
                            <div style={{
                              ...styles.paymentStatus,
                              backgroundColor: getStatusColor(payment.payment_status)
                            }}>
                              {payment.payment_status?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        {payment.scheduled_date && (
                          <div style={styles.paymentDetails}>
                            Scheduled: {new Date(payment.scheduled_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showReceipt && receiptData && (
        <div style={styles.receiptModal} onClick={() => setShowReceipt(false)}>
          <div style={styles.receipt} onClick={(e) => e.stopPropagation()}>
            <div style={styles.receiptHeader}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
              <div style={styles.receiptTitle}>Payment {receiptData.status}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Oakline Bank</div>
            </div>

            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Reference</span>
              <span style={styles.receiptValue}>{receiptData.reference}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Date & Time</span>
              <span style={styles.receiptValue}>{receiptData.date}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Biller</span>
              <span style={styles.receiptValue}>{receiptData.billerName}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Category</span>
              <span style={styles.receiptValue}>{getCategoryIcon(receiptData.category)} {receiptData.category}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Amount</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.amount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>From Account</span>
              <span style={styles.receiptValue}>{receiptData.account.type?.toUpperCase()} - {receiptData.account.number}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>New Balance</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.account.balance)}</span>
            </div>
            {receiptData.scheduledDate && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Scheduled For</span>
                <span style={styles.receiptValue}>{receiptData.scheduledDate}</span>
              </div>
            )}
            {receiptData.dueDate && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Due Date</span>
                <span style={styles.receiptValue}>{receiptData.dueDate}</span>
              </div>
            )}
            {receiptData.memo && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Memo</span>
                <span style={styles.receiptValue}>{receiptData.memo}</span>
              </div>
            )}

            <div style={styles.receiptButtons}>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#059669',
                  color: 'white'
                }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
              <button
                style={{
                  ...styles.receiptButton,
                  backgroundColor: '#1a365d',
                  color: 'white'
                }}
                onClick={() => setShowReceipt(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
