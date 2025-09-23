// pages/enroll.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function EnrollPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = verify, 2 = enroll
  const [formData, setFormData] = useState({ dob: '', ssnLast4: '', password: '' });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Step 1: Verify identity (using applications table)
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${backendUrl}/api/users/verify-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dob: formData.dob, ssnLast4: formData.ssnLast4 })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setUserInfo(data.user); // expects: id, first_name, middle_name, last_name, email
      setStep(2);
      setFormData((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Enroll user (creates auth.user + profile)
  const handleEnroll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${backendUrl}/api/users/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: userInfo.id, // link to applications.id
          email: userInfo.email,
          password: formData.password,
          first_name: userInfo.first_name,
          middle_name: userInfo.middle_name || '',
          last_name: userInfo.last_name
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Enrollment failed');

      setMessage('Enrollment successful! Redirecting to sign-in...');
      setTimeout(() => router.push('/sign-in'), 2000);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid #ccc', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        {step === 1 && (
          <form onSubmit={handleVerify}>
            <h2>Verify Your Identity</h2>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              required
              placeholder="Date of Birth"
              style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
            />
            <input
              type="text"
              name="ssnLast4"
              value={formData.ssnLast4}
              onChange={handleChange}
              required
              maxLength={4}
              placeholder="Last 4 of SSN"
              style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
            />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', cursor: 'pointer' }}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        )}

        {step === 2 && userInfo && (
          <form onSubmit={handleEnroll}>
            <h2>Welcome, {`${userInfo.first_name} ${userInfo.middle_name || ''} ${userInfo.last_name}`.trim()}</h2>
            <p>Email: {userInfo.email}</p>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Set your password"
              style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
            />
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', cursor: 'pointer' }}>
              {loading ? 'Enrolling...' : 'Enroll'}
            </button>
          </form>
        )}

        {message && <p style={{ color: message.includes('successful') ? 'green' : 'red', marginTop: '1rem' }}>{message}</p>}
      </div>
    </div>
  );
}
