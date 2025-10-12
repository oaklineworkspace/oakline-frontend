import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function EnrollPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    ssn: '',
    id_number: '',
    accountNumber: '',
    agreeToTerms: false
  });
  const [applicationInfo, setApplicationInfo] = useState(null); // Renamed from applicationData for clarity
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true); // Start as true to show loading initially
  const [authCreationLoading, setAuthCreationLoading] = useState(false);
  const [accounts, setAccounts] = useState([]); // Renamed from availableAccounts
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [step, setStep] = useState('loading'); // 'loading', 'password', 'success', 'error'
  const [validToken, setValidToken] = useState(false); // To track if the token validation was successful

  // Function to handle magic link authentication and user verification
  const verifyMagicLinkUser = async (user, applicationId) => {
    if (window.enrollmentTimeout) {
      clearTimeout(window.enrollmentTimeout);
      window.enrollmentTimeout = null;
    }

    setLoading(true);
    setError('');
    console.log('Verifying magic link user:', user.email, 'for application:', applicationId);

    try {
      const response = await fetch('/api/verify-magic-link-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          applicationId: applicationId
        })
      });

      const result = await response.json();
      console.log('Magic link verification result:', result);

      if (response.ok) {
        console.log('Magic link verification successful');
        
        // Check if enrollment is already completed
        if (result.enrollment_completed) {
          setError('This enrollment has already been completed. Please use the login page.');
          setStep('error');
          return;
        }
        
        setApplicationInfo(result.application);
        setAccounts(result.accounts || result.account_numbers || []);
        setFormData(prev => ({ ...prev, email: user.email }));
        setStep('password'); // Go straight to password setup
        setValidToken(true); // Token (magic link) is implicitly valid
        setLoading(false); // Ensure loading is false
      } else {
        console.error('Magic link verification failed:', result);
        console.error('Response status:', response.status);
        setError(result.error || 'Invalid enrollment link or session expired. Please contact support.');
        setStep('error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Magic link verification error:', error);
      setError('Error verifying enrollment link. Please try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Function to validate traditional enrollment token
  const validateToken = async (token, applicationId) => {
    try {
      setLoading(true);
      setError('');

      console.log('Validating token:', token, 'for application:', applicationId);

      // First check if enrollment exists
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('token', token)
        .single();

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        setError('Enrollment token not found. Please contact support.');
        setLoading(false);
        return;
      }

      if (!enrollment) {
        setError('Invalid enrollment token.');
        setLoading(false);
        return;
      }

      if (enrollment.is_used) {
        setError('This enrollment link has already been used.');
        setLoading(false);
        return;
      }

      // Check if application_id matches (if provided in enrollment)
      if (enrollment.application_id && enrollment.application_id !== applicationId) {
        setError('Enrollment token does not match the application.');
        setLoading(false);
        return;
      }

      // Get application data
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError) {
        console.error('Application error:', appError);
        setError('Application not found. Please contact support.');
        setLoading(false);
        return;
      }

      // Verify email matches
      if (enrollment.email !== application.email) {
        setError('Email mismatch. Please use the correct enrollment link.');
        setLoading(false);
        return;
      }

      // Get accounts for this application
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('application_id', applicationId);

      if (accountsError) {
        console.error('Accounts error:', accountsError);
        // Don't fail if no accounts yet, but log it
        console.log('No accounts found for application:', applicationId);
      }

      setApplicationInfo(application);
      setAccounts(accounts || []);
      setValidToken(true); // Mark token as valid

      console.log('Token validation successful');
    } catch (error) {
      console.error('Token validation error:', error);
      setError('An error occurred while validating your enrollment link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Prevent navigation away from enrollment until complete
  useEffect(() => {
    const handleRouteChange = (url) => {
      if (step === 'password' && !url.includes('/enroll')) {
        const confirmLeave = window.confirm('Are you sure you want to leave? You need to complete enrollment to access your account.');
        if (!confirmLeave) {
          router.events.emit('routeChangeError');
          throw 'Enrollment incomplete';
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [step, router]);

  // Effect to handle authentication state changes and initial setup
  useEffect(() => {
    const initializeEnrollment = async () => {
      setAuthCreationLoading(true);
      setLoading(true);

      try {
        const { token, application_id, type, error: authError, error_description } = router.query;
        console.log('URL params:', { token: !!token, application_id: !!application_id, type, authError });
        console.log('Full query params:', router.query);

        // Check for auth errors first
        if (authError) {
          console.error('Auth error in URL:', authError, error_description);
          setError(`Authentication error: ${error_description || authError}`);
          setStep('error');
          setAuthCreationLoading(false);
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        console.log('Current session:', !!session, 'User:', session?.user?.email);
        console.log('Session metadata:', session?.user?.user_metadata);

        // Check if user is authenticated (from magic link)
        if (session?.user) {
          const userAppId = session.user.user_metadata?.application_id || application_id;
          
          if (userAppId) {
            console.log('User authenticated via magic link with app ID:', userAppId);
            setApplicationId(userAppId);
            setStep('password'); // Go directly to password setup
            await verifyMagicLinkUser(session.user, userAppId);
          } else {
            console.log('No application ID found in session or query');
            setError('Application ID not found. Please use the link from your email.');
            setStep('error');
          }
        } else if (token && application_id) {
          console.log('Using token-based enrollment');
          setEnrollmentToken(token);
          setApplicationId(application_id);
          await validateToken(token, application_id);
        } else {
          console.log('Invalid enrollment link - missing required parameters');
          setError('Invalid enrollment link. Please check your email for the correct link or request a new one.');
          setStep('error');
        }
      } catch (error) {
        console.error('Error initializing enrollment:', error);
        setError('Error loading enrollment. Please try again.');
        setStep('error');
      } finally {
        setAuthCreationLoading(false);
        setLoading(false);
      }
    };

    if (router.isReady) {
      initializeEnrollment();
    }
  }, [router.isReady, router.query]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!formData.accountNumber) {
      setError('Please select one of your account numbers');
      setLoading(false);
      return;
    }

    // Validate ID field based on country
    if (applicationInfo?.country === 'US') {
      if (!formData.ssn || formData.ssn.trim() === '') {
        setError('Social Security Number is required');
        setLoading(false);
        return;
      }
    } else {
      if (!formData.id_number || formData.id_number.trim() === '') {
        setError('Government ID Number is required');
        setLoading(false);
        return;
      }
    }

    if (!formData.agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      let endpoint, bodyData;

      if (session?.user && step === 'password') {
        endpoint = '/api/complete-enrollment-magic-link';
        bodyData = {
          userId: session.user.id,
          application_id: applicationId,
          email: formData.email,
          password: formData.password,
          ssn: formData.ssn,
          id_number: formData.id_number,
          accountNumber: formData.accountNumber
        };
      } else {
        endpoint = '/api/complete-enrollment';
        bodyData = {
          token: enrollmentToken,
          application_id: applicationId,
          email: formData.email,
          password: formData.password,
          ssn: formData.ssn,
          id_number: formData.id_number,
          accountNumber: formData.accountNumber
        };
      }

      console.log('Submitting enrollment with:', { endpoint, hasUserId: !!bodyData.userId, hasToken: !!bodyData.token });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Enrollment completed successfully! Redirecting to login...');
        setStep('success');
        setTimeout(() => {
          window.location.href = 'https://theoaklinebank.com/login';
        }, 2000);
      } else {
        setError(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setError('An error occurred during enrollment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authCreationLoading || step === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>Setting up your enrollment...</div>
          <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we process your enrollment link.</div>
        </div>
      </div>
    );
  }

  // Handle error states
  if (step === 'error') {
     return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '1rem' }}>Enrollment Error</h2>
          {error && (
            <p style={{ marginBottom: '1.5rem', color: '#374151' }}>{error}</p>
          )}
          {message && (
            <p style={{ marginBottom: '1.5rem', color: '#374151' }}>{message}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render based on the current step and token validity
  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e40af' }}>Complete Your Enrollment</h1>

      {!validToken && step !== 'password' && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Invalid or expired enrollment link. Please check your email or request a new link.
        </div>
      )}

      {(validToken || step === 'password') && step === 'password' && (
        <>
          {applicationInfo && (
            <div style={{ backgroundColor: '#f0f9ff', padding: '1rem', borderRadius: '6px', marginBottom: '2rem' }}>
              <h3>Welcome, {applicationInfo.first_name} {applicationInfo.middle_name ? applicationInfo.middle_name + ' ' : ''}{applicationInfo.last_name}!</h3>
              <p>Email: {applicationInfo.email}</p>
              {accounts.length > 0 && (
                <div>
                  <p><strong>Your Accounts:</strong></p>
                  {accounts.map((account, index) => (
                    <p key={index}>{account.account_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {account.account_number}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled
                style={{ width: '100%', padding: '8px', marginTop: '4px', backgroundColor: '#f3f4f6' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="8"
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                placeholder="Enter your password (min 8 characters)"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label>Confirm Password:</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                placeholder="Confirm your password"
              />
            </div>

            {applicationInfo?.country === 'US' ? (
              <div style={{ marginBottom: '1rem' }}>
                <label>Social Security Number (SSN) <span style={{color: '#ef4444'}}>*</span>:</label>
                <input
                  type="text"
                  name="ssn"
                  value={formData.ssn}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  placeholder="XXX-XX-XXXX"
                  maxLength="11"
                />
              </div>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <label>Government ID Number <span style={{color: '#ef4444'}}>*</span>:</label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  required
                  style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  placeholder="Enter your government ID number"
                />
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label>Select One of Your Account Numbers:</label>
              <select
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                required
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              >
                <option value="">Select an account number</option>
                {accounts.map((account, index) => (
                  <option key={index} value={account.account_number}>
                    {account.account_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {account.account_number}
                  </option>
                ))}
              </select>
            </div>

            <div style={{
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '20px',
              backgroundColor: formData.agreeToTerms ? '#f0fdf4' : '#ffffff',
              borderRadius: '12px',
              border: `3px solid ${formData.agreeToTerms ? '#22c55e' : '#e2e8f0'}`,
              position: 'relative',
              zIndex: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease'
            }}>
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleInputChange}
                required
                style={{
                  width: '24px',
                  height: '24px',
                  accentColor: '#22c55e',
                  cursor: 'pointer',
                  marginTop: '2px',
                  flexShrink: 0,
                  transform: 'scale(1.2)',
                  border: '2px solid #d1d5db',
                  borderRadius: '4px'
                }}
              />
              <label
                style={{
                  fontSize: '14px',
                  color: '#374151',
                  cursor: 'pointer',
                  lineHeight: '1.5',
                  userSelect: 'none'
                }}
                onClick={() => handleInputChange({target: {name: 'agreeToTerms', type: 'checkbox', checked: !formData.agreeToTerms}})}
              >
                I agree to the Terms of Service and Privacy Policy <span style={{color: '#ef4444'}}>*</span>
                {formData.agreeToTerms && <span style={{ color: '#22c55e', marginLeft: '8px', fontSize: '16px', fontWeight: 'bold' }}>✓ Agreed</span>}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !applicationInfo}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: loading ? '#9ca3af' : '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Completing Enrollment...' : 'Complete Enrollment'}
            </button>
          </form>
        </>
      )}

      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: message.includes('Error') || message.includes('Invalid') ? '#fee2e2' : '#d1fae5',
          color: message.includes('Error') || message.includes('Invalid') ? '#dc2626' : '#059669',
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      {step === 'success' && (
        <div style={{
          marginTop: '1rem',
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: '#d1fae5',
          color: '#059669',
          textAlign: 'center'
        }}>
          Enrollment completed successfully! Redirecting to login...
        </div>
      )}
    </div>
  );
}
