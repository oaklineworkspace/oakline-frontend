import { useState } from 'react';

export default function EnrollPage() {
  const [step, setStep] = useState(1); // 1=request, 2=complete
  const [formData, setFormData] = useState({ email: '', last_name: '', ssn: '', password: '', token: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${backendUrl}/api/users/request-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, last_name: formData.last_name, ssn: formData.ssn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setMessage(data.message);
      setStep(2);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${backendUrl}/api/users/complete-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: formData.token, password: formData.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Completion failed');
      setMessage(data.message);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', border: '1px solid #ccc', borderRadius: '12px' }}>
        {step === 1 && (
          <form onSubmit={handleRequest}>
            <h2>Request Enrollment Link</h2>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="Email" />
            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last Name" />
            <input type="text" name="ssn" value={formData.ssn} onChange={handleChange} placeholder="Last 4 SSN" maxLength={4} />
            <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Enrollment Link'}</button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleComplete}>
            <h2>Complete Enrollment</h2>
            <input type="text" name="token" value={formData.token} onChange={handleChange} required placeholder="Enrollment Token" />
            <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="Set Password" />
            <button type="submit" disabled={loading}>{loading ? 'Completing...' : 'Complete Enrollment'}</button>
          </form>
        )}

        {message && <p style={{ color: message.includes('completed') ? 'green' : 'red' }}>{message}</p>}
      </div>
    </div>
  );
}
