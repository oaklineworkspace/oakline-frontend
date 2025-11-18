import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function LinkBankAccountContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [linkedBanks, setLinkedBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    confirm_account_number: '',
    routing_number: '',
    account_type: 'checking',
    swift_code: '',
    iban: '',
    bank_address: '',
    is_primary: false
  });

  useEffect(() => {
    if (user) {
      fetchLinkedBanks();
    }
  }, [user]);

  const fetchLinkedBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedBanks(data || []);
    } catch (error) {
      console.error('Error fetching linked banks:', error);
      showMessage('Failed to load linked bank accounts', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const validateForm = () => {
    if (!formData.account_holder_name.trim()) {
      showMessage('Please enter the account holder name', 'error');
      return false;
    }

    if (!formData.bank_name.trim()) {
      showMessage('Please enter the bank name', 'error');
      return false;
    }

    if (!formData.account_number.trim()) {
      showMessage('Please enter the account number', 'error');
      return false;
    }

    if (formData.account_number !== formData.confirm_account_number) {
      showMessage('Account numbers do not match', 'error');
      return false;
    }

    if (!formData.routing_number.trim()) {
      showMessage('Please enter the routing number', 'error');
      return false;
    }

    if (formData.routing_number.length !== 9 || !/^\d+$/.test(formData.routing_number)) {
      showMessage('Routing number must be exactly 9 digits', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('linked_bank_accounts')
        .insert([{
          user_id: user.id,
          account_holder_name: formData.account_holder_name,
          bank_name: formData.bank_name,
          account_number: formData.account_number,
          routing_number: formData.routing_number,
          account_type: formData.account_type,
          swift_code: formData.swift_code || null,
          iban: formData.iban || null,
          bank_address: formData.bank_address || null,
          is_primary: linkedBanks.length === 0 ? true : formData.is_primary,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      if (formData.is_primary && linkedBanks.length > 0) {
        await supabase
          .from('linked_bank_accounts')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', data.id);
      }

      showMessage('Bank account linked successfully! Verification may be required.', 'success');
      setFormData({
        account_holder_name: '',
        bank_name: '',
        account_number: '',
        confirm_account_number: '',
        routing_number: '',
        account_type: 'checking',
        swift_code: '',
        iban: '',
        bank_address: '',
        is_primary: false
      });
      setShowForm(false);
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error linking bank account:', error);
      showMessage(error.message || 'Failed to link bank account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (bankId) => {
    try {
      await supabase
        .from('linked_bank_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      await supabase
        .from('linked_bank_accounts')
        .update({ is_primary: true })
        .eq('id', bankId);

      showMessage('Primary account updated', 'success');
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error setting primary:', error);
      showMessage('Failed to update primary account', 'error');
    }
  };

  const handleDelete = async (bankId) => {
    if (!confirm('Are you sure you want to remove this bank account?')) return;

    try {
      await supabase
        .from('linked_bank_accounts')
        .update({ status: 'deleted' })
        .eq('id', bankId);

      showMessage('Bank account removed', 'success');
      fetchLinkedBanks();
    } catch (error) {
      console.error('Error deleting bank:', error);
      showMessage('Failed to remove bank account', 'error');
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2d5986 50%, #1a365d 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    backLink: {
      color: 'white',
      textDecoration: 'none',
      padding: '0.75rem 1.5rem',
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: '12px',
      fontWeight: '600',
      transition: 'all 0.3s'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    pageTitle: {
      fontSize: '2.75rem',
      fontWeight: '800',
      color: 'white',
      textAlign: 'center',
      marginBottom: '0.75rem'
    },
    pageSubtitle: {
      fontSize: '1.125rem',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      marginBottom: '1.5rem'
    },
    buttonPrimary: {
      width: '100%',
      padding: '1rem',
      backgroundColor: '#059669',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    formGroup: {
      marginBottom: '1.25rem'
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.9375rem',
      transition: 'border-color 0.3s',
      boxSizing: 'border-box'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.9375rem',
      backgroundColor: 'white',
      boxSizing: 'border-box'
    },
    bankItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    bankHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem'
    },
    bankName: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    primaryBadge: {
      backgroundColor: '#059669',
      color: 'white',
      padding: '0.375rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    bankDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem',
      marginBottom: '1rem'
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column'
    },
    detailLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.25rem'
    },
    detailValue: {
      fontSize: '0.9375rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: '1rem'
    },
    buttonSecondary: {
      flex: 1,
      padding: '0.625rem',
      backgroundColor: 'white',
      color: '#059669',
      border: '2px solid #059669',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    buttonDanger: {
      flex: 1,
      padding: '0.625rem',
      backgroundColor: '#dc2626',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem 1rem',
      color: '#64748b'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={styles.main}>
        <h1 style={styles.pageTitle}>Link Bank Account</h1>
        <p style={styles.pageSubtitle}>
          Link your external bank account for easy withdrawals
        </p>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: messageType === 'success' ? '#d1fae5' : '#fee2e2',
            borderColor: messageType === 'success' ? '#059669' : '#dc2626',
            color: messageType === 'success' ? '#065f46' : '#991b1b'
          }}>
            {message}
          </div>
        )}

        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
              Your Linked Accounts
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                ...styles.buttonPrimary,
                width: 'auto',
                padding: '0.75rem 1.5rem'
              }}
            >
              {showForm ? 'Cancel' : '+ Add New Account'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Account Holder Name *</label>
                <input
                  type="text"
                  name="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Bank of America"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Type *</label>
                  <select
                    name="account_type"
                    value={formData.account_type}
                    onChange={handleChange}
                    style={styles.select}
                    required
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Number *</label>
                  <input
                    type="text"
                    name="account_number"
                    value={formData.account_number}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="1234567890"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Confirm Account Number *</label>
                  <input
                    type="text"
                    name="confirm_account_number"
                    value={formData.confirm_account_number}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="1234567890"
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Routing Number (9 digits) *</label>
                <input
                  type="text"
                  name="routing_number"
                  value={formData.routing_number}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="021000021"
                  maxLength={9}
                  required
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>SWIFT Code (Optional)</label>
                  <input
                    type="text"
                    name="swift_code"
                    value={formData.swift_code}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="BOFAUS3N"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>IBAN (Optional)</label>
                  <input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="GB82 WEST 1234 5698 7654 32"
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Bank Address (Optional)</label>
                <input
                  type="text"
                  name="bank_address"
                  value={formData.bank_address}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="123 Main St, New York, NY 10001"
                />
              </div>

              {linkedBanks.length > 0 && (
                <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                    id="is_primary"
                  />
                  <label htmlFor="is_primary" style={{ ...styles.label, marginBottom: 0, cursor: 'pointer' }}>
                    Set as primary account
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.buttonPrimary,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Linking...' : 'Link Bank Account'}
              </button>
            </form>
          )}

          {linkedBanks.length === 0 && !showForm ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No linked bank accounts yet</p>
              <p>Click "Add New Account" to link your first bank account</p>
            </div>
          ) : (
            linkedBanks.map(bank => (
              <div key={bank.id} style={styles.bankItem}>
                <div style={styles.bankHeader}>
                  <div style={styles.bankName}>{bank.bank_name}</div>
                  {bank.is_primary && (
                    <div style={styles.primaryBadge}>PRIMARY</div>
                  )}
                </div>

                <div style={styles.bankDetails}>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Holder</div>
                    <div style={styles.detailValue}>{bank.account_holder_name}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Type</div>
                    <div style={styles.detailValue}>{bank.account_type.toUpperCase()}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Account Number</div>
                    <div style={styles.detailValue}>****{bank.account_number.slice(-4)}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Routing Number</div>
                    <div style={styles.detailValue}>{bank.routing_number}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Status</div>
                    <div style={{
                      ...styles.detailValue,
                      color: bank.status === 'active' ? '#059669' : '#f59e0b'
                    }}>
                      {bank.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  {!bank.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(bank.id)}
                      style={styles.buttonSecondary}
                    >
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(bank.id)}
                    style={styles.buttonDanger}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function LinkBankAccount() {
  return (
    <ProtectedRoute>
      <LinkBankAccountContent />
    </ProtectedRoute>
  );
}
