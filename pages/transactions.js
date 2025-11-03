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
  const [statusFilter, setStatusFilter] = useState('all');
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

      let transactionsData = [];

      if (accounts && accounts.length > 0) {
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

        transactionsData = txs || [];
      }

      // Fetch crypto deposits with account details
      const { data: cryptoTxData } = await supabase
        .from('crypto_deposits')
        .select(`
          *,
          accounts:account_id (
            account_number,
            account_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Merge and format crypto deposits as transactions
      if (cryptoTxData && cryptoTxData.length > 0) {
        const formattedCryptoDeposits = cryptoTxData.map(crypto => {
          // Map purpose field to display text
          let purposeDisplay = '';
          if (crypto.purpose === 'general_deposit') {
            purposeDisplay = 'Add to Balance';
          } else if (crypto.purpose === 'loan_requirement' || crypto.purpose === 'loan_payment') {
            purposeDisplay = 'Loan Payment';
          } else {
            purposeDisplay = 'Transaction';
          }

          return {
            id: crypto.id,
            type: 'crypto_deposit',
            transaction_type: 'crypto_deposit',
            description: `${crypto.crypto_type} Deposit via ${crypto.network_type} - ${purposeDisplay}`,
            amount: crypto.net_amount || crypto.amount,
            status: crypto.status,
            created_at: crypto.created_at,
            updated_at: crypto.updated_at,
            completed_at: crypto.completed_at,
            crypto_type: crypto.crypto_type,
            network_type: crypto.network_type,
            wallet_address: crypto.wallet_address,
            transaction_hash: crypto.transaction_hash,
            fee: crypto.fee,
            gross_amount: crypto.amount,
            confirmations: crypto.confirmations,
            required_confirmations: crypto.required_confirmations,
            accounts: crypto.accounts,
            reference: crypto.transaction_hash || `CRYPTO-${crypto.id.substring(0, 8).toUpperCase()}`,
            purpose: crypto.purpose
          };
        });

        // Merge and sort all transactions
        transactionsData = [...transactionsData, ...formattedCryptoDeposits]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      setTransactions(transactionsData);
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
      case 'credit': return '💸';
      case 'debit': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      case 'purchase': return '🛒';
      case 'refund': return '↩️';
      case 'interest': return '💎';
      case 'zelle_send': return 'Z';
      case 'zelle_receive': return 'Z';
      case 'crypto_deposit': return '₿';
      default: return '💼';
    }
  };

  const isTransactionCredit = (tx) => {
    const txType = (tx.type || tx.transaction_type || '').toLowerCase();
    const description = (tx.description || '').toLowerCase();

    // Check transaction type first for exact matches
    if (txType === 'deposit' || 
        txType === 'credit' || 
        txType === 'interest' || 
        txType === 'refund' || 
        txType === 'bonus' || 
        txType === 'reward' || 
        txType === 'cashback' || 
        txType === 'zelle_receive' ||
        txType === 'crypto_deposit' ||
        description.includes('received from') ||
        description.includes('transfer from')) {
      return true;
    }

    if (txType === 'withdrawal' || 
        txType === 'debit' || 
        txType === 'purchase' || 
        txType === 'bill_payment' || 
        txType === 'fee' || 
        txType === 'payment' || 
        txType === 'zelle_send' ||
        description.includes('transfer to') ||
        description.includes('sent to')) {
      return false;
    }

    // Fallback
    const amount = parseFloat(tx.amount) || 0;
    return amount >= 0;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return { bg: '#d1fae5', color: '#059669' };
      case 'pending':
        return { bg: '#fef3c7', color: '#f59e0b' };
      case 'failed':
        return { bg: '#fee2e2', color: '#dc2626' };
      case 'cancelled':
        return { bg: '#f3f4f6', color: '#6b7280' };
      default:
        return { bg: '#e0e7ff', color: '#4f46e5' };
    }
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions]; // Create a copy to avoid mutation

    if (filter !== 'all') {
      filtered = filtered.filter(tx => {
        const isCredit = isTransactionCredit(tx);
        if (filter === 'credits') return isCredit;
        if (filter === 'debits') return !isCredit;
        return true;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => 
        (tx.status || 'completed').toLowerCase() === statusFilter.toLowerCase()
      );
    }

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
          ← Back
        </Link>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.content}>
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

          <div style={styles.filters}>
            <button
              onClick={() => setStatusFilter('all')}
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'all' ? styles.filterButtonActive : {})
              }}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'completed' ? styles.filterButtonActive : {})
              }}
            >
              ✓ Completed
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'pending' ? styles.filterButtonActive : {})
              }}
            >
              ⏳ Pending
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'failed' ? styles.filterButtonActive : {})
              }}
            >
              ✗ Failed
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              style={{
                ...styles.filterButton,
                ...(statusFilter === 'cancelled' ? styles.filterButtonActive : {})
              }}
            >
              ⊘ Cancelled
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
              const status = tx.status || 'completed';
              const statusColors = getStatusColor(status);

              return (
                <div key={tx.id} style={styles.transactionItem}>
                  <div style={styles.transactionLeft}>
                    <span style={styles.transactionIcon}>
                      {getTransactionIcon(tx.type || tx.transaction_type)}
                    </span>
                    <div style={styles.transactionInfo}>
                      <div style={styles.transactionDescription}>
                        {tx.description || (tx.type || tx.transaction_type)?.replace(/_/g, ' ').toUpperCase()}</div>
                      <div style={styles.transactionDate}>
                        {formatDate(tx.created_at)}
                      </div>
                      {tx.accounts?.account_number && (
                        <div style={styles.transactionAccount}>
                          Account •••• {tx.accounts.account_number.slice(-4)}
                        </div>
                      )}
                      {tx.reference && (
                        <div 
                          style={styles.transactionRef}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(tx.reference);
                              alert('Reference number copied to clipboard!');
                            } catch (err) {
                              // Fallback for browsers without clipboard API
                              const textArea = document.createElement('textarea');
                              textArea.value = tx.reference;
                              textArea.style.position = 'fixed';
                              textArea.style.opacity = '0';
                              document.body.appendChild(textArea);
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                alert('Reference number copied to clipboard!');
                              } catch (e) {
                                alert(`Reference: ${tx.reference}`);
                              }
                              document.body.removeChild(textArea);
                            }
                          }}
                          title="Click to copy reference number"
                        >
                          Ref: {tx.reference} 📋
                        </div>
                      )}
                      {tx.transaction_type === 'crypto_deposit' && (
                        <>
                          {tx.fee && (
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Fee: ${parseFloat(tx.fee).toFixed(2)} | Gross: ${parseFloat(tx.gross_amount || tx.amount).toFixed(2)}
                            </div>
                          )}
                          {tx.confirmations !== undefined && (
                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                              Confirmations: {tx.confirmations}/{tx.required_confirmations || 3}
                            </div>
                          )}
                        </>
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
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: statusColors.bg,
                      color: statusColors.color
                    }}>
                      {status}
                    </div>
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
    padding: '1rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  title: {
    fontSize: '1.3rem',
    fontWeight: '700',
    margin: 0
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'all 0.3s ease'
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '50vh',
    fontSize: '1rem',
    color: '#64748b'
  },
  error: {
    color: '#dc3545',
    backgroundColor: '#f8d7da',
    padding: '12px',
    borderRadius: '8px',
    margin: '15px',
    textAlign: 'center',
    fontSize: '0.85rem'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem'
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  filters: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '0.5rem 0.8rem',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  },
  filterButtonActive: {
    backgroundColor: '#1e40af',
    color: 'white',
    borderColor: '#1e40af'
  },
  searchInput: {
    width: '100%',
    padding: '0.6rem 1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '0.85rem'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem'
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem'
  },
  transactionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  transactionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
    minWidth: 0
  },
  transactionIcon: {
    fontSize: '1.2rem',
    flexShrink: 0
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0
  },
  transactionDescription: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.2rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  transactionDate: {
    fontSize: '0.7rem',
    color: '#64748b'
  },
  transactionAccount: {
    fontSize: '0.65rem',
    color: '#94a3b8',
    marginTop: '0.2rem'
  },
  transactionRef: {
    fontSize: '0.65rem',
    color: '#1e40af',
    marginTop: '0.2rem',
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: '600'
  },
  transactionRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.3rem',
    flexShrink: 0
  },
  transactionAmount: {
    fontSize: '0.85rem',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  statusBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.65rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap'
  }
};