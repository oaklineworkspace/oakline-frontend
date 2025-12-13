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
      // Set date filter for 1 year (12 months) old
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const dateFilter = oneYearAgo.toISOString();

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
          .gte('created_at', dateFilter)
          .order('created_at', { ascending: false })
          .limit(100);

        if (txError) throw txError;

        // Filter out loan-related transactions since we fetch enriched data from loan_payments table
        transactionsData = (txs || []).filter(tx => {
          const desc = (tx.description || '').toLowerCase();
          const txType = (tx.type || tx.transaction_type || '').toLowerCase();
          // Exclude loan payments/deposits - they'll be fetched from loan_payments table
          const isLoanTx = desc.includes('loan payment') || 
                          desc.includes('loan pay-') ||
                          txType === 'loan_payment' || 
                          txType === 'loan_deposit';
          return !isLoanTx;
        });
      }

      // Fetch crypto deposits with account details (last 12 months)
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
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch account opening crypto deposits (last 12 months)
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
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch ALL loan payments with joined loan data (same approach as dashboard)
      const { data: allLoanPayments, error: loanPaymentsError } = await supabase
        .from('loan_payments')
        .select(`
          *,
          loans:loan_id (
            id,
            loan_type,
            loan_reference,
            user_id,
            status,
            remaining_balance,
            principal,
            account_id
          ),
          accounts:account_id (
            id,
            account_number,
            account_type
          )
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (loanPaymentsError) {
        console.error('Error fetching loan payments:', loanPaymentsError);
      }
      
      // Filter to only include payments for the current user's loans (same as dashboard)
      const loanPaymentsData = (allLoanPayments || []).filter(payment => 
        payment.loans?.user_id === user.id
      );
      console.log('Fetched loan payments for user:', loanPaymentsData.length);

      // Format loan payments as transactions
      if (loanPaymentsData && loanPaymentsData.length > 0) {
        console.log('Formatting loan payments for display:', loanPaymentsData);
        console.log('Loan payments raw data:', JSON.stringify(loanPaymentsData, null, 2));
        const formattedLoanPayments = loanPaymentsData.map(payment => {
          const isDeposit = payment.is_deposit === true || payment.payment_type === 'deposit';
          const loanType = payment.loans?.loan_type || 'PERSONAL LOAN';

          // Try to get description from database first (metadata.description or notes)
          let description = payment.metadata?.description || payment.notes;

          // If no description in database, build it (for backward compatibility)
          if (!description) {
            if (payment.is_deposit) {
              // Extract crypto details from metadata if available
              const cryptoType = payment.metadata?.crypto_type || 'Cryptocurrency';
              const networkType = payment.metadata?.network_type || '';
              const cryptoSymbol = cryptoType === 'Bitcoin' ? 'BTC' :
                                 cryptoType === 'Ethereum' ? 'ETH' :
                                 cryptoType === 'Tether USD' ? 'USDT' :
                                 cryptoType === 'USD Coin' ? 'USDC' : cryptoType;

              if (payment.deposit_method === 'crypto') {
                description = `Loan 10% Collateral Deposit via ${cryptoSymbol} (${networkType})`;
              } else if (payment.deposit_method === 'bank_transfer') {
                description = `Loan 10% Collateral Deposit via Bank Transfer`;
              } else if (payment.deposit_method === 'account_balance' || payment.deposit_method === 'balance') {
                description = `Loan 10% Collateral Deposit via Account Balance`;
              } else {
                description = `Loan 10% Collateral Deposit`;
              }
            } else if (payment.payment_type === 'early_payoff') {
              description = `Loan Early Payoff - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            } else if (payment.payment_type === 'late_fee') {
              description = `Loan Late Fee - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            } else if (payment.payment_type === 'auto_payment') {
              description = `Auto Loan Payment - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            } else if (payment.payment_method === 'crypto' && payment.metadata?.crypto_type) {
              // Regular loan payment made with crypto - check payment_method, not deposit_method
              const cryptoType = payment.metadata.crypto_type;
              const networkType = payment.metadata.network_type || '';
              const cryptoSymbol = cryptoType === 'Bitcoin' ? 'BTC' :
                                 cryptoType === 'Ethereum' ? 'ETH' :
                                 cryptoType === 'Tether USD' ? 'USDT' :
                                 cryptoType === 'USD Coin' ? 'USDC' : cryptoType;
              description = `Loan Payment via ${cryptoSymbol} (${networkType}) - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            } else if (payment.payment_method === 'account_balance' || payment.deposit_method === 'balance' || !payment.payment_method) {
              // Regular loan payment made with account balance
              description = `Loan Payment - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            } else {
              description = `Loan Payment - ${loanType.replace(/_/g, ' ').toUpperCase()}`;
            }
          }

          return {
            id: payment.id,
            type: isDeposit ? 'loan_deposit' : 'loan_payment',
            transaction_type: isDeposit ? 'loan_deposit' : 'loan_payment',
            description: description,
            amount: payment.amount || 0,
            status: payment.status || 'completed',
            created_at: payment.created_at,
            updated_at: payment.updated_at,
            payment_date: payment.payment_date,
            accounts: payment.accounts,
            reference: payment.reference_number || `LOAN-${payment.id.substring(0, 8).toUpperCase()}`,
            loan_reference: payment.loans?.loan_reference,
            loan_type: loanType,
            loan_id: payment.loan_id,
            principal_amount: payment.principal_amount,
            interest_amount: payment.interest_amount,
            late_fee: payment.late_fee,
            balance_after: payment.balance_after,
            payment_type: payment.payment_type,
            deposit_method: payment.deposit_method,
            payment_method: payment.payment_method,
            metadata: payment.metadata,
            tx_hash: payment.tx_hash,
            fee: payment.fee,
            gross_amount: payment.gross_amount,
            confirmations: payment.confirmations,
            required_confirmations: payment.required_confirmations,
            is_deposit: payment.is_deposit,
            user_id: user.id,
            transaction_data: payment
          };
        });

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
      // Only show pending deposits - completed ones are already in transactions table
      if (accountOpeningDeposits && accountOpeningDeposits.length > 0) {
        const formattedAccountOpeningDeposits = accountOpeningDeposits
          .filter(deposit => {
            const status = (deposit.status || '').toLowerCase();
            // Only show if not completed or confirmed (those are already in transactions table)
            return status !== 'completed' && status !== 'confirmed' && status !== 'approved';
          })
          .map(deposit => {
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
    const status = (tx.status || 'completed').toLowerCase();

    // For cancelled/reversed transactions, check if it's a refund or reversal
    if (status === 'cancelled' || status === 'reversed') {
      // If description explicitly says "refund", it's money returned (credit)
      if (description.includes('refund')) {
        return true;
      }
      // If it's a cancelled transfer without "refund" in description, treat as debit (original attempt)
      if (description.includes('wire transfer cancelled') || 
          description.includes('transfer cancelled')) {
        return false;
      }
      // If it was originally a debit/withdrawal that got cancelled, the refund is a credit
      if (txType === 'debit' || txType === 'withdrawal') {
        return true;
      }
      // Otherwise, treat as debit
      return false;
    }

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
        description.includes('online shopping') ||
        description.includes('purchase') ||
        description.includes('shopping') ||
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
        return { bg: '#d1fae5', color: '#047857', fontWeight: '600' };
      case 'pending':
      case 'hold':
        return { bg: '#fef3c7', color: '#b45309', fontWeight: '600' };
      case 'failed':
        return { bg: '#fee2e2', color: '#b91c1c', fontWeight: '700' };
      case 'cancelled':
        return { bg: '#e5e7eb', color: '#6b7280', fontWeight: '600' };
      case 'reversed':
        return { bg: '#e5e7eb', color: '#6b7280', fontWeight: '600' };
      default:
        return { bg: '#e0e7ff', color: '#4338ca', fontWeight: '600' };
    }
  };

  const getDisplayStatus = (status) => {
    return status?.toLowerCase() === 'hold' ? 'Pending' : status;
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
                      color: (status?.toLowerCase() === 'pending' || status?.toLowerCase() === 'hold') ? '#d97706' :
                             status?.toLowerCase() === 'cancelled' ? '#6b7280' :
                             status?.toLowerCase() === 'reversed' ? '#6b7280' :
                             (isCredit ? '#047857' : '#b91c1c'),
                      fontWeight: '700'
                    }}>
                      {isCredit ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: statusColors.bg,
                      color: statusColors.color,
                      fontWeight: statusColors.fontWeight
                    }}>
                      {getDisplayStatus(status)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction Receipt Modal - styled like dashboard */}
      {selectedTransaction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0.25rem 0.5rem'
              }}
              onClick={() => setSelectedTransaction(null)}
            >
              ×
            </button>

            <div style={{
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '0.5rem'
              }}>
                Transaction Receipt
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {selectedTransaction.accounts?.account_type?.replace(/_/g, ' ').toUpperCase() || 'Account'}
              </p>
            </div>

            <div style={{
              backgroundColor: '#f0f9ff',
              padding: '1.5rem',
              borderRadius: '12px',
              margin: '1.5rem 0',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#64748b',
                marginBottom: '0.5rem'
              }}>
                Amount
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: isTransactionCredit(selectedTransaction) ? '#059669' : '#dc2626'
              }}>
                {isTransactionCredit(selectedTransaction) ? '+' : '-'}
                {formatCurrency(Math.abs(parseFloat(selectedTransaction.amount) || 0))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                Transaction Type
              </span>
              <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right', maxWidth: '60%' }}>
                {(selectedTransaction.type || selectedTransaction.transaction_type || 'Transaction')
                  .replace(/_/g, ' ')
                  .toUpperCase()}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                Description
              </span>
              <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>
                {selectedTransaction.description || 'N/A'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                Status
              </span>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                textAlign: 'right',
                ...(() => {
                  const status = (selectedTransaction.status || 'completed').toLowerCase();
                  if (status === 'completed' || status === 'approved' || status === 'confirmed') {
                    return { color: '#065f46', backgroundColor: '#d1fae5', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  } else if (status === 'pending' || status === 'awaiting_confirmations' || status === 'processing' || status === 'hold') {
                    return { color: '#92400e', backgroundColor: '#fef3c7', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  } else if (status === 'failed' || status === 'rejected') {
                    return { color: '#991b1b', backgroundColor: '#fee2e2', padding: '0.25rem 0.75rem', borderRadius: '12px' };
                  }
                  return { color: '#4b5563' };
                })()
              }}>
                {(selectedTransaction.status?.toLowerCase() === 'hold' ? 'PENDING' : (selectedTransaction.status || 'Completed').replace(/_/g, ' ').toUpperCase())}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                Date & Time
              </span>
              <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                {formatDate(selectedTransaction.created_at)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                Reference Number
              </span>
              <span style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right' }}>
                {selectedTransaction.reference || selectedTransaction.id?.slice(0, 8).toUpperCase() || 'N/A'}
              </span>
            </div>

            {!((selectedTransaction.transaction_type === 'loan_deposit' || selectedTransaction.transaction_type === 'loan_payment') && (selectedTransaction.deposit_method === 'crypto' || selectedTransaction.payment_method === 'crypto')) && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: '1px solid #f1f5f9'
              }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                  Account Number
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right' }}>
                  {selectedTransaction.accounts?.account_number || 'N/A'}
                </span>
              </div>
            )}

            {/* Loan Payment/Deposit Details */}
            {(selectedTransaction.transaction_type === 'loan_payment' || selectedTransaction.transaction_type === 'loan_deposit') && (
              <>
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px solid #e2e8f0'
                }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '1rem'
                  }}>
                    Payment Method Details
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                    Payment Method
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                    {selectedTransaction.deposit_method === 'crypto' || selectedTransaction.payment_method === 'crypto' ? '🪙 Cryptocurrency' :
                     selectedTransaction.deposit_method === 'balance' || selectedTransaction.payment_method === 'account_balance' || !selectedTransaction.payment_method ? '💰 Account Balance' :
                     selectedTransaction.deposit_method === 'bank_transfer' ? '🏦 Bank Transfer' :
                     '💰 Account Balance'}
                  </span>
                </div>

                {(selectedTransaction.deposit_method === 'crypto' || selectedTransaction.payment_method === 'crypto') && selectedTransaction.metadata && (
                  <>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                        Cryptocurrency
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                        {selectedTransaction.metadata.crypto_symbol || selectedTransaction.metadata.crypto_type || 'Cryptocurrency'}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                        Network
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                        {selectedTransaction.metadata.network_type || 'Network'}
                      </span>
                    </div>
                    {selectedTransaction.metadata.wallet_address && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Wallet Address
                        </span>
                        <span 
                          style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', cursor: 'pointer' }}
                          onClick={() => copyToClipboard(selectedTransaction.metadata.wallet_address)}
                        >
                          {selectedTransaction.metadata.wallet_address} 📋
                        </span>
                      </div>
                    )}
                    {selectedTransaction.tx_hash && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Transaction Hash
                        </span>
                        <span 
                          style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', cursor: 'pointer' }}
                          onClick={() => copyToClipboard(selectedTransaction.tx_hash)}
                        >
                          {selectedTransaction.tx_hash} 📋
                        </span>
                      </div>
                    )}
                    {selectedTransaction.fee > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Network Fee
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.fee)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.gross_amount && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Gross Amount
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.gross_amount)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {((selectedTransaction.deposit_method === 'balance' || selectedTransaction.payment_method === 'account_balance' || !selectedTransaction.payment_method) && selectedTransaction.accounts) && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Account Number
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right' }}>
                      {selectedTransaction.accounts.account_number || 'N/A'}
                    </span>
                  </div>
                )}

                {selectedTransaction.transaction_type === 'loan_payment' && (selectedTransaction.principal_amount || selectedTransaction.interest_amount || selectedTransaction.balance_after !== undefined) && (
                  <>
                    <div style={{
                      marginTop: '1.5rem',
                      paddingTop: '1.5rem',
                      borderTop: '2px solid #e2e8f0'
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        marginBottom: '1rem'
                      }}>
                        Payment Breakdown
                      </h3>
                    </div>

                    {selectedTransaction.principal_amount && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Principal
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.principal_amount)}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.interest_amount && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Interest
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.interest_amount)}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.late_fee && parseFloat(selectedTransaction.late_fee) > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Late Fee
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.late_fee)}
                        </span>
                      </div>
                    )}

                    {selectedTransaction.balance_after !== undefined && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid #f1f5f9'
                      }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                          Remaining Balance
                        </span>
                        <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                          {formatCurrency(selectedTransaction.balance_after)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Crypto Deposit Details */}
            {selectedTransaction.transaction_type === 'crypto_deposit' && (
              <>
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.5rem',
                  borderTop: '2px solid #e2e8f0'
                }}>
                  <h3 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '1rem'
                  }}>
                    Cryptocurrency Details
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                    Cryptocurrency
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                    {selectedTransaction.crypto_symbol} ({selectedTransaction.crypto_type})
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                    Network
                  </span>
                  <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                    {selectedTransaction.network_type}
                  </span>
                </div>

                {selectedTransaction.wallet_address && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Wallet Address
                    </span>
                    <span 
                      style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', cursor: 'pointer' }}
                      onClick={() => copyToClipboard(selectedTransaction.wallet_address)}
                    >
                      {selectedTransaction.wallet_address.substring(0, 20)}...{selectedTransaction.wallet_address.slice(-10)} 📋
                    </span>
                  </div>
                )}

                {selectedTransaction.transaction_hash && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Transaction Hash
                    </span>
                    <span 
                      style={{ fontSize: '0.75rem', color: '#1e293b', fontWeight: '600', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', cursor: 'pointer' }}
                      onClick={() => copyToClipboard(selectedTransaction.transaction_hash)}
                    >
                      {selectedTransaction.transaction_hash.substring(0, 20)}...{selectedTransaction.transaction_hash.slice(-10)} 📋
                    </span>
                  </div>
                )}

                {selectedTransaction.fee && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Fee
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                      {formatCurrency(selectedTransaction.fee)}
                    </span>
                  </div>
                )}

                {selectedTransaction.gross_amount && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Gross Amount
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                      {formatCurrency(selectedTransaction.gross_amount)}
                    </span>
                  </div>
                )}

                {selectedTransaction.confirmations !== undefined && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>
                      Confirmations
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: '600', textAlign: 'right' }}>
                      {selectedTransaction.confirmations}/{selectedTransaction.required_confirmations || 3}
                    </span>
                  </div>
                )}
              </>
            )}
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
    color: '#0f172a',
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