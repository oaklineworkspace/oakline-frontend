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
    card_number: '',
    expiry: '',
    cvv: '',
    cardholder_name: ''
  });

  useEffect(() => {
    if (token) {
      loadPaymentDetails();
    }
  }, [token]);

  const loadPaymentDetails = async () => {
    try {
      const { data: paymentData, error } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('claim_token', token)
        .eq('status', 'sent')
        .single();

      if (error || !paymentData) {
        setMessage('Payment not found or has already been claimed.', 'error');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(paymentData.expires_at) < new Date()) {
        setMessage('This payment link has expired.', 'error');
        setLoading(false);
        return;
      }

      setPayment(paymentData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading payment:', error);
      setMessage('An error occurred while loading the payment.', 'error');
      setLoading(false);
    }
  };

  const handleClaimWithDebitCard = async () => {
    try {
      if (!debitCardForm.card_number || !debitCardForm.expiry || !debitCardForm.cvv || !debitCardForm.cardholder_name) {
        setMessage('Please fill in all card details.', 'error');
        return;
      }

      setSubmitting(true);

      // Update pending payment as claimed with debit card
      const { error } = await supabase
        .from('pending_payments')
        .update({
          status: 'claimed',
          claim_method: 'debit_card',
          claimed_at: new Date().toISOString(),
          recipient_name: debitCardForm.cardholder_name
        })
        .eq('claim_token', token);

      if (error) throw error;

      setMessage('✅ Payment initiated to your debit card. You should see the funds within 1-3 business days.', 'success');
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      console.error('Error claiming with card:', error);
      setMessage('Failed to process debit card claim. Please try again.', 'error');
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
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          {message && (
            <div style={{
              backgroundColor: messageType === 'error' ? '#fee2e2' : messageType === 'success' ? '#dcfce7' : '#eff6ff',
              border: `2px solid ${messageType === 'error' ? '#fca5a5' : messageType === 'success' ? '#86efac' : '#bfdbfe'}`,
              color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#065f46' : '#1e40af',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.95rem'
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
                <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '1rem' }}>Enter Your Debit Card Details</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Funds will be deposited within 1-3 business days.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                    Cardholder Name
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                    Card Number
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

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength="5"
                      value={debitCardForm.expiry}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, expiry: e.target.value })}
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
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      maxLength="4"
                      value={debitCardForm.cvv}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, cvv: e.target.value })}
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
                    transition: 'opacity 0.2s'
                  }}
                >
                  {submitting ? 'Processing...' : 'Claim Payment to This Card'}
                </button>

                <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                  🔒 Your card details are processed securely and not stored on our servers.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
