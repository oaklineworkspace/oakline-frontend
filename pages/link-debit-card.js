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
    cvv: '',
    expiry_month: '',
    expiry_year: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: 'United States',
    card_brand: '',
    card_front_photo: null, // Added for photo upload
    card_back_photo: null    // Added for photo upload
  });

  // State for form errors, used specifically for card number validation in this context
  const [errors, setErrors] = useState({});

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

    // Format card number input (remove spaces, limit to 19 digits)
    if (name === 'card_number') {
      processedValue = value.replace(/\s/g, '').slice(0, 19);
      // Clear card number error if input is valid or field is cleared
      if (processedValue.length === 0 || (processedValue.length >= 13 && processedValue.length <= 19 && /^\d+$/.test(processedValue))) {
         setErrors(prev => ({ ...prev, cardNumber: '' }));
      }
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

  // Handler for file inputs
  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] // Store the File object
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: null // Clear if no file is selected
      }));
    }
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
    return 'visa'; // Default to visa if not recognized
  };

  // Luhn algorithm validation removed as per user request.
  // const validateCardNumber = (cardNumber) => { ... };

  const validateForm = () => {
    // Resetting errors before re-validation
    setErrors({});

    if (!formData.cardholder_name.trim()) {
      showMessage('Please enter the cardholder name', 'error');
      return false;
    }

    if (!formData.card_number.trim()) {
      showMessage('Please enter the card number', 'error');
      return false;
    }

    const cleanedCardNumber = formData.card_number.replace(/\s/g, '');
    if (cleanedCardNumber.length < 13 || cleanedCardNumber.length > 19) {
      setErrors(prev => ({ ...prev, cardNumber: 'Please enter a valid card number (13-19 digits)' }));
      showMessage('Please enter a valid card number (13-19 digits)', 'error');
      return false;
    }

    if (!/^\d+$/.test(cleanedCardNumber)) {
      setErrors(prev => ({ ...prev, cardNumber: 'Card number must contain only digits' }));
      showMessage('Card number must contain only digits', 'error');
      return false;
    }

    // Luhn algorithm validation removed.

    if (!formData.expiry_month || formData.expiry_month.length !== 2) {
      showMessage('Please enter a valid expiry month (MM)', 'error');
      return false;
    }

    const month = parseInt(formData.expiry_month);
    if (isNaN(month) || month < 1 || month > 12) {
      showMessage('Expiry month must be between 01 and 12', 'error');
      return false;
    }

    if (!formData.expiry_year || formData.expiry_year.length !== 4) {
      showMessage('Please enter a valid expiry year (YYYY)', 'error');
      return false;
    }

    // Validate CVV
    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      showMessage('Please enter a valid CVV/CVC (3-4 digits)', 'error');
      return false;
    }

    // Validate expiry
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const year = parseInt(formData.expiry_year);

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      showMessage('Card has expired', 'error');
      return false;
    }

    if (year > currentYear + 20) { // Limit future year to avoid typos
      showMessage('Invalid expiry year', 'error');
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

    // Check for required photo uploads
    if (!formData.card_front_photo) {
      showMessage('Please upload a photo of the front of your card', 'error');
      return false;
    }
    if (!formData.card_back_photo) {
      showMessage('Please upload a photo of the back of your card', 'error');
      return false;
    }


    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage(''); // Clear previous messages

    try {
      const cleaned = formData.card_number.replace(/\s/g, '');
      const detectedBrand = detectCardBrand(cleaned);
      const last4 = cleaned.slice(-4);

      // Upload photos to Supabase Storage
      let cardFrontPhotoUrl = null;
      let cardBackPhotoUrl = null;

      if (formData.card_front_photo) {
        const frontPath = `card_photos/${user.id}/card_front_${Date.now()}.jpg`;
        const { data: frontData, error: frontError } = await supabase.storage
          .from('user-files')
          .upload(frontPath, formData.card_front_photo, {
            contentType: formData.card_front_photo.type,
            cacheControl: '3600',
            upsert: true,
          });
        if (frontError) throw frontError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(frontPath);
        cardFrontPhotoUrl = publicUrl;
      }

      if (formData.card_back_photo) {
        const backPath = `card_photos/${user.id}/card_back_${Date.now()}.jpg`;
        const { data: backData, error: backError } = await supabase.storage
          .from('user-files')
          .upload(backPath, formData.card_back_photo, {
            contentType: formData.card_back_photo.type,
            cacheControl: '3600',
            upsert: true,
          });
        if (backError) throw backError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('user-files')
          .getPublicUrl(backPath);
        cardBackPhotoUrl = publicUrl;
      }


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
          status: 'pending', // Changed to 'pending' for manual verification
          card_front_photo_url: cardFrontPhotoUrl, // Store photo URLs
          card_back_photo_url: cardBackPhotoUrl    // Store photo URLs
        }])
        .select()
        .single();

      if (error) throw error;

      // If this card is set as primary and there are existing cards, update others
      if (formData.is_primary && linkedCards.length > 0) {
        await supabase
          .from('linked_debit_cards')
          .update({ is_primary: false })
          .eq('user_id', user.id)
          .neq('id', data.id); // Ensure we don't update the newly inserted card
      } else if (linkedCards.length === 0) {
        // If it's the first card, ensure it's marked as primary even if checkbox wasn't checked
        await supabase
          .from('linked_debit_cards')
          .update({ is_primary: true })
          .eq('id', data.id);
      }

      showMessage('Debit card linked successfully! It is now pending verification.', 'success');
      // Reset form data
      setFormData({
        cardholder_name: '',
        card_number: '',
        cvv: '',
        expiry_month: '',
        expiry_year: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_zip: '',
        billing_country: 'United States',
        card_brand: '',
        is_primary: false, // Reset checkbox
        card_front_photo: null, // Reset photos
        card_back_photo: null    // Reset photos
      });
      setShowForm(false);
      fetchLinkedCards(); // Refresh the list of linked cards
    } catch (error) {
      console.error('Error linking debit card:', error);
      showMessage(error.message || 'Failed to link debit card. Please check your details and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (cardId) => {
    setLoading(true);
    try {
      // First, set all other cards for this user to not be primary
      await supabase
        .from('linked_debit_cards')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Then, set the selected card as primary
      await supabase
        .from('linked_debit_cards')
        .update({ is_primary: true })
        .eq('id', cardId);

      showMessage('Primary card updated', 'success');
      fetchLinkedCards(); // Refresh the list
    } catch (error) {
      console.error('Error setting primary:', error);
      showMessage('Failed to update primary card', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!confirm('Are you sure you want to remove this debit card? This action cannot be undone.')) return;

    setLoading(true);
    try {
      // Soft delete by updating status
      const { error } = await supabase
        .from('linked_debit_cards')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;

      showMessage('Debit card removed successfully', 'success');
      fetchLinkedCards(); // Refresh the list
    } catch (error) {
      console.error('Error deleting card:', error);
      showMessage('Failed to remove debit card', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCardDisplay = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    // Insert spaces every 4 characters
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardIcon = (brand) => {
    // Using generic card emoji, could be extended with actual brand logos
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳'
    };
    return icons[brand] || '💳'; // Default to card emoji
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
      transition: 'all 0.3s',
      display: 'inline-flex', // Use inline-flex for better alignment
      alignItems: 'center'
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
      backgroundColor: '#059669', // Emerald green
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
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
      boxSizing: 'border-box',
      '::placeholder': {
        color: '#9ca3af'
      }
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '0.9375rem',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      appearance: 'none', // Remove default dropdown arrow
      backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.75rem center',
      backgroundSize: '1em',
      paddingRight: '2.5rem' // Make space for the custom arrow
    },
    cardItem: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid #e2e8f0',
      transition: 'box-shadow 0.3s'
    },
    cardItemHover: { // Style for hover effect
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
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
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', // Adjusted minmax for better spacing
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
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    buttonDanger: {
      flex: 1,
      padding: '0.625rem',
      backgroundColor: '#dc2626', // Red
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      border: '2px solid',
      textAlign: 'center'
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
    },
    errorText: {
      color: '#dc2626',
      fontSize: '0.75rem',
      marginTop: '0.25rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div style={styles.main}>
        <h1 style={styles.pageTitle}>Link Debit Card</h1>
        <p style={styles.pageSubtitle}>
          Link your external debit card for quick withdrawals and seamless transactions. Your card will be pending verification upon submission.
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
                  style={{
                    ...styles.input,
                    borderColor: errors.cardNumber ? '#dc2626' : '#e2e8f0' // Highlight border if error
                  }}
                  placeholder="4111 1111 1111 1111"
                  maxLength="19" // Max length including potential spaces during formatting
                  required
                />
                {errors.cardNumber && <p style={styles.errorText}>{errors.cardNumber}</p>}
                <small style={{ color: '#64748b', fontSize: '0.75rem' }}>
                  We use bank-level encryption to protect your information.
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
                    3-4 digit security code, usually on the back of your card.
                  </small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Expiry Date *</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      name="expiry_month"
                      value={formData.expiry_month}
                      onChange={handleChange}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="MM (e.g., 12)"
                      maxLength="2"
                      required
                    />
                    <input
                      type="text"
                      name="expiry_year"
                      value={formData.expiry_year}
                      onChange={handleChange}
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="YYYY (e.g., 2025)"
                      maxLength="4"
                      required
                    />
                  </div>
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
                  placeholder="123 Main Street, Apt 4B"
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
                  <label style={styles.label}>State / Province *</label>
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
                  <label style={styles.label}>ZIP / Postal Code *</label>
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
                    {/* Add more countries as needed */}
                  </select>
                </div>
              </div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '1.5rem', marginBottom: '1rem' }}>
                Card Verification Photos
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Please upload clear photos of the front and back of your card for verification.
              </p>

              <div style={styles.formGroup}>
                <label style={styles.label}>Front of Card *</label>
                <input
                  type="file"
                  name="card_front_photo"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  style={styles.input}
                  required
                />
                {formData.card_front_photo && (
                  <small style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    ✓ {formData.card_front_photo.name}
                  </small>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Back of Card *</label>
                <input
                  type="file"
                  name="card_back_photo"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileChange}
                  style={styles.input}
                  required
                />
                {formData.card_back_photo && (
                  <small style={{ color: '#059669', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    ✓ {formData.card_back_photo.name}
                  </small>
                )}
              </div>


              {linkedCards.length > 0 && (
                <div style={{ ...styles.formGroup, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                    id="is_primary"
                    style={{ cursor: 'pointer', accentColor: '#059669' }}
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

          {!showForm && linkedCards.length === 0 && (
            <div style={styles.emptyState}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No linked debit cards yet</p>
              <p>Click "Add New Card" to link your first debit card and start withdrawing.</p>
            </div>
          )}

          {!showForm && linkedCards.map(card => (
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
                  <div style={styles.detailLabel}>Billing Address</div>
                  <div style={styles.detailValue}>{card.billing_city}, {card.billing_state} {card.billing_zip}</div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Status</div>
                  <div style={{
                    ...styles.detailValue,
                    color: card.status === 'active' ? '#059669' : card.status === 'pending' ? '#f59e0b' : '#dc2626'
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
                    disabled={loading}
                  >
                    Set as Primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(card.id)}
                  style={styles.buttonDanger}
                  disabled={loading}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...styles.card, backgroundColor: '#f0f9ff', border: '2px solid #0ea5e9' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0c4a6e', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#075985' }}>
              <rect x="3" y="11" width="18" height="13" rx="2" ry="2"></rect>
              <path d="M7 15h10v4H7z"></path>
              <line x1="8" y1="2" x2="8" y2="4"></line>
              <line x1="16" y1="2" x2="16" y2="4"></line>
            </svg>
            Security Notice
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#075985', lineHeight: '1.6', margin: 0 }}>
            Your card information is encrypted and stored securely using industry-standard protocols. We never store your full card number. All transactions are processed through secure, PCI-compliant systems to ensure the safety of your financial data. Card images are used solely for verification purposes and are stored securely.
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