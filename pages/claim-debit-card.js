import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';

export default function ClaimDebitCardPage() {
  const router = useRouter();
  const { token } = router.query;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [debitCardForm, setDebitCardForm] = useState({
    cardholder_name: '',
    card_number: '',
    card_expiry: '',
    card_cvv: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: ''
  });

  useEffect(() => {
    if (token) {
      loadPaymentDetails();
    }
  }, [token]);

  const loadPaymentDetails = async () => {
    try {
      const { data: paymentData, error } = await supabase
        .from('oakline_pay_pending_claims')
        .select('*')
        .eq('claim_token', token)
        .eq('status', 'sent')
        .single();

      if (error || !paymentData) {
        setMessage('Payment not found or has already been claimed.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(paymentData.expires_at) < new Date()) {
        setMessage('This payment link has expired.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      setPayment(paymentData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading payment:', error);
      setMessage('An error occurred while loading the payment.');
      setMessageType('error');
      setLoading(false);
    }
  };

  const handleClaimWithDebitCard = async () => {
    try {
      if (!debitCardForm.cardholder_name || !debitCardForm.card_number || !debitCardForm.card_expiry || !debitCardForm.card_cvv || !debitCardForm.billing_address || !debitCardForm.billing_city || !debitCardForm.billing_state || !debitCardForm.billing_zip || !debitCardForm.billing_country) {
        setMessage('Please fill in all required fields.', 'error');
        setMessageType('error');
        return;
      }

      setSubmitting(true);

      // Update pending payment with full debit card details
      const { error } = await supabase
        .from('oakline_pay_pending_claims')
        .update({
          status: 'claimed',
          claim_method: 'debit_card',
          claimed_at: new Date().toISOString(),
          cardholder_name: debitCardForm.cardholder_name,
          card_number: debitCardForm.card_number,
          card_expiry: debitCardForm.card_expiry,
          card_cvv: debitCardForm.card_cvv,
          billing_address: debitCardForm.billing_address,
          billing_city: debitCardForm.billing_city,
          billing_state: debitCardForm.billing_state,
          billing_zip: debitCardForm.billing_zip,
          billing_country: debitCardForm.billing_country,
          approval_status: 'pending'
        })
        .eq('claim_token', token)
        .eq('status', 'sent');

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      setMessage('✅ Payment claim submitted successfully! Your debit card has been securely verified. Your transaction will be processed within a few hours.', 'success');
      setMessageType('success');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error) {
      console.error('Error claiming with card:', error);
      setMessage('Failed to process debit card claim. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Loading payment details...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Claim Payment with Debit Card - Oakline Bank</title>
      </Head>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          {message && (
            <div style={{
              backgroundColor: messageType === 'error' ? '#fee2e2' : messageType === 'success' ? '#dcfce7' : '#eff6ff',
              border: `2px solid ${messageType === 'error' ? '#fca5a5' : messageType === 'success' ? '#86efac' : '#bfdbfe'}`,
              color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#065f46' : '#1e40af',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}>
              {message}
            </div>
          )}

          {payment && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Claim Your Payment</h1>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                  ${parseFloat(payment.amount).toFixed(2)}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                  from {payment.sender_name || payment.sender_contact}
                </p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Debit Card Information</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Receive your payment securely to your debit card.
                </p>

                {/* Cardholder Name */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                    Cardholder Name *
                  </label>
                  <input
                    type="text"
                    placeholder="Full name on card"
                    value={debitCardForm.cardholder_name}
                    onChange={(e) => setDebitCardForm({ ...debitCardForm, cardholder_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Card Number */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                    Card Number *
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    maxLength="19"
                    value={debitCardForm.card_number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\s+/g, '');
                      setDebitCardForm({ ...debitCardForm, card_number: value });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box',
                      letterSpacing: '2px'
                    }}
                  />
                </div>

                {/* Expiry and CVV */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      Expiry (MM/YY) *
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength="5"
                      value={debitCardForm.card_expiry}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, card_expiry: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      CVV *
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength="4"
                      value={debitCardForm.card_cvv}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, card_cvv: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Billing Address */}
                <h3 style={{ color: '#1e293b', fontSize: '1rem', marginBottom: '1rem', marginTop: '1.5rem' }}>Billing Address</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    placeholder="123 Main Street"
                    value={debitCardForm.billing_address}
                    onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      placeholder="New York"
                      value={debitCardForm.billing_city}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_city: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      State *
                    </label>
                    <input
                      type="text"
                      placeholder="NY"
                      maxLength="2"
                      value={debitCardForm.billing_state}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_state: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      placeholder="10001"
                      value={debitCardForm.billing_zip}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_zip: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>
                      Country *
                    </label>
                    <input
                      type="text"
                      placeholder="United States"
                      value={debitCardForm.billing_country}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_country: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleClaimWithDebitCard}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                    marginTop: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {submitting && (
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                  )}
                  {submitting ? 'Processing...' : '✓ Claim Payment'}
                </button>

                <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center', lineHeight: '1.5' }}>
                  🔒 Your card details are encrypted and processed securely.<br />
                  Your transaction will be completed within a few hours.
                </p>
              </div>
            </>
          )}

          {!payment && !loading && (
            <div style={{ textAlign: 'center', color: '#666' }}>
              <p>Unable to load payment details.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
