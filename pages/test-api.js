// pages/test-api.js
import { useEffect, useState } from 'react';

const endpoints = [
  '/api/accounts',
  '/api/admin',
  '/api/applications',
  '/api/auth',
  '/api/cards',
  '/api/options',
  '/api/stripe',
  '/api/users'
];

export default function TestAPI() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

    endpoints.forEach(async (endpoint) => {
      try {
        const res = await fetch(`${API_URL}${endpoint}`);
        const data = await res.json();
        setResults(prev => ({ ...prev, [endpoint]: { data, status: res.status } }));
      } catch (err) {
        setResults(prev => ({ ...prev, [endpoint]: { error: err.message } }));
      }
    });
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>API Test Dashboard</h1>
      <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_BACKEND_URL}</p>

      {endpoints.map(endpoint => (
        <div key={endpoint} style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          background: '#f9f9f9'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>{endpoint}</h3>
          {results[endpoint] ? (
            results[endpoint].error ? (
              <p style={{ color: 'red' }}>Error: {results[endpoint].error}</p>
            ) : (
              <pre style={{
                maxHeight: '200px',
                overflowY: 'scroll',
                background: '#e0e0e0',
                padding: '0.5rem',
                borderRadius: '4px'
              }}>
                {JSON.stringify(results[endpoint].data, null, 2)}
              </pre>
            )
          ) : (
            <p>Loading...</p>
          )}
        </div>
      ))}
    </div>
  );
}
