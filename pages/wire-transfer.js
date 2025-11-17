import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';

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

export default function WireTransfer() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [wireForm, setWireForm] = useState({
    from_account_id: '',
    transfer_type: 'domestic',
    recipient_first_name: '',
    recipient_middle_name: '',
    recipient_last_name: '',
    recipient_account: '',
    recipient_bank: '',
    recipient_bank_address: '',
    recipient_bank_city: '',
    recipient_bank_state: '',
    recipient_bank_zip: '',
    recipient_bank_country: 'United States',
    swift_code: '',
    routing_number: '',
    amount: '',
    description: '',
    urgent_transfer: false,
    fee: 15.00,
    urgent_fee: 10.00,
    total_amount: 0
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

      const [accountsRes, transfersRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true }),
        supabase
          .from('wire_transfers')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (accountsRes.data && accountsRes.data.length > 0) {
        setAccounts(accountsRes.data);
        setWireForm(prev => ({ ...prev, from_account_id: accountsRes.data[0].id }));
      }

      if (transfersRes.data) {
        setTransfers(transfersRes.data);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setPageLoading(false);
    }
  };

  const calculateTotal = () => {
    const amount = parseFloat(wireForm.amount) || 0;
    const baseFee = wireForm.transfer_type === 'international' ? 25 : 15;
    const urgentFee = wireForm.urgent_transfer ? 10 : 0;
    const totalFee = baseFee + urgentFee;
    const total = amount + totalFee;

    setWireForm(prev => ({
      ...prev,
      fee: baseFee,
      urgent_fee: urgentFee,
      total_amount: total
    }));
  };

  useEffect(() => {
    calculateTotal();
  }, [wireForm.amount, wireForm.transfer_type, wireForm.urgent_transfer]);

  const handleInputChange = (field, value) => {
    setWireForm(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const sendVerificationCode = async () => {
    setSendingCode(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const { data: { session } } = await supabase.auth.getSession();

      await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer'
        })
      });

      setMessage('Verification code sent to your email');
      setMessageType('success');
    } catch (error) {
      console.error('Error sending code:', error);
      setMessage('Failed to send verification code');
      setMessageType('error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (!wireForm.from_account_id) {
        throw new Error('Please select a source account');
      }

      if (!wireForm.recipient_first_name || !wireForm.recipient_last_name) {
        throw new Error('Please enter recipient first and last name');
      }

      if (!wireForm.recipient_account || !wireForm.recipient_bank) {
        throw new Error('Please fill in all recipient bank details');
      }

      if (!wireForm.recipient_bank_address || !wireForm.recipient_bank_city) {
        throw new Error('Please enter complete bank address');
      }

      if (wireForm.transfer_type === 'international' && !wireForm.swift_code) {
        throw new Error('SWIFT code is required for international transfers');
      }

      if (wireForm.transfer_type === 'domestic' && !wireForm.routing_number) {
        throw new Error('Routing number is required for domestic transfers');
      }

      const amount = parseFloat(wireForm.amount);
      if (!amount || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      const account = accounts.find(a => a.id === wireForm.from_account_id);
      if (parseFloat(account.balance) < wireForm.total_amount) {
        throw new Error('Insufficient funds (including fees)');
      }

      if (verificationCode !== sentCode) {
        throw new Error('Invalid verification code');
      }

      const recipientFullName = `${wireForm.recipient_first_name} ${wireForm.recipient_middle_name ? wireForm.recipient_middle_name + ' ' : ''}${wireForm.recipient_last_name}`;
      const reference = `WIRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const transferData = {
        user_id: user.id,
        from_account_id: wireForm.from_account_id,
        transfer_type: wireForm.transfer_type,
        recipient_name: recipientFullName,
        recipient_account: wireForm.recipient_account,
        recipient_bank: wireForm.recipient_bank,
        recipient_bank_address: `${wireForm.recipient_bank_address}, ${wireForm.recipient_bank_city}, ${wireForm.recipient_bank_state} ${wireForm.recipient_bank_zip}, ${wireForm.recipient_bank_country}`,
        swift_code: wireForm.swift_code || null,
        routing_number: wireForm.routing_number || null,
        amount: parseFloat(wireForm.amount),
        fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
        total_amount: wireForm.total_amount,
        urgent_transfer: wireForm.urgent_transfer,
        description: wireForm.description || null,
        status: 'pending',
        reference: reference,
        verification_code: verificationCode,
        verified_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('wire_transfers')
        .insert([transferData])
        .select()
        .single();

      if (error) throw error;

      const newBalance = parseFloat(account.balance) - wireForm.total_amount;

      const { error: balanceError } = await supabase
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', wireForm.from_account_id);

      if (balanceError) throw balanceError;

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account_id,
        type: 'wire_transfer',
        amount: wireForm.total_amount,
        description: `Wire transfer to ${recipientFullName} at ${wireForm.recipient_bank} - ${wireForm.transfer_type}`,
        status: 'pending',
        reference: reference
      }]);

      const receipt = {
        reference: reference,
        date: new Date().toLocaleString(),
        recipientName: recipientFullName,
        recipientBank: wireForm.recipient_bank,
        transferType: wireForm.transfer_type,
        amount: wireForm.amount,
        fee: wireForm.fee + (wireForm.urgent_transfer ? wireForm.urgent_fee : 0),
        totalAmount: wireForm.total_amount,
        account: {
          type: account.account_type,
          number: account.account_number,
          balance: newBalance
        },
        urgent: wireForm.urgent_transfer,
        description: wireForm.description
      };

      setReceiptData(receipt);
      setShowReceipt(true);

      setWireForm({
        from_account_id: accounts[0]?.id || '',
        transfer_type: 'domestic',
        recipient_first_name: '',
        recipient_middle_name: '',
        recipient_last_name: '',
        recipient_account: '',
        recipient_bank: '',
        recipient_bank_address: '',
        recipient_bank_city: '',
        recipient_bank_state: '',
        recipient_bank_zip: '',
        recipient_bank_country: 'United States',
        swift_code: '',
        routing_number: '',
        amount: '',
        description: '',
        urgent_transfer: false,
        fee: 15.00,
        urgent_fee: 10.00,
        total_amount: 0
      });
      setVerificationCode('');
      setSentCode('');

      await checkUserAndFetchData();

    } catch (error) {
      setMessage(error.message || 'Wire transfer failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
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
    formGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap: '1rem',
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
    checkboxContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '10px',
      border: '2px solid #e2e8f0',
      cursor: 'pointer',
      marginBottom: '1rem'
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer'
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
    transfersList: {
      maxHeight: '600px',
      overflowY: 'auto'
    },
    transferItem: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '1px solid #e2e8f0'
    },
    transferHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'start',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    transferRecipient: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    transferAmount: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: '#059669'
    },
    transferDetails: {
      fontSize: '0.8rem',
      color: '#64748b',
      marginTop: '0.5rem'
    },
    transferStatus: {
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
        <title>Wire Transfer - Oakline Bank</title>
        <meta name="description" content="Send wire transfers securely" />
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
          <h1 style={styles.pageTitle}>🌐 Wire Transfer</h1>

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
                <p>You need an active account to send wire transfers. Please contact support.</p>
              </div>
            </div>
          ) : (
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Send Wire Transfer</h2>
                <form onSubmit={handleSubmit}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Transfer Type *</label>
                    <select
                      style={styles.select}
                      value={wireForm.transfer_type}
                      onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                      required
                    >
                      <option value="domestic">🇺🇸 Domestic (US)</option>
                      <option value="international">🌍 International</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>From Account *</label>
                    <select
                      style={styles.select}
                      value={wireForm.from_account_id}
                      onChange={(e) => handleInputChange('from_account_id', e.target.value)}
                      required
                    >
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.account_type?.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>First Name *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_first_name}
                        onChange={(e) => handleInputChange('recipient_first_name', e.target.value)}
                        placeholder="John"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Middle Name</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_middle_name}
                        onChange={(e) => handleInputChange('recipient_middle_name', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Last Name *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_last_name}
                        onChange={(e) => handleInputChange('recipient_last_name', e.target.value)}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Name *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.recipient_bank}
                      onChange={(e) => handleInputChange('recipient_bank', e.target.value)}
                      placeholder="e.g., Chase Bank"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Account Number *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.recipient_account}
                      onChange={(e) => handleInputChange('recipient_account', e.target.value)}
                      placeholder="Account number"
                      required
                    />
                  </div>

                  {wireForm.transfer_type === 'international' ? (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>SWIFT/BIC Code *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.swift_code}
                        onChange={(e) => handleInputChange('swift_code', e.target.value.toUpperCase())}
                        placeholder="e.g., CHASUS33XXX"
                        maxLength="11"
                        required
                      />
                    </div>
                  ) : (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Routing Number *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.routing_number}
                        onChange={(e) => handleInputChange('routing_number', e.target.value)}
                        placeholder="9-digit routing number"
                        maxLength="9"
                        required
                      />
                    </div>
                  )}

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Street Address *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.recipient_bank_address}
                      onChange={(e) => handleInputChange('recipient_bank_address', e.target.value)}
                      placeholder="Bank street address"
                      required
                    />
                  </div>

                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>City *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_bank_city}
                        onChange={(e) => handleInputChange('recipient_bank_city', e.target.value)}
                        placeholder="City"
                        required
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>State</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_bank_state}
                        onChange={(e) => handleInputChange('recipient_bank_state', e.target.value)}
                        placeholder="State"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.recipient_bank_zip}
                        onChange={(e) => handleInputChange('recipient_bank_zip', e.target.value)}
                        placeholder="ZIP"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Amount ($) *</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={wireForm.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Description (Optional)</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Payment purpose"
                      maxLength="100"
                    />
                  </div>

                  <div 
                    style={styles.checkboxContainer}
                    onClick={() => handleInputChange('urgent_transfer', !wireForm.urgent_transfer)}
                  >
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={wireForm.urgent_transfer}
                      onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                    />
                    <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1e293b', cursor: 'pointer' }}>
                      ⚡ Expedited Processing (+$10.00)
                    </label>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Verification Code *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      maxLength="6"
                      required
                    />
                    <button
                      type="button"
                      onClick={sendVerificationCode}
                      disabled={sendingCode}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: sendingCode ? '#cbd5e1' : '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        cursor: sendingCode ? 'not-allowed' : 'pointer',
                        width: '100%'
                      }}
                    >
                      {sendingCode ? 'Sending...' : 'Send Code'}
                    </button>
                  </div>

                  {wireForm.from_account_id && (
                    <div style={styles.balanceInfo}>
                      <div style={styles.balanceLabel}>Available Balance</div>
                      <div style={styles.balanceValue}>
                        {formatCurrency(accounts.find(a => a.id === wireForm.from_account_id)?.balance || 0)}
                      </div>
                      {wireForm.amount && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                          Total with fees: {formatCurrency(wireForm.total_amount)}<br/>
                          Balance after: {formatCurrency(
                            parseFloat(accounts.find(a => a.id === wireForm.from_account_id)?.balance || 0) - wireForm.total_amount
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
                    {loading ? '🔄 Processing...' : `💸 Send ${formatCurrency(wireForm.total_amount)}`}
                  </button>
                </form>
              </div>

              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Transfer History</h2>
                <div style={styles.transfersList}>
                  {transfers.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p style={{ fontSize: '2rem' }}>📋</p>
                      <p>No transfer history yet</p>
                    </div>
                  ) : (
                    transfers.map(transfer => (
                      <div key={transfer.id} style={styles.transferItem}>
                        <div style={styles.transferHeader}>
                          <div>
                            <div style={styles.transferRecipient}>
                              {transfer.transfer_type === 'domestic' ? '🇺🇸' : '🌍'} {transfer.recipient_name}
                            </div>
                            <div style={styles.transferDetails}>
                              {transfer.recipient_bank}
                            </div>
                            <div style={styles.transferDetails}>
                              Ref: {transfer.reference}
                            </div>
                            <div style={styles.transferDetails}>
                              {new Date(transfer.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={styles.transferAmount}>
                              {formatCurrency(transfer.total_amount)}
                            </div>
                            <div style={{
                              ...styles.transferStatus,
                              backgroundColor: getStatusColor(transfer.status)
                            }}>
                              {transfer.status?.toUpperCase()}
                            </div>
                          </div>
                        </div>
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
              <div style={styles.receiptTitle}>Wire Transfer Submitted</div>
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
              <span style={styles.receiptLabel}>Recipient</span>
              <span style={styles.receiptValue}>{receiptData.recipientName}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Bank</span>
              <span style={styles.receiptValue}>{receiptData.recipientBank}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Type</span>
              <span style={styles.receiptValue}>
                {receiptData.transferType === 'domestic' ? '🇺🇸 Domestic' : '🌍 International'}
              </span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Amount</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.amount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Fee</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.fee)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>Total</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.totalAmount)}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>From Account</span>
              <span style={styles.receiptValue}>{receiptData.account.type?.toUpperCase()} - {receiptData.account.number}</span>
            </div>
            <div style={styles.receiptRow}>
              <span style={styles.receiptLabel}>New Balance</span>
              <span style={styles.receiptValue}>{formatCurrency(receiptData.account.balance)}</span>
            </div>
            {receiptData.urgent && (
              <div style={styles.receiptRow}>
                <span style={styles.receiptLabel}>Processing</span>
                <span style={styles.receiptValue}>⚡ Expedited</span>
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