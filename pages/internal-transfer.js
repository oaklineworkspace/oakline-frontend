
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function InternalTransfer() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [recipientAccountNumber, setRecipientAccountNumber] = useState('');
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [pageLoading, setPageLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

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

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

      if (userAccounts && userAccounts.length > 0) {
        setAccounts(userAccounts);
        setFromAccount(userAccounts[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error loading data. Please refresh.');
      setMessageType('error');
    } finally {
      setPageLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const verifyRecipient = async () => {
    if (!recipientAccountNumber || recipientAccountNumber.length < 10) {
      setMessage('Please enter a valid account number (at least 10 digits)');
      setMessageType('error');
      return;
    }

    setVerifying(true);
    setMessage('');
    setMessageType('');
    setRecipientInfo(null);

    try {
      const ownAccount = accounts.find(acc => acc.account_number === recipientAccountNumber);
      if (ownAccount) {
        setMessage('You cannot transfer to your own account. Use "Transfer Between My Accounts" instead.');
        setMessageType('error');
        setVerifying(false);
        return;
      }

      const { data: recipientAccount, error } = await supabase
        .from('accounts')
        .select('*, profiles!inner(first_name, last_name, email)')
        .eq('account_number', recipientAccountNumber)
        .eq('status', 'active')
        .single();

      if (error || !recipientAccount) {
        setMessage('Account not found or inactive. Please verify the account number.');
        setMessageType('error');
        setVerifying(false);
        return;
      }

      setRecipientInfo({
        accountId: recipientAccount.id,
        accountNumber: recipientAccount.account_number,
        accountType: recipientAccount.account_type,
        ownerName: `${recipientAccount.profiles.first_name} ${recipientAccount.profiles.last_name}`,
        userId: recipientAccount.user_id
      });

      setMessage('✓ Recipient verified successfully');
      setMessageType('success');
    } catch (error) {
      console.error('Error verifying recipient:', error);
      setMessage('Error verifying account. Please try again.');
      setMessageType('error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!recipientInfo) {
      setMessage('Please verify the recipient account first');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const transferAmount = parseFloat(amount);
      const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);

      if (transferAmount <= 0) {
        setMessage('Please enter a valid amount');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (transferAmount > parseFloat(selectedFromAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const referenceNumber = `INT${Date.now()}${Math.floor(Math.random() * 10000)}`;

      const newFromBalance = parseFloat(selectedFromAccount.balance) - transferAmount;
      await supabase
        .from('accounts')
        .update({ balance: newFromBalance, updated_at: new Date().toISOString() })
        .eq('id', fromAccount);

      const { data: recipientAccount } = await supabase
        .from('accounts')
        .select('balance')
        .eq('id', recipientInfo.accountId)
        .single();

      const newToBalance = parseFloat(recipientAccount.balance) + transferAmount;
      await supabase
        .from('accounts')
        .update({ balance: newToBalance, updated_at: new Date().toISOString() })
        .eq('id', recipientInfo.accountId);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: fromAccount,
        type: 'transfer_out',
        transaction_type: 'transfer_out',
        amount: transferAmount,
        description: `Transfer to ${recipientInfo.ownerName} - ${memo || 'Internal Transfer'}`,
        status: 'completed',
        reference: referenceNumber
      }]);

      await supabase.from('transactions').insert([{
        user_id: recipientInfo.userId,
        account_id: recipientInfo.accountId,
        type: 'transfer_in',
        transaction_type: 'transfer_in',
        amount: transferAmount,
        description: `Transfer from ****${selectedFromAccount.account_number?.slice(-4)} - ${memo || 'Internal Transfer'}`,
        status: 'completed',
        reference: referenceNumber
      }]);

      await supabase.from('notifications').insert([
        {
          user_id: user.id,
          type: 'transfer',
          title: 'Transfer Sent',
          message: `You transferred ${formatCurrency(transferAmount)} to ${recipientInfo.ownerName}`
        },
        {
          user_id: recipientInfo.userId,
          type: 'transfer',
          title: 'Money Received',
          message: `You received ${formatCurrency(transferAmount)} from ****${selectedFromAccount.account_number?.slice(-4)}`
        }
      ]);

      const receipt = {
        referenceNumber,
        date: new Date().toLocaleString(),
        senderName: user?.email?.split('@')[0] || 'Account Holder',
        fromAccount: {
          type: selectedFromAccount.account_type,
          number: selectedFromAccount.account_number,
          balance: newFromBalance
        },
        toAccount: {
          type: recipientInfo.accountType,
          number: recipientInfo.accountNumber,
          ownerName: recipientInfo.ownerName
        },
        amount: transferAmount,
        memo: memo || 'Internal Transfer'
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      
      setAmount('');
      setMemo('');
      setRecipientAccountNumber('');
      setRecipientInfo(null);
      setMessage('');
      setMessageType('');
      
      await checkUserAndFetchData();

    } catch (error) {
      console.error('Transfer error:', error);
      setMessage(error.message || 'Transfer failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const getAccountTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'checking': return '🏦';
      case 'savings': return '💰';
      case 'investment': return '📈';
      case 'business': return '🏢';
      default: return '💳';
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0a1f44',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      backgroundColor: '#1a365d',
      color: 'white',
      padding: isMobile ? '0.75rem 1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderBottom: '3px solid #059669'
    },
    headerContent: {
      maxWidth: '1200px',
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
      color: 'white'
    },
    logo: {
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.1rem' : '1.6rem',
      fontWeight: '700'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.5rem 0.875rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.8rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease'
    },
    main: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2rem 1.5rem'
    },
    welcomeSection: {
      marginBottom: isMobile ? '1.5rem' : '2rem',
      textAlign: 'center'
    },
    welcomeTitle: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#cbd5e1'
    },
    contentSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.25rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: isMobile ? '1rem' : '1.5rem',
      paddingBottom: '0.75rem',
      borderBottom: '2px solid #059669'
    },
    formGroup: {
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: isMobile ? '0.75rem' : '0.8rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      width: '100%',
      padding: isMobile ? '0.65rem' : '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    input: {
      width: '100%',
      padding: isMobile ? '0.65rem' : '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    inputGroup: {
      display: 'flex',
      gap: '0.5rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    verifyButton: {
      padding: isMobile ? '0.65rem 1rem' : '0.75rem 1.5rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      whiteSpace: 'nowrap',
      width: isMobile ? '100%' : 'auto'
    },
    recipientCard: {
      backgroundColor: '#ecfdf5',
      border: '2px solid #10b981',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.25rem',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    recipientTitle: {
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      color: '#065f46',
      fontWeight: '600',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    recipientName: {
      fontSize: isMobile ? '0.9rem' : '1rem',
      fontWeight: '700',
      color: '#064e3b',
      marginBottom: '0.5rem'
    },
    recipientDetails: {
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      color: '#065f46'
    },
    accountInfo: {
      backgroundColor: '#f8fafc',
      padding: isMobile ? '0.875rem' : '1rem',
      borderRadius: '12px',
      marginBottom: isMobile ? '1rem' : '1.5rem',
      border: '1px solid #e2e8f0'
    },
    accountInfoLabel: {
      fontSize: isMobile ? '0.7rem' : '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    accountInfoValue: {
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    submitButton: {
      width: '100%',
      padding: isMobile ? '0.875rem' : '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.3)'
    },
    messageBox: {
      padding: isMobile ? '0.875rem' : '1rem',
      borderRadius: '12px',
      marginBottom: isMobile ? '1rem' : '1.5rem',
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      fontWeight: '500'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      border: '2px solid #fca5a5'
    },
    successMessage: {
      backgroundColor: '#d1fae5',
      color: '#065f46',
      border: '2px solid #6ee7b7'
    },
    infoBox: {
      backgroundColor: '#f0f9ff',
      border: '1px solid #bae6fd',
      borderRadius: '12px',
      padding: isMobile ? '1rem' : '1.25rem',
      marginTop: isMobile ? '1rem' : '1.5rem'
    },
    infoTitle: {
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      fontWeight: '600',
      color: '#0c4a6e',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    infoList: {
      fontSize: isMobile ? '0.75rem' : '0.8rem',
      color: '#0369a1',
      lineHeight: '1.8',
      paddingLeft: isMobile ? '1rem' : '1.2rem',
      margin: 0
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
      padding: isMobile ? '0.5rem' : '1rem',
      backdropFilter: 'blur(8px)'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
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
      margin: isMobile ? '-1.5rem -1.5rem 1.5rem -1.5rem' : '-2.5rem -2.5rem 2rem -2.5rem',
      padding: isMobile ? '1.5rem' : '2rem 2.5rem',
      borderRadius: '18px 18px 0 0',
      color: 'white'
    },
    receiptBody: {
      marginBottom: '1.5rem'
    },
    receiptSection: {
      backgroundColor: '#f8fafc',
      padding: isMobile ? '1rem' : '1.25rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    receiptArrow: {
      textAlign: 'center',
      fontSize: '2.5rem',
      color: '#059669',
      margin: '1rem 0',
      fontWeight: 'bold'
    },
    receiptTotal: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: '1.5rem',
      borderRadius: '12px',
      textAlign: 'center',
      marginTop: '1.5rem',
      border: '2px solid #059669'
    },
    receiptAmount: {
      fontSize: isMobile ? '2rem' : '2.5rem',
      fontWeight: 'bold',
      color: '#047857',
      margin: '0.5rem 0',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    receiptMemo: {
      marginTop: '1rem',
      padding: '0.75rem',
      backgroundColor: '#fef3c7',
      borderRadius: '6px',
      border: '1px solid #fbbf24'
    },
    receiptButtons: {
      display: 'flex',
      gap: isMobile ? '0.5rem' : '1rem',
      marginTop: '1.5rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    printButton: {
      flex: 1,
      padding: isMobile ? '0.875rem' : '1rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
    },
    closeButton: {
      flex: 1,
      padding: isMobile ? '0.875rem' : '1rem',
      backgroundColor: '#1a365d',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(26, 54, 93, 0.3)'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a1f44'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255,255,255,0.2)',
      borderTop: '4px solid #059669',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    loadingText: {
      marginTop: '1rem',
      color: '#cbd5e1',
      fontSize: '1rem'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
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
        <title>Send to Oakline User - Oakline Bank</title>
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
          {showReceipt && receiptData && (
            <div style={styles.receiptModal}>
              <div style={styles.receipt}>
                <div style={styles.receiptHeader}>
                  <h2 style={{ margin: '0 0 0.5rem 0', fontSize: isMobile ? '1.5rem' : '1.8rem' }}>✓ Transfer Complete</h2>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.9rem', opacity: 0.9 }}>Reference: {receiptData.referenceNumber}</p>
                  <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', opacity: 0.8 }}>{receiptData.date}</p>
                </div>

                <div style={styles.receiptBody}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Sent by</p>
                    <p style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a365d' }}>{receiptData.senderName}</p>
                  </div>

                  <div style={styles.receiptSection}>
                    <h3 style={{ fontSize: '1rem', color: '#1a365d', marginBottom: '0.75rem' }}>From Account</h3>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Type:</strong> {receiptData.fromAccount.type?.toUpperCase()}</p>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Account:</strong> ••••{receiptData.fromAccount.number?.slice(-4)}</p>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>New Balance:</strong> {formatCurrency(receiptData.fromAccount.balance)}</p>
                  </div>

                  <div style={styles.receiptArrow}>→</div>

                  <div style={styles.receiptSection}>
                    <h3 style={{ fontSize: '1rem', color: '#1a365d', marginBottom: '0.75rem' }}>To Recipient</h3>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Name:</strong> {receiptData.toAccount.ownerName}</p>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Type:</strong> {receiptData.toAccount.type?.toUpperCase()}</p>
                    <p style={{ margin: '0.5rem 0', color: '#475569' }}><strong>Account:</strong> ••••{receiptData.toAccount.number?.slice(-4)}</p>
                  </div>

                  <div style={styles.receiptTotal}>
                    <h3 style={{ fontSize: '1.1rem', color: '#047857', margin: '0 0 0.5rem 0' }}>Amount Transferred</h3>
                    <p style={styles.receiptAmount}>{formatCurrency(receiptData.amount)}</p>
                  </div>

                  {receiptData.memo && (
                    <div style={styles.receiptMemo}>
                      <p style={{ margin: '0', fontSize: '0.9rem', color: '#92400e' }}><strong>📝 Memo:</strong> {receiptData.memo}</p>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#059669', margin: '0 0 0.5rem 0' }}>✅ Transfer Completed Successfully</p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0' }}>Official transaction receipt from Oakline Bank</p>
                </div>

                <div style={styles.receiptButtons}>
                  <button onClick={printReceipt} style={styles.printButton}>🖨️ Print Receipt</button>
                  <button onClick={() => setShowReceipt(false)} style={styles.closeButton}>Done</button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Send Money to Oakline User</h1>
            <p style={styles.welcomeSubtitle}>Transfer funds to another Oakline Bank customer instantly</p>
          </div>

          {message && (
            <div style={{
              ...styles.messageBox,
              ...(messageType === 'error' ? styles.errorMessage : styles.successMessage)
            }}>
              {message}
            </div>
          )}

          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Transfer Details</h2>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account *</label>
                <select
                  style={styles.select}
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  required
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {getAccountTypeIcon(account.account_type)} {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Recipient Account Number *</label>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    style={{ ...styles.input, flex: 1 }}
                    value={recipientAccountNumber}
                    onChange={(e) => setRecipientAccountNumber(e.target.value)}
                    placeholder="Enter Oakline Bank account number"
                    required
                  />
                  <button
                    type="button"
                    onClick={verifyRecipient}
                    style={{
                      ...styles.verifyButton,
                      opacity: verifying ? 0.7 : 1,
                      cursor: verifying ? 'not-allowed' : 'pointer'
                    }}
                    disabled={verifying}
                  >
                    {verifying ? '🔄 Verifying...' : '✓ Verify'}
                  </button>
                </div>
              </div>

              {recipientInfo && (
                <div style={styles.recipientCard}>
                  <div style={styles.recipientTitle}>
                    ✓ Recipient Verified
                  </div>
                  <div style={styles.recipientName}>{recipientInfo.ownerName}</div>
                  <div style={styles.recipientDetails}>
                    {getAccountTypeIcon(recipientInfo.accountType)} {recipientInfo.accountType?.replace('_', ' ')?.toUpperCase()} Account - ****{recipientInfo.accountNumber?.slice(-4)}
                  </div>
                </div>
              )}

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
                  disabled={!recipientInfo}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Memo (Optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="What's this transfer for?"
                  maxLength="100"
                  disabled={!recipientInfo}
                />
              </div>

              {fromAccount && (
                <div style={styles.accountInfo}>
                  <div style={styles.accountInfoLabel}>Available Balance</div>
                  <div style={styles.accountInfoValue}>
                    {formatCurrency(accounts.find(a => a.id === fromAccount)?.balance || 0)}
                  </div>
                </div>
              )}

              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  opacity: (loading || !recipientInfo) ? 0.7 : 1,
                  cursor: (loading || !recipientInfo) ? 'not-allowed' : 'pointer'
                }}
                disabled={loading || !recipientInfo}
              >
                {loading ? '🔄 Processing...' : `💸 Send ${formatCurrency(parseFloat(amount) || 0)}`}
              </button>
            </form>
          </div>

          <div style={styles.infoBox}>
            <h3 style={styles.infoTitle}>
              🔒 Transfer Information
            </h3>
            <ul style={styles.infoList}>
              <li>Internal transfers are instant and free of charge</li>
              <li>Funds are available immediately to the recipient</li>
              <li>Always verify the account number before sending</li>
              <li>All transfers are encrypted and secure</li>
              <li>You'll receive a detailed confirmation receipt</li>
            </ul>
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
