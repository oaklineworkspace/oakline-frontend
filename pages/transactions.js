import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function TransactionsHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
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
      // First, get user's accounts
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

      // Then get transactions for those accounts
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

  const getTransactionTypeColor = (type) => {
    const lowerType = type?.toLowerCase() || '';
    
    if (lowerType.includes('deposit')) {
      return '#2e7d32'; // Dark green for deposits
    } else if (lowerType.includes('credit')) {
      return '#10b981'; // Emerald for credits
    } else if (lowerType.includes('debit')) {
      return '#d32f2f'; // Red for debits
    } else if (lowerType.includes('withdrawal')) {
      return '#dc2626'; // Bright red for withdrawals
    } else if (lowerType.includes('pending')) {
      return '#f59e0b'; // Amber for pending
    } else if (lowerType.includes('reversal')) {
      return '#7c3aed'; // Purple for reversals
    } else if (lowerType.includes('interest')) {
      return '#059669'; // Teal for interest
    } else if (lowerType.includes('fee')) {
      return '#dc2626'; // Bright red for fees
    } else if (lowerType.includes('refund')) {
      return '#10b981'; // Emerald for refunds
    } else if (lowerType.includes('payment')) {
      return '#ef4444'; // Orange-red for payments
    } else if (lowerType.includes('transfer')) {
      return '#3b82f6'; // Blue for transfers
    }
    
    return '#6b7280'; // Gray for unknown types
  };

  const getTransactionIcon = (type) => {
    const lowerType = type?.toLowerCase() || '';
    
    if (lowerType.includes('interest')) return '💰';
    if (lowerType.includes('deposit')) return '💵';
    if (lowerType.includes('withdrawal')) return '🏧';
    if (lowerType.includes('transfer')) return '🔄';
    if (lowerType.includes('payment') || lowerType.includes('bill')) return '💳';
    if (lowerType.includes('refund')) return '↩️';
    if (lowerType.includes('reversal')) return '⏪';
    if (lowerType.includes('fee')) return '⚠️';
    if (lowerType.includes('bonus') || lowerType.includes('reward')) return '🎁';
    
    return '📄';
  };

  const getStatusBadgeStyle = (status) => {
    const lowerStatus = status?.toLowerCase() || 'completed';
    
    if (lowerStatus === 'pending') {
      return {
        backgroundColor: '#fef3c7',
        color: '#f59e0b',
        text: 'Pending'
      };
    } else if (lowerStatus === 'reversal' || lowerStatus === 'reversed') {
      return {
        backgroundColor: '#f3e8ff',
        color: '#7c3aed',
        text: 'Reversal'
      };
    } else if (lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
      return {
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        text: 'Cancelled'
      };
    } else if (lowerStatus === 'failed') {
      return {
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        text: 'Failed'
      };
    } else {
      return {
        backgroundColor: '#d1fae5',
        color: '#10b981',
        text: 'Completed'
      };
    }
  };

  const isTransactionCredit = (tx) => {
    const txType = (tx.transaction_type || '').toLowerCase();
    const amount = parseFloat(tx.amount) || 0;
    
    // Check transaction type for credit indicators
    if (txType.includes('deposit') || 
        txType.includes('credit') || 
        txType.includes('refund') || 
        txType.includes('transfer_in') || 
        txType.includes('interest') || 
        txType.includes('bonus') || 
        txType.includes('reward') || 
        txType.includes('cashback')) {
      return true;
    }
    
    // Check transaction type for debit indicators
    if (txType.includes('debit') || 
        txType.includes('withdrawal') || 
        txType.includes('purchase') || 
        txType.includes('payment') || 
        txType.includes('bill_payment') || 
        txType.includes('fee') || 
        txType.includes('transfer_out')) {
      return false;
    }
    
    // Fallback to amount
    return amount >= 0;
  };

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
        {transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📊</div>
            <h3>No transactions found</h3>
            <p>You haven't made any transactions yet.</p>
            <Link href="/dashboard" style={styles.primaryButton}>
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Account</th>
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const isCredit = isTransactionCredit(tx);
                  const typeColor = getTransactionTypeColor(tx.transaction_type);
                  const statusStyle = getStatusBadgeStyle(tx.status);
                  const txIcon = getTransactionIcon(tx.transaction_type);
                  const amount = Math.abs(parseFloat(tx.amount) || 0);
                  
                  return (
                    <tr key={tx.id} style={styles.tableRow}>
                      <td style={styles.td}>{formatDate(tx.created_at)}</td>
                      <td style={styles.td}>
                        {tx.accounts?.account_number ? 
                          `****${tx.accounts.account_number.slice(-4)}` : 
                          'N/A'
                        }
                        <br />
                        <span style={styles.accountType}>
                          {tx.accounts?.account_type?.replace(/_/g, ' ').toUpperCase() || ''}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '16px' }}>{txIcon}</span>
                          <span>{tx.description || tx.transaction_type || 'Transaction'}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.typeBadge,
                          backgroundColor: typeColor + '20',
                          color: typeColor
                        }}>
                          {tx.transaction_type?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                        </span>
                      </td>
                      <td style={{
                        ...styles.td,
                        ...styles.amount,
                        color: isCredit ? '#10b981' : '#dc2626'
                      }}>
                        {isCredit ? '+' : '-'}
                        {formatCurrency(amount)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.statusBadge,
                          backgroundColor: statusStyle.backgroundColor,
                          color: statusStyle.color
                        }}>
                          {statusStyle.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '20px'
  },
  primaryButton: {
    background: '#1e40af',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    marginTop: '20px',
    display: 'inline-block',
    textDecoration: 'none'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottom: '2px solid #e2e8f0'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#475569',
    fontSize: '14px'
  },
  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: '#1e293b'
  },
  accountType: {
    fontSize: '12px',
    color: '#64748b'
  },
  amount: {
    fontWeight: '600',
    fontSize: '15px'
  },
  typeBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-block',
    textTransform: 'capitalize'
  }
};
