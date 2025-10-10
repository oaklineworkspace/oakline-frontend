import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

// Custom hook for responsive detection
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

export default function AccountDetails() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const { id } = router.query;
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (id && id !== 'undefined') {
      checkUserAndFetchAccount();
    } else if (id === undefined) {
      // still waiting for router
      return;
    } else {
      setError('Invalid account ID');
      setLoading(false);
    }
  }, [id]);

  const checkUserAndFetchAccount = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const userPromise = supabase.auth.getUser();

      const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);

      if (!user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);
      await fetchAccountDetails(user, id);
    } catch (error) {
      console.error('Error checking user:', error);
      if (error.message === 'Request timeout') {
        setError('Connection timeout. Please refresh the page.');
      } else {
        setError('Authentication error. Please try logging in again.');
        router.push('/sign-in');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountDetails = async (user, accountId) => {
    try {
      console.log('Fetching account details for:', { accountId, userId: user.id, userEmail: user.email });

      let accountData = null;
      let accountError = null;

      // Try by account_number
      if (accountId && accountId.length >= 8) {
        const result = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', accountId)
          .eq('user_id', user.id)
          .single();

        accountData = result.data;
        accountError = result.error;
      }

      // Try by ID if needed
      if (accountError && accountError.code === 'PGRST116') {
        const result = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single();

        accountData = result.data;
        accountError = result.error;
      }

      if (accountError || !accountData) {
        console.error('Account fetch error:', accountError);
        setError('Account not found or you do not have permission to view this account.');
        return;
      }

      setAccount(accountData);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('account_id', accountData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) {
        console.error('Error fetching transactions:', transactionsError);
        setTransactions([]);
      } else {
        setTransactions(transactionsData || []);
      }

    } catch (error) {
      console.error('Error fetching account details:', error);
      setError('Error loading account details. Please try again.');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'transfer_in': return '💸';
      case 'transfer_out': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      default: return '💼';
    }
  };

  // ✅ moved styles here so isMobile works
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      fontSize: '1.2rem',
      color: '#64748b'
    },
    spinner: {
      width: '40px',
      height: '40px',
      border: '4px solid #e2e8f0',
      borderTop: '4px solid #1e40af',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '1rem'
    },
    header: {
      backgroundColor: '#1e40af',
      color: 'white',
      padding: isMobile ? '0.75rem 1rem' : '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      flexWrap: 'wrap',
      gap: isMobile ? '0.5rem' : '1rem'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      textDecoration: 'none',
      color: 'white'
    },
    logo: {
      height: isMobile ? '30px' : '40px',
      width: 'auto'
    },
    logoText: {
      fontSize: isMobile ? '1.1rem' : '1.5rem',
      fontWeight: 'bold'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: isMobile ? '1rem 0.5rem' : '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? '1rem' : '2rem'
    },
    errorState: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '50vh',
      textAlign: 'center',
      color: '#64748b',
      padding: '2rem'
    },
    errorTitle: {
      color: '#ef4444',
      marginBottom: '1rem',
      fontSize: isMobile ? '1.2rem' : '1.5rem'
    },
    backButton: {
      padding: isMobile ? '0.3rem 0.6rem' : '0.5rem 1rem',
      backgroundColor: 'rgba(255,255,255,0.2)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '6px',
      fontSize: isMobile ? '0.75rem' : '0.9rem',
      border: '1px solid rgba(255,255,255,0.3)'
    },
    accountCard: {
      backgroundColor: 'white',
      padding: isMobile ? '1rem' : '2rem',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    sectionTitle: {
      fontSize: isMobile ? '1.1rem' : '1.5rem',
      fontWeight: 'bold',
      color: '#1e293b',
      marginBottom: isMobile ? '1rem' : '1.5rem'
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>⚠️ {error}</h2>
          <Link href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
        </div>
        <div style={styles.errorState}>
          <h2 style={styles.errorTitle}>Account Not Found</h2>
          <Link href="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/" style={styles.logoContainer}>
          <img src="/images/logo-primary.png.jpg" alt="Oakline Bank" style={styles.logo} />
          <span style={styles.logoText}>Oakline Bank</span>
        </Link>
        <Link href="/dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      <main style={styles.main}>
        <div style={styles.accountCard}>
          <h1 style={styles.sectionTitle}>
            {account.account_name || 'Account Details'}
          </h1>
          <p>Account Number: {account.account_number}</p>
          <p>Balance: {formatCurrency(account.balance)}</p>
        </div>

        <div style={styles.accountCard}>
          <h2 style={styles.sectionTitle}>Recent Transactions</h2>
          {transactions.length > 0 ? (
            transactions.map(tx => (
              <div key={tx.id}>
                {getTransactionIcon(tx.transaction_type)} {tx.description} — {formatCurrency(tx.amount)}
              </div>
            ))
          ) : (
            <p>No transactions found</p>
          )}
        </div>
      </main>
    </div>
  );
}
