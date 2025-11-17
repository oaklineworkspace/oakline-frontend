
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function WireTransferPage() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [wireTransfers, setWireTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();

  const [wireForm, setWireForm] = useState({
    from_account: '',
    transfer_type: 'domestic',
    beneficiary_name: '',
    beneficiary_email: '',
    beneficiary_phone: '',
    beneficiary_bank: '',
    beneficiary_bank_address: '',
    beneficiary_bank_city: '',
    beneficiary_bank_state: '',
    beneficiary_bank_zip: '',
    beneficiary_address: '',
    beneficiary_city: '',
    beneficiary_state: '',
    beneficiary_zip: '',
    beneficiary_country: 'United States',
    routing_number: '',
    account_number: '',
    swift_code: '',
    iban: '',
    intermediary_bank_name: '',
    intermediary_bank_swift: '',
    intermediary_bank_account: '',
    amount: '',
    transfer_fee: '',
    exchange_rate: '',
    total_deduction: '',
    purpose: '',
    reference_note: '',
    urgent_transfer: false
  });

  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas',
    'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ];

  const TRANSFER_PURPOSES = [
    'Family Support',
    'Business Payment',
    'Real Estate Purchase',
    'Investment',
    'Education',
    'Medical Expenses',
    'Loan Repayment',
    'Personal Savings',
    'Charity/Donation',
    'Other'
  ];

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    calculateFees();
  }, [wireForm.amount, wireForm.transfer_type, wireForm.urgent_transfer]);

  const calculateFees = () => {
    if (!wireForm.amount || isNaN(parseFloat(wireForm.amount))) {
      setWireForm(prev => ({
        ...prev,
        transfer_fee: '',
        total_deduction: ''
      }));
      return;
    }

    const amount = parseFloat(wireForm.amount);
    let baseFee = wireForm.transfer_type === 'domestic' ? 15 : 25;
    const urgentFee = wireForm.urgent_transfer ? 10 : 0;
    const totalFee = baseFee + urgentFee;
    const totalDeduction = amount + totalFee;

    setWireForm(prev => ({
      ...prev,
      transfer_fee: totalFee.toFixed(2),
      total_deduction: totalDeduction.toFixed(2)
    }));
  };

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setWireForm(prev => ({ ...prev, from_account: userAccounts[0].id }));
      }

      const { data: wires } = await supabase
        .from('wire_transfers')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setWireTransfers(wires || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setWireForm(prev => ({ ...prev, [field]: value }));
    
    if (field === 'transfer_type') {
      if (value === 'domestic') {
        setWireForm(prev => ({ 
          ...prev, 
          swift_code: '', 
          iban: '',
          intermediary_bank_name: '',
          intermediary_bank_swift: '',
          intermediary_bank_account: '',
          beneficiary_country: 'United States' 
        }));
      }
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'from_account', 'beneficiary_name', 'beneficiary_bank',
      'beneficiary_address', 'beneficiary_city', 'routing_number',
      'account_number', 'amount', 'purpose'
    ];

    if (wireForm.transfer_type === 'domestic') {
      requiredFields.push('beneficiary_state', 'beneficiary_zip');
    } else {
      requiredFields.push('beneficiary_country', 'swift_code');
    }

    for (const field of requiredFields) {
      if (!wireForm[field]) {
        return false;
      }
    }

    const amount = parseFloat(wireForm.amount);
    if (isNaN(amount) || amount <= 0) {
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateForm()) {
      setMessage('Please fill in all required fields');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
    const totalAmount = parseFloat(wireForm.total_deduction);

    if (totalAmount > parseFloat(selectedAccount.balance)) {
      setMessage('Insufficient funds in selected account (including fees)');
      return;
    }

    setMessage('');
    setStep(2);
  };

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setCodeSent(false);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer',
          userId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setCodeSent(true);
      setShowVerificationModal(true);
      setMessage('Verification code sent to ' + user.email);
    } catch (error) {
      console.error('Error sending verification code:', error);
      setMessage(`${error.message || 'Failed to send verification code. Please try again.'}`);
      setSentCode('');
      setCodeSent(false);
    } finally {
      setSendingCode(false);
    }
  };

  const completeWireTransfer = async () => {
    if (!codeSent) {
      setMessage('Please request a verification code first.');
      return;
    }

    if (!verificationCode || verificationCode.length !== 6) {
      setMessage('Please enter a valid 6-digit verification code.');
      return;
    }

    if (verificationCode !== sentCode) {
      setMessage('Invalid verification code. Please check and try again.');
      return;
    }

    setProcessing(true);
    try {
      const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
      const amount = parseFloat(wireForm.amount);
      const totalAmount = parseFloat(wireForm.total_deduction);

      if (totalAmount > parseFloat(selectedAccount.balance)) {
        setMessage('Insufficient funds');
        setProcessing(false);
        return;
      }

      const { data: wireTransfer, error: wireError } = await supabase
        .from('wire_transfers')
        .insert([{
          user_id: user.id,
          from_account_id: wireForm.from_account,
          beneficiary_name: wireForm.beneficiary_name,
          beneficiary_email: wireForm.beneficiary_email || null,
          beneficiary_phone: wireForm.beneficiary_phone || null,
          beneficiary_bank: wireForm.beneficiary_bank,
          beneficiary_bank_address: wireForm.beneficiary_bank_address || null,
          beneficiary_bank_city: wireForm.beneficiary_bank_city || null,
          beneficiary_bank_state: wireForm.beneficiary_bank_state || null,
          beneficiary_bank_zip: wireForm.beneficiary_bank_zip || null,
          beneficiary_address: `${wireForm.beneficiary_address}, ${wireForm.beneficiary_city}, ${wireForm.beneficiary_state || wireForm.beneficiary_country} ${wireForm.beneficiary_zip || ''}`.trim(),
          routing_number: wireForm.routing_number,
          account_number: wireForm.account_number,
          swift_code: wireForm.swift_code || null,
          iban: wireForm.iban || null,
          intermediary_bank_name: wireForm.intermediary_bank_name || null,
          intermediary_bank_swift: wireForm.intermediary_bank_swift || null,
          intermediary_bank_account: wireForm.intermediary_bank_account || null,
          amount: amount,
          transfer_fee: parseFloat(wireForm.transfer_fee),
          purpose: wireForm.purpose,
          reference_note: wireForm.reference_note || null,
          urgent_transfer: wireForm.urgent_transfer,
          status: 'pending',
          reference_number: `WIRE${Date.now()}${Math.floor(Math.random() * 10000)}`
        }])
        .select()
        .single();

      if (wireError) throw wireError;

      const balanceBefore = parseFloat(selectedAccount.balance);
      const newBalance = balanceBefore - totalAmount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wireForm.from_account);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account,
        type: 'debit',
        amount: totalAmount,
        description: `Wire transfer to ${wireForm.beneficiary_name} - ${wireForm.beneficiary_bank} (including $${wireForm.transfer_fee} fee)`,
        status: 'completed',
        reference: wireTransfer.reference_number,
        balance_before: balanceBefore,
        balance_after: newBalance
      }]);

      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'wire_transfer',
        title: 'Wire Transfer Submitted',
        message: `Wire transfer of ${formatCurrency(amount)} to ${wireForm.beneficiary_name} is pending admin review`
      }]);

      setMessage('Wire transfer submitted successfully and is pending admin review!');
      setShowVerificationModal(false);
      
      setStep(1);
      setWireForm({
        from_account: wireForm.from_account,
        transfer_type: 'domestic',
        beneficiary_name: '',
        beneficiary_email: '',
        beneficiary_phone: '',
        beneficiary_bank: '',
        beneficiary_bank_address: '',
        beneficiary_bank_city: '',
        beneficiary_bank_state: '',
        beneficiary_bank_zip: '',
        beneficiary_address: '',
        beneficiary_city: '',
        beneficiary_state: '',
        beneficiary_zip: '',
        beneficiary_country: 'United States',
        routing_number: '',
        account_number: '',
        swift_code: '',
        iban: '',
        intermediary_bank_name: '',
        intermediary_bank_swift: '',
        intermediary_bank_account: '',
        amount: '',
        transfer_fee: '',
        exchange_rate: '',
        total_deduction: '',
        purpose: '',
        reference_note: '',
        urgent_transfer: false
      });
      setVerificationCode('');
      setSentCode('');
      setCodeSent(false);

      setTimeout(() => {
        checkUserAndLoadData();
      }, 1000);

    } catch (error) {
      console.error('Wire transfer error:', error);
      setMessage(`${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Wire Transfer - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div style={styles.container}>
        <div style={styles.header}>
          <Link href="/" style={styles.logoContainer}>
            <div style={styles.logoPlaceholder}>🏦</div>
            <span style={styles.logoText}>Oakline Bank</span>
          </Link>
          <Link href="/dashboard" style={styles.backButton}>← Dashboard</Link>
        </div>

        <div style={styles.content}>
          <div style={styles.titleSection}>
            <div style={styles.titleIcon}>💸</div>
            <h1 style={styles.title}>Wire Transfer</h1>
            <p style={styles.subtitle}>Securely transfer funds to any bank account worldwide</p>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('successfully') || message.includes('sent') ? '#d1fae5' : '#fee2e2',
              color: message.includes('successfully') || message.includes('sent') ? '#065f46' : '#991b1b',
              borderColor: message.includes('successfully') || message.includes('sent') ? '#10b981' : '#ef4444'
            }}>
              <div style={styles.messageIcon}>
                {message.includes('successfully') || message.includes('sent') ? '✓' : '⚠'}
              </div>
              <div>{message}</div>
            </div>
          )}

          <div style={styles.progressSteps}>
            <div style={{ ...styles.progressStep, ...(step >= 1 ? styles.progressStepActive : {}) }}>
              <div style={styles.progressStepCircle}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div style={styles.progressStepLabel}>Transfer Details</div>
            </div>
            <div style={{ ...styles.progressLine, ...(step >= 2 ? styles.progressLineActive : {}) }}></div>
            <div style={{ ...styles.progressStep, ...(step >= 2 ? styles.progressStepActive : {}) }}>
              <div style={styles.progressStepCircle}>
                {step > 2 ? '✓' : '2'}
              </div>
              <div style={styles.progressStepLabel}>Review & Verify</div>
            </div>
          </div>

          {step === 1 && (
            <div style={styles.formContainer}>
              <div style={styles.formCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardIcon}>📝</div>
                  <div>
                    <h3 style={styles.cardTitle}>Transfer Information</h3>
                    <p style={styles.cardSubtitle}>Please provide all required transfer details</p>
                  </div>
                </div>

                <div style={styles.formSection}>
                  <h4 style={styles.sectionTitle}>Source Account</h4>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Transfer Type <span style={styles.required}>*</span>
                    </label>
                    <select
                      style={styles.modernSelect}
                      value={wireForm.transfer_type}
                      onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                    >
                      <option value="domestic">Domestic (Within USA)</option>
                      <option value="international">International</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      From Account <span style={styles.required}>*</span>
                    </label>
                    <select
                      style={styles.modernSelect}
                      value={wireForm.from_account}
                      onChange={(e) => handleInputChange('from_account', e.target.value)}
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_type?.toUpperCase()} - ****{acc.account_number?.slice(-4)} - {formatCurrency(acc.balance)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Purpose of Transfer <span style={styles.required}>*</span>
                    </label>
                    <select
                      style={styles.modernSelect}
                      value={wireForm.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                    >
                      <option value="">Select purpose</option>
                      {TRANSFER_PURPOSES.map(purpose => (
                        <option key={purpose} value={purpose}>{purpose}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.divider}></div>

                <div style={styles.formSection}>
                  <h4 style={styles.sectionTitle}>Beneficiary Information</h4>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Beneficiary Full Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.modernInput}
                      value={wireForm.beneficiary_name}
                      onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email Address</label>
                      <input
                        type="email"
                        style={styles.modernInput}
                        value={wireForm.beneficiary_email}
                        onChange={(e) => handleInputChange('beneficiary_email', e.target.value)}
                        placeholder="john.smith@example.com"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number</label>
                      <input
                        type="tel"
                        style={styles.modernInput}
                        value={wireForm.beneficiary_phone}
                        onChange={(e) => handleInputChange('beneficiary_phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Street Address <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.modernInput}
                      value={wireForm.beneficiary_address}
                      onChange={(e) => handleInputChange('beneficiary_address', e.target.value)}
                      placeholder="123 Main Street, Apt 4B"
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        City <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        style={styles.modernInput}
                        value={wireForm.beneficiary_city}
                        onChange={(e) => handleInputChange('beneficiary_city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>

                    {wireForm.transfer_type === 'domestic' ? (
                      <>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>
                            State <span style={styles.required}>*</span>
                          </label>
                          <select
                            style={styles.modernSelect}
                            value={wireForm.beneficiary_state}
                            onChange={(e) => handleInputChange('beneficiary_state', e.target.value)}
                          >
                            <option value="">Select State</option>
                            {US_STATES.map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>
                            ZIP Code <span style={styles.required}>*</span>
                          </label>
                          <input
                            type="text"
                            style={styles.modernInput}
                            value={wireForm.beneficiary_zip}
                            onChange={(e) => handleInputChange('beneficiary_zip', e.target.value)}
                            placeholder="10001"
                            maxLength="10"
                          />
                        </div>
                      </>
                    ) : (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          Country <span style={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          style={styles.modernInput}
                          value={wireForm.beneficiary_country}
                          onChange={(e) => handleInputChange('beneficiary_country', e.target.value)}
                          placeholder="United Kingdom"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div style={styles.divider}></div>

                <div style={styles.formSection}>
                  <h4 style={styles.sectionTitle}>Beneficiary Bank Details</h4>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Bank Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      style={styles.modernInput}
                      value={wireForm.beneficiary_bank}
                      onChange={(e) => handleInputChange('beneficiary_bank', e.target.value)}
                      placeholder="Bank of America"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Bank Address</label>
                    <input
                      type="text"
                      style={styles.modernInput}
                      value={wireForm.beneficiary_bank_address}
                      onChange={(e) => handleInputChange('beneficiary_bank_address', e.target.value)}
                      placeholder="100 Bank Street"
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Bank City</label>
                      <input
                        type="text"
                        style={styles.modernInput}
                        value={wireForm.beneficiary_bank_city}
                        onChange={(e) => handleInputChange('beneficiary_bank_city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    {wireForm.transfer_type === 'domestic' && (
                      <>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Bank State</label>
                          <select
                            style={styles.modernSelect}
                            value={wireForm.beneficiary_bank_state}
                            onChange={(e) => handleInputChange('beneficiary_bank_state', e.target.value)}
                          >
                            <option value="">Select State</option>
                            {US_STATES.map(state => (
                              <option key={state} value={state}>{state}</option>
                            ))}
                          </select>
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Bank ZIP</label>
                          <input
                            type="text"
                            style={styles.modernInput}
                            value={wireForm.beneficiary_bank_zip}
                            onChange={(e) => handleInputChange('beneficiary_bank_zip', e.target.value)}
                            placeholder="10001"
                            maxLength="10"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        {wireForm.transfer_type === 'domestic' ? 'Routing Number (ABA)' : 'Routing/Sort Code'} <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        style={styles.modernInput}
                        value={wireForm.routing_number}
                        onChange={(e) => handleInputChange('routing_number', e.target.value)}
                        placeholder={wireForm.transfer_type === 'domestic' ? '021000021' : '12-34-56'}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Account Number <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        style={styles.modernInput}
                        value={wireForm.account_number}
                        onChange={(e) => handleInputChange('account_number', e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>

                  {wireForm.transfer_type === 'international' && (
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          SWIFT/BIC Code <span style={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          style={styles.modernInput}
                          value={wireForm.swift_code}
                          onChange={(e) => handleInputChange('swift_code', e.target.value.toUpperCase())}
                          placeholder="BOFAUS3NXXX"
                          maxLength="11"
                        />
                        <small style={styles.helpText}>
                          8 or 11 characters
                        </small>
                      </div>
                      <div style={styles.formGroup}>
                        <label style={styles.label}>IBAN (if applicable)</label>
                        <input
                          type="text"
                          style={styles.modernInput}
                          value={wireForm.iban}
                          onChange={(e) => handleInputChange('iban', e.target.value.toUpperCase())}
                          placeholder="GB29NWBK60161331926819"
                        />
                        <small style={styles.helpText}>
                          International Bank Account Number
                        </small>
                      </div>
                    </div>
                  )}
                </div>

                {wireForm.transfer_type === 'international' && (
                  <>
                    <div style={styles.divider}></div>
                    <div style={styles.formSection}>
                      <h4 style={styles.sectionTitle}>Intermediary Bank (Optional)</h4>
                      <p style={styles.sectionDescription}>
                        Some international transfers may require an intermediary bank
                      </p>

                      <div style={styles.formGroup}>
                        <label style={styles.label}>Intermediary Bank Name</label>
                        <input
                          type="text"
                          style={styles.modernInput}
                          value={wireForm.intermediary_bank_name}
                          onChange={(e) => handleInputChange('intermediary_bank_name', e.target.value)}
                          placeholder="Citibank N.A."
                        />
                      </div>

                      <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Intermediary SWIFT Code</label>
                          <input
                            type="text"
                            style={styles.modernInput}
                            value={wireForm.intermediary_bank_swift}
                            onChange={(e) => handleInputChange('intermediary_bank_swift', e.target.value.toUpperCase())}
                            placeholder="CITIUS33XXX"
                            maxLength="11"
                          />
                        </div>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Intermediary Account</label>
                          <input
                            type="text"
                            style={styles.modernInput}
                            value={wireForm.intermediary_bank_account}
                            onChange={(e) => handleInputChange('intermediary_bank_account', e.target.value)}
                            placeholder="Account number"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div style={styles.divider}></div>

                <div style={styles.formSection}>
                  <h4 style={styles.sectionTitle}>Transfer Amount & Details</h4>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Transfer Amount (USD) <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="number"
                        style={styles.modernInput}
                        value={wireForm.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Reference Note</label>
                      <input
                        type="text"
                        style={styles.modernInput}
                        value={wireForm.reference_note}
                        onChange={(e) => handleInputChange('reference_note', e.target.value)}
                        placeholder="Invoice #1234"
                      />
                    </div>
                  </div>

                  <div style={styles.feeBreakdown}>
                    <div style={styles.feeRow}>
                      <span style={styles.feeLabel}>Transfer Amount:</span>
                      <span style={styles.feeValue}>{formatCurrency(wireForm.amount || 0)}</span>
                    </div>
                    <div style={styles.feeRow}>
                      <span style={styles.feeLabel}>Transfer Fee:</span>
                      <span style={styles.feeValue}>{formatCurrency(wireForm.transfer_fee || 0)}</span>
                    </div>
                    <div style={styles.feeRow}>
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={wireForm.urgent_transfer}
                          onChange={(e) => handleInputChange('urgent_transfer', e.target.checked)}
                          style={styles.checkbox}
                        />
                        <span>Urgent Transfer (+$10.00)</span>
                      </label>
                    </div>
                    <div style={{ ...styles.feeRow, ...styles.totalRow }}>
                      <span style={styles.totalLabel}>Total Deduction:</span>
                      <span style={styles.totalValue}>{formatCurrency(wireForm.total_deduction || 0)}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.warningBox}>
                  <div style={styles.warningIcon}>⚠️</div>
                  <div style={styles.warningContent}>
                    <strong>Important Notice:</strong> Wire transfers are typically irreversible. Please verify all details carefully before proceeding.
                    {wireForm.transfer_type === 'international' && ' International transfers may take 1-5 business days to complete.'}
                  </div>
                </div>

                <button
                  style={styles.primaryButton}
                  onClick={handleNext}
                  disabled={processing}
                  onMouseEnter={(e) => !processing && (e.target.style.opacity = '0.9')}
                  onMouseLeave={(e) => !processing && (e.target.style.opacity = '1')}
                >
                  {processing ? 'Processing...' : 'Continue to Review →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={styles.formContainer}>
              <div style={styles.formCard}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardIcon}>📋</div>
                  <div>
                    <h3 style={styles.cardTitle}>Review Transfer Details</h3>
                    <p style={styles.cardSubtitle}>Please verify all information before proceeding</p>
                  </div>
                </div>

                <div style={styles.reviewGrid}>
                  <div style={styles.reviewSection}>
                    <h4 style={styles.reviewSectionTitle}>Transfer Information</h4>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Type:</span>
                      <span style={styles.reviewValue}>{wireForm.transfer_type === 'domestic' ? 'Domestic (USA)' : 'International'}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>From Account:</span>
                      <span style={styles.reviewValue}>
                        {accounts.find(acc => acc.id === wireForm.from_account)?.account_type?.toUpperCase()} -
                        ****{accounts.find(acc => acc.id === wireForm.from_account)?.account_number?.slice(-4)}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Purpose:</span>
                      <span style={styles.reviewValue}>{wireForm.purpose}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Amount:</span>
                      <span style={{...styles.reviewValue, fontWeight: 'bold', fontSize: '1.1rem', color: '#059669'}}>
                        {formatCurrency(wireForm.amount)}
                      </span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Transfer Fee:</span>
                      <span style={styles.reviewValue}>{formatCurrency(wireForm.transfer_fee)}</span>
                    </div>
                    {wireForm.urgent_transfer && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Processing:</span>
                        <span style={{...styles.reviewValue, color: '#dc2626'}}>Urgent (+$10.00)</span>
                      </div>
                    )}
                    <div style={{ ...styles.reviewRow, borderTop: '2px solid #e5e7eb', paddingTop: '12px', marginTop: '8px' }}>
                      <span style={{...styles.reviewLabel, fontWeight: 'bold'}}>Total Deduction:</span>
                      <span style={{...styles.reviewValue, fontWeight: 'bold', fontSize: '1.2rem', color: '#dc2626'}}>
                        {formatCurrency(wireForm.total_deduction)}
                      </span>
                    </div>
                  </div>

                  <div style={styles.reviewSection}>
                    <h4 style={styles.reviewSectionTitle}>Beneficiary Details</h4>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Name:</span>
                      <span style={styles.reviewValue}>{wireForm.beneficiary_name}</span>
                    </div>
                    {wireForm.beneficiary_email && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Email:</span>
                        <span style={styles.reviewValue}>{wireForm.beneficiary_email}</span>
                      </div>
                    )}
                    {wireForm.beneficiary_phone && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Phone:</span>
                        <span style={styles.reviewValue}>{wireForm.beneficiary_phone}</span>
                      </div>
                    )}
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Address:</span>
                      <span style={styles.reviewValue}>
                        {wireForm.beneficiary_address}, {wireForm.beneficiary_city}, {wireForm.beneficiary_state || wireForm.beneficiary_country} {wireForm.beneficiary_zip || ''}
                      </span>
                    </div>
                  </div>

                  <div style={styles.reviewSection}>
                    <h4 style={styles.reviewSectionTitle}>Bank Details</h4>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Bank Name:</span>
                      <span style={styles.reviewValue}>{wireForm.beneficiary_bank}</span>
                    </div>
                    {wireForm.beneficiary_bank_address && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Bank Address:</span>
                        <span style={styles.reviewValue}>{wireForm.beneficiary_bank_address}</span>
                      </div>
                    )}
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Routing Number:</span>
                      <span style={styles.reviewValue}>{wireForm.routing_number}</span>
                    </div>
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Account Number:</span>
                      <span style={styles.reviewValue}>****{wireForm.account_number.slice(-4)}</span>
                    </div>
                    {wireForm.swift_code && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>SWIFT Code:</span>
                        <span style={styles.reviewValue}>{wireForm.swift_code}</span>
                      </div>
                    )}
                    {wireForm.iban && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>IBAN:</span>
                        <span style={styles.reviewValue}>{wireForm.iban}</span>
                      </div>
                    )}
                    {wireForm.reference_note && (
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Reference:</span>
                        <span style={styles.reviewValue}>{wireForm.reference_note}</span>
                      </div>
                    )}
                  </div>

                  {wireForm.intermediary_bank_name && (
                    <div style={styles.reviewSection}>
                      <h4 style={styles.reviewSectionTitle}>Intermediary Bank</h4>
                      <div style={styles.reviewRow}>
                        <span style={styles.reviewLabel}>Bank Name:</span>
                        <span style={styles.reviewValue}>{wireForm.intermediary_bank_name}</span>
                      </div>
                      {wireForm.intermediary_bank_swift && (
                        <div style={styles.reviewRow}>
                          <span style={styles.reviewLabel}>SWIFT Code:</span>
                          <span style={styles.reviewValue}>{wireForm.intermediary_bank_swift}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={styles.verificationNotice}>
                  <div style={styles.verificationIconContainer}>
                    <span style={styles.verificationIcon}>🔐</span>
                  </div>
                  <div>
                    <p style={styles.verificationNoticeTitle}>Email Verification Required</p>
                    <p style={styles.verificationNoticeText}>
                      For your security, we'll send a 6-digit verification code to: <strong>{user?.email}</strong>
                    </p>
                    <p style={styles.verificationNoticeText}>
                      After verification, your transfer will be submitted for admin review with a <strong>pending</strong> status.
                    </p>
                  </div>
                </div>

                <div style={styles.buttonRow}>
                  <button 
                    style={styles.secondaryButton} 
                    onClick={() => setStep(1)}
                    disabled={processing || sendingCode}
                  >
                    ← Edit Details
                  </button>
                  <button
                    style={styles.primaryButton}
                    onClick={sendVerificationCode}
                    disabled={processing || sendingCode}
                    onMouseEnter={(e) => !(processing || sendingCode) && (e.target.style.opacity = '0.9')}
                    onMouseLeave={(e) => !(processing || sendingCode) && (e.target.style.opacity = '1')}
                  >
                    {sendingCode ? (
                      <>
                        <span style={styles.buttonSpinner}></span>
                        Sending Code...
                      </>
                    ) : (
                      'Send Verification Code →'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={styles.historyCard}>
            <div style={styles.historyHeader}>
              <div style={styles.historyIcon}>📜</div>
              <h3 style={styles.historyTitle}>Transfer History</h3>
            </div>
            {wireTransfers.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>💸</div>
                <p style={styles.emptyText}>No wire transfers yet</p>
                <p style={styles.emptySubtext}>Your transfer history will appear here</p>
              </div>
            ) : (
              <div style={styles.historyList}>
                {wireTransfers.slice(0, 5).map(wire => (
                  <div key={wire.id} style={styles.historyItem}>
                    <div style={styles.historyMain}>
                      <div style={styles.historyLeft}>
                        <div style={styles.historyStatusIcon}>
                          {wire.status === 'completed' ? '✓' : 
                           wire.status === 'pending' ? '⏱' : 
                           wire.status === 'processing' ? '⚙' : '⚠'}
                        </div>
                        <div style={styles.historyInfo}>
                          <div style={styles.historyName}>{wire.beneficiary_name}</div>
                          <div style={styles.historyBank}>{wire.beneficiary_bank}</div>
                          <div style={styles.historyRef}>Ref: {wire.reference_number}</div>
                        </div>
                      </div>
                      <div style={styles.historyRight}>
                        <div style={styles.historyAmount}>{formatCurrency(wire.amount)}</div>
                        <div style={{
                          ...styles.historyStatus,
                          backgroundColor: wire.status === 'completed' ? '#d1fae5' :
                                         wire.status === 'pending' ? '#fef3c7' :
                                         wire.status === 'processing' ? '#dbeafe' : '#fee2e2',
                          color: wire.status === 'completed' ? '#065f46' :
                                wire.status === 'pending' ? '#92400e' :
                                wire.status === 'processing' ? '#1e40af' : '#991b1b'
                        }}>
                          {wire.status.charAt(0).toUpperCase() + wire.status.slice(1)}
                        </div>
                        <div style={styles.historyDate}>
                          {new Date(wire.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showVerificationModal && (
          <div style={styles.modalOverlay} onClick={() => !processing && setShowVerificationModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div style={styles.modalIconContainer}>
                  <span style={styles.modalIcon}>🔐</span>
                </div>
                <h2 style={styles.modalTitle}>Verify Your Transfer</h2>
                <p style={styles.modalSubtitle}>
                  We've sent a 6-digit code to <strong>{user.email}</strong>
                </p>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.codeInputContainer}>
                  <label style={styles.codeLabel}>Verification Code</label>
                  <input
                    type="text"
                    style={styles.verificationInput}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength="6"
                    disabled={processing}
                    autoFocus
                  />
                  <p style={styles.codeHint}>
                    ⏱ Code expires in 15 minutes
                  </p>
                </div>

                <div style={styles.resendContainer}>
                  <p style={styles.resendText}>Didn't receive the code?</p>
                  <button
                    style={styles.resendButton}
                    onClick={sendVerificationCode}
                    disabled={processing || sendingCode}
                  >
                    {sendingCode ? 'Resending...' : 'Resend Code'}
                  </button>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button 
                  style={styles.cancelButton} 
                  onClick={() => setShowVerificationModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.confirmButton,
                    ...(processing || verificationCode.length !== 6 ? styles.confirmButtonDisabled : {})
                  }}
                  onClick={completeWireTransfer}
                  disabled={processing || verificationCode.length !== 6}
                >
                  {processing ? (
                    <>
                      <span style={styles.buttonSpinner}></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>✓</span> Verify & Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    paddingBottom: '80px'
  },
  header: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    color: 'white',
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.75rem'
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '700'
  },
  backButton: {
    padding: '0.625rem 1.25rem',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500'
  },
  content: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.5rem'
  },
  titleSection: {
    textAlign: 'center',
    marginBottom: '2.5rem',
    animation: 'fadeIn 0.6s ease'
  },
  titleIcon: {
    fontSize: '3.5rem',
    marginBottom: '1rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '0.5rem',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#64748b',
    fontWeight: '400'
  },
  message: {
    padding: '1.125rem 1.5rem',
    borderRadius: '12px',
    marginBottom: '1.75rem',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
    animation: 'fadeIn 0.4s ease',
    fontWeight: '500'
  },
  messageIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  progressSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2.5rem',
    padding: '0 2rem'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: 0.4,
    transition: 'all 0.4s ease'
  },
  progressStepActive: {
    opacity: 1
  },
  progressStepCircle: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    fontWeight: 'bold',
    transition: 'all 0.4s ease'
  },
  progressStepLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#64748b'
  },
  progressLine: {
    flex: 1,
    height: '3px',
    backgroundColor: '#e5e7eb',
    margin: '0 1rem',
    maxWidth: '120px',
    transition: 'all 0.4s ease'
  },
  progressLineActive: {
    backgroundColor: '#10b981'
  },
  formContainer: {
    marginBottom: '2rem'
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '2px solid #f3f4f6'
  },
  cardIcon: {
    fontSize: '2rem',
    backgroundColor: '#eff6ff',
    padding: '0.75rem',
    borderRadius: '12px'
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '0.25rem'
  },
  cardSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  },
  formSection: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  sectionDescription: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '1rem',
    marginTop: '-0.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem',
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '1.25rem',
    marginBottom: '0'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151'
  },
  required: {
    color: '#ef4444'
  },
  modernInput: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '0.95rem',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  modernSelect: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '0.95rem',
    border: '1.5px solid #e5e7eb',
    borderRadius: '10px',
    backgroundColor: '#ffffff',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  helpText: {
    display: 'block',
    marginTop: '0.5rem',
    fontSize: '0.8rem',
    color: '#9ca3af',
    fontStyle: 'italic'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '2rem 0'
  },
  feeBreakdown: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '12px',
    marginTop: '1.5rem',
    border: '1px solid #e5e7eb'
  },
  feeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    fontSize: '0.95rem'
  },
  feeLabel: {
    color: '#64748b',
    fontWeight: '500'
  },
  feeValue: {
    color: '#1e293b',
    fontWeight: '600'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    color: '#1e293b',
    fontWeight: '500'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  totalRow: {
    borderTop: '2px solid #e5e7eb',
    paddingTop: '0.75rem',
    marginTop: '0.5rem',
    marginBottom: 0
  },
  totalLabel: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#0f172a'
  },
  totalValue: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#dc2626'
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  warningIcon: {
    fontSize: '1.5rem',
    flexShrink: 0
  },
  warningContent: {
    fontSize: '0.9rem',
    color: '#92400e',
    lineHeight: '1.6'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
  },
  reviewGrid: {
    display: 'grid',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  reviewSection: {
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  reviewSectionTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '1rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e5e7eb'
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.875rem',
    gap: '1rem'
  },
  reviewLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
    minWidth: '140px'
  },
  reviewValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  verificationNotice: {
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start'
  },
  verificationIconContainer: {
    backgroundColor: 'white',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  verificationIcon: {
    fontSize: '1.5rem'
  },
  verificationNoticeTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '0.5rem',
    margin: 0
  },
  verificationNoticeText: {
    fontSize: '0.9rem',
    color: '#1e40af',
    lineHeight: '1.6',
    margin: '0.5rem 0'
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  secondaryButton: {
    flex: 1,
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    marginTop: '2rem'
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f3f4f6'
  },
  historyIcon: {
    fontSize: '1.75rem',
    backgroundColor: '#eff6ff',
    padding: '0.625rem',
    borderRadius: '10px'
  },
  historyTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem'
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    opacity: 0.5
  },
  emptyText: {
    fontSize: '1.125rem',
    color: '#64748b',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  emptySubtext: {
    fontSize: '0.9rem',
    color: '#9ca3af'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  historyItem: {
    padding: '1.25rem',
    borderRadius: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    transition: 'all 0.3s ease'
  },
  historyMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem'
  },
  historyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1
  },
  historyStatusIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    flexShrink: 0
  },
  historyInfo: {
    flex: 1
  },
  historyName: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '0.25rem'
  },
  historyBank: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  historyRef: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontFamily: 'monospace'
  },
  historyRight: {
    textAlign: 'right'
  },
  historyAmount: {
    fontSize: '1.125rem',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '0.5rem'
  },
  historyStatus: {
    display: 'inline-block',
    padding: '0.375rem 0.875rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '0.5rem'
  },
  historyDate: {
    fontSize: '0.8rem',
    color: '#9ca3af'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
    backdropFilter: 'blur(4px)'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '20px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'fadeIn 0.3s ease'
  },
  modalHeader: {
    padding: '2rem 2rem 1.5rem',
    textAlign: 'center',
    borderBottom: '1px solid #e5e7eb'
  },
  modalIconContainer: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    margin: '0 auto 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalIcon: {
    fontSize: '2rem'
  },
  modalTitle: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: '0.5rem'
  },
  modalSubtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    margin: 0
  },
  modalBody: {
    padding: '2rem'
  },
  codeInputContainer: {
    marginBottom: '1.5rem'
  },
  codeLabel: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem'
  },
  verificationInput: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.5rem',
    fontWeight: '700',
    letterSpacing: '0.5rem',
    textAlign: 'center',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    fontFamily: 'monospace',
    boxSizing: 'border-box'
  },
  codeHint: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    marginTop: '0.75rem',
    textAlign: 'center'
  },
  resendContainer: {
    textAlign: 'center',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '12px'
  },
  resendText: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  resendButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '0.25rem 0.5rem'
  },
  modalFooter: {
    padding: '1.5rem 2rem 2rem',
    display: 'flex',
    gap: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    flex: 1,
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#64748b',
    backgroundColor: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  confirmButton: {
    flex: 2,
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: '700',
    color: 'white',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  },
  confirmButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    fontSize: '1.125rem',
    color: '#64748b',
    fontWeight: '600'
  }
};
