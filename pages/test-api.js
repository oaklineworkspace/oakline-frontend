import { useEffect, useState } from 'react';

export default function TestAPI() {
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
    fetch(`${API_URL}/api/accounts`)
      .then(res => res.json())
      .then(data => setResponse(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>API Test</h1>
      <p><strong>Render Backend URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
      <p><strong>Response:</strong> {JSON.stringify(response, null, 2)}</p>
      <p><strong>Error:</strong> {error}</p>
    </div>
  );
}
