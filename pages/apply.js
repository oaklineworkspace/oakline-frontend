import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

// Account types will be fetched from Supabase

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'EG', name: 'Egypt' },
  { code: 'KE', name: 'Kenya' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'AE', name: 'UAE' },
  { code: 'RU', name: 'Russia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AR', name: 'Argentina' },
  { code: 'OTHER', name: 'Other / Enter Manually' }
];

const STATES_BY_COUNTRY = {
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
  ],
  CA: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon'
  ],
  AU: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland',
    'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ],
  IN: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ],
  BR: [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal', 'Espírito Santo',
    'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Para', 'Paraíba',
    'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul',
    'Rondônia', 'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
  ]
};

const MAJOR_CITIES_BY_STATE = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose', 'Fresno'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Tallahassee'],
  'Illinois': ['Chicago', 'Springfield', 'Rockford', 'Peoria', 'Elgin', 'Waukegan'],
  'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Mississauga', 'Windsor'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford']
};

export default function Apply() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showManualCountry, setShowManualCountry] = useState(false);
  const [showManualState, setShowManualState] = useState(false);
  const [showManualCity, setShowManualCity] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifiedEmailAddress, setVerifiedEmailAddress] = useState('');
  const [bankDetails, setBankDetails] = useState(null);
  const [accountTypes, setAccountTypes] = useState([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    mothersMaidenName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    ssn: '',
    idNumber: '',
    country: 'US',
    manualCountry: '',
    address: '',
    city: '',
    manualCity: '',
    state: '',
    manualState: '',
    zipCode: '',
    accountTypes: [],
    employmentStatus: '',
    annualIncome: '',
    agreeToTerms: false,
    idFrontPath: '', // Store file path, not URL
    idBackPath: '' // Store file path, not URL
  });

  const [idFrontFile, setIdFrontFile] = useState(null);
  const [idBackFile, setIdBackFile] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);

  const selectedAccountMinDeposit = formData.accountTypes.reduce((totalDeposit, accountId) => {
    const account = accountTypes.find(acc => acc.id === accountId);
    const minDeposit = parseFloat(account?.min_deposit) || 0;
    return totalDeposit + minDeposit;
  }, 0);

  useEffect(() => {
    const fetchBankDetails = async () => {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();

      if (!error && data) {
        setBankDetails(data);
      }
    };

    const fetchAccountTypes = async () => {
      setLoadingAccountTypes(true);
      const { data, error } = await supabase
        .from('account_types')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setAccountTypes(data);
      } else {
        console.error('Error fetching account types:', error);
        setErrors({ submit: 'Failed to load account types. Please refresh the page.' });
      }
      setLoadingAccountTypes(false);
    };

    fetchBankDetails();
    fetchAccountTypes();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^\+?[\d\s\-\(\)]{10,}$/.test(phone);

  const handleIdFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [type === 'front' ? 'idFront' : 'idBack']: 'Only JPG and PNG files are allowed'
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        [type === 'front' ? 'idFront' : 'idBack']: 'File size must be less than 5MB'
      }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'front') {
        setIdFrontPreview(reader.result);
        setIdFrontFile(file);
      } else {
        setIdBackPreview(reader.result);
        setIdBackFile(file);
      }
    };
    reader.readAsDataURL(file);

    // Clear any previous errors
    setErrors(prev => ({
      ...prev,
      [type === 'front' ? 'idFront' : 'idBack']: ''
    }));

    // Upload immediately
    await uploadIdDocument(file, type);
  };

  const uploadIdDocument = async (file, type) => {
    const setUploading = type === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('documentType', type);

      const response = await fetch('/api/upload-id-document', {
        method: 'POST',
        body: formDataToSend
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Save the file path (not the URL) for secure storage
      // We already have local preview from FileReader
      setFormData(prev => ({
        ...prev,
        [type === 'front' ? 'idFrontPath' : 'idBackPath']: data.filePath
      }));

      console.log(`✅ ID ${type} uploaded securely. Path stored: ${data.filePath}`);

    } catch (error) {
      console.error(`Error uploading ID ${type}:`, error);
      setErrors(prev => ({
        ...prev,
        [type === 'front' ? 'idFront' : 'idBack']: error.message || 'Upload failed. Please try again.'
      }));

      // Clear the file and preview on error
      if (type === 'front') {
        setIdFrontFile(null);
        setIdFrontPreview(null);
      } else {
        setIdBackFile(null);
        setIdBackPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const saveIdDocumentsToDatabase = async () => {
    try {
      console.log('Saving ID documents to database...');

      const response = await fetch('/api/save-id-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          documentType: 'ID Card', // You can make this dynamic if needed
          frontPath: formData.idFrontPath,
          backPath: formData.idBackPath
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to save ID documents to database:', data.error);
        // Don't fail the application if this fails, just log it
        return false;
      }

      console.log('✅ ID documents saved to database successfully');
      return true;
    } catch (error) {
      console.error('Error saving ID documents to database:', error);
      return false;
    }
  };

  const removeIdDocument = (type) => {
    if (type === 'front') {
      setIdFrontFile(null);
      setIdFrontPreview(null);
      setFormData(prev => ({ ...prev, idFrontPath: '' }));
    } else {
      setIdBackFile(null);
      setIdBackPreview(null);
      setFormData(prev => ({ ...prev, idBackPath: '' }));
    }
    setErrors(prev => ({
      ...prev,
      [type === 'front' ? 'idFront' : 'idBack']: ''
    }));
  };

  const getEffectiveCountry = () => {
    return formData.country === 'OTHER' ? formData.manualCountry : formData.country;
  };

  const getEffectiveState = () => {
    // Return manual state if manual entry is being used, otherwise return selected state
    if (shouldShowManualState()) {
      return formData.manualState;
    }
    return formData.state;
  };

  const getEffectiveCity = () => {
    // Return manual city if manual entry is being used, otherwise return selected city
    if (shouldShowManualCity()) {
      return formData.manualCity;
    }
    return formData.city;
  };

  const getAvailableStates = () => {
    const country = getEffectiveCountry();
    return STATES_BY_COUNTRY[country] || [];
  };

  const getAvailableCities = () => {
    const state = getEffectiveState();
    return MAJOR_CITIES_BY_STATE[state] || [];
  };

  const shouldShowManualState = () => {
    const country = getEffectiveCountry();
    return !STATES_BY_COUNTRY[country] || showManualState;
  };

  const shouldShowManualCity = () => {
    const state = getEffectiveState();
    return !MAJOR_CITIES_BY_STATE[state] || showManualCity;
  };

  const handleSendVerificationCode = async () => {
    if (!verificationEmail.trim()) {
      setErrors({ verificationEmail: 'Email is required' });
      return;
    }

    if (!validateEmail(verificationEmail)) {
      setErrors({ verificationEmail: 'Invalid email format' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verificationEmail.trim().toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ verificationEmail: data.error || 'Failed to send verification code' });
        setLoading(false);
        return;
      }

      setCodeSent(true);
      setResendTimer(60);
      setErrors({});

    } catch (error) {
      console.error('Error sending verification code:', error);
      setErrors({ verificationEmail: 'Failed to send verification code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      setErrors({ verificationCode: 'Verification code is required' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Verifying email:', verificationEmail.trim().toLowerCase());
      const response = await fetch('/api/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail.trim().toLowerCase(),
          code: verificationCode.trim()
        })
      });

      const data = await response.json();
      console.log('Verification response:', data);

      if (!response.ok) {
        setErrors({ verificationCode: data.error || 'Invalid verification code' });
        setLoading(false);
        return;
      }

      console.log('✅ Email verified successfully');
      setIsEmailVerified(true);
      setVerifiedEmailAddress(verificationEmail.trim().toLowerCase());
      setFormData(prev => ({ ...prev, email: verificationEmail.trim().toLowerCase() }));
      setCurrentStep(1);
      setErrors({});

    } catch (error) {
      console.error('Error verifying email:', error);
      setErrors({ verificationCode: 'Failed to verify email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (!validatePhone(formData.phone)) {
        newErrors.phone = 'Invalid phone number format (can start with + for international numbers)';
      }
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';

      if (!getEffectiveCountry()) newErrors.country = 'Country is required';

      if (getEffectiveCountry() === 'US') {
        if (!formData.ssn.trim()) newErrors.ssn = 'SSN is required';
      } else {
        if (!formData.idNumber.trim()) newErrors.idNumber = 'Government ID Number is required';
      }
    }

    if (step === 2) {
      if (!formData.address.trim()) newErrors.address = 'Address is required';

      const effectiveCity = getEffectiveCity();
      const effectiveState = getEffectiveState();

      if (!effectiveCity || !effectiveCity.trim()) newErrors.city = 'City is required';
      if (!effectiveState || !effectiveState.trim()) newErrors.state = 'State/Province is required';
      if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP/Postal code is required';
    }

    if (step === 3) {
      if (formData.accountTypes.length === 0) newErrors.accountTypes = 'Select at least one account type';
      if (!formData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
      if (!formData.annualIncome) newErrors.annualIncome = 'Annual income is required';
    }

    if (step === 4) {
      if (!formData.idFrontPath || !idFrontPreview) {
        newErrors.idFront = 'Please upload front side of your ID';
      }
      if (!formData.idBackPath || !idBackPreview) {
        newErrors.idBack = 'Please upload back side of your ID';
      }
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Handle country change
      if (name === 'country') {
        setShowManualCountry(value === 'OTHER');
        if (value !== 'OTHER') {
          newData.manualCountry = '';
        }
        // Reset state and city when country changes
        newData.state = '';
        newData.manualState = '';
        newData.city = '';
        newData.manualCity = '';
        setShowManualState(false);
        setShowManualCity(false);
      }

      // Handle state change
      if (name === 'state') {
        // Reset city when state changes
        newData.city = '';
        newData.manualCity = '';
        setShowManualCity(false);
      }

      return newData;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const toggleAccountType = (accountId) => {
    setFormData(prev => {
      const selected = prev.accountTypes.includes(accountId)
        ? prev.accountTypes.filter(id => id !== accountId)
        : [...prev.accountTypes, accountId];
      return { ...prev, accountTypes: selected };
    });

    if (errors.accountTypes) {
      setErrors(prev => ({ ...prev, accountTypes: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    // Ensure the email hasn't been changed from the verified one
    if (!isEmailVerified || formData.email.trim().toLowerCase() !== verifiedEmailAddress) {
      setErrors({ submit: 'Please use the verified email address or verify your email first.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();

      // CRITICAL: Double-check email verification status in database BEFORE attempting insert
      console.log('Checking email verification status before submission...');
      const verifyResponse = await fetch('/api/check-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });

      const verifyResult = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResult.verified) {
        console.error('Email verification check failed:', verifyResult);
        setErrors({ submit: 'Email verification has expired or is invalid. Please go back to Step 1 and verify your email again.' });
        setLoading(false);
        return;
      }

      console.log('✅ Email verification confirmed:', verifyResult);

      // Save ID documents to database if both are uploaded
      if (formData.idFrontPath && formData.idBackPath) {
        console.log('Saving ID documents to database...');
        await saveIdDocumentsToDatabase();
      }

      // Debug: Check the actual database state
      const debugResponse = await fetch('/api/debug-email-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const debugData = await debugResponse.json();
      console.log('📊 Database state before insert:', debugData);

      // Wait a moment to ensure database trigger can see the verification
      await new Promise(resolve => setTimeout(resolve, 500));

      const effectiveCountry = getEffectiveCountry();
      const effectiveState = getEffectiveState();
      const effectiveCity = getEffectiveCity();

      // Create account type enum mapping
      const enumMapping = {
        'Checking Account': 'checking_account',
        'Savings Account': 'savings_account',
        'Business Checking': 'business_checking',
        'Business Savings': 'business_savings',
        'Student Checking': 'student_checking',
        'Money Market Account': 'money_market',
        'Certificate of Deposit (CD)': 'certificate_of_deposit',
        'Retirement Account (IRA)': 'retirement_ira',
        'Joint Checking Account': 'joint_checking',
        'Trust Account': 'trust_account',
        'Investment Brokerage Account': 'investment_brokerage',
        'High-Yield Savings Account': 'high_yield_savings',
        'International Checking': 'international_checking',
        'Foreign Currency Account': 'foreign_currency',
        'Cryptocurrency Wallet': 'cryptocurrency_wallet',
        'Loan Repayment Account': 'loan_repayment',
        'Mortgage Account': 'mortgage',
        'Auto Loan Account': 'auto_loan',
        'Credit Card Account': 'credit_card',
        'Prepaid Card Account': 'prepaid_card',
        'Payroll Account': 'payroll_account',
        'Nonprofit/Charity Account': 'nonprofit_charity',
        'Escrow Account': 'escrow_account'
      };

      const mappedAccountTypes = formData.accountTypes.map(id => {
        const accountType = accountTypes.find(at => at.id === id);
        return enumMapping[accountType?.name] || accountType?.name?.toLowerCase().replace(/\s+/g, '_');
      });

      // Check if email already exists in applications
      const { data: existingApp } = await supabase
        .from('applications')
        .select('email')
        .eq('email', formData.email.trim().toLowerCase())
        .single();

      if (existingApp) {
        setErrors({ submit: 'An application with this email already exists. Please try another email or contact support.' });
        setLoading(false);
        return;
      }

      // Insert the application with user_id = NULL (admin will create user later)
      console.log('Creating application without user_id for email:', normalizedEmail);
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .insert([{
          user_id: null, // User will be created by admin during approval
          first_name: formData.firstName.trim(),
          middle_name: formData.middleName.trim() || null,
          last_name: formData.lastName.trim(),
          mothers_maiden_name: formData.mothersMaidenName.trim() || null,
          email: normalizedEmail, // Use the verified email
          phone: formData.phone.trim(),
          date_of_birth: formData.dateOfBirth,
          country: effectiveCountry,
          ssn: effectiveCountry === 'US' ? formData.ssn.trim() : null,
          id_number: effectiveCountry !== 'US' ? formData.idNumber.trim() : null,
          address: formData.address.trim(),
          city: effectiveCity,
          state: effectiveState,
          zip_code: formData.zipCode.trim(),
          employment_status: formData.employmentStatus,
          annual_income: formData.annualIncome,
          account_types: mappedAccountTypes,
          agree_to_terms: formData.agreeToTerms,
          id_front_path: formData.idFrontPath || null,
          id_back_path: formData.idBackPath || null,
          application_status: 'pending',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (applicationError) {
        console.error('Application creation error:', applicationError);

        if (applicationError.code === '23505') {
          setErrors({ submit: 'An application with this email already exists. Please try another email or contact support.' });
          setLoading(false);
          return;
        }

        throw new Error('Failed to create application: ' + applicationError.message);
      }

      console.log('✅ Application created successfully:', applicationData.id);
      console.log('Application will be reviewed by admin who will create user account and send credentials');

      // Send confirmation email to applicant
      try {
        const emailResponse = await fetch('/api/send-application-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            accountTypes: formData.accountTypes.map(id => {
              const accountType = accountTypes.find(at => at.id === id);
              return {
                name: accountType?.name || '',
                min_opening_deposit: accountType?.min_deposit || 0
              };
            })
          })
        });

        if (emailResponse.ok) {
          console.log('✅ Confirmation email sent to applicant');
        } else {
          console.error('Failed to send confirmation email, but application was created');
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the application if email fails
      }

      // Show success screen
      setSubmitSuccess(true);
      setCurrentStep(5); // Move to success screen

    } catch (error) {
      console.error('Application submission error:', error);

      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to submit application. Please try again.';

      if (error.message) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'An application with this email already exists. Please try another email or contact support.';
        } else if (error.message.includes('invalid input syntax')) {
          errorMessage = 'Invalid data format. Please check all fields and try again.';
        } else if (error.message.includes('Email must be verified')) {
          errorMessage = 'Email verification is required. Please verify your email first.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F5F6F8 0%, #e0f2fe 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    header: {
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
      color: 'white',
      padding: '1.5rem 0 0.5rem',
      boxShadow: '0 8px 32px rgba(26, 62, 111, 0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    logo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: 'white',
      textDecoration: 'none'
    },
    logoImage: {
      height: '50px',
      width: 'auto',
      objectFit: 'contain'
    },
    bankName: {
      fontSize: '1.5rem',
      fontWeight: '700',
      letterSpacing: '0.5px'
    },
    bankTagline: {
      fontSize: '0.85rem',
      fontWeight: '500',
      opacity: 0.8,
      color: '#FFC857'
    },
    headerInfo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem'
    },
    supportInfo: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem'
    },
    supportLabel: {
      fontSize: '0.85rem',
      opacity: 0.9,
      fontWeight: '500',
      color: '#FFD687'
    },
    supportPhone: {
      fontSize: '1rem',
      fontWeight: '700',
      color: '#FFC857'
    },
    headerActions: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'center'
    },
    loginButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.8rem 1.5rem',
      backgroundColor: 'rgba(255,200,87,0.15)',
      border: '2px solid rgba(255,200,87,0.3)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '10px',
      fontSize: '0.9rem',
      fontWeight: '700',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    homeButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,200,87,0.15)',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '600',
      border: '2px solid rgba(255,200,87, 0.3)',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    goBackButton: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      backgroundColor: 'rgba(255,200,87,0.25)',
      color: 'white',
      border: '2px solid rgba(255,200,87, 0.4)',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    buttonIcon: {
      fontSize: '1.1rem'
    },
    progressContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '1rem 2rem 0'
    },
    progressBar: {
      width: '100%',
      height: '4px',
      backgroundColor: 'rgba(255,200,87,0.2)',
      borderRadius: '2px',
      marginBottom: '1rem',
      overflow: 'hidden'
    },
    progressFill: {
      height: '100%',
      background: 'linear-gradient(90deg, #FFC857 0%, #FFD687 100%)',
      borderRadius: '2px',
      transition: 'width 0.5s ease'
    },
    progressSteps: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    progressStep: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: 0.5,
      transition: 'all 0.3s ease',
      fontSize: '0.875rem',
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '500'
    },
    progressStepActive: {
      opacity: 1,
      color: '#FFC857',
      fontWeight: '700',
      transform: 'scale(1.05)'
    },
    formCard: {
      background: 'white',
      borderRadius: '24px',
      padding: '3rem',
      boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
      border: '1px solid #e0e0e0',
      marginBottom: '2rem',
      animation: 'fadeInUp 0.6s ease'
    },
    sectionTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1A3E6F',
      marginBottom: '2rem',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px'
    },
    formGrid: {
      display: 'grid',
      gap: '1.5rem'
    },
    gridCols2: {
      gridTemplateColumns: 'repeat(2, 1fr)'
    },
    gridCols3: {
      gridTemplateColumns: 'repeat(3, 1fr)'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1A3E6F',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    required: {
      color: '#ef4444'
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      backgroundColor: '#ffffff',
      fontFamily: 'inherit'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#1A3E6F',
      boxShadow: '0 0 0 3px rgba(26, 62, 111, 0.1)'
    },
    inputError: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2'
    },
    select: {
      width: '100%',
      padding: '14px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '500',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    errorMessage: {
      color: '#ef4444',
      fontSize: '13px',
      fontWeight: '500',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    toggleButton: {
      fontSize: '12px',
      color: '#1A3E6F',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      textDecoration: 'underline',
      padding: '4px 0'
    },
    accountTypesGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1rem',
      marginTop: '1rem'
    },
    accountCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden'
    },
    accountCardSelected: {
      borderColor: '#1A3E6F',
      backgroundColor: '#f0f4f8',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(26, 62, 111, 0.15)'
    },
    accountCardHover: {
      borderColor: '#9ca3af',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    accountHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '8px'
    },
    accountIcon: {
      fontSize: '24px',
      padding: '8px',
      borderRadius: '10px',
      backgroundColor: '#f1f5f9'
    },
    accountName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1A3E6F'
    },
    accountDescription: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '12px',
      lineHeight: 1.5
    },
    accountRate: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#1A3E6F',
      backgroundColor: '#FFC857',
      padding: '4px 8px',
      borderRadius: '6px',
      display: 'inline-block'
    },
    minDepositBadge: {
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      padding: '0.5rem',
      marginTop: '0.75rem',
      fontSize: '13px',
      fontWeight: '600',
      color: '#92400e',
      textAlign: 'center'
    },
    depositNotice: {
      backgroundColor: '#eff6ff',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1.5rem'
    },
    checkboxContainer: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      marginTop: '1.5rem',
      position: 'relative',
      zIndex: 1,
      backgroundColor: 'white'
    },
    checkbox: {
      width: '20px',
      height: '20px',
      minWidth: '20px',
      minHeight: '20px',
      marginTop: '2px',
      cursor: 'pointer',
      accentColor: '#1A3E6F',
      transform: 'scale(1.3)',
      position: 'relative',
      zIndex: 11,
      flexShrink: 0,
      appearance: 'auto',
      WebkitAppearance: 'checkbox',
      MozAppearance: 'checkbox'
    },
    checkboxLabel: {
      fontSize: '15px',
      color: '#1A3E6F',
      lineHeight: '1.6',
      cursor: 'pointer',
      fontWeight: '500',
      flex: 1,
      userSelect: 'none',
      paddingTop: '1px'
    },
    link: {
      color: '#1A3E6F',
      textDecoration: 'none',
      fontWeight: '600'
    },
    buttonContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '3rem',
      gap: '1rem'
    },
    button: {
      padding: '14px 28px',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minHeight: '52px'
    },
    primaryButton: {
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
      color: 'white',
      border: 'none',
      padding: '1rem 2rem',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
      position: 'relative',
      overflow: 'hidden'
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      color: '#1A3E6F',
      border: '2px solid #1A3E6F',
      padding: '1rem 2rem',
      borderRadius: '10px',
      fontSize: '1rem',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'hidden'
    },
    outlineButton: {
      background: 'transparent',
      color: '#6b7280',
      border: '2px solid #d1d5db'
    },
    buttonDisabled: {
      background: '#9ca3af',
      cursor: 'not-allowed',
      boxShadow: 'none'
    },
    errorAlert: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '12px',
      padding: '1rem',
      marginTop: '1rem'
    },
    errorAlertText: {
      color: '#ef4444',
      fontSize: '13px',
      fontWeight: '500'
    },
    successAlert: {
      backgroundColor: '#f0fdf4',
      border: '1px solid #bbf7d0',
      borderRadius: '12px',
      padding: '1.5rem',
      marginTop: '1rem',
      textAlign: 'center'
    },
    successAlertText: {
      color: '#16a34a',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '0.5rem'
    },
    successMessage: {
      color: '#15803d',
      fontSize: '14px',
      fontWeight: '500'
    },

    // Footer Styles
    footer: {
      backgroundColor: '#1A3E6F',
      color: 'white',
      padding: '3rem 0 1rem',
      marginTop: '2rem'
    },
    footerContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 2rem'
    },
    footerGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '2rem',
      marginBottom: '2rem'
    },
    footerColumn: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    },
    footerLogo: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1rem'
    },
    footerLogoImg: {
      height: '40px',
      width: 'auto',
      objectFit: 'contain'
    },
    footerBankName: {
      fontSize: '1.2rem',
      fontWeight: '700',
      color: 'white'
    },
    footerTagline: {
      fontSize: '0.8rem',
      color: '#FFC857'
    },
    footerDescription: {
      fontSize: '0.9rem',
      color: '#FFD687',
      lineHeight: '1.5'
    },
    footerColumnTitle: {
      fontSize: '1.1rem',
      fontWeight: '600',
      color: '#FFC857',
      marginBottom: '0.5rem'
    },
    footerLinks: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    footerLink: {
      color: '#FFD687',
      textDecoration: 'none',
      fontSize: '0.9rem',
      transition: 'color 0.3s ease'
    },
    securityBadges: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    securityBadge: {
      backgroundColor: '#2A5490',
      padding: '0.5rem 0.75rem',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    footerBottom: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
      paddingTop: '2rem',
      borderTop: '1px solid rgba(255,200,87,0.3)'
    },
    footerBottomLeft: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem'
    },
    routingText: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#FFC857',
      fontFamily: 'monospace'
    },
    memberText: {
      fontSize: '0.8rem',
      color: '#FFD687',
      fontWeight: '500'
    },
    footerBottomRight: {
      display: 'flex',
      gap: '1.5rem',
      flexWrap: 'wrap'
    },
    footerBottomLink: {
      color: '#FFD687',
      textDecoration: 'none',
      fontSize: '0.8rem',
      transition: 'color 0.3s ease'
    },
    copyright: {
      textAlign: 'center',
      paddingTop: '1rem',
      borderTop: '1px solid rgba(255,200,87,0.3)',
      marginTop: '1rem'
    },
    scrollingAccountContainer: {
      maxWidth: '1200px',
      margin: '1rem auto 0',
      padding: '0 2rem',
      overflow: 'hidden',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '0.75rem 1.5rem',
      position: 'relative'
    },
    scrollingAccountText: {
      whiteSpace: 'nowrap',
      animation: 'scrollAccountOpening 25s linear infinite',
      color: '#FFD687',
      fontSize: '0.95rem',
      fontWeight: '600',
      letterSpacing: '0.5px'
    },
    // Styles for account type cards
    accountTypeCard: {
      border: '2px solid #e5e7eb',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    },
    accountTypeCardSelected: {
      borderColor: '#10b981',
      backgroundColor: '#f0f4f4',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(16, 185, 121, 0.2)'
    },
    accountTypeCardHover: {
      borderColor: '#9ca3af',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    accountTypeName: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1A3E6F',
      marginBottom: '8px'
    },
    accountTypeDescription: {
      fontSize: '13px',
      color: '#64748b',
      lineHeight: '1.5',
      flexGrow: 1,
      marginBottom: '12px'
    },
    accountTypeFeatures: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '12px'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      color: '#64748b'
    },
    featureIcon: {
      fontSize: '16px'
    },
    depositRequiredBadge: {
      marginTop: '12px',
      padding: '12px',
      backgroundColor: '#fef3c7',
      border: '1px solid #fbbf24',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      color: '#92400e',
      textAlign: 'center'
    },

    // Step 4 - Account & Employment Styles
    accountCardSelectedInStep4: {
      borderColor: '#0066CC',
      backgroundColor: '#e6f2ff',
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 25px rgba(0, 102, 204, 0.2)'
    },
    accountCardHoverInStep4: {
      borderColor: '#9ca3af',
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundPattern}></div>

      <div style={styles.content}>
        {/* Enhanced Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logo}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logoImage} />
              <div>
                <div style={styles.bankName}>Oakline Bank</div>
                <div style={styles.bankTagline}>Your Financial Partner</div>
              </div>
            </Link>

            <div style={styles.headerInfo}>
              <div style={styles.supportInfo}>
                <span style={styles.supportLabel}>Need Help?</span>
                <span style={styles.supportPhone}>📞 1-800-OAKLINE</span>
              </div>
            </div>

            <div style={styles.headerActions}>
              <Link href="/login" style={styles.loginButton}>
                <span style={styles.buttonIcon}>👤</span>
                Existing Customer
              </Link>
              <div style={styles.headerButtons}>
                <Link href="/" style={styles.homeButton}>
                  <span style={styles.homeButtonIcon}>🏠</span>
                  Back to Home
                </Link>
                <button
                  onClick={() => window.history.back()}
                  style={styles.goBackButton}
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>

          {/* Scrolling Welcome Message */}
          <div style={styles.scrollingAccountContainer}>
            <div style={styles.scrollingAccountText}>
              Welcome to Oakline Bank - Your trusted financial partner since 1995 • Explore all 23 account types with detailed benefits • Join over 500,000+ satisfied customers • Award-winning mobile app • FDIC Insured up to $250,000 • Rated #1 Customer Service
            </div>
          </div>

          {/* Progress Indicator */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBar}>
              <div style={{
                ...styles.progressFill,
                width: currentStep === 0 ? '20%' : currentStep === 1 ? '40%' : currentStep === 2 ? '60%' : currentStep === 3 ? '80%' : currentStep === 4 ? '90%' : currentStep === 5 ? '100%' : '0%'
              }}></div>
            </div>
            <div style={styles.progressSteps}>
              <div style={{...styles.progressStep, ...(currentStep >= 0 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: 'clamp(35px, 10vw, 50px)',
                  height: 'clamp(35px, 10vw, 50px)',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 0 ? '#0066CC' : 'rgba(0, 102, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontWeight: '700',
                  color: 'white',
                  border: currentStep >= 0 ? '3px solid #0066CC' : '3px solid rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}>✉</div>
                <span style={{fontWeight: currentStep === 0 ? '700' : '500', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'}}>Email</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 1 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 1 ? '#0066CC' : 'rgba(0, 102, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 1 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 1 ? '3px solid #0066CC' : '3px solid rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}>👤</div>
                <span style={{fontWeight: currentStep === 1 ? '700' : '500', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'}}>Personal</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 2 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 2 ? '#0066CC' : 'rgba(0, 102, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 2 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 2 ? '3px solid #0066CC' : '3px solid rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}>🏠</div>
                <span style={{fontWeight: currentStep === 2 ? '700' : '500', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'}}>Address</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 3 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 3 ? '#0066CC' : 'rgba(0, 102, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 3 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 3 ? '3px solid #0066CC' : '3px solid rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}>💼</div>
                <span style={{fontWeight: currentStep === 3 ? '700' : '500', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'}}>Account</span>
              </div>
              <div style={{...styles.progressStep, ...(currentStep >= 4 ? styles.progressStepActive : {})}}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= 4 ? '#0066CC' : 'rgba(0, 102, 204, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '18px',
                  color: currentStep >= 4 ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                  border: currentStep >= 4 ? '3px solid #0066CC' : '3px solid rgba(0, 102, 204, 0.3)',
                  transition: 'all 0.3s ease'
                }}>🪪</div>
                <span style={{fontWeight: currentStep === 4 ? '700' : '500', fontSize: 'clamp(0.7rem, 2vw, 0.9rem)'}}>ID Upload</span>
              </div>
            </div>
          </div>
        </header>

        {/* Form Card */}
        <div style={styles.formCard}>
          <h2 style={styles.sectionTitle}>
            {currentStep === 0 && (
              <>
                <span>✉️</span> Email Verification
              </>
            )}
            {currentStep === 1 && (
              <>
                <span>👤</span> Personal Information
              </>
            )}
            {currentStep === 2 && (
              <>
                <span>🏠</span> Address Details
              </>
            )}
            {currentStep === 3 && (
              <>
                <span>💼</span> Account & Employment
              </>
            )}
            {currentStep === 4 && (
              <>
                <span>🪪</span> ID Document Upload
              </>
            )}
            {currentStep === 5 && (
              <>
                <span>🎉</span> Application Submitted
              </>
            )}
          </h2>

          {/* Step 0: Email Verification */}
          {currentStep === 0 && (
            <div style={{
              maxWidth: '500px',
              margin: '0 auto',
              padding: '2rem 0'
            }}>
              <p style={{
                textAlign: 'center',
                color: '#666',
                fontSize: '16px',
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                To ensure the security of your application, please verify your email address. We'll send you a verification code that you'll need to enter below.
              </p>

              {!codeSent ? (
                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Email Address <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="email"
                      value={verificationEmail}
                      onChange={(e) => {
                        setVerificationEmail(e.target.value);
                        if (errors.verificationEmail) {
                          setErrors({});
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.verificationEmail ? styles.inputError : {})
                      }}
                      placeholder="your.email@example.com"
                      disabled={loading}
                    />
                    {errors.verificationEmail && (
                      <div style={styles.errorMessage}>⚠️ {errors.verificationEmail}</div>
                    )}
                  </div>

                  <button
                    onClick={handleSendVerificationCode}
                    disabled={loading}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      ...(loading ? styles.buttonDisabled : {})
                    }}
                  >
                    {loading ? 'Sending...' : '📧 Send Verification Code'}
                  </button>
                </div>
              ) : (
                <div style={styles.formGrid}>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#16a34a',
                      fontWeight: '600'
                    }}>
                      ✅ Verification code sent to:
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: '#15803d',
                      fontWeight: '700',
                      marginTop: '0.5rem'
                    }}>
                      {verificationEmail}
                    </div>
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>
                      Verification Code <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        if (errors.verificationCode) {
                          setErrors({});
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.verificationCode ? styles.inputError : {}),
                        fontSize: '24px',
                        textAlign: 'center',
                        letterSpacing: '0.5rem',
                        fontFamily: 'monospace'
                      }}
                      placeholder="000000"
                      maxLength="6"
                      disabled={loading}
                    />
                    {errors.verificationCode && (
                      <div style={styles.errorMessage}>⚠️ {errors.verificationCode}</div>
                    )}
                    <p style={{
                      fontSize: '13px',
                      color: '#666',
                      marginTop: '0.5rem',
                      textAlign: 'center'
                    }}>
                      Please check your email and enter the 6-digit code we sent you.
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    flexDirection: 'column'
                  }}>
                    <button
                      onClick={handleVerifyEmail}
                      disabled={loading || !verificationCode}
                      style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        ...(loading || !verificationCode ? styles.buttonDisabled : {})
                      }}
                    >
                      {loading ? 'Verifying...' : '✓ Verify Email'}
                    </button>

                    <button
                      onClick={() => {
                        if (resendTimer === 0) {
                          handleSendVerificationCode();
                        }
                      }}
                      disabled={loading || resendTimer > 0}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton,
                        ...(loading || resendTimer > 0 ? styles.buttonDisabled : {})
                      }}
                    >
                      {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : '🔄 Resend Code'}
                    </button>

                    <button
                      onClick={() => {
                        setCodeSent(false);
                        setVerificationCode('');
                        setVerificationEmail('');
                        setErrors({});
                      }}
                      disabled={loading}
                      style={{
                        ...styles.button,
                        ...styles.outlineButton,
                        ...(loading ? styles.buttonDisabled : {})
                      }}
                    >
                      ✏️ Change Email Address
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div style={styles.formGrid}>
              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    First Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.firstName ? styles.inputError : {})
                    }}
                    placeholder="Enter your first name"
                  />
                  {errors.firstName && (
                    <div style={styles.errorMessage}>⚠️ {errors.firstName}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Middle Name</label>
                  <input
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your middle name"
                  />
                </div>
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Last Name <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.lastName ? styles.inputError : {})
                    }}
                    placeholder="Enter your last name"
                  />
                  {errors.lastName && (
                    <div style={styles.errorMessage}>⚠️ {errors.lastName}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Mother's Maiden Name</label>
                  <input
                    type="text"
                    name="mothersMaidenName"
                    value={formData.mothersMaidenName}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your mother's maiden name"
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Email Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  readOnly={isEmailVerified}
                  style={{
                    ...styles.input,
                    ...(errors.email ? styles.inputError : {}),
                    ...(isEmailVerified ? { backgroundColor: '#f0f4f4', cursor: 'not-allowed' } : {})
                  }}
                  placeholder="Enter your email address"
                />
                {isEmailVerified && (
                  <div style={{
                    fontSize: '13px',
                    color: '#16a34a',
                    fontWeight: '600',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ✅ Email verified
                  </div>
                )}
                {errors.email && (
                  <div style={styles.errorMessage}>⚠️ {errors.email}</div>
                )}
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Phone Number <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.phone ? styles.inputError : {})
                    }}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <div style={styles.errorMessage}>⚠️ {errors.phone}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Date of Birth <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.dateOfBirth ? styles.inputError : {})
                    }}
                  />
                  {errors.dateOfBirth && (
                    <div style={styles.errorMessage}>⚠️ {errors.dateOfBirth}</div>
                  )}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Country <span style={styles.required}>*</span>
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  style={{
                    ...styles.select,
                    ...(errors.country ? styles.inputError : {})
                  }}
                >
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {showManualCountry && (
                  <input
                    type="text"
                    name="manualCountry"
                    value={formData.manualCountry}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Enter your country"
                  />
                )}
                {errors.country && (
                  <div style={styles.errorMessage}>⚠️ {errors.country}</div>
                )}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  {getEffectiveCountry() === 'US' ? 'Social Security Number' : 'Government ID Number'} <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name={getEffectiveCountry() === 'US' ? 'ssn' : 'idNumber'}
                  value={getEffectiveCountry() === 'US' ? formData.ssn : formData.idNumber}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    ...((getEffectiveCountry() === 'US' ? errors.ssn : errors.idNumber) ? styles.inputError : {})
                  }}
                  placeholder={getEffectiveCountry() === 'US' ? 'XXX-XX-XXXX' : 'Enter your government ID number'}
                />
                {getEffectiveCountry() === 'US' && errors.ssn && (
                  <div style={styles.errorMessage}>⚠️ {errors.ssn}</div>
                )}
                {getEffectiveCountry() !== 'US' && errors.idNumber && (
                  <div style={styles.errorMessage}>⚠️ {errors.idNumber}</div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Address Information */}
          {currentStep === 2 && (
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Street Address <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  style={{
                    ...styles.input,
                    ...(errors.address ? styles.inputError : {})
                  }}
                  placeholder="123 Main Street"
                />
                {errors.address && (
                  <div style={styles.errorMessage}>⚠️ {errors.address}</div>
                )}
              </div>

              <div style={{...styles.formGrid, ...styles.gridCols3}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    City <span style={styles.required}>*</span>
                  </label>
                  {shouldShowManualCity() ? (
                    <input
                      type="text"
                      name="manualCity"
                      value={formData.manualCity || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.city) {
                          setErrors(prev => ({ ...prev, city: '' }));
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.city ? styles.inputError : {})
                      }}
                      placeholder="Enter your city"
                    />
                  ) : (
                    <select
                      name="city"
                      value={formData.city || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.city) {
                          setErrors(prev => ({ ...prev, city: '' }));
                        }
                      }}
                      style={{
                        ...styles.select,
                        ...(errors.city ? styles.inputError : {})
                      }}
                    >
                      <option value="">Select City</option>
                      {getAvailableCities().map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  )}
                  {getAvailableCities().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualCity(!showManualCity);
                        setFormData(prev => ({ ...prev, city: '', manualCity: '' }));
                        setErrors(prev => ({ ...prev, city: '' }));
                      }}
                      style={styles.toggleButton}
                    >
                      {showManualCity ? 'Select from list' : 'Enter manually'}
                    </button>
                  )}
                  {errors.city && (
                    <div style={styles.errorMessage}>⚠️ {errors.city}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    State / Province <span style={styles.required}>*</span>
                  </label>
                  {shouldShowManualState() ? (
                    <input
                      type="text"
                      name="manualState"
                      value={formData.manualState || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.state) {
                          setErrors(prev => ({ ...prev, state: '' }));
                        }
                      }}
                      style={{
                        ...styles.input,
                        ...(errors.state ? styles.inputError : {})
                      }}
                      placeholder="Enter your state/province"
                    />
                  ) : (
                    <select
                      name="state"
                      value={formData.state || ''}
                      onChange={(e) => {
                        handleInputChange(e);
                        if (errors.state) {
                          setErrors(prev => ({ ...prev, state: '' }));
                        }
                      }}
                      style={{
                        ...styles.select,
                        ...(errors.state ? styles.inputError : {})
                      }}
                    >
                      <option value="">Select State/Province</option>
                      {getAvailableStates().map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  )}
                  {getAvailableStates().length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualState(!showManualState);
                        setFormData(prev => ({ ...prev, state: '', manualState: '', city: '', manualCity: '' }));
                        setShowManualCity(false);
                        setErrors(prev => ({ ...prev, state: '', city: '' }));
                      }}
                      style={styles.toggleButton}
                    >
                      {showManualState ? 'Select from list' : 'Enter manually'}
                    </button>
                  )}
                  {errors.state && (
                    <div style={styles.errorMessage}>⚠️ {errors.state}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    ZIP / Postal Code <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.zipCode ? styles.inputError : {})
                    }}
                    placeholder="12345"
                  />
                  {errors.zipCode && (
                    <div style={styles.errorMessage}>⚠️ {errors.zipCode}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Account & Employment */}
          {currentStep === 3 && (
            <div style={styles.formGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Choose Your Account Types <span style={styles.required}>*</span>
                </label>

                {selectedAccountMinDeposit > 0 && (
                  <div style={{
                    backgroundColor: '#FEF3C7',
                    border: '2px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '24px' }}>💰</span>
                    <div>
                      <strong style={{ color: '#92400E', fontSize: '15px' }}>
                        Total Minimum Deposit Required: ${selectedAccountMinDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                      <p style={{ color: '#92400E', margin: '4px 0 0 0', fontSize: '13px' }}>
                        You'll need to fund your account(s) with this amount after approval.
                      </p>
                    </div>
                  </div>
                )}

                {loadingAccountTypes ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading account types...
                  </div>
                ) : (
                  <div style={styles.accountTypesGrid}>
                    {accountTypes.map(account => {
                      const minDeposit = parseFloat(account.min_deposit) || 0;
                      return (
                        <div
                          key={account.id}
                          onClick={() => toggleAccountType(account.id)}
                          style={{
                            ...styles.accountCard,
                            ...(formData.accountTypes.includes(account.id) ? styles.accountCardSelectedInStep4 : {}),
                          }}
                          onMouseEnter={(e) => {
                            if (!formData.accountTypes.includes(account.id)) {
                              Object.assign(e.currentTarget.style, styles.accountCardHoverInStep4);
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!formData.accountTypes.includes(account.id)) {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <div style={styles.accountHeader}>
                            <div style={{
                              ...styles.accountIcon,
                              backgroundColor: formData.accountTypes.includes(account.id) ? '#0066CC' : '#f1f5f9',
                              color: formData.accountTypes.includes(account.id) ? 'white' : 'inherit'
                            }}>
                              {account.icon}
                            </div>
                            <div style={styles.accountName}>{account.name}</div>
                          </div>
                          <div style={styles.accountDescription}>{account.description}</div>
                          <div style={styles.accountRate}>{account.rate}</div>
                          {minDeposit > 0 && (
                            <div style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              backgroundColor: '#fef3c7',
                              border: '1px solid #fde68a',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#92400e',
                              textAlign: 'center'
                            }}>
                              💰 Min. Opening Deposit: ${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                          {minDeposit === 0 && (
                            <div style={{
                              marginTop: '12px',
                              padding: '10px 12px',
                              backgroundColor: '#d1fae5',
                              border: '1px solid #86efac',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#065f46',
                              textAlign: 'center'
                            }}>
                              ✓ No Minimum Deposit Required
                            </div>
                          )}
                          {formData.accountTypes.includes(account.id) && (
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              backgroundColor: '#0066CC',
                              color: 'white',
                              borderRadius: '50%',
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '14px'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {errors.accountTypes && (
                  <div style={styles.errorMessage}>⚠️ {errors.accountTypes}</div>
                )}
              </div>

              {selectedAccountMinDeposit > 0 && (
                <div style={styles.depositNotice}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '16px', fontWeight: '600', color: '#1A3E6F' }}>
                    📋 Important: Minimum Deposit Required
                  </h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
                    The account type(s) you selected require a total minimum deposit of <strong>${selectedAccountMinDeposit.toFixed(2)}</strong> to activate your accounts.
                  </p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
                    After submitting your application, our team will review it. Once approved, you'll need to make the minimum deposit before your accounts become active.
                  </p>
                </div>
              )}

              <div style={{...styles.formGrid, ...styles.gridCols2}}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Employment Status <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="employmentStatus"
                    value={formData.employmentStatus}
                    onChange={handleInputChange}
                    style={{
                      ...styles.select,
                      ...(errors.employmentStatus ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="employed_fulltime">Employed Full-time</option>
                    <option value="employed_parttime">Employed Part-time</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                  </select>
                  {errors.employmentStatus && (
                    <div style={styles.errorMessage}>⚠️ {errors.employmentStatus}</div>
                  )}
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Annual Income <span style={styles.required}>*</span>
                  </label>
                  <select
                    name="annualIncome"
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                    style={{
                      ...styles.select,
                      ...(errors.annualIncome ? styles.inputError : {})
                    }}
                  >
                    <option value="">Select Income Range</option>
                    <option value="under_25k">Under $25,000</option>
                    <option value="25k_50k">$25,000 - $50,000</option>
                    <option value="50k_75k">$50,000 - $75,000</option>
                    <option value="75k_100k">$75,000 - $100,000</option>
                    <option value="100k_150k">$100,000 - $150,000</option>
                    <option value="over_150k">Over $150,000</option>
                  </select>
                  {errors.annualIncome && (
                    <div style={styles.errorMessage}>⚠️ {errors.annualIncome}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: ID Document Upload */}
          {currentStep === 4 && (
            <div style={{maxWidth: '900px', margin: '0 auto'}}>
              <div style={{
                backgroundColor: '#eff6ff',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '2px solid #3b82f6'
              }}>
                <h3 style={{margin: '0 0 0.5rem 0', fontSize: '18px', fontWeight: '700', color: '#1A3E6F'}}>
                  🪪 Identity Verification Required
                </h3>
                <p style={{margin: 0, color: '#374151', fontSize: '14px', lineHeight: '1.6'}}>
                  Please upload clear photos of both sides of your government-issued ID (Driver's License, Passport, or National ID Card).
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                marginBottom: '2rem'
              }}>
                {/* ID Front Upload */}
                <div style={styles.inputGroup}>
                  <label style={{...styles.label, textAlign: 'center', display: 'block', marginBottom: '1rem'}}>
                    ID Front Side <span style={styles.required}>*</span>
                  </label>

                  {!idFrontPreview ? (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem',
                      border: errors.idFront ? '2px dashed #ef4444' : '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      cursor: uploadingFront ? 'not-allowed' : 'pointer',
                      backgroundColor: uploadingFront ? '#f1f5f9' : '#f8fafc',
                      transition: 'all 0.3s ease',
                      minHeight: '250px'
                    }}>
                      <div style={{fontSize: '48px', marginBottom: '1rem'}}>📄</div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: '#1A3E6F', marginBottom: '0.5rem'}}>
                        {uploadingFront ? 'Uploading...' : 'Click to Upload Front'}
                      </div>
                      <div style={{fontSize: '13px', color: '#64748b'}}>
                        JPG or PNG (max 5MB)
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={(e) => handleIdFileChange(e, 'front')}
                        disabled={uploadingFront}
                        style={{display: 'none'}}
                      />
                    </label>
                  ) : (
                    <div style={{position: 'relative'}}>
                      <img
                        src={idFrontPreview}
                        alt="ID Front"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          borderRadius: '12px',
                          border: '2px solid #10b981',
                          backgroundColor: '#f8fafc'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeIdDocument('front')}
                        disabled={uploadingFront}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          fontSize: '18px',
                          cursor: uploadingFront ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                      >
                        ×
                      </button>
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#16a34a',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        ✅ Front uploaded successfully
                      </div>
                    </div>
                  )}
                  {errors.idFront && (
                    <div style={styles.errorMessage}>⚠️ {errors.idFront}</div>
                  )}
                </div>

                {/* ID Back Upload */}
                <div style={styles.inputGroup}>
                  <label style={{...styles.label, textAlign: 'center', display: 'block', marginBottom: '1rem'}}>
                    ID Back Side <span style={styles.required}>*</span>
                  </label>

                  {!idBackPreview ? (
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2rem',
                      border: errors.idBack ? '2px dashed #ef4444' : '2px dashed #cbd5e1',
                      borderRadius: '12px',
                      cursor: uploadingBack ? 'not-allowed' : 'pointer',
                      backgroundColor: uploadingBack ? '#f1f5f9' : '#f8fafc',
                      transition: 'all 0.3s ease',
                      minHeight: '250px'
                    }}>
                      <div style={{fontSize: '48px', marginBottom: '1rem'}}>📄</div>
                      <div style={{fontSize: '16px', fontWeight: '600', color: '#1A3E6F', marginBottom: '0.5rem'}}>
                        {uploadingBack ? 'Uploading...' : 'Click to Upload Back'}
                      </div>
                      <div style={{fontSize: '13px', color: '#64748b'}}>
                        JPG or PNG (max 5MB)
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={(e) => handleIdFileChange(e, 'back')}
                        disabled={uploadingBack}
                        style={{display: 'none'}}
                      />
                    </label>
                  ) : (
                    <div style={{position: 'relative'}}>
                      <img
                        src={idBackPreview}
                        alt="ID Back"
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          borderRadius: '12px',
                          border: '2px solid #10b981',
                          backgroundColor: '#f8fafc'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeIdDocument('back')}
                        disabled={uploadingBack}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          fontSize: '18px',
                          cursor: uploadingBack ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                      >
                        ×
                      </button>
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        textAlign: 'center',
                        color: '#16a34a',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        ✅ Back uploaded successfully
                      </div>
                    </div>
                  )}
                  {errors.idBack && (
                    <div style={styles.errorMessage}>⚠️ {errors.idBack}</div>
                  )}
                </div>
              </div>

              <div style={{
                backgroundColor: '#fff7ed',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #FFC857',
                marginBottom: '2rem'
              }}>
                <p style={{margin: 0, color: '#92400e', fontSize: '13px', lineHeight: '1.5'}}>
                  <strong>📝 Important:</strong> Make sure your ID photo is clear, not blurry, and all information is readable. We use this to verify your identity for security purposes. On mobile devices, you can choose to use your camera directly from the file selector.
                </p>
              </div>


              <div style={{
                ...styles.checkboxContainer,
                borderColor: formData.agreeToTerms ? '#0066CC' : '#e2e8f0',
                backgroundColor: formData.agreeToTerms ? '#e6f2ff' : '#f8fafc'
              }}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    style={styles.checkbox}
                  />
                  {formData.agreeToTerms && (
                    <span style={{color: '#0066CC', fontSize: '16px', fontWeight: 'bold'}}>✓</span>
                  )}
                </div>
                <label
                  style={styles.checkboxLabel}
                  onClick={() => handleInputChange({target: {name: 'agreeToTerms', type: 'checkbox', checked: !formData.agreeToTerms}})}
                >
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" style={styles.link}>
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={styles.link}>
                    Privacy Policy
                  </Link>{' '}
                  <span style={styles.required}>*</span>
                </label>
              </div>
              {errors.agreeToTerms && (
                <div style={styles.errorMessage}>⚠️ {errors.agreeToTerms}</div>
              )}

              {errors.submit && (
                <div style={styles.errorAlert}>
                  <div style={styles.errorAlertText}>⚠️ {errors.submit}</div>
                </div>
              )}

              {submitSuccess && (
                <div style={styles.successAlert}>
                  <div style={styles.successAlertText}>🎉 Application Submitted Successfully!</div>
                  <div style={styles.successMessage}>
                    Your account has been created and a welcome email with enrollment instructions has been sent to {formData.email}.
                    Please check your inbox (and spam folder) for the enrollment link.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Success Screen */}
          {currentStep === 5 && (
            <div style={{
              textAlign: 'center',
              padding: '0',
              background: 'white',
              borderRadius: '20px',
              overflow: 'hidden',
              animation: 'fadeInUp 0.6s ease',
              maxWidth: '100%',
              margin: '0 auto'
            }}>
              {/* Header Section with Oakline Branding */}
              <div style={{
                background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
                padding: 'clamp(2rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)',
                color: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'clamp(0.5rem, 2vw, 1rem)',
                  marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
                  flexWrap: 'wrap'
                }}>
                  <img
                    src="/images/Oakline_Bank_logo_design_c1b04ae0.png"
                    alt="Oakline Bank"
                    style={{
                      height: 'clamp(40px, 10vw, 60px)',
                      width: 'auto',
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  <div style={{
                    fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    color: 'white'
                  }}>
                    {bankDetails?.name || 'Oakline Bank'}
                  </div>
                </div>

                <div style={{
                  fontSize: 'clamp(50px, 15vw, 80px)',
                  marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
                  animation: 'bounce 1s ease',
                  color: 'white'
                }}>✅</div>

                <h2 style={{
                  fontSize: 'clamp(1.5rem, 5vw, 2.25rem)',
                  marginBottom: 'clamp(0.75rem, 2vw, 1rem)',
                  fontWeight: '700',
                  lineHeight: '1.2',
                  color: 'white'
                }}>
                  Application Submitted Successfully!
                </h2>

                <p style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1.125rem)',
                  marginBottom: '0',
                  lineHeight: '1.6',
                  opacity: 0.95,
                  color: 'white'
                }}>
                  Welcome to the Oakline Bank family
                </p>
              </div>

              {/* Content Section */}
              <div style={{ padding: 'clamp(1.5rem, 5vw, 3rem) clamp(1rem, 3vw, 2rem)' }}>
                <div style={{
                  backgroundColor: '#f8fafc',
                  padding: 'clamp(1rem, 4vw, 2rem)',
                  borderRadius: '15px',
                  marginBottom: 'clamp(1rem, 3vw, 2rem)',
                  border: '2px solid #e2e8f0'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(1.125rem, 4vw, 1.5rem)',
                    color: '#1A3E6F',
                    marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
                    fontWeight: '700'
                  }}>
                    📧 What Happens Next?
                  </h3>

                  <div style={{
                    textAlign: 'left',
                    maxWidth: '600px',
                    margin: '0 auto'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
                      gap: 'clamp(0.5rem, 2vw, 1rem)',
                      padding: 'clamp(0.75rem, 3vw, 1rem)',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: 'clamp(20px, 6vw, 32px)',
                        backgroundColor: '#0066CC',
                        borderRadius: '50%',
                        width: 'clamp(35px, 10vw, 50px)',
                        height: 'clamp(35px, 10vw, 50px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: '700',
                        color: 'white'
                      }}>1</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#1A3E6F', fontSize: 'clamp(0.9rem, 3vw, 1.125rem)', display: 'block' }}>Application Review</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: 'clamp(0.8rem, 2.5vw, 0.9375rem)', lineHeight: '1.6' }}>
                          Our team will review your application within 24-48 hours
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      marginBottom: 'clamp(1rem, 3vw, 1.5rem)',
                      gap: 'clamp(0.5rem, 2vw, 1rem)',
                      padding: 'clamp(0.75rem, 3vw, 1rem)',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: 'clamp(20px, 6vw, 32px)',
                        backgroundColor: '#0066CC',
                        borderRadius: '50%',
                        width: 'clamp(35px, 10vw, 50px)',
                        height: 'clamp(35px, 10vw, 50px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: '700',
                        color: 'white'
                      }}>2</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#1A3E6F', fontSize: 'clamp(0.9rem, 3vw, 1.125rem)', display: 'block' }}>Approval Email</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: 'clamp(0.8rem, 2.5vw, 0.9375rem)', lineHeight: '1.6', wordBreak: 'break-word' }}>
                          Once approved, you'll receive an email at <strong style={{ color: '#1A3E6F' }}>{formData.email}</strong> with your login credentials
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'clamp(0.5rem, 2vw, 1rem)',
                      padding: 'clamp(0.75rem, 3vw, 1rem)',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}>
                      <div style={{
                        fontSize: 'clamp(20px, 6vw, 32px)',
                        backgroundColor: '#0066CC',
                        borderRadius: '50%',
                        width: 'clamp(35px, 10vw, 50px)',
                        height: 'clamp(35px, 10vw, 50px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        fontWeight: '700',
                        color: 'white'
                      }}>3</div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#1A3E6F', fontSize: 'clamp(0.9rem, 3vw, 1.125rem)', display: 'block' }}>Start Banking</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: 'clamp(0.8rem, 2.5vw, 0.9375rem)', lineHeight: '1.6' }}>
                          Log in with your credentials and start enjoying your new banking accounts
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fff7ed',
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  borderRadius: '12px',
                  marginBottom: 'clamp(1rem, 3vw, 2rem)',
                  border: '2px solid #FFC857',
                  textAlign: 'left'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#92400e',
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9375rem)',
                    lineHeight: '1.6'
                  }}>
                    <strong>⏰ Important:</strong> Please allow 24-48 hours for application review. You will receive an email notification once your application has been processed.
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: 'clamp(0.5rem, 2vw, 1rem)',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: 'clamp(1rem, 3vw, 2rem)'
                }}>
                  <button
                    onClick={() => router.push('/')}
                    style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
                      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(26, 62, 111, 0.4)',
                      transition: 'all 0.3s ease',
                      flex: '1 1 auto',
                      minWidth: '140px',
                      maxWidth: '200px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 24px rgba(26, 62, 111, 0.5)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 6px 20px rgba(26, 62, 111, 0.4)';
                    }}
                  >
                    🏠 Return to Home
                  </button>

                  <button
                    onClick={() => router.push('/login')}
                    style={{
                      padding: 'clamp(12px, 3vw, 16px) clamp(20px, 5vw, 32px)',
                      backgroundColor: 'transparent',
                      color: '#1A3E6F',
                      border: '2px solid #1A3E6F',
                      borderRadius: '12px',
                      fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      flex: '1 1 auto',
                      minWidth: '140px',
                      maxWidth: '200px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#1A3E6F';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#1A3E6F';
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    🔑 Go to Login
                  </button>
                </div>

                <div style={{
                  padding: 'clamp(1rem, 3vw, 1.5rem)',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#64748b',
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    lineHeight: '1.6'
                  }}>
                    Need assistance? Contact our support team at{' '}
                    <a href={`tel:${bankDetails?.phone || '1-800-OAKLINE'}`} style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-word' }}>
                      {bankDetails?.phone || '1-800-OAKLINE'}
                    </a>
                    {' '}or email{' '}
                    <a href={`mailto:${bankDetails?.email_info || 'support@theoaklinebank.com'}`} style={{ color: '#1A3E6F', fontWeight: '600', textDecoration: 'none', wordBreak: 'break-word' }}>
                      {bankDetails?.email_info || 'support@theoaklinebank.com'}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={styles.buttonContainer}>
            {currentStep > 0 && currentStep < 5 && (
              <button
                onClick={handleBack}
                disabled={loading || uploadingFront || uploadingBack}
                style={{
                  ...styles.button,
                  ...styles.outlineButton,
                  ...(loading || uploadingFront || uploadingBack ? styles.buttonDisabled : {})
                }}
              >
                ← Back
              </button>
            )}

            <div style={{marginLeft: currentStep === 1 ? 'auto' : currentStep === 0 ? 'auto' : currentStep === 2 ? 'auto' : currentStep === 3 ? 'auto' : '0'}}>
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={loading || uploadingFront || uploadingBack}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    ...(loading || uploadingFront || uploadingBack ? styles.buttonDisabled : {})
                  }}
                >
                  Next Step →
                </button>
              ) : currentStep === 4 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.agreeToTerms || uploadingFront || uploadingBack}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    ...(loading || !formData.agreeToTerms || uploadingFront || uploadingBack ? styles.buttonDisabled : {})
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #ffffff40',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      🎉 Submit Application
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.footerLinks}>
          <Link href="/login" style={styles.footerLink}>
            Already have an account? Sign In
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerGrid}>
            <div style={styles.footerColumn}>
              <div style={styles.footerLogo}>
                <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.footerLogoImg} />
                <div style={styles.footerBankName}>Oakline Bank</div>
              </div>
              <div style={styles.footerTagline}>Your Financial Partner</div>
              <div style={styles.footerDescription}>
                We are committed to providing exceptional banking services tailored to your needs. From everyday accounts to strategic investments, we're here to help you achieve your financial goals.
              </div>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Quick Links</div>
              <ul style={styles.footerLinks}>
                <li><Link href="/about" style={styles.footerLink}>About Us</Link></li>
                <li><Link href="/services" style={styles.footerLink}>Services</Link></li>
                <li><Link href="/contact" style={styles.footerLink}>Contact Us</Link></li>
                <li><Link href="/faq" style={styles.footerLink}>FAQ</Link></li>
              </ul>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Support</div>
              <ul style={styles.footerLinks}>
                <li><Link href="/support/account-help" style={styles.footerLink}>Account Help</Link></li>
                <li><Link href="/support/security" style={styles.footerLink}>Security Center</Link></li>
                <li><Link href="/support/fees" style={styles.footerLink}>Fee Schedule</Link></li>
                <li><Link href="/support/privacy" style={styles.footerLink}>Privacy Policy</Link></li>
              </ul>
            </div>
            <div style={styles.footerColumn}>
              <div style={styles.footerColumnTitle}>Connect With Us</div>
              <div style={styles.footerDescription}>Follow us on social media for the latest updates and financial tips.</div>
              <div style={styles.footerBottomRight}>
                <Link href="#" style={styles.footerBottomLink}>Facebook</Link>
                <Link href="#" style={styles.footerBottomLink}>Twitter</Link>
                <Link href="#" style={styles.footerBottomLink}>LinkedIn</Link>
              </div>
              <div style={styles.securityBadges}>
                <div style={styles.securityBadge}>🔒 Secure Connection</div>
                <div style={styles.securityBadge}>🛡️ FDIC Insured</div>
              </div>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <div style={styles.footerBottomLeft}>
              <div style={styles.memberText}>Member FDIC | Equal Housing Lender</div>
            </div>
            <div style={styles.footerBottomRight}>
              <Link href="/terms" style={styles.footerBottomLink}>Terms of Service</Link>
              <Link href="/privacy" style={styles.footerBottomLink}>Privacy Policy</Link>
            </div>
          </div>
          <div style={styles.copyright}>
            © 2024 Oakline Bank. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes scrollAccountOpening {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }

        .grid-cols-2 {
          grid-template-columns: repeat(2, 1fr);
        }
        .grid-cols-3 {
          grid-template-columns: repeat(3, 1fr);
        }


        @media (max-width: 768px) {
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }

        input:focus, select:focus {
          outline: none !important;
          border-color: #1A3E6F !important;
          box-shadow: 0 0 0 3px rgba(26, 62, 111, 0.1) !important;
        }
      `}</style>
    </div>
  );
}