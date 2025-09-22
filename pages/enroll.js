// pages/enroll.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function EnrollPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    dob: '',
    ssnLast4: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/users/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Enrollment failed');

      setMessage('Enrollment successful! Redirecting to sign-in...');
      setFormData({ email: '', password: '', dob: '', ssnLast4: '' });

      setTimeout(() => router.push('/sign-in'), 2000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 50%, #1A3E6F 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        color: 'white',
        padding: '1rem 2rem',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255,255,255,0.1)'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'white' }}>
          <div style={{ fontSize: '2rem' }}>🏦</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>Oakline Bank</span>
            <span style={{ fontSize: '0.9rem', color: '#FFC857', fontWeight: '500' }}>Secure Banking Enrollment</span>
          </div>
        </Link>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        minHeight: 'calc(100vh - 100px)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '450px',
          backgroundColor: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          padding: '2.5rem',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#1A3E6F',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
              boxShadow: '0 8px 32px rgba(26,62,111,0.3)'
            }}>
              <span style={{ fontSize: '2rem', color: 'white' }}>🏦</span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '700', color: '#1A3E6F', marginBottom: '0.5rem' }}>Enroll for Online Access</h1>
            <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>Enter your email, password, and verify your identity</p>
          </div>

          <form onSubmit={handleEnroll} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required style={{ padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }} />

            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Password" value={formData.password} onChange={handleChange} required style={{ width: '100%', padding: '0.875rem 3rem 0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>{showPassword ? '🙈' : '👁️'}</button>
            </div>

            <input type="date" name="dob" placeholder="Date of Birth" value={formData.dob} onChange={handleChange} style={{ padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }} />
            <input type="text" name="ssnLast4" placeholder="Last 4 digits of SSN" value={formData.ssnLast4} onChange={handleChange} maxLength={4} style={{ padding: '0.875rem 1rem', borderRadius: '10px', border: '2px solid #e2e8f0' }} />

            <button type="submit" disabled={loading} style={{ padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: 'white', fontWeight: '700', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Enrolling...' : 'Enroll'}
            </button>
          </form>

          {message && <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '10px', backgroundColor: message.includes('successful') ? '#d1fae5' : '#fee2e2', color: message.includes('successful') ? '#065f46' : '#dc2626' }}>{message}</div>}

          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
            Already enrolled? <Link href="/sign-in" style={{ color: '#1A3E6F', fontWeight: '600' }}>Sign In</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
