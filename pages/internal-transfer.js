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

function RecentTransfers({ user, isMobile }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentTransfers();
    }
  }, [user]);

  const fetchRecentTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['debit', 'credit'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setTransfers(data);
      }
    } catch (error) {
      console.error('Error fetching transfers:', error);
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

  const transferStyles = {
    section: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    title: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: isMobile ? '1.5rem' : '2rem',
      paddingBottom: '1rem',
      borderBottom: '3px solid #1e40af',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    transferItem: {
      padding: isMobile ? '1rem' : '1.25rem',
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0',
      transition: 'all 0.3s'
    },
    transferHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
      flexWrap: 'wrap',
      gap: '0.5rem'
    },
    transferType: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    transferAmount: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700'
    },
    transferDetails: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#64748b',
      lineHeight: '1.6'
    },
    transferDate: {
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      color: '#94a3b8',
      marginTop: '0.5rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#94a3b8'
    },
    emptyIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    }
  };

  if (loading) {
    return (
      <div style={transferStyles.section}>
        <h2 style={transferStyles.title}>
          <span style={{ fontSize: '1.5rem' }}>📋</span>
          Recent Transfers
        </h2>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Loading transfers...
        </div>
      </div>
    );
  }

  return (
    <div style={transferStyles.section}>
      <h2 style={transferStyles.title}>
        <span style={{ fontSize: '1.5rem' }}>📋</span>
        Recent Transfers
      </h2>
      {transfers.length === 0 ? (
        <div style={transferStyles.emptyState}>
          <div style={transferStyles.emptyIcon}>💸</div>
          <p style={{ fontSize: isMobile ? '1rem' : '1.1rem', margin: 0 }}>No recent transfers</p>
        </div>
      ) : (
        <div>
          {transfers.map(transfer => (
            <div
              key={transfer.id}
              style={transferStyles.transferItem}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1e40af';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={transferStyles.transferHeader}>
                <div style={transferStyles.transferType}>
                  {transfer.type === 'debit' ? '📤 Sent' : '📥 Received'}
                </div>
                <div
                  style={{
                    ...transferStyles.transferAmount,
                    color: transfer.type === 'debit' ? '#dc2626' : '#059669'
                  }}
                >
                  {transfer.type === 'debit' ? '-' : '+'}{formatCurrency(transfer.amount)}
                </div>
              </div>
              <div style={transferStyles.transferDetails}>
                {transfer.description}
              </div>
              {transfer.reference && (
                <div style={{ ...transferStyles.transferDetails, marginTop: '0.25rem' }}>
                  Ref: {transfer.reference}
                </div>
              )}
              <div style={transferStyles.transferDate}>
                {new Date(transfer.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [messageType, setMessageType] = useState('');
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

      // First, get the account
      const { data: recipientAccount, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('account_number', recipientAccountNumber.trim())
        .eq('status', 'active')
        .single();

      if (accountError || !recipientAccount) {
        setMessage('Account not found or inactive. Please verify the account number.');
        setMessageType('error');
        setVerifying(false);
        return;
      }

      // Try to get profile from profiles table
      let ownerName = 'Oakline User';
      if (recipientAccount.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', recipientAccount.user_id)
          .single();

        if (profile && profile.first_name && profile.last_name) {
          ownerName = `${profile.first_name} ${profile.last_name}`;
        }
      }

      // If no profile found, try applications table
      if (ownerName === 'Oakline User' && recipientAccount.application_id) {
        const { data: application } = await supabase
          .from('applications')
          .select('first_name, last_name')
          .eq('id', recipientAccount.application_id)
          .single();

        if (application && application.first_name && application.last_name) {
          ownerName = `${application.first_name} ${application.last_name}`;
        }
      }

      setRecipientInfo({
        accountId: recipientAccount.id,
        accountNumber: recipientAccount.account_number,
        accountType: recipientAccount.account_type,
        ownerName: ownerName,
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

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setMessage('Authentication error. Please sign in again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/internal-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          from_account_id: fromAccount,
          to_account_number: recipientAccountNumber,
          amount: transferAmount,
          memo: memo || 'Internal Transfer'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Transfer failed');
      }

      const referenceNumber = result.reference_number;
      const newFromBalance = result.new_balance;

      const receipt = {
        referenceNumber,
        date: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
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
      maxWidth: '1000px',
      margin: '0 auto',
      padding: isMobile ? '1.5rem 1rem' : '3rem 2rem'
    },
    welcomeSection: {
      marginBottom: isMobile ? '2rem' : '3rem',
      textAlign: 'center'
    },
    welcomeTitle: {
      fontSize: isMobile ? '1.75rem' : '2.5rem',
      fontWeight: '800',
      color: '#1e293b',
      marginBottom: '0.75rem',
      letterSpacing: '-0.02em'
    },
    welcomeSubtitle: {
      fontSize: isMobile ? '1rem' : '1.15rem',
      color: '#64748b',
      fontWeight: '400'
    },
    contentSection: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: isMobile ? '1.5rem' : '2.5rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
      marginBottom: '2rem',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: isMobile ? '1.5rem' : '2rem',
      paddingBottom: '1rem',
      borderBottom: '3px solid #1e40af',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    formGroup: {
      marginBottom: isMobile ? '1.25rem' : '1.75rem'
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
    inputGroup: {
      display: 'flex',
      gap: '0.75rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    verifyButton: {
      padding: isMobile ? '0.75rem 1.25rem' : '0.875rem 2rem',
      background: '#1e40af',
      backgroundColor: '#1e40af',
      color: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      fontSize: isMobile ? '0.875rem' : '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      whiteSpace: 'nowrap',
      width: isMobile ? '100%' : 'auto',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    recipientCard: {
      backgroundColor: '#ecfdf5',
      border: '2px solid #10b981',
      borderRadius: '12px',
      padding: isMobile ? '1.25rem' : '1.5rem',
      marginBottom: isMobile ? '1.25rem' : '1.75rem'
    },
    recipientTitle: {
      fontSize: isMobile ? '0.875rem' : '1rem',
      color: '#065f46',
      fontWeight: '600',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    recipientName: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#064e3b',
      marginBottom: '0.75rem'
    },
    recipientDetails: {
      fontSize: isMobile ? '0.875rem' : '1rem',
      color: '#065f46'
    },
    accountInfo: {
      backgroundColor: '#f1f5f9',
      padding: isMobile ? '1rem' : '1.25rem',
      borderRadius: '12px',
      marginBottom: isMobile ? '1.25rem' : '1.75rem',
      border: '2px solid #cbd5e1'
    },
    accountInfoLabel: {
      fontSize: isMobile ? '0.8rem' : '0.875rem',
      color: '#64748b',
      marginBottom: '0.5rem',
      fontWeight: '500'
    },
    accountInfoValue: {
      fontSize: isMobile ? '1.25rem' : '1.5rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    submitButton: {
      width: '100%',
      padding: isMobile ? '1rem' : '1.25rem',
      background: '#1e40af',
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
    messageBox: {
      padding: isMobile ? '1rem' : '1.25rem',
      borderRadius: '12px',
      marginBottom: isMobile ? '1.25rem' : '1.75rem',
      fontSize: isMobile ? '0.875rem' : '1rem',
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
      backgroundColor: '#eff6ff',
      border: '2px solid #bfdbfe',
      borderRadius: '12px',
      padding: isMobile ? '1.25rem' : '1.5rem',
      marginTop: isMobile ? '1.5rem' : '2rem'
    },
    infoTitle: {
      fontSize: isMobile ? '0.95rem' : '1.05rem',
      fontWeight: '700',
      color: '#1e40af',
      marginBottom: '1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    infoList: {
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      color: '#1e40af',
      lineHeight: '1.8',
      paddingLeft: isMobile ? '1.25rem' : '1.5rem',
      margin: 0
    },
    receiptModal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: isMobile ? '1rem' : '2rem',
      backdropFilter: 'blur(4px)'
    },
    receipt: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '1.25rem' : '1.75rem',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '85vh',
      overflowY: 'auto',
      boxShadow: '0 15px 40px rgba(0,0,0,0.25)',
      border: '2px solid #059669'
    },
    receiptHeader: {
      textAlign: 'center',
      borderBottom: '2px solid #059669',
      paddingBottom: '1.25rem',
      marginBottom: '1.25rem'
    },
    receiptTitle: {
      fontSize: isMobile ? '1.35rem' : '1.65rem',
      fontWeight: '800',
      color: '#059669',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    receiptSubtitle: {
      fontSize: isMobile ? '0.8rem' : '0.9rem',
      color: '#64748b',
      marginBottom: '0.4rem'
    },
    receiptBody: {
      marginBottom: '1.25rem'
    },
    receiptSection: {
      backgroundColor: '#f8fafc',
      padding: isMobile ? '0.875rem' : '1rem',
      borderRadius: '10px',
      marginBottom: '0.875rem',
      border: '2px solid #e2e8f0'
    },
    receiptSectionTitle: {
      fontSize: isMobile ? '0.875rem' : '0.95rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem'
    },
    receiptRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: isMobile ? '0.8rem' : '0.875rem'
    },
    receiptLabel: {
      color: '#64748b',
      fontWeight: '500'
    },
    receiptValue: {
      color: '#1e293b',
      fontWeight: '600',
      textAlign: 'right'
    },
    receiptArrow: {
      textAlign: 'center',
      fontSize: '3rem',
      color: '#059669',
      margin: '1.5rem 0',
      fontWeight: 'bold'
    },
    receiptTotal: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      padding: '1.25rem',
      borderRadius: '10px',
      textAlign: 'center',
      marginTop: '1.25rem',
      border: '2px solid #059669'
    },
    receiptAmount: {
      fontSize: isMobile ? '1.75rem' : '2rem',
      fontWeight: 'bold',
      color: '#047857',
      margin: '0.5rem 0',
      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    receiptMemo: {
      marginTop: '0.875rem',
      padding: '0.75rem',
      backgroundColor: '#fef3c7',
      borderRadius: '6px',
      border: '2px solid #fbbf24'
    },
    receiptButtons: {
      display: 'flex',
      gap: isMobile ? '0.5rem' : '0.75rem',
      marginTop: '1.25rem',
      flexDirection: isMobile ? 'column' : 'row'
    },
    printButton: {
      flex: 1,
      padding: isMobile ? '0.75rem' : '0.875rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.9rem',
      fontWeight: '700',
      transition: 'all 0.3s',
      boxShadow: '0 3px 8px rgba(5, 150, 105, 0.3)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem'
    },
    closeButton: {
      flex: 1,
      padding: isMobile ? '0.75rem' : '0.875rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: isMobile ? '0.85rem' : '0.9rem',
      fontWeight: '700',
      transition: 'all 0.3s',
      boxShadow: '0 3px 8px rgba(30, 64, 175, 0.3)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.4rem'
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
                  <h2 style={styles.receiptTitle}>
                    <span style={{ fontSize: '2.5rem' }}>✓</span>
                    Transfer Successful
                  </h2>
                  <p style={styles.receiptSubtitle}>Transaction Reference: <strong>{receiptData.referenceNumber}</strong></p>
                  <p style={{ ...styles.receiptSubtitle, fontSize: isMobile ? '0.85rem' : '0.95rem' }}>{receiptData.date}</p>
                </div>

                <div style={styles.receiptBody}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#eff6ff', borderRadius: '12px' }}>
                    <p style={{ fontSize: '1rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>Transferred by</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e40af' }}>{receiptData.senderName}</p>
                  </div>

                  <div style={styles.receiptSection}>
                    <h3 style={styles.receiptSectionTitle}>
                      {getAccountTypeIcon(receiptData.fromAccount.type)} From Account
                    </h3>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Account Type:</span>
                      <span style={styles.receiptValue}>{receiptData.fromAccount.type?.toUpperCase()}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Account Number:</span>
                      <span style={styles.receiptValue}>••••{receiptData.fromAccount.number?.slice(-4)}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>New Balance:</span>
                      <span style={{ ...styles.receiptValue, color: '#059669', fontSize: isMobile ? '1.1rem' : '1.25rem' }}>{formatCurrency(receiptData.fromAccount.balance)}</span>
                    </div>
                  </div>

                  <div style={styles.receiptArrow}>↓</div>

                  <div style={styles.receiptSection}>
                    <h3 style={styles.receiptSectionTitle}>
                      {getAccountTypeIcon(receiptData.toAccount.type)} To Recipient
                    </h3>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Recipient Name:</span>
                      <span style={styles.receiptValue}>{receiptData.toAccount.ownerName}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Account Type:</span>
                      <span style={styles.receiptValue}>{receiptData.toAccount.type?.toUpperCase()}</span>
                    </div>
                    <div style={styles.receiptRow}>
                      <span style={styles.receiptLabel}>Account Number:</span>
                      <span style={styles.receiptValue}>••••{receiptData.toAccount.number?.slice(-4)}</span>
                    </div>
                  </div>

                  <div style={styles.receiptTotal}>
                    <h3 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', color: '#047857', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Transfer Amount</h3>
                    <p style={styles.receiptAmount}>{formatCurrency(receiptData.amount)}</p>
                  </div>

                  {receiptData.memo && receiptData.memo !== 'Internal Transfer' && (
                    <div style={styles.receiptMemo}>
                      <p style={{ margin: '0', fontSize: isMobile ? '0.95rem' : '1.05rem', color: '#92400e', fontWeight: '500' }}>
                        <strong>📝 Memo:</strong> {receiptData.memo}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', borderTop: '3px solid #e2e8f0', paddingTop: '2rem', marginTop: '2rem' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#059669', margin: '0 0 0.75rem 0' }}>✅ Transaction Completed</p>
                  <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0' }}>This is your official transaction receipt from Oakline Bank</p>
                </div>

                <div style={styles.receiptButtons}>
                  <button
                    onClick={printReceipt}
                    style={styles.printButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#047857'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#059669'}
                  >
                    🖨️ Print Receipt
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    style={styles.closeButton}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#1e40af'}
                  >
                    ✓ Done
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Send Money to Oakline User</h1>
            <p style={styles.welcomeSubtitle}>Transfer funds securely to another Oakline Bank customer</p>
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
            <h2 style={styles.sectionTitle}>
              <span style={{ fontSize: '1.5rem' }}>💸</span>
              Transfer Details
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>From Account *</label>
                <select
                  style={styles.select}
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  required
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                    onMouseEnter={(e) => !verifying && (e.target.style.backgroundColor = '#1e3a8a')}
                    onMouseLeave={(e) => !verifying && (e.target.style.backgroundColor = '#1e40af')}
                  >
                    {verifying ? '🔄 Verifying...' : '✓ Verify Account'}
                  </button>
                </div>
              </div>

              {recipientInfo && (
                <div style={{
                  backgroundColor: '#ecfdf5',
                  border: '3px solid #10b981',
                  borderRadius: '16px',
                  padding: isMobile ? '1.5rem' : '2rem',
                  marginBottom: isMobile ? '1.5rem' : '2rem',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #6ee7b7'
                  }}>
                    <span style={{ fontSize: '2rem' }}>✅</span>
                    <div>
                      <h3 style={{
                        margin: 0,
                        fontSize: isMobile ? '1.1rem' : '1.3rem',
                        fontWeight: '700',
                        color: '#065f46'
                      }}>
                        Recipient Verified
                      </h3>
                      <p style={{
                        margin: '0.25rem 0 0 0',
                        fontSize: isMobile ? '0.85rem' : '0.95rem',
                        color: '#059669'
                      }}>
                        Please confirm the details below before proceeding
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gap: '1rem'
                  }}>
                    <div style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.5rem'
                      }}>
                        Recipient Name
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1.1rem' : '1.25rem',
                        fontWeight: '700',
                        color: '#064e3b'
                      }}>
                        {recipientInfo.ownerName}
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.5rem'
                      }}>
                        Account Type
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        fontWeight: '700',
                        color: '#064e3b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.5rem' }}>
                          {getAccountTypeIcon(recipientInfo.accountType)}
                        </span>
                        {recipientInfo.accountType?.replace('_', ' ')?.toUpperCase()} Account
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'white',
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '0.5rem'
                      }}>
                        Account Number
                      </div>
                      <div style={{
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        fontWeight: '700',
                        color: '#064e3b',
                        fontFamily: 'monospace'
                      }}>
                        ••••••{recipientInfo.accountNumber?.slice(-4)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#d1fae5',
                    borderRadius: '8px',
                    fontSize: isMobile ? '0.8rem' : '0.9rem',
                    color: '#065f46',
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    🔒 This information has been verified and encrypted for your security
                  </div>
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Transfer Amount ($) *</label>
                <input
                  type="text" // Changed type to text to accept any format
                  style={styles.input}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
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
                  opacity: (loading || !recipientInfo) ? 0.6 : 1,
                  cursor: (loading || !recipientInfo) ? 'not-allowed' : 'pointer'
                }}
                disabled={loading || !recipientInfo}
                onMouseEnter={(e) => !loading && recipientInfo && (e.target.style.backgroundColor = '#1e3a8a')}
                onMouseLeave={(e) => !loading && recipientInfo && (e.target.style.backgroundColor = '#1e40af')}
              >
                {loading ? '🔄 Processing Transfer...' : `💸 Send Money`}
              </button>
            </form>
          </div>

          <RecentTransfers user={user} isMobile={isMobile} />
        </main>
      </div>
    </>
  );
}