
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
  const [selectedTransaction, setSelectedTransaction] = useState(null);
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
          ),
          crypto_assets:crypto_asset_id (
            crypto_type,
            network_type,
            symbol
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch account opening crypto deposits
      const { data: accountOpeningDeposits } = await supabase
        .from('account_opening_crypto_deposits')
        .select(`
          *,
          accounts:account_id (
            account_number,
            account_type
          ),
          crypto_assets:crypto_asset_id (
            crypto_type,
            network_type,
            symbol
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch loan payments
      const { data: loanPaymentsData } = await supabase
        .from('loan_payments')
        .select(`
          *,
          loans:loan_id (
            loan_type,
            loan_reference
          ),
          accounts:account_id (
            account_number,
            account_type
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      // Format loan payments as transactions
      if (loanPaymentsData && loanPaymentsData.length > 0) {
        const formattedLoanPayments = loanPaymentsData.map(payment => ({
          id: payment.id,
          type: 'loan_payment',
          transaction_type: 'loan_payment',
          description: `Loan Payment - ${payment.loans?.loan_type?.replace(/_/g, ' ').toUpperCase() || 'Loan'}`,
          amount: payment.amount || 0,
          status: payment.status || 'pending',
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          payment_date: payment.payment_date,
          accounts: payment.accounts,
          reference: payment.reference_number || `LOAN-${payment.id.substring(0, 8).toUpperCase()}`,
          loan_reference: payment.loans?.loan_reference,
          principal_amount: payment.principal_amount,
          interest_amount: payment.interest_amount,
          late_fee: payment.late_fee,
          balance_after: payment.balance_after
        }));

        transactionsData = [...transactionsData, ...formattedLoanPayments];
      }

      // Merge and format crypto deposits as transactions
      if (cryptoTxData && cryptoTxData.length > 0) {
        const formattedCryptoDeposits = cryptoTxData.map(crypto => {
          let purposeDisplay = '';
          if (crypto.purpose === 'general_deposit') {
            purposeDisplay = 'Add to Balance';
          } else if (crypto.purpose === 'loan_requirement') {
            purposeDisplay = 'Loan Deposit (10% Collateral)';
          } else if (crypto.purpose === 'loan_payment') {
            purposeDisplay = 'Loan Payment';
          } else {
            purposeDisplay = 'Deposit';
          }

          const cryptoSymbol = crypto.crypto_assets?.symbol || 'CRYPTO';
          const cryptoType = crypto.crypto_assets?.crypto_type || 'Cryptocurrency';
          const networkName = crypto.crypto_assets?.network_type || 'Network';

          return {
            id: crypto.id,
            type: 'crypto_deposit',
            transaction_type: 'crypto_deposit',
            description: `${cryptoSymbol} ${purposeDisplay} via ${networkName}`,
            amount: crypto.net_amount || crypto.amount || 0,
            status: crypto.status || 'pending',
            created_at: crypto.created_at,
            updated_at: crypto.updated_at,
            completed_at: crypto.completed_at,
            crypto_type: cryptoType,
            crypto_symbol: cryptoSymbol,
            network_type: networkName,
            wallet_address: crypto.metadata?.wallet_address || crypto.wallet_address,
            transaction_hash: crypto.transaction_hash,
            fee: crypto.fee,
            gross_amount: crypto.amount,
            confirmations: crypto.confirmations,
            required_confirmations: crypto.required_confirmations,
            accounts: crypto.accounts,
            reference: crypto.transaction_hash || `CRYPTO-${crypto.id.substring(0, 8).toUpperCase()}`,
            purpose: crypto.purpose,
            is_account_opening: crypto.metadata?.funding_mode || false
          };
        });

        transactionsData = [...transactionsData, ...formattedCryptoDeposits];
      }

      // Format account opening crypto deposits as transactions
      if (accountOpeningDeposits && accountOpeningDeposits.length > 0) {
        const formattedAccountOpeningDeposits = accountOpeningDeposits.map(deposit => {
          const cryptoSymbol = deposit.crypto_assets?.symbol || 'CRYPTO';
          const cryptoType = deposit.crypto_assets?.crypto_type || 'Cryptocurrency';
          const networkName = deposit.crypto_assets?.network_type || 'Network';

          return {
            id: deposit.id,
            type: 'account_opening_deposit',
            transaction_type: 'crypto_deposit',
            description: `${cryptoSymbol} Account Opening Deposit`,
            amount: deposit.net_amount || deposit.amount || 0,
            status: deposit.status || 'pending',
            created_at: deposit.created_at,
            updated_at: deposit.updated_at,
            completed_at: deposit.completed_at,
            crypto_type: cryptoType,
            crypto_symbol: cryptoSymbol,
            network_type: networkName,
            transaction_hash: deposit.tx_hash,
            fee: deposit.fee,
            gross_amount: deposit.amount,
            confirmations: deposit.confirmations,
            required_confirmations: deposit.required_confirmations,
            accounts: deposit.accounts,
            reference: deposit.tx_hash || `OPENING-${deposit.id.substring(0, 8).toUpperCase()}`,
            purpose: 'account_activation'
          };
        });

        transactionsData = [...transactionsData, ...formattedAccountOpeningDeposits];
      }

      // Sort all transactions
      transactionsData = transactionsData
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
      case 'loan_payment': return '🏦';
      default: return '💼';
    }
  };

  const isTransactionCredit = (tx) => {
    const txType = (tx.type || tx.transaction_type || '').toLowerCase();
    const description = (tx.description || '').toLowerCase();

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
        txType === 'loan_payment' ||
        txType === 'zelle_send' ||
        description.includes('transfer to') ||
        description.includes('sent to')) {
      return false;
    }

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
    let filtered = [...transactions];

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

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Copied to clipboard!');
      } catch (e) {
        alert(`Value: ${text}`);
      }
      document.body.removeChild(textArea);
    }
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
              const amount = parseFloat(tx.amount) || 0;
              const isCredit = isTransactionCredit(tx);
              const status = tx.status || 'completed';
              const statusColors = getStatusColor(status);

              return (
                <div 
                  key={tx.id} 
                  style={styles.transactionItem}
                  onClick={() => setSelectedTransaction(tx)}
                >
                  <div style={styles.transactionLeft}>
                    <span style={styles.transactionIcon}>
                      {getTransactionIcon(tx.type || tx.transaction_type)}
                    </span>
                    <div style={styles.transactionInfo}>
                      <div style={styles.transactionDescription}>
                        {tx.description || (tx.type || tx.transaction_type)?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div style={styles.transactionDate}>
                        {formatDate(tx.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={styles.transactionRight}>
                    <div style={{
                      ...styles.transactionAmount,
                      color: status?.toLowerCase() === 'pending' ? '#f59e0b' : 
                             (isCredit ? '#059669' : '#dc2626')
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

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div style={styles.modalOverlay} onClick={() => setSelectedTransaction(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Transaction Details</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setSelectedTransaction(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Type:</span>
                <span style={styles.detailValue}>
                  {getTransactionIcon(selectedTransaction.type || selectedTransaction.transaction_type)} {' '}
                  {selectedTransaction.description || (selectedTransaction.type || selectedTransaction.transaction_type)?.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Amount:</span>
                <span style={{
                  ...styles.detailValue,
                  color: isTransactionCredit(selectedTransaction) ? '#059669' : '#dc2626',
                  fontWeight: '700',
                  fontSize: '1.1rem'
                }}>
                  {isTransactionCredit(selectedTransaction) ? '+' : '-'}
                  {formatCurrency(Math.abs(parseFloat(selectedTransaction.amount) || 0))}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Status:</span>
                <span style={{
                  ...styles.statusBadge,
                  ...getStatusColor(selectedTransaction.status || 'completed')
                }}>
                  {selectedTransaction.status || 'completed'}
                </span>
              </div>

              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Date:</span>
                <span style={styles.detailValue}>{formatDate(selectedTransaction.created_at)}</span>
              </div>

              {selectedTransaction.accounts?.account_number && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Account:</span>
                  <span style={styles.detailValue}>
                    {selectedTransaction.accounts.account_type} (••••{selectedTransaction.accounts.account_number.slice(-4)})
                  </span>
                </div>
              )}

              {selectedTransaction.reference && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Reference:</span>
                  <span 
                    style={{...styles.detailValue, ...styles.copyableText}}
                    onClick={() => copyToClipboard(selectedTransaction.reference)}
                  >
                    {selectedTransaction.reference} 📋
                  </span>
                </div>
              )}

              {selectedTransaction.transaction_type === 'loan_payment' && (
                <>
                  <div style={styles.divider}></div>
                  <h3 style={styles.sectionTitle}>Loan Payment Details</h3>

                  {selectedTransaction.loan_reference && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Loan Reference:</span>
                      <span style={styles.detailValue}>{selectedTransaction.loan_reference}</span>
                    </div>
                  )}

                  {selectedTransaction.principal_amount && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Principal:</span>
                      <span style={styles.detailValue}>{formatCurrency(selectedTransaction.principal_amount)}</span>
                    </div>
                  )}

                  {selectedTransaction.interest_amount && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Interest:</span>
                      <span style={styles.detailValue}>{formatCurrency(selectedTransaction.interest_amount)}</span>
                    </div>
                  )}

                  {selectedTransaction.late_fee && parseFloat(selectedTransaction.late_fee) > 0 && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Late Fee:</span>
                      <span style={{...styles.detailValue, color: '#ef4444'}}>{formatCurrency(selectedTransaction.late_fee)}</span>
                    </div>
                  )}

                  {selectedTransaction.balance_after !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Remaining Balance:</span>
                      <span style={styles.detailValue}>{formatCurrency(selectedTransaction.balance_after)}</span>
                    </div>
                  )}
                </>
              )}

              {selectedTransaction.transaction_type === 'crypto_deposit' && (
                <>
                  <div style={styles.divider}></div>
                  <h3 style={styles.sectionTitle}>Crypto Details</h3>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Cryptocurrency:</span>
                    <span style={styles.detailValue}>
                      {selectedTransaction.crypto_symbol} ({selectedTransaction.crypto_type})
                    </span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Network:</span>
                    <span style={styles.detailValue}>{selectedTransaction.network_type}</span>
                  </div>

                  {selectedTransaction.wallet_address && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Wallet Address:</span>
                      <span 
                        style={{...styles.detailValue, ...styles.copyableText, fontSize: '0.75rem'}}
                        onClick={() => copyToClipboard(selectedTransaction.wallet_address)}
                      >
                        {selectedTransaction.wallet_address.substring(0, 20)}...{selectedTransaction.wallet_address.slice(-10)} 📋
                      </span>
                    </div>
                  )}

                  {selectedTransaction.transaction_hash && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Transaction Hash:</span>
                      <span 
                        style={{...styles.detailValue, ...styles.copyableText, fontSize: '0.75rem'}}
                        onClick={() => copyToClipboard(selectedTransaction.transaction_hash)}
                      >
                        {selectedTransaction.transaction_hash.substring(0, 20)}...{selectedTransaction.transaction_hash.slice(-10)} 📋
                      </span>
                    </div>
                  )}

                  {selectedTransaction.fee && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Fee:</span>
                      <span style={styles.detailValue}>{formatCurrency(selectedTransaction.fee)}</span>
                    </div>
                  )}

                  {selectedTransaction.gross_amount && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Gross Amount:</span>
                      <span style={styles.detailValue}>{formatCurrency(selectedTransaction.gross_amount)}</span>
                    </div>
                  )}

                  {selectedTransaction.confirmations !== undefined && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Confirmations:</span>
                      <span style={styles.detailValue}>
                        {selectedTransaction.confirmations}/{selectedTransaction.required_confirmations || 3}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  transactionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    flex: 1,
    minWidth: 0
  },
  transactionIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: '10px'
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0
  },
  transactionDescription: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.2rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  transactionDate: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  transactionRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.4rem',
    flexShrink: 0
  },
  transactionAmount: {
    fontSize: '0.95rem',
    fontWeight: '700',
    whiteSpace: 'nowrap'
  },
  statusBadge: {
    padding: '0.25rem 0.7rem',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    backgroundColor: 'white',
    borderRadius: '16px 16px 0 0'
  },
  modalTitle: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0.25rem',
    lineHeight: 1,
    transition: 'color 0.2s'
  },
  modalBody: {
    padding: '1.5rem',
    overflowY: 'auto',
    flex: 1
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9'
  },
  detailLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#64748b'
  },
  detailValue: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: '#1e293b',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word'
  },
  copyableText: {
    color: '#1e40af',
    cursor: 'pointer',
    fontFamily: 'monospace',
    textDecoration: 'underline'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '1rem 0'
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.75rem'
  }
};
