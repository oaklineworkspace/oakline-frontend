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
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      marginBottom: '2rem'
    },
    title: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: isMobile ? '1.5rem' : '2rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669',
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

export default function Transfer() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRecentTransfers();
    }
  }, [user]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
    } finally {
      setPageLoading(false);
    }
  };

  const fetchRecentTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const { data: userAccounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id);

      if (accountsError) {
        console.error('Error fetching accounts for transfers:', accountsError);
        return;
      }

      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(acc => acc.id);

        const { data: transfers, error: transfersError } = await supabase
          .from('transactions')
          .select('*')
          .in('account_id', accountIds)
          .in('type', ['debit', 'credit'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (transfersError) {
          console.error('Error fetching transfers:', transfersError);
        } else {
          console.log('Fetched recent transfers:', transfers);
          setRecentTransfers(transfers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching recent transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateReferenceNumber = () => {
    const uuid = crypto.randomUUID();
    return `TXN-${uuid.substring(0, 8).toUpperCase()}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const transferAmount = parseFloat(amount);
      const selectedFromAccount = accounts.find(acc => acc.id === fromAccount);
      const selectedToAccount = accounts.find(acc => acc.id === toAccount);

      if (!selectedToAccount) {
        setMessage('Please select a destination account');
        setLoading(false);
        return;
      }

      if (fromAccount === toAccount) {
        setMessage('Cannot transfer to the same account');
        setLoading(false);
        return;
      }

      if (transferAmount <= 0) {
        setMessage('Please enter a valid amount');
        setLoading(false);
        return;
      }

      if (transferAmount > parseFloat(selectedFromAccount?.balance || 0)) {
        setMessage('Insufficient funds');
        setLoading(false);
        return;
      }

      const referenceNumber = generateReferenceNumber();
      const debitReference = `${referenceNumber}-DR`;
      const creditReference = `${referenceNumber}-CR`;

      // Deduct from source account
      const newFromBalance = parseFloat(selectedFromAccount.balance) - transferAmount;
      const { error: debitError } = await supabase
        .from('accounts')
        .update({ balance: newFromBalance, updated_at: new Date().toISOString() })
        .eq('id', fromAccount);

      if (debitError) {
        throw new Error('Failed to debit source account');
      }

      // Add to destination account
      const newToBalance = parseFloat(selectedToAccount.balance) + transferAmount;
      const { error: creditError } = await supabase
        .from('accounts')
        .update({ balance: newToBalance, updated_at: new Date().toISOString() })
        .eq('id', toAccount);

      if (creditError) {
        // Rollback debit
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(selectedFromAccount.balance) })
          .eq('id', fromAccount);
        throw new Error('Failed to credit destination account');
      }

      // Create debit transaction
      const { error: debitTransactionError } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: fromAccount,
        type: 'debit',
        amount: transferAmount,
        description: `Transfer to ${selectedToAccount.account_type?.toUpperCase()} account ending in ${selectedToAccount.account_number?.slice(-4)}`,
        status: 'completed',
        reference: debitReference,
        balance_before: parseFloat(selectedFromAccount.balance),
        balance_after: newFromBalance
      });

      if (debitTransactionError) {
        console.error('Debit transaction insert error:', debitTransactionError);
        // Rollback both account updates
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(selectedFromAccount.balance) })
          .eq('id', fromAccount);
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(selectedToAccount.balance) })
          .eq('id', toAccount);
        throw new Error('Failed to record debit transaction');
      }

      // Create credit transaction
      const { error: creditTransactionError } = await supabase.from('transactions').insert({
        user_id: user.id,
        account_id: toAccount,
        type: 'credit',
        amount: transferAmount,
        description: `Transfer from ${selectedFromAccount.account_type?.toUpperCase()} account ending in ${selectedFromAccount.account_number?.slice(-4)}`,
        status: 'completed',
        reference: creditReference,
        balance_before: parseFloat(selectedToAccount.balance),
        balance_after: newToBalance
      });

      if (creditTransactionError) {
        console.error('Credit transaction insert error:', creditTransactionError);
        // Rollback account updates and debit transaction
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(selectedFromAccount.balance) })
          .eq('id', fromAccount);
        await supabase
          .from('accounts')
          .update({ balance: parseFloat(selectedToAccount.balance) })
          .eq('id', toAccount);
        await supabase
          .from('transactions')
          .delete()
          .eq('reference', debitReference);
        throw new Error('Failed to record credit transaction');
      }

      // Generate receipt data
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
          type: selectedToAccount.account_type,
          number: selectedToAccount.account_number,
          balance: newToBalance
        },
        amount: transferAmount,
        memo: memo || 'Internal Transfer'
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setAmount('');
      setMemo('');

      // Refresh accounts and transfers
      await checkUserAndFetchData();

      // Wait a bit for the database to be updated, then fetch transfers
      setTimeout(async () => {
        await fetchRecentTransfers();
      }, 500);

    } catch (error) {
      setMessage(error.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  const viewTransferReceipt = (transfer) => {
    const fromAccountData = accounts.find(acc => acc.id === transfer.account_id);
    const isDebit = transfer.type === 'debit';

    const receipt = {
      referenceNumber: transfer.reference || 'N/A',
      date: formatDate(transfer.created_at),
      senderName: user?.email?.split('@')[0] || 'Account Holder',
      fromAccount: {
        type: fromAccountData?.account_type || 'N/A',
        number: fromAccountData?.account_number || 'N/A',
        balance: transfer.balance_after || 0
      },
      toAccount: {
        type: 'Account',
        number: 'N/A'
      },
      amount: transfer.amount,
      memo: transfer.description || 'Transfer',
      status: transfer.status || 'completed'
    };

    setReceiptData(receipt);
    setShowReceipt(true);
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
      padding: isMobile ? '1rem' : '1.5rem 2rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderBottom: '3px solid #059669'
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
      color: 'white'
    },
    logo: {
      height: isMobile ? '35px' : '45px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.2rem' : '1.6rem',
      fontWeight: '700'
    },
    backButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: isMobile ? '0.85rem' : '0.95rem',
      border: '1px solid rgba(255,255,255,0.3)',
      transition: 'all 0.3s ease'
    },
    main: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.75rem' : '2.5rem 2rem'
    },
    welcomeSection: {
      marginBottom: '2rem',
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
    transferOptions: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    transferCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: isMobile ? '1.5rem' : '2rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid #059669',
      textDecoration: 'none',
      color: 'inherit'
    },
    transferCardIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    transferCardTitle: {
      fontSize: isMobile ? '1rem' : '1.1rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    transferCardDesc: {
      fontSize: isMobile ? '0.8rem' : '0.85rem',
      color: '#64748b',
      lineHeight: '1.6'
    },
    contentSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.1rem' : '1.25rem',
      fontWeight: '700',
      color: '#1a365d',
      marginBottom: '1.5rem',
      paddingBottom: '1rem',
      borderBottom: '2px solid #059669'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: isMobile ? '1rem' : '1.5rem',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '0.8rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    select: {
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      transition: 'border-color 0.3s'
    },
    input: {
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.875rem',
      transition: 'border-color 0.3s'
    },
    accountInfo: {
      backgroundColor: '#f8fafc',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0'
    },
    accountInfoLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    accountInfoValue: {
      fontSize: '0.95rem',
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
      boxShadow: '0 6px 20px rgba(30, 64, 175, 0.4)'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#dc2626',
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '2px solid #fca5a5'
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
    receiptBody: {
      marginBottom: '1.5rem'
    },
    receiptSection: {
      backgroundColor: '#f8fafc',
      padding: '1.25rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    receiptButtons: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem'
    },
    printButton: {
      flex: 1,
      padding: '1rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: '600',
      transition: 'all 0.3s',
      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
    },
    closeButton: {
      flex: 1,
      padding: '1rem',
      backgroundColor: '#1a365d',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '1rem',
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
    loadingText: {
      marginTop: '1rem',
      color: '#64748b',
      fontSize: '1rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      maxWidth: '500px',
      margin: '0 auto'
    },
    emptyIcon: {
      fontSize: '4rem',
      marginBottom: '1rem'
    },
    emptyTitle: {
      fontSize: '1.5rem',
      color: '#1e293b',
      marginBottom: '1rem'
    },
    emptyDesc: {
      fontSize: '1rem',
      color: '#64748b',
      marginBottom: '2rem'
    },
    emptyButton: {
      display: 'inline-block',
      padding: '0.875rem 2rem',
      backgroundColor: '#1e40af',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '12px',
      fontWeight: '600',
      fontSize: '1rem'
    },
    recentTransfersSection: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '16px',
      padding: isMobile ? '1rem' : '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      border: '1px solid #059669',
      marginTop: '2rem'
    },
    transfersList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    transferItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      transition: 'all 0.2s',
      cursor: 'pointer'
    },
    transferLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flex: 1
    },
    transferIcon: {
      fontSize: '1.5rem'
    },
    transferInfo: {
      flex: 1
    },
    transferDescription: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    transferDate: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    transferRef: {
      fontSize: '0.7rem',
      color: '#94a3b8',
      fontFamily: 'monospace',
      marginTop: '0.25rem'
    },
    transferRight: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '0.25rem'
    },
    transferAmount: {
      fontSize: '1rem',
      fontWeight: '700'
    },
    transferStatus: {
      fontSize: '0.7rem',
      padding: '0.25rem 0.5rem',
      backgroundColor: '#d1fae5',
      color: '#065f46',
      borderRadius: '8px',
      textTransform: 'capitalize',
      fontWeight: '600'
    },
    quickAmounts: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.75rem',
      flexWrap: 'wrap',
      alignItems: 'center'
    },
    quickAmountsLabel: {
      fontSize: '0.85rem',
      color: '#64748b',
      fontWeight: '500'
    },
    quickAmountButton: {
      padding: '0.4rem 0.8rem',
      backgroundColor: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #bfdbfe',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.8rem',
      fontWeight: '600',
      transition: 'all 0.2s'
    },
    balanceAfter: {
      marginTop: '0.75rem',
      fontSize: '0.9rem',
      color: '#64748b',
      fontWeight: '500'
    },
    viewReceiptButton: {
      fontSize: '0.7rem',
      padding: '0.25rem 0.5rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      marginTop: '0.25rem'
    }
  };

  if (pageLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
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
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏦</div>
          <h1 style={styles.emptyTitle}>No Accounts Found</h1>
          <p style={styles.emptyDesc}>You need at least one active account to make transfers.</p>
          <Link href="/apply" style={styles.emptyButton}>Open an Account</Link>
        </div>
      </div>
    );
  }

  if (accounts.length < 2) {
    return (
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
          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Transfer Funds</h1>
            <p style={styles.welcomeSubtitle}>Move money between accounts or send to others</p>
          </div>

          <div style={styles.transferOptions}>
            <Link href="/internal-transfer" style={styles.transferCard}>
              <div style={styles.transferCardIcon}>👤</div>
              <h2 style={styles.transferCardTitle}>Send to Oakline User</h2>
              <p style={styles.transferCardDesc}>
                Transfer money to another Oakline Bank customer using their account number
              </p>
            </Link>

            <Link href="/wire-transfer" style={styles.transferCard}>
              <div style={styles.transferCardIcon}>🌐</div>
              <h2 style={styles.transferCardTitle}>Wire Transfer</h2>
              <p style={styles.transferCardDesc}>
                Send money domestically or internationally to external banks
              </p>
            </Link>
          </div>

          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🏦</div>
            <h2 style={styles.emptyTitle}>Need Multiple Accounts?</h2>
            <p style={styles.emptyDesc}>
              You need at least two active accounts to transfer between your own accounts.
            </p>
            <Link href="/apply" style={styles.emptyButton}>Open Another Account</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Transfer Funds - Oakline Bank</title>
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
              <div style={styles.receipt} className="receipt-print">
                <div style={styles.receiptHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={{ height: '50px', marginRight: '1rem' }} />
                    <div style={{ textAlign: 'left' }}>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'white' }}>Oakline Bank</h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>Transfer Receipt</p>
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Reference:</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', fontFamily: 'monospace' }}>{receiptData.referenceNumber}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Date & Time:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{receiptData.date}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(5, 150, 105, 0.3)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>✓ Transfer {receiptData.status || 'Successful'}</span>
                  </div>
                </div>

                <div style={styles.receiptBody}>
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '2px dashed #e2e8f0' }}>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '500' }}>Authorized by</p>
                      <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e40af', margin: 0 }}>{receiptData.senderName}</p>
                    </div>

                    <div style={styles.receiptSection}>
                      <h3 style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                        📤 From Account
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Type:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{receiptData.fromAccount.type?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Number:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', fontSize: '0.9rem' }}>••••{receiptData.fromAccount.number?.slice(-4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>New Balance:</span>
                        <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '0.95rem' }}>{formatCurrency(receiptData.fromAccount.balance)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', margin: '1.5rem 0', fontSize: '2rem', color: '#059669' }}>⬇</div>

                    <div style={styles.receiptSection}>
                      <h3 style={{ fontSize: '0.9rem', color: '#059669', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>
                        📥 To Account
                      </h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Type:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>{receiptData.toAccount.type?.toUpperCase()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Account Number:</span>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontFamily: 'monospace', fontSize: '0.9rem' }}>••••{receiptData.toAccount.number?.slice(-4)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '0.5rem 0', padding: '0.5rem 0' }}>
                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>New Balance:</span>
                        <span style={{ fontWeight: '700', color: '#059669', fontSize: '0.95rem' }}>{formatCurrency(receiptData.toAccount.balance)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', padding: '2rem', borderRadius: '12px', textAlign: 'center', border: '2px solid #059669', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#047857', margin: '0 0 0.75rem 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Transfer Amount</h3>
                    <p style={{ fontSize: '2.5rem', fontWeight: '800', color: '#047857', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{formatCurrency(receiptData.amount)}</p>
                  </div>

                  {receiptData.memo && receiptData.memo !== 'Internal Transfer' && (
                    <div style={{ backgroundColor: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '8px', padding: '1rem', marginTop: '1rem' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e', fontWeight: '600' }}>
                        <span style={{ fontSize: '1.1rem', marginRight: '0.5rem' }}>📝</span>
                        Memo: {receiptData.memo}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, textAlign: 'center', fontWeight: '500' }}>
                      This is an official receipt from Oakline Bank. For support, contact us at support@theoaklinebank.com
                    </p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                      © {new Date().getFullYear()} Oakline Bank. All rights reserved. | Member FDIC
                    </p>
                  </div>
                </div>

                <div style={styles.receiptButtons}>
                  <button onClick={printReceipt} style={styles.printButton}>🖨️ Print Receipt</button>
                  <button onClick={() => setShowReceipt(false)} style={styles.closeButton}>Done</button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.welcomeSection}>
            <h1 style={styles.welcomeTitle}>Transfer Between Your Accounts</h1>
            <p style={styles.welcomeSubtitle}>Move money instantly between your Oakline accounts</p>
          </div>

          <div style={styles.transferOptions}>
            <Link href="/internal-transfer" style={styles.transferCard}>
              <div style={styles.transferCardIcon}>👤</div>
              <h2 style={styles.transferCardTitle}>Send to Oakline User</h2>
              <p style={styles.transferCardDesc}>
                Transfer money to another Oakline Bank customer using their account number
              </p>
            </Link>

            <Link href="/wire-transfer" style={styles.transferCard}>
              <div style={styles.transferCardIcon}>🌐</div>
              <h2 style={styles.transferCardTitle}>Wire Transfer</h2>
              <p style={styles.transferCardDesc}>
                Send money domestically or internationally to external banks
              </p>
            </Link>
          </div>

          {message && (
            <div style={styles.errorMessage}>{message}</div>
          )}

          <div style={styles.contentSection}>
            <h2 style={styles.sectionTitle}>Transfer Between My Accounts</h2>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
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
                  <label style={styles.label}>To Account *</label>
                  <select
                    style={styles.select}
                    value={toAccount}
                    onChange={(e) => setToAccount(e.target.value)}
                    required
                  >
                    <option value="">Select destination account</option>
                    {accounts
                      .filter(acc => acc.id !== fromAccount)
                      .map(account => (
                        <option key={account.id} value={account.id}>
                          {getAccountTypeIcon(account.account_type)} {account.account_type?.replace('_', ' ')?.toUpperCase()} - ****{account.account_number?.slice(-4)} - {formatCurrency(account.balance || 0)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
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
                  <div style={styles.quickAmounts}>
                    <span style={styles.quickAmountsLabel}>Quick amounts:</span>
                    {[10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        style={styles.quickAmountButton}
                        onClick={() => setAmount(val.toString())}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  {fromAccount && (
                    <div style={styles.balanceAfter}>
                      Balance after: {formatCurrency(parseFloat(accounts.find(a => a.id === fromAccount)?.balance || 0) - parseFloat(amount || 0))}
                    </div>
                  )}
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
                  />
                </div>
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
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                {loading ? '🔄 Processing...' : `💸 Transfer ${formatCurrency(parseFloat(amount) || 0)}`}
              </button>
            </form>
          </div>

          <RecentTransfers user={user} isMobile={isMobile} />
        </main>
      </div>
    </>
  );
}