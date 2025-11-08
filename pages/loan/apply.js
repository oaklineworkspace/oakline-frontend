import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanApplicationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [accounts, setAccounts] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [loanPurposes, setLoanPurposes] = useState([]);
  const [selectedLoanTypeData, setSelectedLoanTypeData] = useState(null);
  const [accountTypes, setAccountTypes] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    loan_type: '',
    principal: '',
    term_months: '',
    purpose: '',
    interest_rate: '',
    deposit_method: 'balance'
  });

  // ID Documents state
  const [idDocuments, setIdDocuments] = useState({
    front: null,
    back: null,
    frontPreview: null,
    backPreview: null,
    frontUploading: false,
    backUploading: false
  });

  // Collateral state
  const [collaterals, setCollaterals] = useState([]);
  const [currentCollateral, setCurrentCollateral] = useState({
    collateral_type: '',
    ownership_type: '',
    estimated_value: '',
    description: '',
    photos: [],
    photosPreviews: []
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [creditScore, setCreditScore] = useState(null);
  const DEPOSIT_PERCENTAGE = 0.10;

  useEffect(() => {
    fetchBankDetails();
    fetchLoanTypes();
    fetchLoanPurposes();
    fetchAccountTypes();
    if (user) {
      fetchUserAccounts();
      checkActiveLoan();
      fetchCreditScore();
    }
  }, [user]);

  useEffect(() => {
    if (formData.principal) {
      const required = parseFloat(formData.principal) * DEPOSIT_PERCENTAGE;
      setDepositAmount(required);
    }
  }, [formData.principal]);

  const fetchCreditScore = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_scores')
        .select('score, score_source, score_reason')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setCreditScore(data);
      }
    } catch (err) {
      console.error('Error fetching credit score:', err);
    }
  };

  const fetchLoanTypes = async () => {
    try {
      setFetchingData(true);
      const { data: typesData, error: typesError } = await supabase
        .from('loan_types')
        .select(`
          *,
          loan_interest_rates!loan_type_id (
            id,
            rate,
            apr,
            min_term_months,
            max_term_months
          )
        `)
        .order('name', { ascending: true });

      if (typesError) {
        console.error('Error fetching loan types:', typesError);
        setError('Failed to load loan types. Please refresh the page.');
        setFetchingData(false);
        return;
      }

      if (typesData && typesData.length > 0) {
        const formattedTypes = typesData.map(type => ({
          id: type.id,
          value: type.name.toLowerCase().replace(/\s+/g, '_'),
          label: type.name,
          desc: type.description || `Apply for a ${type.name.toLowerCase()}`,
          minAmount: parseFloat(type.min_amount) || 1000,
          maxAmount: parseFloat(type.max_amount) || 5000000,
          rates: Array.isArray(type.loan_interest_rates) ? type.loan_interest_rates.map(r => ({
            rate: parseFloat(r.rate),
            apr: parseFloat(r.apr),
            min_term_months: parseInt(r.min_term_months),
            max_term_months: parseInt(r.max_term_months)
          })) : [],
          icon: getLoanTypeIcon(type.name)
        }));
        setLoanTypes(formattedTypes);
      } else {
        setLoanTypes(getDefaultLoanTypes());
      }
    } catch (err) {
      console.error('Error in fetchLoanTypes:', err);
      setLoanTypes(getDefaultLoanTypes());
    } finally {
      setFetchingData(false);
    }
  };

  const fetchLoanPurposes = async () => {
    try {
      const { data, error } = await supabase
        .from('loan_purposes')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setLoanPurposes(data);
      }
    } catch (err) {
      console.error('Error fetching loan purposes:', err);
    }
  };

  const fetchAccountTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setAccountTypes(data);
      }
    } catch (err) {
      console.error('Error fetching account types:', err);
    }
  };

  const getLoanTypeIcon = (name) => {
    const nameLC = name.toLowerCase();
    if (nameLC.includes('personal')) return '👤';
    if (nameLC.includes('home') || nameLC.includes('mortgage')) return '🏠';
    if (nameLC.includes('auto') || nameLC.includes('car') || nameLC.includes('vehicle')) return '🚗';
    if (nameLC.includes('business')) return '🏢';
    if (nameLC.includes('student') || nameLC.includes('education')) return '🎓';
    if (nameLC.includes('equity')) return '🏡';
    return '💰';
  };

  const getDefaultLoanTypes = () => [
    {
      id: '1', value: 'personal', label: 'Personal Loan',
      rates: [{ rate: 6.99, apr: 6.99, min_term_months: 12, max_term_months: 84 }],
      icon: '👤', desc: 'Perfect for debt consolidation, home improvements, or major purchases',
      minAmount: 1000, maxAmount: 50000
    },
    {
      id: '2', value: 'home_mortgage', label: 'Home Mortgage',
      rates: [{ rate: 7.25, apr: 7.25, min_term_months: 180, max_term_months: 360 }],
      icon: '🏠', desc: 'Fixed and adjustable-rate mortgages for your dream home',
      minAmount: 50000, maxAmount: 5000000
    },
    {
      id: '3', value: 'auto_loan', label: 'Auto Loan',
      rates: [{ rate: 5.99, apr: 5.99, min_term_months: 24, max_term_months: 72 }],
      icon: '🚗', desc: 'Finance new or used vehicles with competitive rates',
      minAmount: 5000, maxAmount: 100000
    },
    {
      id: '4', value: 'business', label: 'Business Loan',
      rates: [{ rate: 8.50, apr: 8.50, min_term_months: 12, max_term_months: 120 }],
      icon: '🏢', desc: 'Expand your business with flexible financing options',
      minAmount: 10000, maxAmount: 500000
    },
    {
      id: '5', value: 'student', label: 'Student Loan',
      rates: [{ rate: 4.99, apr: 4.99, min_term_months: 120, max_term_months: 240 }],
      icon: '🎓', desc: 'Invest in education with competitive student loan rates',
      minAmount: 1000, maxAmount: 100000
    },
    {
      id: '6', value: 'home_equity', label: 'Home Equity Loan',
      rates: [{ rate: 7.50, apr: 7.50, min_term_months: 60, max_term_months: 360 }],
      icon: '🏡', desc: 'Leverage your home equity for major expenses',
      minAmount: 10000, maxAmount: 500000
    }
  ];

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const checkActiveLoan = async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending_deposit', 'under_review', 'active', 'approved']);

      if (!error && data && data.length > 0) {
        setHasActiveLoan(true);
      }
    } catch (err) {
      console.error('Error checking active loans:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'loan_type') {
      const selectedLoan = loanTypes.find(lt => lt.value === value);
      if (selectedLoan) {
        setSelectedLoanTypeData(selectedLoan);
        const rates = selectedLoan.rates || [];
        if (rates.length > 0) {
          const defaultRate = rates[0].apr || rates[0].rate;
          setFormData(prev => ({
            ...prev,
            interest_rate: defaultRate.toString(),
            loan_type: value,
            term_months: prev.term_months &&
                         parseInt(prev.term_months) >= rates[0].min_term_months &&
                         parseInt(prev.term_months) <= rates[0].max_term_months
                         ? prev.term_months
                         : ''
          }));
        }
      }
    }
  };

  // New handler to manage file selection and immediate upload
  const handleFileChange = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG and PNG files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Set preview and uploading state
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdDocuments(prev => ({
        ...prev,
        [`${documentType}Preview`]: reader.result,
      }));
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setIdDocuments(prev => ({ ...prev, [`${documentType}Uploading`]: true }));
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setIdDocuments(prev => ({ ...prev, [`${documentType}Uploading`]: false }));
        return;
      }

      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('documentType', `id_${documentType}`);
      formDataUpload.append('email', user.email);

      const response = await fetch('/api/upload-id-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formDataUpload
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to upload ${documentType} ID`);
      }

      // Store the uploaded file path
      setIdDocuments(prev => ({
        ...prev,
        [documentType]: result.filePath,
        [`${documentType}Uploading`]: false
      }));
      
      setError('');
    } catch (err) {
      console.error(`Error uploading ${documentType} ID:`, err);
      setError(err.message || `Failed to upload ${documentType} ID document`);
      setIdDocuments(prev => ({ 
        ...prev, 
        [documentType]: null,
        [`${documentType}Preview`]: null,
        [`${documentType}Uploading`]: false 
      }));
    }
  };

  

  const handleCollateralPhotoUpload = async (files) => {
    if (!files || files.length === 0) return;

    const uploadedPhotos = [];
    const uploadedPreviews = [];

    for (let file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Each photo must be less than 5MB');
        continue;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Session expired. Please log in again.');
          return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('documentType', 'collateral');
        formDataUpload.append('email', user.email);

        const response = await fetch('/api/upload-id-document', { // Assuming this endpoint handles collateral uploads too
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formDataUpload
        });

        const result = await response.json();

        if (response.ok) {
          uploadedPhotos.push(result.filePath);
          uploadedPreviews.push(result.previewUrl);
        } else {
          setError(result.error || 'Failed to upload collateral photo');
        }
      } catch (err) {
        console.error('Error uploading collateral photo:', err);
        setError('An error occurred while uploading collateral photos.');
      }
    }

    setCurrentCollateral(prev => ({
      ...prev,
      photos: [...prev.photos, ...uploadedPhotos],
      photosPreviews: [...prev.photosPreviews, ...uploadedPreviews]
    }));
  };

  const addCollateral = () => {
    if (!currentCollateral.collateral_type || !currentCollateral.estimated_value) {
      setError('Please fill in collateral type and estimated value');
      return;
    }

    setCollaterals([...collaterals, { ...currentCollateral }]);
    setCurrentCollateral({
      collateral_type: '',
      ownership_type: '',
      estimated_value: '',
      description: '',
      photos: [],
      photosPreviews: []
    });
    setError('');
  };

  const removeCollateral = (index) => {
    setCollaterals(collaterals.filter((_, i) => i !== index));
  };

  const validateStep = (step) => {
    setError('');

    switch(step) {
      case 1:
        if (!formData.loan_type || !formData.principal || !formData.term_months || !formData.purpose || !formData.interest_rate) {
          setError('Please fill in all required loan details');
          return false;
        }
        if (selectedLoanTypeData) {
          const principal = parseFloat(formData.principal);
          if (principal < selectedLoanTypeData.minAmount || principal > selectedLoanTypeData.maxAmount) {
            setError(`Loan amount must be between $${selectedLoanTypeData.minAmount.toLocaleString()} and $${selectedLoanTypeData.maxAmount.toLocaleString()}`);
            return false;
          }
        }
        return true;

      case 2:
        // Check if both ID documents have been uploaded (should be string paths)
        if (!idDocuments.front || !idDocuments.back) {
          setError('Please upload both front and back of your ID');
          return false;
        }
        if (typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string') {
          setError('ID documents are still uploading. Please wait.');
          return false;
        }
        return true;

      case 3:
        // Collateral is optional
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user) {
        setError('You must be logged in to apply for a loan');
        setLoading(false);
        return;
      }

      if (hasActiveLoan) {
        setError('You already have an active or pending loan.');
        setLoading(false);
        return;
      }

      if (accounts.length === 0) {
        setError('You must have an active account to apply for a loan');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      // Verify ID documents are uploaded (they should already be uploaded from Step 2)
      if (!idDocuments.front || !idDocuments.back || 
          typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string') {
        setError('ID documents are missing or not properly uploaded. Please go back to Step 2.');
        setLoading(false);
        return;
      }

      const principal = parseFloat(formData.principal);
      const requiredDeposit = principal * DEPOSIT_PERCENTAGE;

      // Submit loan application
      const response = await fetch('/api/loan/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_type: formData.loan_type,
          principal: principal,
          term_months: parseInt(formData.term_months),
          purpose: formData.purpose,
          interest_rate: parseFloat(formData.interest_rate),
          deposit_required: requiredDeposit,
          deposit_method: formData.deposit_method,
          id_documents: {
            front: typeof idDocuments.front === 'string' ? idDocuments.front : null,
            back: typeof idDocuments.back === 'string' ? idDocuments.back : null
          },
          collaterals: collaterals
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit loan application');
      }

      setSuccessData({
        loanId: data.loan.id,
        amount: requiredDeposit,
        loanType: formData.loan_type
      });
      setSuccess('success');

    } catch (err) {
      setError(err.message || 'An error occurred while submitting your application');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPayment = () => {
    if (!formData.principal || !formData.interest_rate || !formData.term_months) {
      return 0;
    }

    const principal = parseFloat(formData.principal);
    const monthlyRate = parseFloat(formData.interest_rate) / 100 / 12;
    const numPayments = parseInt(formData.term_months);

    if (monthlyRate === 0) {
      return (principal / numPayments).toFixed(2);
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    return monthlyPayment.toFixed(2);
  };

  const accountBalance = accounts.length > 0 ? parseFloat(accounts[0].balance) : 0;
  const hasSufficientBalance = accountBalance >= depositAmount;

  if (success === 'success' && successData) {
    return (
      <div style={styles.successModalOverlay}>
        <div style={styles.successModalContainer}>
          <div style={styles.successModalContent}>
            <div style={styles.successCheckmark}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" stroke="#10b981" strokeWidth="4" fill="#f0fdf4"/>
                <path d="M25 40L35 50L55 30" stroke="#10b981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h2 style={styles.successModalTitle}>Application Submitted Successfully!</h2>

            <p style={styles.successModalMessage}>
              Your loan application has been received. Please complete the required 10% security deposit to proceed with the review process.
            </p>

            <div style={styles.successModalActions}>
              <button
                onClick={() => router.push(`/loan/deposit-confirmation?loan_id=${successData.loanId}&amount=${successData.amount}`)}
                style={styles.successModalButton}
              >
                Proceed to Deposit Payment
              </button>
              <button
                onClick={() => router.push('/loan/dashboard')}
                style={styles.successModalSecondaryButton}
              >
                View Loan Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (fetchingData) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Loading loan application...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Apply for Your Loan Today</h1>
          <p style={styles.heroSubtitle}>
            Complete our simple 4-step application process
          </p>
        </div>
      </div>

      <div style={styles.mainContent}>
        {hasActiveLoan && (
          <div style={styles.warningAlert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div>
              <strong style={styles.alertTitle}>Active Loan Detected</strong>
              <p style={styles.alertMessage}>
                You currently have an active loan. Please complete it before applying for a new one.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.alert}>
            <div style={styles.alertIcon}>⚠️</div>
            <div>
              <strong style={styles.alertTitle}>Error</strong>
              <p style={styles.alertMessage}>{error}</p>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div style={styles.progressContainer}>
          <div style={styles.progressSteps}>
            {[1, 2, 3, 4].map(step => (
              <div key={step} style={{display: 'flex', alignItems: 'center', flex: 1}}>
                <div style={{...styles.progressStep, ...(currentStep >= step ? styles.progressStepActive : {})}}>
                  <div style={{...styles.progressNumber, ...(currentStep >= step ? {backgroundColor: '#059669', color: '#fff'} : {})}}>
                    {step}
                  </div>
                  <span style={styles.progressLabel}>
                    {step === 1 && 'Loan Details'}
                    {step === 2 && 'ID Upload'}
                    {step === 3 && 'Collateral'}
                    {step === 4 && 'Review'}
                  </span>
                </div>
                {step < 4 && <div style={styles.progressLine}></div>}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Step 1: Loan Details */}
          {currentStep === 1 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Step 1: Loan Details</h2>
                <p style={styles.sectionDesc}>Choose your loan type and specify the amount you need</p>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelText}>Loan Type</span>
                  <span style={styles.required}>*</span>
                </label>
                <select
                  name="loan_type"
                  value={formData.loan_type}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                  disabled={hasActiveLoan}
                >
                  <option value="">Select loan type...</option>
                  {loanTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Loan Amount</span>
                    <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="principal"
                    value={formData.principal}
                    onChange={handleInputChange}
                    placeholder="10000"
                    min={selectedLoanTypeData?.minAmount || 1000}
                    max={selectedLoanTypeData?.maxAmount || 5000000}
                    step="100"
                    required
                    style={styles.input}
                    disabled={hasActiveLoan}
                  />
                  {formData.principal && depositAmount > 0 && (
                    <div style={styles.depositNotice}>
                      <div style={styles.depositNoticeIcon}>ℹ️</div>
                      <div style={styles.depositNoticeContent}>
                        <strong style={styles.depositNoticeTitle}>Minimum Deposit Required</strong>
                        <p style={styles.depositNoticeText}>
                          A minimum deposit of <strong>${depositAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong> (10% of loan amount)
                          is required to activate your account after approval.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Repayment Term (months)</span>
                    <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="number"
                    name="term_months"
                    value={formData.term_months}
                    onChange={handleInputChange}
                    placeholder="36"
                    min={selectedLoanTypeData?.rates?.[0]?.min_term_months || 1}
                    max={selectedLoanTypeData?.rates?.[0]?.max_term_months || 360}
                    required
                    style={styles.input}
                    disabled={hasActiveLoan}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Interest Rate (APR)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.interest_rate ? `${formData.interest_rate}%` : ''}
                    readOnly
                    style={{...styles.input, backgroundColor: '#f0fdf4', cursor: 'not-allowed'}}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelText}>Purpose of Loan</span>
                  <span style={styles.required}>*</span>
                </label>
                {loanPurposes.length > 0 ? (
                  <select
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    style={styles.select}
                    required
                    disabled={hasActiveLoan}
                  >
                    <option value="">Select purpose...</option>
                    {loanPurposes.map(purpose => (
                      <option key={purpose.id} value={purpose.name}>{purpose.name}</option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="Describe the purpose of this loan..."
                    required
                    rows="4"
                    style={styles.textarea}
                    disabled={hasActiveLoan}
                  />
                )}
              </div>

              <div style={styles.actionSection}>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={hasActiveLoan || !formData.loan_type}
                  style={{...styles.submitButton, ...(hasActiveLoan || !formData.loan_type ? styles.submitButtonDisabled : {})}}
                >
                  Next: Upload ID Documents →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: ID Document Upload */}
          {currentStep === 2 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Step 2: ID Document Upload</h2>
                <p style={styles.sectionDesc}>Upload clear photos of the front and back of your government-issued ID</p>
              </div>

              <div style={styles.uploadGrid}>
                <div style={styles.uploadCard}>
                  <h3 style={styles.uploadTitle}>Front of ID</h3>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => handleFileChange(e, 'front')}
                    disabled={idDocuments.frontUploading}
                    style={styles.fileInput}
                    id="front-upload"
                  />
                  <label htmlFor="front-upload" style={styles.uploadButton}>
                    {idDocuments.frontUploading ? 'Uploading...' : (idDocuments.front && typeof idDocuments.front === 'string') ? '✓ Uploaded' : 'Choose File'}
                  </label>
                  {idDocuments.frontPreview && (
                    <img src={idDocuments.frontPreview} alt="ID Front" style={styles.previewImage} />
                  )}
                </div>

                <div style={styles.uploadCard}>
                  <h3 style={styles.uploadTitle}>Back of ID</h3>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => handleFileChange(e, 'back')}
                    disabled={idDocuments.backUploading}
                    style={styles.fileInput}
                    id="back-upload"
                  />
                  <label htmlFor="back-upload" style={styles.uploadButton}>
                    {idDocuments.backUploading ? 'Uploading...' : (idDocuments.back && typeof idDocuments.back === 'string') ? '✓ Uploaded' : 'Choose File'}
                  </label>
                  {idDocuments.backPreview && (
                    <img src={idDocuments.backPreview} alt="ID Back" style={styles.previewImage} />
                  )}
                </div>
              </div>

              <div style={styles.actionSection}>
                <button type="button" onClick={prevStep} style={styles.cancelButton}>
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!idDocuments.front || !idDocuments.back || 
                           typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string' ||
                           idDocuments.frontUploading || idDocuments.backUploading}
                  style={{
                    ...styles.submitButton,
                    ...(!idDocuments.front || !idDocuments.back || 
                        typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string' ||
                        idDocuments.frontUploading || idDocuments.backUploading
                      ? styles.submitButtonDisabled
                      : {})
                  }}
                >
                  Next: Add Collateral (Optional) →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Collateral Upload */}
          {currentStep === 3 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Step 3: Collateral (Optional)</h2>
                <p style={styles.sectionDesc}>Adding collateral may improve your approval chances and interest rate</p>
              </div>

              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Collateral Type</span>
                  </label>
                  <select
                    value={currentCollateral.collateral_type}
                    onChange={(e) => setCurrentCollateral({...currentCollateral, collateral_type: e.target.value})}
                    style={styles.select}
                  >
                    <option value="">Select type...</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Ownership Type</span>
                  </label>
                  <select
                    value={currentCollateral.ownership_type}
                    onChange={(e) => setCurrentCollateral({...currentCollateral, ownership_type: e.target.value})}
                    style={styles.select}
                  >
                    <option value="">Select ownership...</option>
                    <option value="owned">Fully Owned</option>
                    <option value="financed">Financed</option>
                    <option value="leased">Leased</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <span style={styles.labelText}>Estimated Value</span>
                  </label>
                  <input
                    type="number"
                    value={currentCollateral.estimated_value}
                    onChange={(e) => setCurrentCollateral({...currentCollateral, estimated_value: e.target.value})}
                    placeholder="25000"
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelText}>Description</span>
                </label>
                <textarea
                  value={currentCollateral.description}
                  onChange={(e) => setCurrentCollateral({...currentCollateral, description: e.target.value})}
                  placeholder="e.g., 2020 Honda Accord, VIN: 1HGCV1F3XLA012345"
                  rows="3"
                  style={styles.textarea}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <span style={styles.labelText}>Upload Photos/Documents</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  onChange={(e) => handleCollateralPhotoUpload(e.target.files)}
                  style={styles.input}
                />
                {currentCollateral.photosPreviews.length > 0 && (
                  <div style={styles.photoGrid}>
                    {currentCollateral.photosPreviews.map((url, i) => (
                      <img key={i} src={url} alt={`Collateral ${i+1}`} style={styles.thumbnailImage} />
                    ))}
                  </div>
                )}
              </div>

              <button type="button" onClick={addCollateral} style={styles.addButton}>
                + Add This Collateral
              </button>

              {collaterals.length > 0 && (
                <div style={styles.collateralList}>
                  <h3 style={styles.listTitle}>Added Collateral:</h3>
                  {collaterals.map((col, i) => (
                    <div key={i} style={styles.collateralItem}>
                      <div>
                        <strong>{col.collateral_type}</strong> - ${parseFloat(col.estimated_value).toLocaleString()}
                        <p style={{margin: '4px 0', fontSize: '14px', color: '#64748b'}}>{col.description}</p>
                      </div>
                      <button type="button" onClick={() => removeCollateral(i)} style={styles.removeButton}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.actionSection}>
                <button type="button" onClick={prevStep} style={styles.cancelButton}>
                  ← Previous
                </button>
                <button type="button" onClick={nextStep} style={styles.submitButton}>
                  Next: Review & Submit →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {currentStep === 4 && (
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Step 4: Review & Submit</h2>
                <p style={styles.sectionDesc}>Please review your application details before submitting</p>
              </div>

              <div style={styles.reviewSection}>
                <div style={styles.reviewCard}>
                  <h3 style={styles.reviewTitle}>Loan Details</h3>
                  <div style={styles.reviewRow}>
                    <span>Loan Type:</span>
                    <strong>{loanTypes.find(t => t.value === formData.loan_type)?.label}</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Amount:</span>
                    <strong>${parseFloat(formData.principal).toLocaleString()}</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Term:</span>
                    <strong>{formData.term_months} months</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Interest Rate:</span>
                    <strong>{formData.interest_rate}% APR</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Monthly Payment:</span>
                    <strong>${calculateMonthlyPayment()}</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Required Deposit (10%):</span>
                    <strong>${depositAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong>
                  </div>
                </div>

                <div style={styles.reviewCard}>
                  <h3 style={styles.reviewTitle}>ID Documents</h3>
                  <div style={styles.reviewRow}>
                    <span>Front of ID:</span>
                    <strong>{idDocuments.front && typeof idDocuments.front === 'string' ? '✓ Uploaded' : 'Pending'}</strong>
                  </div>
                  <div style={styles.reviewRow}>
                    <span>Back of ID:</span>
                    <strong>{idDocuments.back && typeof idDocuments.back === 'string' ? '✓ Uploaded' : 'Pending'}</strong>
                  </div>
                </div>

                {collaterals.length > 0 && (
                  <div style={styles.reviewCard}>
                    <h3 style={styles.reviewTitle}>Collateral</h3>
                    {collaterals.map((col, i) => (
                      <div key={i} style={styles.reviewRow}>
                        <span>{col.collateral_type}:</span>
                        <strong>${parseFloat(col.estimated_value).toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={styles.actionSection}>
                <button type="button" onClick={prevStep} style={styles.cancelButton}>
                  ← Previous
                </button>
                <button
                  type="submit"
                  disabled={loading || !idDocuments.front || !idDocuments.back || 
                           typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string'}
                  style={{
                    ...styles.submitButton,
                    ...(loading || !idDocuments.front || !idDocuments.back || 
                        typeof idDocuments.front !== 'string' || typeof idDocuments.back !== 'string'
                      ? styles.submitButtonDisabled
                      : {})
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#059669',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    marginTop: '20px',
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '500'
  },
  hero: {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    padding: '60px 20px',
    textAlign: 'center',
    color: '#fff'
  },
  heroContent: {
    maxWidth: '900px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: 'clamp(32px, 5vw, 48px)',
    fontWeight: '700',
    marginBottom: '20px'
  },
  heroSubtitle: {
    fontSize: 'clamp(15px, 2.5vw, 18px)',
    opacity: '0.95'
  },
  mainContent: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 20px 80px'
  },
  warningAlert: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    borderLeft: '4px solid #f59e0b',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  alert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderLeft: '4px solid #ef4444',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px'
  },
  alertIcon: {
    fontSize: '24px'
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '4px'
  },
  alertMessage: {
    fontSize: '14px',
    margin: 0
  },
  progressContainer: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '40px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  progressSteps: {
    display: 'flex',
    alignItems: 'center',
    maxWidth: '800px',
    margin: '0 auto'
  },
  progressStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  progressStepActive: {},
  progressNumber: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '700',
    transition: 'all 0.3s'
  },
  progressLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center'
  },
  progressLine: {
    flex: 1,
    height: '2px',
    backgroundColor: '#e5e7eb',
    margin: '0 16px'
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  section: {
    padding: '48px'
  },
  sectionHeader: {
    marginBottom: '32px'
  },
  sectionTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '12px'
  },
  sectionDesc: {
    fontSize: '16px',
    color: '#64748b'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '28px',
    marginBottom: '28px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '24px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '6px'
  },
  labelText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1e293b'
  },
  required: {
    color: '#ef4444',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit'
  },
  select: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  uploadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  uploadCard: {
    border: '2px dashed #d1d5db',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center'
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1e293b'
  },
  fileInput: {
    display: 'none'
  },
  uploadButton: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#059669',
    color: '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    marginBottom: '16px'
  },
  previewImage: {
    width: '100%',
    maxWidth: '300px',
    borderRadius: '8px',
    marginTop: '16px'
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
    marginTop: '16px'
  },
  thumbnailImage: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    marginTop: '16px'
  },
  collateralList: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px'
  },
  listTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#1e293b'
  },
  collateralItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginBottom: '12px'
  },
  removeButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  reviewSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginBottom: '32px'
  },
  reviewCard: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  reviewTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#1e293b'
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '15px'
  },
  actionSection: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'flex-end',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '16px 32px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    backgroundColor: '#fff',
    border: '2px solid #d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  submitButton: {
    padding: '16px 48px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  submitButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed'
  },
  successModalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  successModalContainer: {
    maxWidth: '600px',
    width: '100%'
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  successCheckmark: {
    marginBottom: '24px'
  },
  successModalTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '16px'
  },
  successModalMessage: {
    fontSize: '16px',
    color: '#4b5563',
    marginBottom: '32px'
  },
  successModalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  successModalButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  successModalSecondaryButton: {
    padding: '16px 24px',
    fontSize: '16px',
    fontWeight: '700',
    color: '#1e293b',
    backgroundColor: 'transparent',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    fontFamily: 'inherit'
  },
  depositNotice: {
    marginTop: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  depositNoticeIcon: {
    fontSize: '24px',
    flexShrink: 0
  },
  depositNoticeContent: {
    flex: 1
  },
  depositNoticeTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#1e40af',
    display: 'block',
    marginBottom: '4px'
  },
  depositNoticeText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
    lineHeight: '1.5'
  }
};

export default function LoanApplication() {
  return (
    <ProtectedRoute>
      <LoanApplicationContent />
    </ProtectedRoute>
  );
}