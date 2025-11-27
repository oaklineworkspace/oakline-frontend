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
  const [user, setUser] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimMethod, setClaimMethod] = useState('account'); // 'account' or 'debit_card'
  const [debitCardForm, setDebitCardForm] = useState({
    card_number: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    if (token) {
      loadPaymentDetails();
      checkUserSession();
    }
  }, [token]);

  const checkUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const loadPaymentDetails = async () => {
    try {
      const { data: paymentData, error } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('claim_token', token)
        .eq('status', 'pending')
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
      setShowClaimForm(true);
      setLoading(false);
    } catch (error) {
      console.error('Error loading payment:', error);
      setMessage('An error occurred while loading the payment.', 'error');
      setLoading(false);
    }
  };

  const handleClaimWithAccount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push(`/sign-up?redirect=/claim-payment?token=${token}`);
        return;
      }

      // Update pending payment as claimed
      const { error } = await supabase
        .from('pending_payments')
        .update({
          status: 'claimed',
          claimed_by_user_id: session.user.id,
          claim_method: 'account',
          claimed_at: new Date().toISOString()
        })
        .eq('claim_token', token);

      if (error) throw error;

      // Get or create account for recipient
      const { data: account } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .limit(1)
        .single();

      if (account) {
        // Add funds to recipient's account
        const newBalance = parseFloat(account.balance || 0) + parseFloat(payment.amount);
        await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', account.id);

        // Create credit transaction for recipient
        await supabase
          .from('transactions')
          .insert({
            user_id: session.user.id,
            account_id: account.id,
            type: 'oakline_pay_receive',
            amount: payment.amount,
            description: `Oakline Pay received from ${payment.sender_name || payment.sender_contact}`,
            status: 'completed',
            reference: `CLAIM-${payment.id.slice(0, 8)}`
          });
      }

      setMessage('✅ Payment claimed successfully! The funds have been added to your account.', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error claiming payment:', error);
      setMessage('Failed to claim payment. Please try again.', 'error');
    }
  };

  const handleClaimWithDebitCard = async () => {
    try {
      if (!debitCardForm.card_number || !debitCardForm.expiry || !debitCardForm.cvv) {
        setMessage('Please fill in all card details.', 'error');
        return;
      }

      // Update pending payment as claimed with debit card
      const { error } = await supabase
        .from('pending_payments')
        .update({
          status: 'claimed',
          claim_method: 'debit_card',
          claimed_at: new Date().toISOString()
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
        <title>Claim Your Payment - Oakline Bank</title>
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

          {payment && showClaimForm && (
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
                <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: '1rem' }}>Choose how to receive your money:</h2>

                <div
                  onClick={() => setClaimMethod('account')}
                  style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: claimMethod === 'account' ? '2px solid #667eea' : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: claimMethod === 'account' ? '#eff6ff' : 'white',
                    transition: 'all 0.3s'
                  }}
                >
                  <input
                    type="radio"
                    name="claim_method"
                    value="account"
                    checked={claimMethod === 'account'}
                    onChange={(e) => setClaimMethod(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label style={{ cursor: 'pointer', color: '#1e293b' }}>
                    <strong>Create Oakline Bank Account</strong>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Instant credit to your new account
                    </p>
                  </label>
                </div>

                <div
                  onClick={() => setClaimMethod('debit_card')}
                  style={{
                    padding: '1rem',
                    border: claimMethod === 'debit_card' ? '2px solid #667eea' : '2px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: claimMethod === 'debit_card' ? '#eff6ff' : 'white',
                    transition: 'all 0.3s'
                  }}
                >
                  <input
                    type="radio"
                    name="claim_method"
                    value="debit_card"
                    checked={claimMethod === 'debit_card'}
                    onChange={(e) => setClaimMethod(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label style={{ cursor: 'pointer', color: '#1e293b' }}>
                    <strong>Use Debit Card</strong>
                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Deposit to your debit card (1-3 business days)
                    </p>
                  </label>
                </div>
              </div>

              {claimMethod === 'debit_card' && (
                <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <input
                    type="text"
                    placeholder="Card Number"
                    value={debitCardForm.card_number}
                    onChange={(e) => setDebitCardForm({ ...debitCardForm, card_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      marginBottom: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.95rem'
                    }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={debitCardForm.expiry}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, expiry: e.target.value })}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.95rem'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      value={debitCardForm.cvv}
                      onChange={(e) => setDebitCardForm({ ...debitCardForm, cvv: e.target.value })}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.95rem'
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={claimMethod === 'account' ? handleClaimWithAccount : handleClaimWithDebitCard}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                {claimMethod === 'account' ? 'Claim & Create Account' : 'Claim to Debit Card'}
              </button>

              <p style={{ color: '#94a3b8', fontSize: '0.8rem', textAlign: 'center', margin: '1.5rem 0 0 0' }}>
                Expires: {new Date(payment.expires_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
