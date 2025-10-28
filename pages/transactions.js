
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
    const amount = parseFloat(tx.amount) || 0;
    
    // Determine if it's a credit (money in) or debit (money out)
    if (txType.includes('deposit') || txType.includes('credit') || txType.includes('transfer_in') || txType.includes('interest') || txType.includes('refund') || txType.includes('bonus') || txType.includes('reward') || txType.includes('cashback') || txType.includes('zelle_receive')) {
      return true;
    } else if (txType.includes('debit') || txType.includes('withdrawal') || txType.includes('purchase') || txType.includes('transfer_out') || txType.includes('bill_payment') || txType.includes('fee') || txType.includes('payment') || txType.includes('zelle_send')) {
      return false;
    } else {
      // Fallback: check if amount is positive or negative
      return amount >= 0;
    }
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
              ✅ Credits
            </button>
            <button
              onClick={() => setFilter('debits')}
              style={{
                ...styles.filterButton,
                ...(filter === 'debits' ? styles.filterButtonActive : {})
              }}
            >
              ❌ Debits
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
                <div key={tx.id} style={styles.transactionCard}>
                  <div style={{
                    ...styles.transactionIcon,
                    backgroundColor: isCredit ? '#d1fae5' : '#fee2e2',
                    color: isCredit ? '#059669' : '#dc2626'
                  }}>
                    {getTransactionIcon(txType)}
                  </div>
                  
                  <div style={styles.transactionDetails}>
                    <div style={styles.transactionHeader}>
                      <span style={styles.transactionType}>
                        {tx.description || txType?.replace(/_/g, ' ').toUpperCase() || 'Transaction'}
                      </span>
                      <span style={{
                        ...styles.transactionAmount,
                        color: isCredit ? '#059669' : '#dc2626'
                      }}>
                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                      </span>
                    </div>
                    
                    <div style={styles.transactionDescription}>
                      {txType?.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    
                    <div style={styles.transactionMeta}>
                      <span style={styles.transactionDate}>{formatDate(tx.created_at)}</span>
                      {tx.accounts?.account_number && (
                        <span style={styles.transactionAccount}>
                          ****{tx.accounts.account_number.slice(-4)}
                        </span>
                      )}
                      {tx.reference && (
                        <span style={styles.transactionRef}>Ref: {tx.reference}</span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    ...styles.statusBadge,
                    backgroundColor: tx.status === 'completed' ? '#d1fae5' : 
                                   tx.status === 'pending' ? '#fef3c7' : '#fee2e2',
                    color: tx.status === 'completed' ? '#059669' : 
                          tx.status === 'pending' ? '#f59e0b' : '#dc2626'
                  }}>
                    {tx.status}
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1e3c72',
    margin: 0
  },
  backButton: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    textDecoration: 'none',
    display: 'inline-block'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
    background: 'white',
    borderRadius: '12px',
    margin: '20px'
  },
  error: {
    color: '#dc3545',
    background: '#f8d7da',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  controls: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  filters: {
    display: 'flex',
    gap: '0.5rem'
  },
  filterButton: {
    padding: '0.5rem 1rem',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
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
    padding: '0.5rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.9rem',
    minWidth: '200px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  transactionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  transactionIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    flexShrink: 0
  },
  transactionDetails: {
    flex: 1,
    minWidth: 0
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  transactionType: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  transactionAmount: {
    fontSize: '1.1rem',
    fontWeight: '700'
  },
  transactionDescription: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  transactionMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  transactionDate: {},
  transactionAccount: {},
  transactionRef: {
    fontFamily: 'monospace'
  },
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 0
  }
};
