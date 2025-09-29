// pages/test-api.js
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Your Supabase client

const endpoints = [
  { path: '/accounts', protected: true },
  { path: '/admin', protected: true },
  { path: '/applications', protected: true },
  { path: '/auth', protected: false },
  { path: '/cards', protected: true },
  { path: '/options', protected: false },
  { path: '/stripe', protected: true },
  { path: '/users', protected: true }
];

export default function TestAPI() {
  const [results, setResults] = useState({});
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL; // e.g., https://oakline-bank.onrender.com/api

  useEffect(() => {
    const fetchEndpoint = async ({ path, protected: isProtected }) => {
      try {
        const headers = {};

        // Include Supabase token if protected
        if (isProtected) {
          const session = supabase.auth.session();
          if (!session?.access_token) {
            setResults(prev => ({
              ...prev,
              [path]: { error: 'No Supabase session token available' }
            }));
            return;
          }
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`${API_URL}${path}`, { headers });
        const data = await res.json();

        setResults(prev => ({ ...prev, [path]: { data, status: res.status } }));
      } catch (err) {
        setResults(prev => ({ ...prev, [path]: { error: err.message } }));
      }
    };

    endpoints.forEach(fetchEndpoint);
  }, [API_URL]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>API Test Dashboard</h1>
      <p><strong>Backend URL:</strong> {API_URL}</p>

      {endpoints.map(({ path }) => (
        <div key={path} style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem',
          background: '#f9f9f9'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>{path}</h3>
          {results[path] ? (
            results[path].error ? (
              <p style={{ color: 'red' }}>Error: {results[path].error}</p>
            ) : (
              <>
                <p>Status: {results[path].status}</p>
                <pre style={{
                  maxHeight: '200px',
                  overflowY: 'scroll',
                  background: '#e0e0e0',
                  padding: '0.5rem',
                  borderRadius: '4px'
                }}>
                  {JSON.stringify(results[path].data, null, 2)}
                </pre>
              </>
            )
          ) : (
            <p>Loading...</p>
          )}
        </div>
      ))}
    </div>
  );
}
