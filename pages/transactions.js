
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function TransactionsHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchTransactions();
  }, []);

  const checkAuthAndFetchTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      await fetchTransactions(session.user);
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication error');
      setLoading(false);
    }
  };

  const fetchTransactions = async (user) => {
    try {
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const accountIds = accounts.map(acc => acc.id);

      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts:account_id (
            account_number,
            account_type
          )
        `)
        .in('account_id', accountIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (txError) throw txError;

      setTransactions(txs || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'transfer_in': return '💸';
      case 'transfer_out': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      case 'debit': return '💳';
      case 'credit': return '💵';
      case 'purchase': return '🛒';
      case 'refund': return '↩️';
      case 'interest': return '💎';
      case 'zelle_send': return 'Z';
      case 'zelle_receive': return 'Z';
      default: return '💼';
    }
  };

  const isTransactionCredit = (tx) => {
    const txType = (tx.type || tx.transaction_type || '').toLowerCase();
    
    // Credit transactions (money IN) - these should be GREEN/POSITIVE
    if (txType.includes('deposit') || 
        txType.includes('credit') || 
        txType.includes('transfer_in') || 
        txType.includes('interest') || 
        txType.includes('refund') || 
        txType.includes('bonus') || 
        txType.includes('reward') || 
        txType.includes('cashback') || 
        txType.includes('zelle_receive')) {
      return true;
    }
    
    // Debit transactions (money OUT) - these should be RED/NEGATIVE
    if (txType.includes('debit') || 
        txType.includes('withdrawal') || 
        txType.includes('purchase') || 
        txType.includes('transfer_out') || 
        txType.includes('bill_payment') || 
        txType.includes('fee') || 
        txType.includes('payment') || 
        txType.includes('zelle_send')) {
      return false;
    }
    
    // Fallback: check if amount is positive or negative
    const amount = parseFloat(tx.amount) || 0;
    return amount >= 0;
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Apply type filter
    if (filter !== 'all') {
      filtered = filtered.filter(tx => {
        const isCredit = isTransactionCredit(tx);
        if (filter === 'credits') return isCredit;
        if (filter === 'debits') return !isCredit;
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.transaction_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.reference || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading transactions...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Transaction History</h1>
        <Link href="/dashboard" style={styles.backButton}>
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.content}>
        {/* Filters and Search */}
        <div style={styles.controls}>
          <div style={styles.filters}>
            <button
              onClick={() => setFilter('all')}
              style={{
                ...styles.filterButton,
                ...(filter === 'all' ? styles.filterButtonActive : {})
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('credits')}
              style={{
                ...styles.filterButton,
                ...(filter === 'credits' ? styles.filterButtonActive : {})
              }}
            >
              💚 Credits
            </button>
            <button
              onClick={() => setFilter('debits')}
              style={{
                ...styles.filterButton,
                ...(filter === 'debits' ? styles.filterButtonActive : {})
              }}
            >
              ❤️ Debits
            </button>
          </div>
          
          <input
            type="text"
            placeholder="🔍 Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        {filteredTransactions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <h3>No transactions found</h3>
            <p>{searchTerm ? 'Try a different search term' : "You haven't made any transactions yet."}</p>
          </div>
        ) : (
          <div style={styles.transactionsList}>
            {filteredTransactions.map(tx => {
              const txType = tx.type || tx.transaction_type || '';
              const amount = parseFloat(tx.amount) || 0;
              const isCredit = isTransactionCredit(tx);
              
              return (
                <div key={tx.id} style={styles.transactionItem}>
                  <div style={styles.transactionLeft}>
                    <span style={styles.transactionIcon}>
                      {getTransactionIcon(txType)}
                    </span>
                    <div style={styles.transactionInfo}>
                      <div style={styles.transactionDescription}>
                        {tx.description || txType?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={styles.transactionDate}>
                        {formatDate(tx.created_at)}
                      </div>
                      {tx.accounts?.account_number && (
                        <div style={styles.transactionAccount}>
                          Account •••• {tx.accounts.account_number.slice(-4)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={styles.transactionRight}>
                    <div style={{
                      ...styles.transactionAmount,
                      color: isCredit ? '#059669' : '#dc2626'
                    }}>
                      {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                    </div>
                    {tx.status && (
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: tx.status === 'completed' ? '#d1fae5' : 
                                       tx.status === 'pending' ? '#fef3c7' : '#fee2e2',
                        color: tx.status === 'completed' ? '#059669' : 
                              tx.status === 'pending' ? '#f59e0b' : '#dc2626'
                      }}>
                        {tx.status}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    margin: 0
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'all 0.3s ease'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '1.2rem',
    color: '#64748b'
  },
  error: {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    margin: '20px',
    textAlign: 'center'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filters: {
    display: 'flex',
    gap: '0.5rem'
  },
  filterButton: {
    padding: '0.6rem 1.2rem',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '0.6rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.95rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  transactionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flex: 1
  },
  transactionIcon: {
    fontSize: '1.5rem'
  },
  transactionInfo: {
    flex: 1
  },
  transactionDescription: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  transactionDate: {
    fontSize: '0.8rem',
    color: '#64748b'
  },
  transactionAccount: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '0.25rem'
  },
  transactionRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.5rem'
  },
  transactionAmount: {
    fontSize: '1.05rem',
    fontWeight: '700'
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'capitalize'
  }
};
