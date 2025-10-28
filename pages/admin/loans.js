import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function AdminLoansContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [filter, loans]);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/sign-in');
        return;
      }

      const response = await fetch('/api/admin/check-access', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.isAdmin) {
        router.push('/unauthorized');
        return;
      }

      setIsAdmin(true);
      fetchAllLoans();
    } catch (err) {
      console.error('Error checking admin access:', err);
      router.push('/unauthorized');
    }
  };

  const fetchAllLoans = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/loans/get-all', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setLoans(data.loans || []);
      } else {
        setError(data.error || 'Failed to fetch loans');
      }
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError('An error occurred while fetching loans');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredLoans(loans);
    } else {
      setFilteredLoans(loans.filter(loan => loan.status === filter));
    }
  };

  const handleAction = async (loanId, action) => {
    setProcessing(loanId);
    setError('');
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/loans/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ loan_id: loanId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} loan`);
      }

      setSuccess(data.message || `Loan ${action}d successfully`);
      await fetchAllLoans();

    } catch (err) {
      setError(err.message || `An error occurred while ${action}ing the loan`);
    } finally {
      setProcessing(null);
    }
  };

  const calculateTotalDue = (loan) => {
    const monthlyRate = loan.interest_rate / 100 / 12;
    const numPayments = loan.term_months;

    if (monthlyRate === 0) {
      return loan.principal;
    }

    const monthlyPayment = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment * numPayments;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#3b82f6',
      rejected: '#ef4444',
      active: '#10b981',
      closed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (!isAdmin || loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Loan Management</h1>
          <p style={styles.subtitle}>Review and manage all loan applications</p>
        </div>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <strong>Success!</strong> {success}
        </div>
      )}

      <div style={styles.filterBar}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterButton,
            ...(filter === 'all' ? styles.filterButtonActive : {})
          }}
        >
          All ({loans.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          style={{
            ...styles.filterButton,
            ...(filter === 'pending' ? styles.filterButtonActive : {})
          }}
        >
          Pending ({loans.filter(l => l.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          style={{
            ...styles.filterButton,
            ...(filter === 'approved' ? styles.filterButtonActive : {})
          }}
        >
          Approved ({loans.filter(l => l.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          style={{
            ...styles.filterButton,
            ...(filter === 'rejected' ? styles.filterButtonActive : {})
          }}
        >
          Rejected ({loans.filter(l => l.status === 'rejected').length})
        </button>
        <button
          onClick={() => setFilter('active')}
          style={{
            ...styles.filterButton,
            ...(filter === 'active' ? styles.filterButtonActive : {})
          }}
        >
          Active ({loans.filter(l => l.status === 'active').length})
        </button>
        <button
          onClick={() => setFilter('closed')}
          style={{
            ...styles.filterButton,
            ...(filter === 'closed' ? styles.filterButtonActive : {})
          }}
        >
          Closed ({loans.filter(l => l.status === 'closed').length})
        </button>
      </div>

      {filteredLoans.length === 0 ? (
        <div style={styles.emptyState}>
          <p>No loans found with status: {filter}</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Loan Type</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Interest</th>
                <th style={styles.th}>Term</th>
                <th style={styles.th}>Total Due</th>
                <th style={styles.th}>Remaining</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoans.map(loan => {
                const totalDue = calculateTotalDue(loan);
                return (
                  <tr key={loan.id} style={styles.tableRow}>
                    <td style={styles.td}>
                      <div style={styles.userInfo}>
                        <div>{loan.user_email || 'N/A'}</div>
                        <div style={styles.userName}>{loan.user_name || ''}</div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {loan.loan_type?.replace('_', ' ').toUpperCase()}
                    </td>
                    <td style={styles.td}>${loan.principal.toLocaleString()}</td>
                    <td style={styles.td}>{loan.interest_rate}%</td>
                    <td style={styles.td}>{loan.term_months} mo</td>
                    <td style={styles.td}>${totalDue.toFixed(2)}</td>
                    <td style={styles.td}>
                      ${(loan.remaining_balance || totalDue).toFixed(2)}
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: getStatusColor(loan.status) + '20',
                          color: getStatusColor(loan.status)
                        }}
                      >
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {new Date(loan.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        {loan.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(loan.id, 'approve')}
                              disabled={processing === loan.id}
                              style={{...styles.actionButton, ...styles.approveButton}}
                            >
                              {processing === loan.id ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(loan.id, 'reject')}
                              disabled={processing === loan.id}
                              style={{...styles.actionButton, ...styles.rejectButton}}
                            >
                              {processing === loan.id ? '...' : 'Reject'}
                            </button>
                          </>
                        )}
                        {loan.status === 'active' && loan.remaining_balance <= 0.01 && (
                          <button
                            onClick={() => handleAction(loan.id, 'close')}
                            disabled={processing === loan.id}
                            style={{...styles.actionButton, ...styles.closeButton}}
                          >
                            {processing === loan.id ? '...' : 'Close'}
                          </button>
                        )}
                        {(loan.status === 'rejected' || loan.status === 'closed' || loan.status === 'approved') && (
                          <span style={styles.noAction}>No action available</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '5px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  successAlert: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#059669'
  },
  filterBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap'
  },
  filterButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  filterButtonActive: {
    backgroundColor: '#10b981',
    color: '#fff',
    borderColor: '#10b981'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    color: '#666'
  },
  tableContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
    borderBottom: '2px solid #e5e7eb'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s'
  },
  td: {
    padding: '15px',
    fontSize: '14px',
    color: '#1a1a1a'
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  userName: {
    fontSize: '12px',
    color: '#6b7280'
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-block'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  actionButton: {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  approveButton: {
    backgroundColor: '#10b981',
    color: '#fff'
  },
  rejectButton: {
    backgroundColor: '#ef4444',
    color: '#fff'
  },
  closeButton: {
    backgroundColor: '#6b7280',
    color: '#fff'
  },
  noAction: {
    fontSize: '13px',
    color: '#9ca3af',
    fontStyle: 'italic'
  }
};

export default function AdminLoans() {
  return (
    <ProtectedRoute>
      <AdminLoansContent />
    </ProtectedRoute>
  );
}
