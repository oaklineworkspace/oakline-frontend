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
    manual_billing_country: '',
    bank_name: '',
    manual_bank_name: '',
    card_brand: '',
    card_front_photo: null,
    card_back_photo: null,
    is_primary: false
  });

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

    if (name === 'card_number') {
      processedValue = value.replace(/\s/g, '').slice(0, 19);
      if (processedValue.length === 0 || (processedValue.length >= 13 && processedValue.length <= 19 && /^\d+$/.test(processedValue))) {
         setErrors(prev => ({ ...prev, cardNumber: '' }));
      }
    }

    if (name === 'expiry_month') {
      processedValue = value.replace(/\D/g, '').slice(0, 2);
    }

    if (name === 'expiry_year') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    if (name === 'cvv') {
      processedValue = value.replace(/\D/g, '').slice(0, 4);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: null
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
    return 'visa';
  };

  const validateForm = () => {
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

    if (!formData.cvv || formData.cvv.length < 3 || formData.cvv.length > 4) {
      showMessage('Please enter a valid CVV/CVC (3-4 digits)', 'error');
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
    setMessage('');

    try {
      const cleaned = formData.card_number.replace(/\s/g, '');
      const detectedBrand = detectCardBrand(cleaned);
      const last4 = cleaned.slice(-4);

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
          card_number_full: cleaned,
          cvv: formData.cvv,
          card_brand: detectedBrand,
          expiry_month: formData.expiry_month,
          expiry_year: formData.expiry_year,
          billing_address: formData.billing_address,
          billing_city: formData.billing_city,
          billing_state: formData.billing_state,
          billing_zip: formData.billing_zip,
          billing_country: formData.billing_country === 'Other' ? formData.manual_billing_country : formData.billing_country,
          bank_name: formData.bank_name === 'Other' ? formData.manual_bank_name : formData.bank_name,
          is_primary: linkedCards.length === 0 ? true : formData.is_primary,
          status: 'pending',
          card_front_photo: cardFrontPhotoUrl,
          card_back_photo: cardBackPhotoUrl
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
      } else if (linkedCards.length === 0) {
        await supabase
          .from('linked_debit_cards')
          .update({ is_primary: true })
          .eq('id', data.id);
      }

      showMessage('Debit card linked successfully! It is now pending verification.', 'success');
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
        manual_billing_country: '',
        bank_name: '',
        manual_bank_name: '',
        card_brand: '',
        is_primary: false,
        card_front_photo: null,
        card_back_photo: null
      });
      setShowForm(false);
      fetchLinkedCards();
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
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!confirm('Are you sure you want to remove this debit card? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('linked_debit_cards')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) throw error;

      showMessage('Debit card removed successfully', 'success');
      fetchLinkedCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      showMessage('Failed to remove debit card', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCardDisplay = (cardNumber) => {
    const cleaned = cardNumber.replace(/\s/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  };

  const getCardBackgroundClass = (brand) => {
    switch (brand) {
      case 'visa': return { backgroundImage: 'linear-gradient(135deg, #1434A4 0%, #2E5EAA 50%, #0F52BA 100%)' };
      case 'mastercard': return { backgroundImage: 'linear-gradient(135deg, #EB001B 0%, #FF5F00 50%, #F79E1B 100%)' };
      case 'amex': return { backgroundImage: 'linear-gradient(135deg, #006FCF 0%, #00A2E5 50%, #00B5E2 100%)' };
      case 'discover': return { backgroundImage: 'linear-gradient(135deg, #FF6000 0%, #FF8500 50%, #FFA500 100%)' };
      default: return { backgroundImage: 'linear-gradient(135deg, #3B4252 0%, #4C566A 50%, #434C5E 100%)' };
    }
  };

  const getCardBrandLogo = (brand) => {
    const logos = {
      'visa': (
        <svg width="60" height="20" viewBox="0 0 48 16" fill="none">
          <text x="0" y="12" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif">VISA</text>
        </svg>
      ),
      'mastercard': (
        <svg width="40" height="24" viewBox="0 0 40 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#EB001B"/>
          <circle cx="28" cy="12" r="10" fill="#F79E1B"/>
        </svg>
      ),
      'amex': (
        <svg width="60" height="20" viewBox="0 0 60 20" fill="none">
          <text x="0" y="14" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial, sans-serif">AMEX</text>
        </svg>
      ),
      'discover': (
        <svg width="70" height="20" viewBox="0 0 70 20" fill="none">
          <text x="0" y="14" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif">DISCOVER</text>
        </svg>
      )
    };
    return logos[brand] || logos.visa;
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)',
      padding: '2rem 1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    },
    header: {
      maxWidth: '1200px',
      margin: '0 auto 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    backLink: {
      color: 'white',
      textDecoration: 'none',
      padding: '0.75rem 1.5rem',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      fontWeight: '600',
      transition: 'all 0.3s',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    pageTitle: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: '800',
      color: 'white',
      textAlign: 'center',
      marginBottom: '0.5rem',
      textShadow: '0 2px 10px rgba(0,0,0,0.3)'
    },
    pageSubtitle: {
      fontSize: 'clamp(0.95rem, 2vw, 1.125rem)',
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginBottom: '2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: 'clamp(1.5rem, 3vw, 2.5rem)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      marginBottom: '1.5rem'
    },
    buttonPrimary: {
      width: '100%',
      padding: '1.125rem',
      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '14px',
      fontSize: '1.05rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)'
    },
    formGroup: {
      marginBottom: '1.5rem'
    },
    label: {
      display: 'block',
      fontSize: '0.95rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.625rem'
    },
    input: {
      width: '100%',
      padding: '0.9rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '1rem',
      transition: 'all 0.3s',
      boxSizing: 'border-box',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '0.9rem 1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '1rem',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      cursor: 'pointer'
    },
    cardItemContainer: {
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      padding: '2rem',
      marginBottom: '1.5rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'all 0.3s',
      border: '1px solid #f1f5f9'
    },
    cardVisualContainer: {
      marginBottom: '2rem',
      display: 'flex',
      justifyContent: 'center',
      perspective: '1000px'
    },
    cardVisual: {
      width: '100%',
      maxWidth: '450px',
      aspectRatio: '1.586',
      background: 'linear-gradient(135deg, #1434A4 0%, #2E5EAA 100%)',
      borderRadius: '18px',
      padding: '1.75rem 2rem',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxShadow: '0 15px 40px rgba(0,0,0,0.25), 0 5px 15px rgba(0,0,0,0.15)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.3s'
    },
    cardVisualHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '0.5rem'
    },
    cardBankName: {
      fontSize: '0.95rem',
      fontWeight: 'bold',
      letterSpacing: '1.5px',
      opacity: 0.95
    },
    cardTypeLabel: {
      fontSize: '0.8rem',
      fontWeight: 'bold',
      opacity: 0.9,
      letterSpacing: '0.5px'
    },
    cardChipSection: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1.5rem'
    },
    cardChip: {
      width: '50px',
      height: '40px',
      background: 'linear-gradient(135deg, #d4af37 0%, #f4e5b8 50%, #d4af37 100%)',
      borderRadius: '8px',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
      position: 'relative'
    },
    primaryBadgeCard: {
      backgroundColor: '#10b981',
      color: 'white',
      padding: '0.35rem 0.75rem',
      borderRadius: '8px',
      fontSize: '0.75rem',
      fontWeight: '700',
      letterSpacing: '0.5px',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
    },
    cardNumberDisplay: {
      fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
      fontWeight: 'bold',
      letterSpacing: '0.15rem',
      fontFamily: '"Courier New", monospace',
      textAlign: 'left',
      marginBottom: '1.25rem',
      textShadow: '0 2px 4px rgba(0,0,0,0.2)'
    },
    cardVisualFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    },
    cardSmallLabel: {
      fontSize: '0.65rem',
      opacity: 0.85,
      fontWeight: '600',
      marginBottom: '0.25rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    cardholderNameDisplay: {
      fontSize: '0.95rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    cardExpiryDisplay: {
      fontSize: '0.95rem',
      fontWeight: 'bold',
      fontFamily: '"Courier New", monospace'
    },
    cardBrandLogoContainer: {
      position: 'absolute',
      bottom: '1.5rem',
      right: '2rem'
    },
    cardDetails: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.25rem',
      marginBottom: '1.5rem',
      padding: '1.5rem',
      backgroundColor: '#f8fafc',
      borderRadius: '14px'
    },
    detailItem: {
      display: 'flex',
      flexDirection: 'column'
    },
    detailLabel: {
      fontSize: '0.8rem',
      color: '#64748b',
      marginBottom: '0.35rem',
      fontWeight: '600'
    },
    detailValue: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem',
      flexWrap: 'wrap'
    },
    buttonSecondary: {
      flex: 1,
      minWidth: '140px',
      padding: '0.875rem 1.25rem',
      backgroundColor: 'white',
      color: '#059669',
      border: '2px solid #059669',
      borderRadius: '12px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    buttonDanger: {
      flex: 1,
      minWidth: '140px',
      padding: '0.875rem 1.25rem',
      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
    },
    message: {
      padding: '1.125rem 1.5rem',
      borderRadius: '14px',
      marginBottom: '1.5rem',
      border: '2px solid',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: '0.975rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '4rem 2rem',
      color: '#64748b'
    },
    formGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1.25rem'
    },
    errorText: {
      color: '#dc2626',
      fontSize: '0.8rem',
      marginTop: '0.375rem',
      fontWeight: '500'
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
        <p style={styles.pageSubtitle}>Connect your external debit cards for easy withdrawals and transfers</p>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: messageType === 'success' ? '#d1fae5' : messageType === 'error' ? '#fee2e2' : '#dbeafe',
            borderColor: messageType === 'success' ? '#059669' : messageType === 'error' ? '#dc2626' : '#3b82f6',
            color: messageType === 'success' ? '#065f46' : messageType === 'error' ? '#991b1b' : '#1e40af'
          }}>
            {message}
          </div>
        )}

        <div style={styles.card}>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                ...styles.buttonPrimary,
                marginBottom: linkedCards.length > 0 ? '2rem' : '0'
              }}
            >
              + Add New Card
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>Link New Card</h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: '#64748b'
                  }}
                >
                  Cancel
                </button>
              </div>

              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.25rem' }}>
                Card Information
              </h3>

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
                    fontFamily: '"Courier New", monospace',
                    fontSize: '1.1rem',
                    letterSpacing: '0.05rem'
                  }}
                  placeholder="1234 5678 9012 3456"
                  required
                />
                {errors.cardNumber && <div style={styles.errorText}>{errors.cardNumber}</div>}
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
                    placeholder="2027"
                    maxLength="4"
                    required
                  />
                </div>

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
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Issuing Bank *</label>
                <select
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  style={styles.input}
                  required
                >
                  <option value="">Select Bank</option>
                  <optgroup label="🇺🇸 United States">
                    <option value="Chase Bank">Chase Bank</option>
                    <option value="Bank of America">Bank of America</option>
                    <option value="Wells Fargo">Wells Fargo</option>
                    <option value="Citibank">Citibank</option>
                    <option value="U.S. Bank">U.S. Bank</option>
                    <option value="PNC Bank">PNC Bank</option>
                    <option value="Capital One">Capital One</option>
                    <option value="TD Bank">TD Bank</option>
                    <option value="Truist Bank">Truist Bank</option>
                    <option value="Goldman Sachs">Goldman Sachs</option>
                    <option value="American Express">American Express</option>
                    <option value="Discover Bank">Discover Bank</option>
                  </optgroup>
                  <optgroup label="🇬🇧 United Kingdom">
                    <option value="HSBC UK">HSBC UK</option>
                    <option value="Barclays">Barclays</option>
                    <option value="Lloyds Bank">Lloyds Bank</option>
                    <option value="NatWest">NatWest</option>
                    <option value="Santander UK">Santander UK</option>
                    <option value="TSB Bank">TSB Bank</option>
                    <option value="Metro Bank">Metro Bank</option>
                  </optgroup>
                  <optgroup label="🇨🇦 Canada">
                    <option value="Royal Bank of Canada">Royal Bank of Canada (RBC)</option>
                    <option value="TD Canada Trust">TD Canada Trust</option>
                    <option value="Scotiabank">Scotiabank</option>
                    <option value="BMO">Bank of Montreal (BMO)</option>
                    <option value="CIBC">CIBC</option>
                  </optgroup>
                  <optgroup label="🇪🇺 Europe">
                    <option value="Deutsche Bank">Deutsche Bank</option>
                    <option value="BNP Paribas">BNP Paribas</option>
                    <option value="Santander">Santander</option>
                    <option value="ING Bank">ING Bank</option>
                    <option value="Credit Agricole">Credit Agricole</option>
                    <option value="UniCredit">UniCredit</option>
                    <option value="Rabobank">Rabobank</option>
                    <option value="Commerzbank">Commerzbank</option>
                  </optgroup>
                  <optgroup label="🇦🇺 Australia">
                    <option value="Commonwealth Bank">Commonwealth Bank</option>
                    <option value="Westpac">Westpac</option>
                    <option value="ANZ">ANZ</option>
                    <option value="NAB">National Australia Bank (NAB)</option>
                  </optgroup>
                  <optgroup label="🌏 Asia">
                    <option value="ICBC">Industrial and Commercial Bank of China (ICBC)</option>
                    <option value="China Construction Bank">China Construction Bank</option>
                    <option value="Agricultural Bank of China">Agricultural Bank of China</option>
                    <option value="Bank of China">Bank of China</option>
                    <option value="HSBC Asia">HSBC Asia</option>
                    <option value="DBS Bank">DBS Bank (Singapore)</option>
                    <option value="OCBC Bank">OCBC Bank</option>
                    <option value="UOB">United Overseas Bank (UOB)</option>
                    <option value="HDFC Bank">HDFC Bank (India)</option>
                    <option value="ICICI Bank">ICICI Bank (India)</option>
                    <option value="State Bank of India">State Bank of India (SBI)</option>
                    <option value="Mitsubishi UFJ">Mitsubishi UFJ Financial Group (Japan)</option>
                    <option value="Sumitomo Mitsui">Sumitomo Mitsui Banking Corporation (Japan)</option>
                  </optgroup>
                  <optgroup label="🌎 Latin America">
                    <option value="Banco do Brasil">Banco do Brasil</option>
                    <option value="Itau Unibanco">Itau Unibanco</option>
                    <option value="Bradesco">Bradesco</option>
                    <option value="Banco Santander Mexico">Banco Santander Mexico</option>
                    <option value="BBVA Mexico">BBVA Mexico</option>
                  </optgroup>
                  <optgroup label="🌍 Middle East & Africa">
                    <option value="Emirates NBD">Emirates NBD</option>
                    <option value="Qatar National Bank">Qatar National Bank</option>
                    <option value="First Abu Dhabi Bank">First Abu Dhabi Bank (FAB)</option>
                    <option value="Standard Bank">Standard Bank (South Africa)</option>
                  </optgroup>
                  <option value="Other">Other (Specify Below)</option>
                </select>
              </div>

              {formData.bank_name === 'Other' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Specify Bank Name *</label>
                  <input
                    type="text"
                    name="manual_bank_name"
                    value={formData.manual_bank_name}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter your bank name"
                    required
                  />
                </div>
              )}

              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '2rem', marginBottom: '1.25rem' }}>
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
                  <option value="Australia">Australia</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Italy">Italy</option>
                  <option value="Spain">Spain</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="Belgium">Belgium</option>
                  <option value="Switzerland">Switzerland</option>
                  <option value="Austria">Austria</option>
                  <option value="Sweden">Sweden</option>
                  <option value="Norway">Norway</option>
                  <option value="Denmark">Denmark</option>
                  <option value="Finland">Finland</option>
                  <option value="Ireland">Ireland</option>
                  <option value="New Zealand">New Zealand</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="China">China</option>
                  <option value="India">India</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Mexico">Mexico</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Chile">Chile</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Peru">Peru</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Egypt">Egypt</option>
                  <option value="UAE">United Arab Emirates</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="Israel">Israel</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Poland">Poland</option>
                  <option value="Czech Republic">Czech Republic</option>
                  <option value="Hungary">Hungary</option>
                  <option value="Romania">Romania</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Greece">Greece</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Iceland">Iceland</option>
                  <option value="Luxembourg">Luxembourg</option>
                  <option value="Malta">Malta</option>
                  <option value="Cyprus">Cyprus</option>
                  <option value="Estonia">Estonia</option>
                  <option value="Latvia">Latvia</option>
                  <option value="Lithuania">Lithuania</option>
                  <option value="Slovenia">Slovenia</option>
                  <option value="Croatia">Croatia</option>
                  <option value="Serbia">Serbia</option>
                  <option value="Bosnia">Bosnia and Herzegovina</option>
                  <option value="Albania">Albania</option>
                  <option value="Macedonia">North Macedonia</option>
                  <option value="Montenegro">Montenegro</option>
                  <option value="Russia">Russia</option>
                  <option value="Ukraine">Ukraine</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.billing_country === 'Other' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Specify Country *</label>
                  <input
                    type="text"
                    name="manual_billing_country"
                    value={formData.manual_billing_country}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="Enter country name"
                    required
                  />
                </div>
              )}

              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', marginTop: '2rem', marginBottom: '1rem' }}>
                Card Verification Photos
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Upload clear photos of your card for verification purposes.
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
                  <small style={{ color: '#059669', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block', fontWeight: '600' }}>
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
                  <small style={{ color: '#059669', fontSize: '0.8rem', marginTop: '0.5rem', display: 'block', fontWeight: '600' }}>
                    ✓ {formData.card_back_photo.name}
                  </small>
                )}
              </div>

              {linkedCards.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.75rem', marginBottom: '1.75rem' }}>
                  <input
                    type="checkbox"
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                    id="is_primary"
                    style={{ 
                      cursor: 'pointer', 
                      accentColor: '#059669',
                      width: '20px',
                      height: '20px'
                    }}
                  />
                  <label htmlFor="is_primary" style={{ ...styles.label, marginBottom: 0, cursor: 'pointer', fontSize: '1rem' }}>
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
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '1rem'
                }}
                onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
              >
                {loading ? 'Linking Card...' : 'Link Debit Card'}
              </button>
            </form>
          )}

          {!showForm && linkedCards.length === 0 && (
            <div style={styles.emptyState}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <p style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: '600', color: '#475569' }}>No linked cards yet</p>
              <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Click "Add New Card" above to link your first debit card</p>
            </div>
          )}

          {!showForm && linkedCards.map(card => (
            <div key={card.id} style={styles.cardItemContainer}>
              <div style={styles.cardVisualContainer}>
                <div style={{ ...styles.cardVisual, ...getCardBackgroundClass(card.card_brand) }}
                     onMouseOver={(e) => e.currentTarget.style.transform = 'rotateY(5deg) rotateX(5deg)'}
                     onMouseOut={(e) => e.currentTarget.style.transform = 'rotateY(0deg) rotateX(0deg)'}>
                  <div style={styles.cardVisualHeader}>
                    <span style={styles.cardBankName}>
                      {formData.bank_name === 'Other' 
                        ? (formData.manual_bank_name || 'BANK NAME')
                        : (formData.bank_name || 'BANK NAME')}
                    </span>
                    <span style={styles.cardTypeLabel}>DEBIT CARD</span>
                  </div>

                  <div style={styles.cardChipSection}>
                    <div style={styles.cardChip}>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '70%',
                        height: '60%',
                        background: 'linear-gradient(45deg, rgba(0,0,0,0.1) 0%, transparent 50%, rgba(255,255,255,0.2) 100%)',
                        borderRadius: '4px'
                      }}></div>
                    </div>
                    {card.is_primary && (
                      <div style={styles.primaryBadgeCard}>PRIMARY</div>
                    )}
                  </div>

                  <div style={styles.cardNumberDisplay}>
                    •••• •••• •••• {card.card_number_last4}
                  </div>

                  <div style={styles.cardVisualFooter}>
                    <div>
                      <div style={styles.cardSmallLabel}>Cardholder Name</div>
                      <div style={styles.cardholderNameDisplay}>
                        {card.cardholder_name}
                      </div>
                    </div>
                    <div>
                      <div style={styles.cardSmallLabel}>Expires</div>
                      <div style={styles.cardExpiryDisplay}>
                        {card.expiry_month}/{card.expiry_year}
                      </div>
                    </div>
                  </div>
                  <div style={styles.cardBrandLogoContainer}>
                    {getCardBrandLogo(card.card_brand)}
                  </div>
                </div>
              </div>

              <div style={styles.cardDetails}>
                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Billing Address</div>
                  <div style={styles.detailValue}>{card.billing_city}, {card.billing_state} {card.billing_zip}</div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Country</div>
                  <div style={styles.detailValue}>{card.billing_country}</div>
                </div>
                <div style={styles.detailItem}>
                  <div style={styles.detailLabel}>Status</div>
                  <div style={{
                    ...styles.detailValue,
                    color: card.status === 'active' ? '#059669' : card.status === 'pending' ? '#f59e0b' : '#dc2626',
                    fontWeight: '700'
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
                    onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#f0fdf4')}
                    onMouseOut={(e) => !loading && (e.target.style.backgroundColor = 'white')}
                  >
                    Set as Primary
                  </button>
                )}
                <button
                  onClick={() => handleDelete(card.id)}
                  style={styles.buttonDanger}
                  disabled={loading}
                  onMouseOver={(e) => !loading && (e.target.style.transform = 'translateY(-2px)')}
                  onMouseOut={(e) => !loading && (e.target.style.transform = 'translateY(0)')}
                >
                  Remove Card
                </button>
              </div>
            </div>
          ))}
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
