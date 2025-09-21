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
        // 1️⃣ Query accounts table by account_number
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('id, account_number, balance, account_type, application_id')
          .eq('account_number', accountNumber)
          .single();

        if (accountError || !accountData) {
          setAccountInfo(null);
          return;
        }

        // 2️⃣ Fetch application to verify SSN
        const { data: applicationData, error: appError } = await supabase
          .from('applications')
          .select('id, ssn')
          .eq('id', accountData.application_id)
          .single();

        if (appError || !applicationData || applicationData.ssn.slice(-4) !== ssn) {
          setAccountInfo(null);
          return;
        }

        // ✅ Account and SSN match
        setAccountInfo({ ...accountData, applicationId: applicationData.id });
      } catch (err) {
        console.error(err);
        setAccountInfo(null);
      }
    };

    const debounce = setTimeout(verifyAccount, 500); // debounce 500ms
    return () => clearTimeout(debounce);
  }, [accountNumber, ssn]);

  // ---------- Password Strength ----------
  useEffect(() => {
    if (!password) return setPasswordStrength('');
    if (password.length < 8) setPasswordStrength('Weak');
    else if (password.match(/(?=.*[0-9])(?=.*[!@#$%^&*])/)) setPasswordStrength('Strong');
    else setPasswordStrength('Medium');
  }, [password]);

  // ---------- Handle Enrollment ----------
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
        .eq('account_id', accountInfo.id)
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
          email,
        }]);

      if (profileError) {
        setMessage('Error creating profile: ' + profileError.message);
        setLoading(false);
        return;
      }

      setMessage('✅ Enrollment successful! Check your email to verify your account.');
      setAccountNumber(''); setSSN(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setAccountInfo(null);
      setLoading(false);

      // Optional redirect
      // router.push('/login');
    } catch (err) {
      console.error(err);
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Enroll - Oakline Bank</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Enroll for Online Access</h1>

          {message && (
            <div className={`p-3 mb-4 rounded-md text-sm border ${message.includes('✅') ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleEnroll} className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Account Number *</label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="123456789"
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">SSN (Last 4 digits) *</label>
              <input
                type="password"
                value={ssn}
                onChange={e => setSSN(e.target.value)}
                placeholder="1234"
                maxLength={4}
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            {accountInfo && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800">
                Account Verified: {accountInfo.account_type.toUpperCase()} | Balance: ${accountInfo.balance.toFixed(2)}
              </div>
            )}

            <div>
              <label className="block font-semibold mb-1">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Password *</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="********"
                className="w-full p-3 border rounded-md"
                required
              />
              {password && (
                <p className={`mt-1 text-sm ${passwordStrength === 'Weak' ? 'text-red-600' : passwordStrength === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                  Strength: {passwordStrength}
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold mb-1">Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="********"
                className="w-full p-3 border rounded-md"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 bg-blue-800 text-white rounded-md mt-2 hover:bg-blue-900 transition"
            >
              {loading ? 'Processing...' : 'Enroll'}
            </button>
          </form>

          <p className="mt-4 text-sm text-center">
            Already have an account? <Link href="/login" className="text-blue-600 underline">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
