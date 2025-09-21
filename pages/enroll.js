// pages/enroll.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';

export default function Enroll() {
  const router = useRouter();

  // Step State
  const [step, setStep] = useState(1);

  // Account Verification
  const [accountNumber, setAccountNumber] = useState('');
  const [ssn, setSSN] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);

  // Login Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');

  // Feedback
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // ---------------- Real-Time Account Verification ----------------
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
    const debounce = setTimeout(verifyAccount, 500);
    return () => clearTimeout(debounce);
  }, [accountNumber, ssn]);

  // ---------------- Password Strength ----------------
  useEffect(() => {
    if (!password) return setPasswordStrength('');
    if (password.length < 8) setPasswordStrength('Weak');
    else if (password.match(/(?=.*[0-9])(?=.*[!@#$%^&*])/)) setPasswordStrength('Strong');
    else setPasswordStrength('Medium');
  }, [password]);

  // ---------------- Step Navigation ----------------
  const nextStep = () => {
    if (step === 1 && !accountInfo) {
      setMessage('Please verify your account first.');
      return;
    }
    if (step === 2) {
      if (!email || !password || !confirmPassword) {
        setMessage('All fields are required.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
    }
    setMessage('');
    setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1);

  // ---------------- Handle Enrollment ----------------
  const handleEnroll = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Check existing profile
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

      // Sign up auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setMessage(authError.message);
        setLoading(false);
        return;
      }

      // Create profile linking to account
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
      setLoading(false);
      setStep(1);
      setAccountNumber(''); setSSN(''); setEmail(''); setPassword(''); setConfirmPassword('');
      setAccountInfo(null);
    } catch (err) {
      console.error(err);
      setMessage('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // ---------------- Step Indicators ----------------
  const steps = ['Verify Account', 'Set Credentials', 'Review & Submit'];

  return (
    <>
      <Head>
        <title>Enroll - Oakline Bank</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Enroll for Online Access</h1>

          {/* Step Indicator */}
          <div className="flex justify-between mb-6">
            {steps.map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <div className={`w-8 h-8 mx-auto rounded-full text-white font-bold flex items-center justify-center ${i + 1 <= step ? 'bg-blue-800' : 'bg-gray-300'}`}>
                  {i + 1}
                </div>
                <p className={`mt-2 text-xs ${i + 1 <= step ? 'text-blue-800' : 'text-gray-400'}`}>{s}</p>
              </div>
            ))}
          </div>

          {message && (
            <div className={`p-3 mb-4 rounded-md text-sm border ${message.includes('✅') ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'}`}>
              {message}
            </div>
          )}

          {/* Step 1: Account Verification */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Account Number *</label>
                <input type="text" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="123456789" className="w-full p-3 border rounded-md" />
              </div>
              <div>
                <label className="block font-semibold mb-1">SSN (Last 4 digits) *</label>
                <input type="password" value={ssn} onChange={e => setSSN(e.target.value)} placeholder="1234" maxLength={4} className="w-full p-3 border rounded-md" />
              </div>
              {accountInfo && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800">
                  Account Verified: {accountInfo.account_type.toUpperCase()} | Balance: ${accountInfo.balance.toFixed(2)}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Set Credentials */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 border rounded-md" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="********" className="w-full p-3 border rounded-md" />
                {password && (
                  <p className={`mt-1 text-sm ${passwordStrength === 'Weak' ? 'text-red-600' : passwordStrength === 'Medium' ? 'text-yellow-600' : 'text-green-600'}`}>
                    Strength: {passwordStrength}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1">Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="********" className="w-full p-3 border rounded-md" />
              </div>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold mb-2">Review Your Info</h2>
              <p><strong>Account:</strong> {accountInfo.account_type.toUpperCase()} ****{accountNumber.slice(-4)}</p>
              <p><strong>Balance:</strong> ${accountInfo.balance.toFixed(2)}</p>
              <p><strong>Email:</strong> {email}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            {step > 1 && <button onClick={prevStep} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">Back</button>}
            {step < 3 && <button onClick={nextStep} className="ml-auto px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900">Next</button>}
            {step === 3 && <button onClick={handleEnroll} disabled={loading} className="ml-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">{loading ? 'Processing...' : 'Enroll'}</button>}
          </div>

          <p className="mt-4 text-sm text-center">
            Already have an account? <Link href="/login" className="text-blue-600 underline">Login</Link>
          </p>
        </div>
      </div>
    </>
  );
}
