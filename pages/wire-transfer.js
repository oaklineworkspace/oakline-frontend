
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
  const [bankDetails, setBankDetails] = useState(null);
  const router = useRouter();

  const [wireForm, setWireForm] = useState({
    from_account: '',
    transfer_type: 'domestic',
    beneficiary_name: '',
    beneficiary_bank: '',
    beneficiary_address: '',
    beneficiary_city: '',
    beneficiary_state: '',
    beneficiary_zip: '',
    beneficiary_country: 'United States',
    routing_number: '',
    account_number: '',
    swift_code: '',
    amount: '',
    memo: ''
  });

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      // Fetch bank details
      const { data: bankData } = await supabase
        .from('bank_details')
        .select('*')
        .single();
      setBankDetails(bankData);

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
    
    if (field === 'transfer_type' && value === 'domestic') {
      setWireForm(prev => ({ ...prev, swift_code: '' }));
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'from_account', 'beneficiary_name', 'beneficiary_bank',
      'beneficiary_address', 'beneficiary_city', 'routing_number',
      'account_number', 'amount'
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
      setMessage('❌ Please fill in all required fields');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
    const amount = parseFloat(wireForm.amount);

    if (amount > parseFloat(selectedAccount.balance)) {
      setMessage('❌ Insufficient funds in selected account');
      return;
    }

    setMessage('');
    setStep(2);
  };

  const sendVerificationCode = async () => {
    setProcessing(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);

      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          code: code,
          type: 'wire_transfer'
        })
      });

      if (!response.ok) throw new Error('Failed to send verification code');

      setShowVerificationModal(true);
      setMessage('✅ Verification code sent to your email');
    } catch (error) {
      console.error('Error sending verification code:', error);
      setMessage('❌ Failed to send verification code. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const completeWireTransfer = async () => {
    if (verificationCode !== sentCode) {
      setMessage('❌ Invalid verification code. Please check and try again.');
      return;
    }

    setProcessing(true);
    try {
      const selectedAccount = accounts.find(acc => acc.id === wireForm.from_account);
      const amount = parseFloat(wireForm.amount);

      if (amount > parseFloat(selectedAccount.balance)) {
        setMessage('❌ Insufficient funds');
        setProcessing(false);
        return;
      }

      const { data: wireTransfer, error: wireError } = await supabase
        .from('wire_transfers')
        .insert([{
          user_id: user.id,
          from_account_id: wireForm.from_account,
          beneficiary_name: wireForm.beneficiary_name,
          beneficiary_bank: wireForm.beneficiary_bank,
          beneficiary_address: `${wireForm.beneficiary_address}, ${wireForm.beneficiary_city}, ${wireForm.beneficiary_state || wireForm.beneficiary_country} ${wireForm.beneficiary_zip || ''}`.trim(),
          routing_number: wireForm.routing_number,
          account_number: wireForm.account_number,
          swift_code: wireForm.swift_code || null,
          amount: amount,
          memo: wireForm.memo || null,
          status: 'processing',
          reference_number: `WIRE${Date.now()}${Math.floor(Math.random() * 10000)}`
        }])
        .select()
        .single();

      if (wireError) throw wireError;

      const balanceBefore = parseFloat(selectedAccount.balance);
      const newBalance = balanceBefore - amount;
      await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', wireForm.from_account);

      await supabase.from('transactions').insert([{
        user_id: user.id,
        account_id: wireForm.from_account,
        type: 'debit',
        amount: amount,
        description: `Wire transfer to ${wireForm.beneficiary_name} - ${wireForm.beneficiary_bank}`,
        status: 'completed',
        reference: wireTransfer.reference_number,
        balance_before: balanceBefore,
        balance_after: newBalance
      }]);

      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'wire_transfer',
        title: 'Wire Transfer Processing',
        message: `Wire transfer of ${formatCurrency(amount)} to ${wireForm.beneficiary_name} is being processed`
      }]);

      await fetch('/api/send-transfer-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          transferType: 'wire',
          amount: amount,
          recipientName: wireForm.beneficiary_name,
          recipientBank: wireForm.beneficiary_bank,
          reference: wireTransfer.reference_number
        })
      });

      setMessage('✅ Wire transfer submitted successfully and is being processed!');
      setShowVerificationModal(false);
      
      setStep(1);
      setWireForm({
        from_account: wireForm.from_account,
        transfer_type: 'domestic',
        beneficiary_name: '',
        beneficiary_bank: '',
        beneficiary_address: '',
        beneficiary_city: '',
        beneficiary_state: '',
        beneficiary_zip: '',
        beneficiary_country: 'United States',
        routing_number: '',
        account_number: '',
        swift_code: '',
        amount: '',
        memo: ''
      });
      setVerificationCode('');
      setSentCode('');

      setTimeout(() => {
        checkUserAndLoadData();
      }, 1000);

    } catch (error) {
      console.error('Wire transfer error:', error);
      setMessage(`❌ ${error.message}`);
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
            <h1 style={styles.title}>🌐 Wire Transfer</h1>
            <p style={styles.subtitle}>Send money securely to any bank account</p>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
              color: message.includes('✅') ? '#155724' : '#721c24',
              borderColor: message.includes('✅') ? '#c3e6cb' : '#f5c6cb'
            }}>
              {message}
            </div>
          )}

          <div style={styles.steps}>
            <div style={{ ...styles.stepItem, ...(step >= 1 ? styles.stepActive : {}) }}>
              <div style={styles.stepNumber}>1</div>
              <div style={styles.stepLabel}>Transfer Details</div>
            </div>
            <div style={styles.stepLine}></div>
            <div style={{ ...styles.stepItem, ...(step >= 2 ? styles.stepActive : {}) }}>
              <div style={styles.stepNumber}>2</div>
              <div style={styles.stepLabel}>Review & Confirm</div>
            </div>
          </div>

          {step === 1 && (
            <div style={styles.formCard}>
              <h3 style={styles.sectionTitle}>Wire Transfer Information</h3>

              <div style={styles.formGroup}>
                <label style={styles.label}>Transfer Type *</label>
                <select
                  style={styles.select}
                  value={wireForm.transfer_type}
                  onChange={(e) => handleInputChange('transfer_type', e.target.value)}
                >
                  <option value="domestic">Domestic (Within USA)</option>
                  <option value="international">International</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>From Account *</label>
                <select
                  style={styles.select}
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

              <div style={styles.divider}></div>

              <h4 style={styles.subsectionTitle}>Beneficiary Information</h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Beneficiary Full Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_name}
                  onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Beneficiary Address *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_address}
                  onChange={(e) => handleInputChange('beneficiary_address', e.target.value)}
                  placeholder="123 Main Street, Apt 4B"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>City *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.beneficiary_city}
                    onChange={(e) => handleInputChange('beneficiary_city', e.target.value)}
                    placeholder="New York"
                  />
                </div>

                {wireForm.transfer_type === 'domestic' ? (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>State *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.beneficiary_state}
                        onChange={(e) => handleInputChange('beneficiary_state', e.target.value)}
                        placeholder="NY"
                        maxLength="2"
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>ZIP Code *</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={wireForm.beneficiary_zip}
                        onChange={(e) => handleInputChange('beneficiary_zip', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </>
                ) : (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Country *</label>
                    <input
                      type="text"
                      style={styles.input}
                      value={wireForm.beneficiary_country}
                      onChange={(e) => handleInputChange('beneficiary_country', e.target.value)}
                      placeholder="United Kingdom"
                    />
                  </div>
                )}
              </div>

              <div style={styles.divider}></div>

              <h4 style={styles.subsectionTitle}>Bank Information</h4>

              <div style={styles.formGroup}>
                <label style={styles.label}>Beneficiary Bank Name *</label>
                <input
                  type="text"
                  style={styles.input}
                  value={wireForm.beneficiary_bank}
                  onChange={(e) => handleInputChange('beneficiary_bank', e.target.value)}
                  placeholder="Bank of America"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    {wireForm.transfer_type === 'domestic' ? 'Routing Number *' : 'Routing/Sort Code *'}
                  </label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.routing_number}
                    onChange={(e) => handleInputChange('routing_number', e.target.value)}
                    placeholder={wireForm.transfer_type === 'domestic' ? '123456789' : '12-34-56'}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Account Number *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.account_number}
                    onChange={(e) => handleInputChange('account_number', e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              {wireForm.transfer_type === 'international' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>SWIFT/BIC Code *</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.swift_code}
                    onChange={(e) => handleInputChange('swift_code', e.target.value.toUpperCase())}
                    placeholder="BOFAUS3N"
                    maxLength="11"
                  />
                  <small style={styles.helpText}>
                    Required for international transfers (8 or 11 characters)
                  </small>
                </div>
              )}

              <div style={styles.divider}></div>

              <h4 style={styles.subsectionTitle}>Transfer Details</h4>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Amount (USD) *</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={wireForm.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Memo / Reference (Optional)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={wireForm.memo}
                    onChange={(e) => handleInputChange('memo', e.target.value)}
                    placeholder="Invoice #1234"
                  />
                </div>
              </div>

              <div style={styles.infoBox}>
                <p style={styles.infoText}>
                  ⚠️ <strong>Important:</strong> Wire transfers are typically irreversible. Please verify all details carefully before proceeding.
                  {wireForm.transfer_type === 'international' && ' International transfers may take 1-5 business days.'}
                </p>
              </div>

              <button
                style={styles.primaryButton}
                onClick={handleNext}
                disabled={processing}
                onMouseEnter={(e) => !processing && (e.target.style.backgroundColor = '#1e3a8a')}
                onMouseLeave={(e) => !processing && (e.target.style.backgroundColor = '#1e40af')}
              >
                {processing ? 'Processing...' : 'Continue to Review →'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={styles.formCard}>
              <h3 style={styles.sectionTitle}>Review Wire Transfer</h3>

              <div style={styles.reviewSection}>
                <div style={styles.reviewCategory}>
                  <h4 style={styles.reviewCategoryTitle}>Transfer Information</h4>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Type:</span>
                    <span style={styles.reviewValue}>{wireForm.transfer_type === 'domestic' ? 'Domestic' : 'International'}</span>
                  </div>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>From Account:</span>
                    <span style={styles.reviewValue}>
                      {accounts.find(acc => acc.id === wireForm.from_account)?.account_type?.toUpperCase()} -
                      ****{accounts.find(acc => acc.id === wireForm.from_account)?.account_number?.slice(-4)}
                    </span>
                  </div>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Amount:</span>
                    <span style={{...styles.reviewValue, fontWeight: 'bold', fontSize: '1.1rem', color: '#059669'}}>
                      {formatCurrency(wireForm.amount)}
                    </span>
                  </div>
                </div>

                <div style={styles.reviewCategory}>
                  <h4 style={styles.reviewCategoryTitle}>Beneficiary Details</h4>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Name:</span>
                    <span style={styles.reviewValue}>{wireForm.beneficiary_name}</span>
                  </div>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Address:</span>
                    <span style={styles.reviewValue}>
                      {wireForm.beneficiary_address}, {wireForm.beneficiary_city}, {wireForm.beneficiary_state || wireForm.beneficiary_country} {wireForm.beneficiary_zip || ''}
                    </span>
                  </div>
                </div>

                <div style={styles.reviewCategory}>
                  <h4 style={styles.reviewCategoryTitle}>Bank Details</h4>
                  <div style={styles.reviewRow}>
                    <span style={styles.reviewLabel}>Bank:</span>
                    <span style={styles.reviewValue}>{wireForm.beneficiary_bank}</span>
                  </div>
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
                  {wireForm.memo && (
                    <div style={styles.reviewRow}>
                      <span style={styles.reviewLabel}>Memo:</span>
                      <span style={styles.reviewValue}>{wireForm.memo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button 
                  style={styles.secondaryButton} 
                  onClick={() => setStep(1)}
                  disabled={processing}
                >
                  ← Edit Details
                </button>
                <button
                  style={styles.primaryButton}
                  onClick={sendVerificationCode}
                  disabled={processing}
                  onMouseEnter={(e) => !processing && (e.target.style.backgroundColor = '#1e3a8a')}
                  onMouseLeave={(e) => !processing && (e.target.style.backgroundColor = '#1e40af')}
                >
                  {processing ? (
                    <>
                      <span style={styles.buttonSpinner}></span>
                      Sending Code...
                    </>
                  ) : (
                    'Proceed to Verification'
                  )}
                </button>
              </div>
            </div>
          )}

          <div style={styles.historyCard}>
            <h3 style={styles.sectionTitle}>Transfer History</h3>
            {wireTransfers.length === 0 ? (
              <p style={styles.emptyText}>No wire transfers yet</p>
            ) : (
              <div style={styles.historyList}>
                {wireTransfers.map(wire => (
                  <div key={wire.id} style={styles.historyItem}>
                    <div style={styles.historyInfo}>
                      <div style={styles.historyName}>{wire.beneficiary_name}</div>
                      <div style={styles.historyBank}>{wire.beneficiary_bank}</div>
                      <div style={styles.historyRef}>Ref: {wire.reference_number}</div>
                      <div style={styles.historyDate}>
                        {new Date(wire.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div style={styles.historyRight}>
                      <div style={styles.historyAmount}>{formatCurrency(wire.amount)}</div>
                      <div style={{
                        ...styles.historyStatus,
                        color: wire.status === 'completed' ? '#059669' :
                               wire.status === 'processing' ? '#f59e0b' : '#dc2626'
                      }}>
                        {wire.status.charAt(0).toUpperCase() + wire.status.slice(1)}
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
              <h2 style={styles.modalTitle}>Email Verification</h2>
              <p style={styles.modalText}>
                We've sent a 6-digit verification code to <strong>{user.email}</strong>
              </p>
              <input
                type="text"
                style={styles.verificationInput}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                disabled={processing}
              />
              <div style={styles.modalButtons}>
                <button 
                  style={styles.cancelButton} 
                  onClick={() => setShowVerificationModal(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  style={styles.confirmButton}
                  onClick={completeWireTransfer}
                  disabled={processing || verificationCode.length !== 6}
                  onMouseEnter={(e) => !processing && verificationCode.length === 6 && (e.target.style.backgroundColor = '#1e3a8a')}
                  onMouseLeave={(e) => !processing && verificationCode.length === 6 && (e.target.style.backgroundColor = '#1e40af')}
                >
                  {processing ? (
                    <>
                      <span style={styles.buttonSpinner}></span>
                      Processing...
                    </>
                  ) : (
                    'Complete Transfer'
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
      `}</style>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    paddingBottom: '100px'
  },
  header: {
    backgroundColor: '#0a1a2f',
    color: 'white',
    padding: '1.25rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(10, 26, 47, 0.25)'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    textDecoration: 'none',
    color: 'white'
  },
  logoPlaceholder: {
    fontSize: '1.5rem'
  },
  logoText: {
    fontSize: '1.25rem',
    fontWeight: 'bold'
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#1e40af',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)'
  },
  content: {
    padding: '2rem',
    maxWidth: '900px',
    margin: '0 auto'
  },
  titleSection: {
    marginBottom: '2rem',
    textAlign: 'center'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '0.5rem'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#64748b'
  },
  message: {
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    border: '2px solid',
    fontWeight: '500'
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '2rem',
    padding: '2rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
  },
  stepItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    opacity: 0.4,
    transition: 'opacity 0.3s'
  },
  stepActive: {
    opacity: 1
  },
  stepNumber: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#d4af37',
    color: '#0a1a2f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '1.1rem'
  },
  stepLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  stepLine: {
    width: '80px',
    height: '2px',
    backgroundColor: '#e2e8f0',
    margin: '0 1rem'
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1.5rem'
  },
  subsectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#0a1a2f',
    marginBottom: '1rem',
    marginTop: '0.5rem'
  },
  formGroup: {
    marginBottom: '1.5rem',
    flex: 1
  },
  formRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap'
  },
  label: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
  },
  select: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    backgroundColor: 'white',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  input: {
    width: '100%',
    padding: '0.875rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  helpText: {
    display: 'block',
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.25rem'
  },
  divider: {
    height: '1px',
    backgroundColor: '#e2e8f0',
    margin: '2rem 0'
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  infoText: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#92400e',
    lineHeight: '1.5'
  },
  primaryButton: {
    width: '100%',
    padding: '1rem',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  secondaryButton: {
    flex: 1,
    padding: '1rem',
    backgroundColor: '#f1f5f9',
    color: '#0a1a2f',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem'
  },
  reviewSection: {
    marginBottom: '2rem'
  },
  reviewCategory: {
    marginBottom: '1.5rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  reviewCategoryTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0a1a2f',
    marginBottom: '1rem'
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    alignItems: 'flex-start'
  },
  reviewLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '500',
    flex: '0 0 140px'
  },
  reviewValue: {
    fontSize: '0.9rem',
    color: '#0a1a2f',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    marginTop: '2rem'
  },
  historyList: {
    display: 'grid',
    gap: '1rem'
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '1.25rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  historyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  historyName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0a1a2f'
  },
  historyBank: {
    fontSize: '0.85rem',
    color: '#64748b'
  },
  historyRef: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontFamily: 'monospace'
  },
  historyDate: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  historyRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem'
  },
  historyAmount: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#0a1a2f'
  },
  historyStatus: {
    fontSize: '0.8rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9'
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    padding: '2rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#0a1a2f',
    marginBottom: '1rem'
  },
  modalText: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  verificationInput: {
    width: '100%',
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '1.5rem',
    textAlign: 'center',
    letterSpacing: '0.5rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    boxSizing: 'border-box'
  },
  modalButtons: {
    display: 'flex',
    gap: '1rem'
  },
  cancelButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#f1f5f9',
    color: '#0a1a2f',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  confirmButton: {
    flex: 1,
    padding: '0.875rem',
    backgroundColor: '#1e40af',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0a1a2f',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
    fontSize: '1rem'
  }
};
