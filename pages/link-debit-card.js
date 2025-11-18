import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function LinkDebitCardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [linkedCards, setLinkedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    cardholder_name: '',
    card_number: '',
    card_brand: 'visa',
    cvv: '',
    expiry_month: '',
    expiry_year: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: 'United States',
    is_primary: false
  });

  useEffect(() => {
    if (user) {
      fetchLinkedCards();
    }
  }, [user]);

  const fetchLinkedCards = async () => {
    try {
      const { data, error} = await supabase
        .from('linked_debit_cards')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'active'])
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedCards(data || []);
    } catch (error) {
      console.error('Error fetching linked cards:', error);
      showMessage('Failed to load linked debit cards', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;

    // Format card number input (remove spaces, limit to 16 digits)
    if (name === 'card_number') {
      processedValue = value.replace(/\s/g, '').slice(0, 19);
    }

    // Format expiry month (2 digits)
    if (name === 'expiry_month') {
      processedValue = value.replace(/\D/g, '').slice(0, 2);
    }

    // Format expiry year (4 digits)
    if (name === 'expiry_year') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    // Format CVV (3-4 digits)
    if (name === 'cvv') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
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

  const detectCardBrand = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    return 'visa';
  };

  const validateCardNumber = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const validateForm = () => {
    if (!formData.cardholder_name.trim()) {
      showMessage('Please enter the cardholder name', 'error');
      return false;
    }

    if (!formData.card_number.trim()) {
      showMessage('Please enter the card number', 'error');
      return false;
    }

    const cleaned = formData.card_number.replace(/\s/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) {
      showMessage('Please enter a valid card number', 'error');
      return false;
    }

    if (!validateCardNumber(cleaned)) {
      showMessage('Invalid card number. Please check and try again.', 'error');
      return false;
    }

    if (!formData.expiry_month || formData.expiry_month.length !== 2) {
      showMessage('Please enter a valid expiry month (MM)', 'error');
      return false;
    }

    const month = parseInt(formData.expiry_month);
    if (month < 1 || month > 12) {
      showMessage('Expiry month must be between 01 and 12', 'error');
      return false;
    }

    if (!formData.expiry_year || formData.expiry_year.length !== 4) {
      showMessage('Please enter a valid expiry year (YYYY)', 'error');
      return false;
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const year = parseInt(formData.expiry_year);

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      showMessage('Card has expired', 'error');
      return false;
    }

    if (year > currentYear + 20) {
      showMessage('Invalid expiry year', 'error');
      return false;
    }

    if (!formData.cvv || formData.cvv.length < 3) {
      showMessage('Please enter a valid CVV/CVC (3-4 digits)', 'error');
      return false;
    }

    if (!formData.billing_address.trim()) {
      showMessage('Please enter the billing address', 'error');
      return false;
    }

    if (!formData.billing_city.trim()) {
      showMessage('Please enter the billing city', 'error');
      return false;
    }

    if (!formData.billing_state.trim()) {
      showMessage('Please enter the billing state', 'error');
      return false;
    }

    if (!formData.billing_zip.trim()) {
      showMessage('Please enter the billing ZIP code', 'error');
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
      const cleaned = formData.card_number.replace(/\s/g, '');
      const detectedBrand = detectCardBrand(cleaned);
      const last4 = cleaned.slice(-4);

      const { data, error } = await supabase
        .from('linked_debit_cards')
        .insert([{
          user_id: user.id,
          cardholder_name: formData.cardholder_name,
          card_number_last4: last4,
          card_brand: detectedBrand,
          expiry_month: formData.expiry_month,
          expiry_year: formData.expiry_year,
          billing_address: formData.billing_address,
          billing_city: formData.billing_city,
          billing_state: formData.billing_state,
          billing_zip: formData.billing_zip,
          billing_country: formData.billing_country,
          is_primary: linkedCards.length === 0 ? true : formData.is_primary,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      if (formData.is_primary && linkedCards.length > 0) {
        await supabase
          .from('linked_debit_cards')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', data.id);
      }

      showMessage('Debit card linked successfully!', 'success');
      setFormData({
        cardholder_name: '',
        card_number: '',
        card_brand: 'visa',
        expiry_month: '',
        expiry_year: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_zip: '',
        billing_country: 'United States',
        is_primary: false
      });
      setShowForm(false);
      fetchLinkedCards();
    } catch (error) {
      console.error('Error linking debit card:', error);
      showMessage(error.message || 'Failed to link debit card', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (cardId) => {
    try {
      await supabase
        .from('linked_debit_cards')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      await supabase
        .from('linked_debit_cards')
        .update({ is_primary: true })
        .eq('id', cardId);

      showMessage('Primary card updated', 'success');
      fetchLinkedCards();
    } catch (error) {
      console.error('Error setting primary:', error);
      showMessage('Failed to update primary card', 'error');
    }
  };

  const handleDelete = async (cardId) => {
    if (!confirm('Are you sure you want to remove this debit card?')) return;

    try {
      await supabase
        .from('linked_debit_cards')
        .update({ status: 'deleted' })
        .eq('id', cardId);

      showMessage('Debit card removed', 'success');
      fetchLinkedCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      showMessage('Failed to remove debit card', 'error');
    }
  };

  const formatCardDisplay = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳'
    };
    return icons[brand] || '💳';
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
    cardItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem'
    },
    cardName: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    primaryBadge: {
      backgroundColor: '#059669',
      color: 'white',
      padding: '0.375rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600'
    },
    cardDetails: {
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
        <h1 style={styles.pageTitle}>Link Debit Card</h1>
        <p style={styles.pageSubtitle}>
          Link your external debit card for quick withdrawals
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
              Your Linked Cards
            </h2>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                ...styles.buttonPrimary,
                width: 'auto',
                padding: '0.75rem 1.5rem'
              }}
            >
              {showForm ? 'Cancel' : '+ Add New Card'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Cardholder Name *</label>
                <input
                  type="text"
                  name="cardholder_name"
                  value={formData.cardholder_name}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Card Number *</label>
                <input
                  type="text"
                  name="card_number"
                  value={formatCardDisplay(formData.card_number)}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="4111 1111 1111 1111"
                  maxLength="23"
                  required
                />
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  We use bank-level encryption to protect your information
                </small>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>CVV/CVC *</label>
                  <input
                    type="text"
                    name="cvv"
                    value={formData.cvv}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="123"
                    maxLength="4"
                    required
                  />
                  <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                    3-4 digit security code on the back of your card
                  </small>
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Month (MM) *</label>
                  <input
                    type="text"
                    name="expiry_month"
                    value={formData.expiry_month}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="12"
                    maxLength="2"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Year (YYYY) *</label>
                  <input
                    type="text"
                    name="expiry_year"
                    value={formData.expiry_year}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="2025"
                    maxLength="4"
                    required
                  />
                </div>
              </div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Billing Address
              </h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Street Address *</label>
                <input
                  type="text"
                  name="billing_address"
                  value={formData.billing_address}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="123 Main Street"
                  required
                />
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    name="billing_city"
                    value={formData.billing_city}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="New York"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>State *</label>
                  <input
                    type="text"
                    name="billing_state"
                    value={formData.billing_state}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="NY"
                    required
                  />
                </div>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>ZIP Code *</label>
                  <input
                    type="text"
                    name="billing_zip"
                    value={formData.billing_zip}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="10001"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Country *</label>
                  <select
                    name="billing_country"
                    value={formData.billing_country}
                    onChange={handleChange}
                    style={styles.select}
                    required
                  >
                    <option value="United States">United States</option>
                    <option value="Canada">Canada</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
              </div>

              {linkedCards.length > 0 && (
                <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                    id="is_primary"
                  />
                  <label htmlFor="is_primary" style={{ ...styles.label, marginBottom: 0, cursor: 'pointer' }}>
                    Set as primary card
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
                {loading ? 'Linking...' : 'Link Debit Card'}
              </button>
            </form>
          )}

          {linkedCards.length === 0 && !showForm ? (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No linked debit cards yet</p>
              <p>Click "Add New Card" to link your first debit card</p>
            </div>
          ) : (
            linkedCards.map(card => (
              <div key={card.id} style={styles.cardItem}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardName}>
                    {getCardIcon(card.card_brand)} {card.card_brand.toUpperCase()} •••• {card.card_number_last4}
                  </div>
                  {card.is_primary && (
                    <div style={styles.primaryBadge}>PRIMARY</div>
                  )}
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Cardholder</div>
                    <div style={styles.detailValue}>{card.cardholder_name}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Expiry</div>
                    <div style={styles.detailValue}>{card.expiry_month}/{card.expiry_year}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Billing City</div>
                    <div style={styles.detailValue}>{card.billing_city}, {card.billing_state}</div>
                  </div>
                  <div style={styles.detailItem}>
                    <div style={styles.detailLabel}>Status</div>
                    <div style={{
                      ...styles.detailValue,
                      color: card.status === 'active' ? '#059669' : '#f59e0b'
                    }}>
                      {card.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  {!card.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(card.id)}
                      style={styles.buttonSecondary}
                    >
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(card.id)}
                    style={styles.buttonDanger}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0c4a6e', marginBottom: '0.75rem' }}>
            🔒 Security Notice
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#075985', lineHeight: '1.6', margin: 0 }}>
            Your card information is encrypted and stored securely. We never store your full card number.
            All transactions are processed through secure, PCI-compliant systems.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LinkDebitCard() {
  return (
    <ProtectedRoute>
      <LinkDebitCardContent />
    </ProtectedRoute>
  );
}
