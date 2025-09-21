// pages/enroll.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Enroll() {
  const router = useRouter();

  const [accountNumber, setAccountNumber] = useState('');
  const [ssn, setSSN] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [accountInfo, setAccountInfo] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Real-time account verification
  useEffect(() => {
    const verifyAccount = async () => {
      if (accountNumber.length < 6 || ssn.length !== 4) {
        setAccountInfo(null);
        return;
      }
      try {
        const { data: applicationData, error: appError } = await supabase
          .from('applications')
          .select(`
            id,
            first_name,
            last_name,
            email,
            ssn,
            accounts(id, account_number, balance, account_type)
          `)
          .eq('ssn', ssn)
          .single();

        if (appError || !applicationData) {
          setAccountInfo(null);
          return;
        }

        const accountData = applicationData.accounts.find(a => a.account_number === accountNumber);
        if (!accountData) {
          setAccountInfo(null);
          return;
        }

        setAccountInfo({ ...accountData, applicationId: applicationData.id });
      } catch (err) {
        console.error(err);
        setAccountInfo(null);
      }
    };

    const debounce = setTimeout(verifyAccount, 500);
    return () => clearTimeout(debounce);
  }, [accountNumber, ssn]);

  // Password strength
  useEffect(() => {
    if (!password) return setPasswordStrength('');
    if (password.length < 8) setPasswordStrength('Weak');
    else if (password.match(/(?=.*[0-9])(?=.*[!@#$%^&*])/)) setPasswordStrength('Strong');
    else setPasswordStrength('Medium');
  }, [password]);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!accountNumber || !ssn || !email || !password || !confirmPassword) {
      setMessage('All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    if (!accountInfo) {
      setMessage('Account not found or SSN incorrect.');
      return;
    }

    setLoading(true);

    try {
      // Check if user already enrolled
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', accountInfo.id)
        .single();

      if (existingUser) {
        setMessage('This account already has online access. Please log in.');
        setLoading(false);
        return;
      }

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        setMessage(authError.message);
        setLoading(false);
        return;
      }

      // Link profile to account
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          account_id: accountInfo.id,
          email
        }]);

      if (profileError) {
        setMessage('Error creating profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      setMessage('✅ Enrollment successful! Check your email to verify your account.');
      setAccountNumber(''); setSSN(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Inline Styles
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '20px'
  };

  const cardStyle = {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  };

  const titleStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1e3a8a',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    border: 'none'
  };

  const buttonHoverStyle = {
    backgroundColor: '#1e40af'
  };

  const messageStyle = (success) => ({
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '8px',
    fontSize: '14px',
    border: `1px solid ${success ? '#4ade80' : '#f87171'}`,
    backgroundColor: success ? '#d1fae5' : '#fee2e2',
    color: success ? '#065f46' : '#b91c1c'
  });

  const verifiedStyle = {
    backgroundColor: '#e0f2fe',
    border: '1px solid #bae6fd',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0369a1',
    marginBottom: '15px'
  };

  const linkStyle = {
    color: '#1d4ed8',
    textDecoration: 'underline'
  };

  return (
    <>
      <Head>
        <title>Enroll - Oakline Bank</title>
      </Head>
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={titleStyle}>Enroll for Online Access</h1>

          {message && (
            <div style={messageStyle(message.includes('✅'))}>
              {message}
            </div>
          )}

          <form onSubmit={handleEnroll}>
            <input
              type="text"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              placeholder="Account Number"
              style={inputStyle}
              required
            />

            <input
              type="password"
              value={ssn}
              onChange={e => setSSN(e.target.value)}
              placeholder="SSN (Last 4 digits)"
              maxLength={4}
              style={inputStyle}
              required
            />

            {accountInfo && (
              <div style={verifiedStyle}>
                Account Verified: {accountInfo.account_type.toUpperCase()} | Balance: ${accountInfo.balance.toFixed(2)}
              </div>
            )}

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              style={inputStyle}
              required
            />

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={inputStyle}
              required
            />
            {password && (
              <p style={{ fontSize: '14px', color: passwordStrength === 'Weak' ? '#b91c1c' : passwordStrength === 'Medium' ? '#f59e0b' : '#16a34a', marginBottom: '10px' }}>
                Strength: {passwordStrength}
              </p>
            )}

            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              style={inputStyle}
              required
            />

            <button type="submit" style={{ ...buttonStyle, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}>
              {loading ? 'Processing...' : 'Enroll'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
            Already have an account? <Link href="/login" style={linkStyle}>Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
