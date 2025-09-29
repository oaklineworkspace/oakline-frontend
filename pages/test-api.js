// pages/test-api.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Make sure this points to your Supabase client

const endpoints = [
  '/api/account-management',
  '/api/account-types',
  '/api/applications',
  '/api/apply-card',
  '/api/card-actions',
  '/api/card-transactions',
  '/api/cards',
  '/api/complete-enrollment-magic-link',
  '/api/complete-enrollment',
  '/api/create-auth-user',
  '/api/debug-enrollment-link',
  '/api/debug-enrollment',
  '/api/get-user-accounts',
  '/api/get-user-cards',
  '/api/process-transfer',
  '/api/resend-enrollment',
  '/api/send-welcome-email',
  '/api/user-cards',
  '/api/verify-magic-link-enrollment',
  '/api/zelle-contacts',
  '/api/zelle-transactions',
  '/api/admin',
  '/api/stripe'
];

export default function TestAPI() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const fetchEndpoints = async () => {
      // Get the current session from Supabase
      const session = supabase.auth.session();
      const token = session?.access_token;

      const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

      endpoints.forEach(async (endpoint) => {
        try {
          const res = await fetch(`${API_URL}${endpoint}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          const data = await res.json();
          setResults(prev => ({ ...prev, [endpoint]: { data, status: res.status } }));
        } catch (err) {
          setResults(prev => ({ ...prev, [endpoint]: { error: err.message } }));
        }
      });
    };

    fetchEndpoints();
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
