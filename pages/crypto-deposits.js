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
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...deposits];

    // Apply filters
    if (filters.crypto_type) {
      result = result.filter(d => d.crypto_type === filters.crypto_type);
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
      pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
      on_hold: { label: 'On Hold', color: '#f59e0b', bg: '#fef3c7' },
      awaiting_confirmations: { label: 'Awaiting Confirmations', color: '#3b82f6', bg: '#dbeafe' },
      confirmed: { label: 'Confirmed', color: '#10b981', bg: '#d1fae5' },
      processing: { label: 'Processing', color: '#3b82f6', bg: '#dbeafe' },
      completed: { label: 'Completed', color: '#10b981', bg: '#d1fae5' },
      failed: { label: 'Failed', color: '#ef4444', bg: '#fee2e2' },
      reversed: { label: 'Reversed', color: '#ef4444', bg: '#fee2e2' }
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
      BTC: '₿',
      ETH: 'Ξ',
      USDT: '₮',
      BNB: 'B'
    };
    return icons[cryptoType] || '🪙';
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
    setSelectedDeposit(deposit);
    setShowDetailModal(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredDeposits.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDeposits = filteredDeposits.slice(startIndex, endIndex);

  const uniqueCryptoTypes = [...new Set(deposits.map(d => d.crypto_type))];
  const uniqueStatuses = [...new Set(deposits.map(d => d.status))];

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
                          <div style={styles.cryptoCell}>
                            <span style={styles.cryptoIcon}>{getCryptoIcon(deposit.crypto_type)}</span>
                            <span style={styles.cryptoName}>{deposit.crypto_type}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{deposit.network_type}</td>
                        <td style={styles.td}>
                          <span style={styles.amountValue}>{formatCurrency(deposit.amount)}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.feeValue}>{formatCurrency(deposit.fee)}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.netAmount}>{formatCurrency(deposit.net_amount)}</span>
                        </td>
                        <td style={styles.td}>{getStatusBadge(deposit.status)}</td>
                        <td style={styles.td}>
                          <span style={styles.confirmations}>
                            {deposit.confirmations}/{deposit.required_confirmations}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.dateCell}>
                            {formatDate(deposit.created_at)}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <button
                            onClick={() => viewDetails(deposit)}
                            style={styles.viewButton}
                          >
                            View
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
                        <span style={styles.cryptoIconLarge}>{getCryptoIcon(deposit.crypto_type)}</span>
                        <div>
                          <div style={styles.cryptoNameLarge}>{deposit.crypto_type}</div>
                          <div style={styles.networkType}>{deposit.network_type}</div>
                        </div>
                      </div>
                      {getStatusBadge(deposit.status)}
                    </div>

                    <div style={styles.mobileCardBody}>
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
                        <span style={styles.mobileValueBold}>{formatCurrency(deposit.net_amount)}</span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Confirmations:</span>
                        <span style={styles.mobileValue}>
                          {deposit.confirmations}/{deposit.required_confirmations}
                        </span>
                      </div>
                      <div style={styles.mobileRow}>
                        <span style={styles.mobileLabel}>Date:</span>
                        <span style={styles.mobileValue}>{formatDate(deposit.created_at)}</span>
                      </div>
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

        {/* Detail Modal */}
        {showDetailModal && selectedDeposit && (
          <div style={styles.modal} onClick={() => setShowDetailModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Deposit Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={styles.modalCloseButton}
                >
                  ×
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.detailSection}>
                  <h3 style={styles.detailSectionTitle}>Transaction Information</h3>
                  
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Cryptocurrency:</span>
                    <span style={styles.detailValue}>
                      {getCryptoIcon(selectedDeposit.crypto_type)} {selectedDeposit.crypto_type}
                    </span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Network:</span>
                    <span style={styles.detailValue}>{selectedDeposit.network_type}</span>
                  </div>

                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Wallet Address:</span>
                    <span style={{...styles.detailValue, wordBreak: 'break-all', fontSize: '0.85rem'}}>
                      {selectedDeposit.wallet_address}
                    </span>
                  </div>

                  {selectedDeposit.transaction_hash && (
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Transaction Hash:</span>
                      <span style={{...styles.detailValue, wordBreak: 'break-all', fontSize: '0.85rem'}}>
                        {selectedDeposit.transaction_hash}
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
                      {formatCurrency(selectedDeposit.net_amount)}
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
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1e293b',
    fontWeight: '700'
  },
  modalCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '2rem',
    color: '#94a3b8',
    cursor: 'pointer',
    lineHeight: '1'
  },
  modalBody: {
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
  }
};

// Add media query for responsive table
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(min-width: 1024px)');
  if (mediaQuery.matches) {
    styles.tableContainer.display = 'block';
    styles.mobileCards.display = 'none';
  }
}
