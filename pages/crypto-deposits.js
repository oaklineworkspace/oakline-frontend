import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function CryptoDeposits() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [filters, setFilters] = useState({
    crypto_type: '',
    status: '',
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [deposits, filters]);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/sign-in');
        return;
      }

      setUser(session.user);
      await fetchDeposits(session);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeposits = async (session) => {
    try {
      const { data, error } = await supabase
        .from('crypto_deposits')
        .select(`
          *,
          accounts:account_id (
            account_number,
            account_type
          ),
          crypto_assets:crypto_asset_id (
            crypto_type,
            symbol,
            network_type
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deposits:', error);
        return;
      }

      // Log the data to debug
      console.log('Crypto deposits data:', data);
      setDeposits(data || []);
    } catch (error) {
      console.error('Error loading deposits:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...deposits];

    // Apply filters
    if (filters.crypto_type) {
      result = result.filter(d => d.crypto_assets?.symbol === filters.crypto_type);
    }

    if (filters.status) {
      result = result.filter(d => d.status === filters.status);
    }

    if (filters.date_from) {
      result = result.filter(d => new Date(d.created_at) >= new Date(filters.date_from));
    }

    if (filters.date_to) {
      result = result.filter(d => new Date(d.created_at) <= new Date(filters.date_to));
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[filters.sort_by];
      let bVal = b[filters.sort_by];

      if (filters.sort_by === 'amount' || filters.sort_by === 'fee' || filters.sort_by === 'net_amount') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (filters.sort_by === 'created_at' || filters.sort_by === 'updated_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (filters.sort_order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredDeposits(result);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pending', color: '#92400e', bg: '#fef3c7' },
      on_hold: { label: 'On Hold', color: '#92400e', bg: '#fef3c7' },
      awaiting_confirmations: { label: 'Awaiting Confirmations', color: '#92400e', bg: '#fef3c7' },
      confirmed: { label: 'Confirmed', color: '#065f46', bg: '#d1fae5' },
      processing: { label: 'Processing', color: '#92400e', bg: '#fef3c7' },
      completed: { label: 'Completed', color: '#065f46', bg: '#d1fae5' },
      failed: { label: 'Failed', color: '#991b1b', bg: '#fee2e2' },
      reversed: { label: 'Reversed', color: '#991b1b', bg: '#fee2e2' }
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };

    return (
      <span style={{
        ...styles.statusBadge,
        backgroundColor: config.bg,
        color: config.color
      }}>
        {config.label}
      </span>
    );
  };

  const getCryptoIcon = (cryptoType) => {
    const icons = {
      'Bitcoin': '₿',
      'Ethereum': 'Ξ',
      'Tether USD': '₮',
      'USD Coin': '$',
      'BNB': 'B',
      'Solana': 'S',
      'Cardano': 'A',
      'Polygon': 'M',
      'Avalanche': 'A',
      'Litecoin': 'Ł',
      'XRP': 'X',
      'TON': 'T'
    };
    return icons[cryptoType] || '🪙';
  };

  const getCryptoData = (deposit) => {
    // Get crypto data from the joined crypto_assets table
    return {
      type: deposit.crypto_assets?.crypto_type || 'Unknown',
      symbol: deposit.crypto_assets?.symbol || 'N/A',
      network: deposit.crypto_assets?.network_type || 'Unknown'
    };
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toFixed(2);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      crypto_type: '',
      status: '',
      date_from: '',
      date_to: '',
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  const viewDetails = (deposit) => {
    const depositData = {
      referenceNumber: String(deposit.id).substring(0, 8).toUpperCase(),
      date: formatDate(deposit.created_at),
      accountNumber: deposit.accounts?.account_number || 'N/A',
      cryptoType: getCryptoData(deposit).type,
      cryptoSymbol: getCryptoData(deposit).symbol,
      network: getCryptoData(deposit).network,
      amount: formatCurrency(deposit.amount),
      fee: formatCurrency(deposit.fee || 0),
      netAmount: formatCurrency(deposit.net_amount || ((deposit.amount || 0) - (deposit.fee || 0))),
      status: deposit.status,
      confirmations: deposit.confirmations || 0,
      requiredConfirmations: deposit.required_confirmations || 3,
      transactionId: deposit.id,
      completedAt: deposit.completed_at ? formatDate(deposit.completed_at) : null
    };
    
    setSuccessData(depositData);
    setShowSuccessModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeposits = filteredDeposits.slice(startIndex, endIndex);

  const uniqueCryptoTypes = [...new Set(deposits.map(d => d.crypto_assets?.symbol))].filter(Boolean);
  const uniqueStatuses = [...new Set(deposits.map(d => d.status))].filter(Boolean);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading crypto deposits...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Crypto Deposits - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
          <h1 style={styles.headerTitle}>Crypto Deposits</h1>
          <div style={{ width: '80px' }}></div>
        </div>

        <div style={styles.content}>
          {/* Filters Section */}
          <div style={styles.filtersCard}>
            <div style={styles.filtersHeader}>
              <h3 style={styles.filtersTitle}>Filters & Sorting</h3>
              <button onClick={clearFilters} style={styles.clearButton}>
                Clear All
              </button>
            </div>

            <div style={styles.filtersGrid}>
              {/* Crypto Type Filter */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Crypto Type</label>
                <select
                  style={styles.filterSelect}
                  value={filters.crypto_type}
                  onChange={(e) => handleFilterChange('crypto_type', e.target.value)}
                >
                  <option value="">All Types</option>
                  {uniqueCryptoTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Status</label>
                <select
                  style={styles.filterSelect}
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>From Date</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div>

              {/* Date To */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>To Date</label>
                <input
                  type="date"
                  style={styles.filterInput}
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div>

              {/* Sort By */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Sort By</label>
                <select
                  style={styles.filterSelect}
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                >
                  <option value="created_at">Date Created</option>
                  <option value="amount">Amount</option>
                  <option value="status">Status</option>
                  <option value="updated_at">Last Updated</option>
                </select>
              </div>

              {/* Sort Order */}
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>Order</label>
                <select
                  style={styles.filterSelect}
                  value={filters.sort_order}
                  onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div style={styles.summaryBar}>
            <p style={styles.summaryText}>
              Showing {currentDeposits.length} of {filteredDeposits.length} deposits
              {filteredDeposits.length !== deposits.length && ` (${deposits.length} total)`}
            </p>
          </div>

          {/* Deposits List */}
          {currentDeposits.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🪙</div>
              <h3 style={styles.emptyTitle}>No Deposits Found</h3>
              <p style={styles.emptyText}>
                {deposits.length === 0
                  ? "You haven't made any crypto deposits yet."
                  : "No deposits match your current filters."}
              </p>
              {deposits.length > 0 && (
                <button onClick={clearFilters} style={styles.emptyButton}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Crypto</th>
                      <th style={styles.th}>Network</th>
                      <th style={styles.th}>Account</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Fee</th>
                      <th style={styles.th}>Net Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Confirmations</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDeposits.map((deposit) => (
                      <tr key={deposit.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.2rem' }}>{getCryptoIcon(getCryptoData(deposit).type)}</span>
                            <span style={{ fontWeight: '600' }}>{getCryptoData(deposit).symbol}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{getCryptoData(deposit).network}</td>
                        <td style={styles.td}>
                          {deposit.accounts?.account_number ?
                            `****${deposit.accounts.account_number.slice(-4)}` :
                            'N/A'}
                        </td>
                        <td style={styles.td}>{formatCurrency(deposit.amount)}</td>
                        <td style={styles.td}>{formatCurrency(deposit.fee || 0)}</td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>
                          {formatCurrency(deposit.net_amount || ((deposit.amount || 0) - (deposit.fee || 0)))}
                        </td>
                        <td style={styles.td}>{getStatusBadge(deposit.status)}</td>
                        <td style={styles.td}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: (deposit.confirmations || 0) >= (deposit.required_confirmations || 3) ? '#059669' : '#f59e0b'
                          }}>
                            {deposit.confirmations || 0} / {deposit.required_confirmations || 3}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: '0.85rem' }}>
                            {formatDate(deposit.created_at)}
                          </div>
                          {deposit.completed_at && (
                            <div style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.25rem' }}>
                              Completed: {formatDate(deposit.completed_at)}
                            </div>
                          )}
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => viewDetails(deposit)}
                            style={styles.viewButton}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div style={styles.mobileCards}>
                {currentDeposits.map((deposit) => (
                  <div key={deposit.id} style={styles.mobileCard}>
                    <div style={styles.mobileCardHeader}>
                      <div style={styles.cryptoCell}>
                        <span style={styles.cryptoIconLarge}>{getCryptoIcon(getCryptoData(deposit).type)}</span>
                        <div>
                          <div style={styles.cryptoNameLarge}>{getCryptoData(deposit).symbol}</div>
                          <div style={styles.networkType}>{getCryptoData(deposit).network}</div>
                        </div>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>

                    <div style={styles.mobileCardBody}>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Account:</span>
                        <span style={styles.mobileValue}>
                          {deposit.accounts?.account_number ?
                            `****${deposit.accounts.account_number.slice(-4)}` :
                            'N/A'}
                        </span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Amount:</span>
                        <span style={styles.mobileValue}>{formatCurrency(deposit.amount)}</span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Fee:</span>
                        <span style={styles.mobileValue}>{formatCurrency(deposit.fee)}</span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Net Amount:</span>
                        <span style={styles.mobileValueBold}>{formatCurrency(deposit.net_amount || ((deposit.amount || 0) - (deposit.fee || 0)))}</span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Confirmations:</span>
                        <span style={styles.mobileValue}>
                          {deposit.confirmations || 0} / {deposit.required_confirmations || 3}
                        </span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Created:</span>
                        <span style={styles.mobileValue}>{formatDate(deposit.created_at)}</span>
                      </div>
                      {deposit.completed_at && (
                        <div style={styles.mobileRow}>
                          <span style={styles.mobileLabel}>Completed:</span>
                          <span style={styles.mobileValue}>{formatDate(deposit.completed_at)}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => viewDetails(deposit)}
                      style={styles.mobileViewButton}
                    >
                      View Full Details
                    </button>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                    }}
                  >
                    Previous
                  </button>

                  <div style={styles.paginationInfo}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      ...styles.paginationButton,
                      ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Success Modal */}
        {showSuccessModal && successData && (
          <div style={styles.successOverlay} onClick={() => setShowSuccessModal(false)}>
            <div style={styles.successModal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.successIcon}>
                {successData.status === 'completed' || successData.status === 'approved' ? '✅' : 
                 successData.status === 'pending' || successData.status === 'awaiting_confirmations' ? '⏳' : '❌'}
              </div>
              <h2 style={styles.successTitle}>
                {successData.status === 'completed' || successData.status === 'approved' ? 'Deposit Completed!' :
                 successData.status === 'pending' || successData.status === 'awaiting_confirmations' ? 'Deposit Pending' : 'Deposit Status'}
              </h2>
              
              {/* Receipt Details */}
              <div style={styles.successInfoBox}>
                <h3 style={styles.receiptSectionTitle}>📋 Deposit Receipt</h3>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Reference Number:</span>
                  <span style={styles.receiptValue}>{successData.referenceNumber}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Date & Time:</span>
                  <span style={styles.receiptValue}>{successData.date}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Account:</span>
                  <span style={styles.receiptValue}>{successData.accountNumber}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Cryptocurrency:</span>
                  <span style={styles.receiptValue}>{successData.cryptoType} ({successData.cryptoSymbol})</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Network:</span>
                  <span style={styles.receiptValue}>{successData.network}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Deposit Amount:</span>
                  <span style={styles.receiptValue}>{successData.amount}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Network Fee:</span>
                  <span style={styles.receiptValue}>-{successData.fee}</span>
                </div>
                <div style={{...styles.receiptRow, borderTop: '2px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem'}}>
                  <span style={{...styles.receiptLabel, fontWeight: '700', fontSize: '1rem'}}>Net Amount:</span>
                  <span style={{...styles.receiptValue, fontWeight: '700', fontSize: '1.25rem', color: '#059669'}}>{successData.netAmount}</span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Status:</span>
                  <span style={{...styles.receiptValue, 
                    color: successData.status === 'completed' || successData.status === 'approved' ? '#059669' :
                           successData.status === 'pending' || successData.status === 'awaiting_confirmations' ? '#f59e0b' : '#dc2626',
                    fontWeight: '600', textTransform: 'capitalize'}}>
                    {successData.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={styles.receiptRow}>
                  <span style={styles.receiptLabel}>Confirmations:</span>
                  <span style={styles.receiptValue}>{successData.confirmations} / {successData.requiredConfirmations}</span>
                </div>
                {successData.completedAt && (
                  <div style={styles.receiptRow}>
                    <span style={styles.receiptLabel}>Completed:</span>
                    <span style={styles.receiptValue}>{successData.completedAt}</span>
                  </div>
                )}
              </div>

              <div style={styles.successButtons}>
                <button 
                  onClick={() => router.push('/dashboard')} 
                  style={styles.dashboardButton}
                  onMouseEnter={(e) => e.target.style.background = 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'}
                  onMouseLeave={(e) => e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'}
                >
                  Go to Dashboard
                </button>
                <button 
                  onClick={() => setShowSuccessModal(false)} 
                  style={styles.closeButton}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Old Detail Modal - Keep for backward compatibility but hidden */}
        {showDetailModal && selectedDeposit && false && (
          <div style={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Deposit Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={styles.oldCloseButton}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalContent}>
                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Transaction Information</h3>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Cryptocurrency:</span>
                    <span style={styles.detailValue}>
                      {getCryptoIcon(selectedDeposit.crypto_assets?.crypto_type)} {selectedDeposit.crypto_assets?.crypto_type || 'N/A'} ({selectedDeposit.crypto_assets?.symbol || 'N/A'})
                    </span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Network:</span>
                    <span style={styles.detailValue}>{selectedDeposit.crypto_assets?.network_type || 'N/A'}</span>
                  </div>

                  {selectedDeposit.memo && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Memo/Tag:</span>
                      <span style={{...styles.detailValue, wordBreak: 'break-all', fontSize: '0.85rem'}}>
                        {selectedDeposit.memo}
                      </span>
                    </div>
                  )}

                  {selectedDeposit.tx_hash && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Transaction Hash:</span>
                      <span style={{...styles.detailValue, wordBreak: 'break-all', fontSize: '0.85rem'}}>
                        {selectedDeposit.tx_hash}
                      </span>
                    </div>
                  )}
                </div>

                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Amount Details</h3>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Deposit Amount:</span>
                    <span style={styles.detailValue}>{formatCurrency(selectedDeposit.amount)}</span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Processing Fee:</span>
                    <span style={styles.detailValue}>{formatCurrency(selectedDeposit.fee)}</span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Net Amount:</span>
                    <span style={{...styles.detailValue, fontWeight: 'bold', color: '#10b981'}}>
                      {formatCurrency(selectedDeposit.net_amount || 0)}
                    </span>
                  </div>
                </div>

                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Status & Confirmations</h3>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Status:</span>
                    {getStatusBadge(selectedDeposit.status)}
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Confirmations:</span>
                    <span style={styles.detailValue}>
                      {selectedDeposit.confirmations} of {selectedDeposit.required_confirmations} required
                    </span>
                  </div>

                  {selectedDeposit.hold_reason && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Hold Reason:</span>
                      <span style={styles.detailValue}>{selectedDeposit.hold_reason}</span>
                    </div>
                  )}

                  {selectedDeposit.rejection_reason && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Rejection Reason:</span>
                      <span style={{...styles.detailValue, color: '#ef4444'}}>
                        {selectedDeposit.rejection_reason}
                      </span>
                    </div>
                  )}
                </div>

                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Timestamps</h3>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Created:</span>
                    <span style={styles.detailValue}>{formatDate(selectedDeposit.created_at)}</span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Last Updated:</span>
                    <span style={styles.detailValue}>{formatDate(selectedDeposit.updated_at)}</span>
                  </div>

                  {selectedDeposit.completed_at && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Completed:</span>
                      <span style={styles.detailValue}>{formatDate(selectedDeposit.completed_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={styles.modalCloseButtonBottom}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    paddingBottom: '50px'
  },
  header: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2563eb 100%)',
    color: 'white',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '1rem',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '6px',
    transition: 'background 0.2s'
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1.5rem'
  },
  filtersCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  filtersTitle: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#1e293b'
  },
  clearButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background 0.2s'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  filterLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#475569'
  },
  filterSelect: {
    padding: '0.625rem',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9rem',
    backgroundColor: 'white',
    cursor: 'pointer'
  },
  filterInput: {
    padding: '0.625rem',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  summaryBar: {
    backgroundColor: 'white',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  summaryText: {
    margin: 0,
    color: '#64748b',
    fontSize: '0.95rem'
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'none'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f8fafc'
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0'
  },
  tableRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s'
  },
  td: {
    padding: '1rem',
    fontSize: '0.9rem',
    color: '#1e293b'
  },
  cryptoCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  cryptoIcon: {
    fontSize: '1.5rem'
  },
  cryptoName: {
    fontWeight: '600'
  },
  amountValue: {
    fontWeight: '600',
    color: '#1e293b'
  },
  feeValue: {
    color: '#ef4444',
    fontSize: '0.9rem'
  },
  netAmount: {
    fontWeight: '700',
    color: '#10b981',
    fontSize: '1rem'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    whiteSpace: 'nowrap'
  },
  confirmations: {
    fontSize: '0.9rem',
    color: '#6b7280'
  },
  dateCell: {
    fontSize: '0.85rem',
    color: '#6b7280'
  },
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  mobileCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  mobileCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  mobileCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f1f5f9'
  },
  cryptoIconLarge: {
    fontSize: '2rem'
  },
  cryptoNameLarge: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: '#1e293b'
  },
  networkType: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  mobileCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem'
  },
  mobileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mobileLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  mobileValue: {
    fontSize: '0.9rem',
    color: '#1e293b'
  },
  mobileValueBold: {
    fontSize: '1rem',
    color: '#10b981',
    fontWeight: '700'
  },
  mobileViewButton: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600'
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginTop: '2rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  paginationButton: {
    padding: '0.625rem 1.25rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  paginationButtonDisabled: {
    backgroundColor: '#cbd5e1',
    cursor: 'not-allowed'
  },
  paginationInfo: {
    fontSize: '0.95rem',
    color: '#475569',
    fontWeight: '500'
  },
  emptyState: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '3rem 2rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  emptyText: {
    fontSize: '1rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  emptyButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  modalTitle: {
    fontSize: '1.5rem',
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
    lineHeight: 1
  },
  modalContent: {
    padding: '1.5rem'
  },
  detailSection: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f1f5f9'
  },
  detailSectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '1rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    gap: '1rem'
  },
  detailLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
    minWidth: '140px'
  },
  detailValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1
  },
  modalFooter: {
    padding: '1.5rem',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  modalCloseButtonBottom: {
    padding: '0.75rem 2rem',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f1f5f9'
  },
  spinner: {
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    animation: 'spin 1s linear infinite'
  },
  successOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
    padding: '1rem'
  },
  successModal: {
    backgroundColor: 'white',
    padding: '2.5rem',
    borderRadius: '20px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out'
  },
  successIcon: {
    fontSize: '4rem',
    textAlign: 'center',
    marginBottom: '1rem'
  },
  successTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: '1rem'
  },
  successInfoBox: {
    backgroundColor: '#f7fafc',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  receiptSectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9'
  },
  receiptLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500'
  },
  receiptValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word'
  },
  successButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginTop: '1.5rem'
  },
  dashboardButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  oldCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0.25rem',
    lineHeight: 1
  }
};

// Add media query for responsive table
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(min-width: 1024px)');
  const updateDisplay = (matches) => {
    if (styles.tableContainer) styles.tableContainer.display = matches ? 'block' : 'none';
    if (styles.mobileCards) styles.mobileCards.display = matches ? 'none' : 'flex';
  };
  updateDisplay(mediaQuery.matches);
  mediaQuery.addEventListener('change', (e) => updateDisplay(e.matches));
}