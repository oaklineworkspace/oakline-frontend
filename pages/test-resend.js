
import { useState } from 'react';

export default function TestResend() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendTestEmail = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test-resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Test Resend Email</h1>
      <p>Click the button below to send a test email via Resend API</p>
      
      <button 
        onClick={sendTestEmail}
        disabled={loading}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: '#0066cc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '20px'
        }}
      >
        {loading ? 'Sending...' : 'Send Test Email'}
      </button>

      {result && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: result.success ? '#d1fae5' : '#fee2e2',
          borderRadius: '8px'
        }}>
          <h3>{result.success ? '✅ Success!' : '❌ Error'}</h3>
          <pre style={{ 
            overflow: 'auto', 
            fontSize: '12px',
            whiteSpace: 'pre-wrap' 
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
