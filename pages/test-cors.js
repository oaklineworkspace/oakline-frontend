// pages/test-cors.js
import { useEffect, useState } from 'react';

export default function TestCORS() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://oakline-bank.onrender.com';

    fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Origin': window.location.origin
      }
    })
      .then(res => res.json())
      .then(data => setResponse(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Render Backend CORS Test</h1>
      <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL || 'https://oakline-bank.onrender.com'}</p>

      {response && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#d1fae5', borderRadius: '8px' }}>
          <h3>Success:</h3>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', borderRadius: '8px' }}>
          <h3>Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {!response && !error && <p>Loading...</p>}
    </div>
  );
}
