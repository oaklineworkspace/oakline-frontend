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

  // ---------- Real-Time Account Verification ----------
  useEffect(() => {
    const verifyAccount = async () => {
      if (accountNumber.length < 6 || ssn.length !== 4) {
        setAccountInfo(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('id, account_type, balance')
          .eq('account_number', accountNumber)
          .eq('ssn', ssn)
          .single();

        if (data && !error) setAccountInfo(data);
        else setAccountInfo(null);
      } catch (err) {
        console.error(err);
        setAccountInfo(null);
      }
    };

    const delayDebounce = setTimeout(verifyAccount, 500); // Debounce 500ms
    return () => clearTimeout(delayDebounce);
  }, [accountNumber, ssn]);

  // ---------- Password Strength ----------
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
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_id', accountInfo.id)
        .single();

      if (existingUser) {
        setMessage('This account already has online access. Please log in.');
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      if (authError) {
        setMessage(authError.message);
        setLoading(false);
        return;
      }

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
      // router.push('/login');
    } catch (err) {
      console.error(err);
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // ---------- Inline Styles ----------
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f3f4f6',
      padding: '1rem'
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '2rem',
      maxWidth: '450px',
      width: '100%',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
    },
    title: {
      fontSize: '1.8rem',
      fontWeight: '700',
      marginBottom: '1.5rem',
      textAlign: 'center'
    },
    input: {
      width: '100%',
      padding: '0.75rem 1rem',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      marginBottom: '0.75rem',
      fontSize: '1rem'
    },
    label: {
      fontWeight: '600',
      marginBottom: '0.25rem',
      display: 'block'
    },
    button: {
      width: '100%',
      padding: '0.75rem',
      borderRadius: '10px',
      border: 'none',
      backgroundColor: '#1e40af',
      color: '#fff',
      fontWeight: '600',
      fontSize: '1rem',
      cursor: 'pointer'
    },
    messageSuccess: {
      backgroundColor: '#d1fae5',
      border: '1px solid #10b981',
      color: '#065f46',
      padding: '0.75rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontSize: '0.9rem'
    },
    messageError: {
      backgroundColor: '#fee2e2',
      border: '1px solid #ef4444',
      color: '#991b1b',
      padding: '0.75rem',
      borderRadius: '8px',
      marginBottom: '1rem',
      fontSize: '0.9rem'
    },
    infoBox: {
      backgroundColor: '#e0f2fe',
      border: '1px solid #60a5fa',
      color: '#1e3a8a',
      padding: '0.75rem',
      borderRadius: '8px',
      marginBottom: '0.75rem',
      fontSize: '0.9rem'
    },
    passwordStrength: (strength) => ({
      color: strength === 'Weak' ? '#dc2626' : strength === 'Medium' ? '#ca8a04' : '#16a34a',
      fontSize: '0.85rem',
      marginBottom: '0.75rem'
    }),
    footerText: {
      fontSize: '0.875rem',
      textAlign: 'center',
      marginTop: '1rem'
    },
    footerLink: {
      color: '#1e40af',
      textDecoration: 'underline',
      cursor: 'pointer'
    }
  };

  return (
    <>
      <Head>
        <title>Enroll - Oakline Bank</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Enroll for Online Access</h1>

          {message && (
            <div style={message.includes('✅') ? styles.messageSuccess : styles.messageError}>
              {message}
            </div>
          )}

          <form onSubmit={handleEnroll}>
            <div>
              <label style={styles.label}>Account Number *</label>
              <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="123456789" style={styles.input} required />
            </div>

            <div>
              <label style={styles.label}>SSN (Last 4 digits) *</label>
              <input type="password" value={ssn} onChange={e => setSSN(e.target.value)} placeholder="1234" maxLength={4} style={styles.input} required />
            </div>

            {accountInfo && (
              <div style={styles.infoBox}>
                Account Verified: {accountInfo.account_type.toUpperCase()} | Balance: ${accountInfo.balance.toFixed(2)}
              </div>
            )}

            <div>
              <label style={styles.label}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={styles.input} required />
            </div>

            <div>
              <label style={styles.label}>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" style={styles.input} required />
              {password && <p style={styles.passwordStrength(passwordStrength)}>Strength: {passwordStrength}</p>}
            </div>

            <div>
              <label style={styles.label}>Confirm Password *</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="********" style={styles.input} required />
            </div>

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Processing...' : 'Enroll'}
            </button>
          </form>

          <p style={styles.footerText}>
            Already have an account? <Link href="/login" style={styles.footerLink}>Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
