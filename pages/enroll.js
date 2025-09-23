import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Enroll() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dob, setDob] = useState('');
  const [ssnLast4, setSsnLast4] = useState('');
  const [applicationId, setApplicationId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    try {
      const res = await axios.post('/api/users/verify-identity', { dob, ssnLast4 });
      setApplicationId(res.data.application.id);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    }
  };

  const handleEnroll = async () => {
    setError('');
    try {
      const res = await axios.post('/api/users/enroll', { applicationId, password });
      alert('Enrollment successful! You can now log in.');
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Enrollment failed');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
      {step === 1 && (
        <div>
          <h2>Verify Identity</h2>
          <input type="date" value={dob} onChange={e => setDob(e.target.value)} placeholder="Date of Birth" />
          <input type="text" value={ssnLast4} onChange={e => setSsnLast4(e.target.value)} placeholder="Last 4 of SSN" maxLength={4} />
          <button onClick={handleVerify}>Verify</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
      {step === 2 && (
        <div>
          <h2>Set Password</h2>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button onClick={handleEnroll}>Enroll</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
