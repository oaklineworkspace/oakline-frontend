
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function AdminResendEnrollment() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [applicationData, setApplicationData] = useState(null);

  const ADMIN_PASSWORD = 'Chrismorgan23$';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setApplicationData(null);

    try {
      const response = await fetch(`/api/applications?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (response.ok && data.length > 0) {
        setApplicationData(data[0]);
        setMessage('Application found. Click "Resend Enrollment Link" to send a new link.');
      } else {
        setError('No application found for this email address.');
      }
    } catch (err) {
      setError('Error searching for application. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEnrollment = async () => {
    if (!applicationData) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/resend-enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: applicationData.id,
          email: applicationData.email,
          firstName: applicationData.first_name,
          middleName: applicationData.middle_name,
          lastName: applicationData.last_name,
          country: applicationData.country
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(`✅ Enrollment link successfully sent to ${applicationData.email}`);
        setEmail('');
        setApplicationData(null);
      } else {
        setError(result.error || 'Failed to send enrollment link');
      }
    } catch (err) {
      setError('Error sending enrollment link. Please try again.');
      console.error('Resend error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ color: '#1e40af', marginBottom: '1.5rem', textAlign: 'center' }}>
            🔒 Admin Access
          </h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            {error && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: '6px',
                marginBottom: '1rem',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{ color: '#1e40af', margin: 0 }}>
            📧 Resend Enrollment Links
          </h1>
          <button
            onClick={() => setAuthenticated(false)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: '#374151', marginBottom: '1.5rem', fontSize: '20px' }}>
            Search by Email
          </h2>
          <form onSubmit={handleSearch}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151', fontWeight: '500' }}>
                User Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#9ca3af' : '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Searching...' : 'Search Application'}
            </button>
          </form>
        </div>

        {message && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#d1fae5',
            color: '#059669',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #059669'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #dc2626'
          }}>
            {error}
          </div>
        )}

        {applicationData && (
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ color: '#1e40af', marginBottom: '1.5rem', fontSize: '18px' }}>
              Application Details
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <strong style={{ color: '#6b7280' }}>Name:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {applicationData.first_name} {applicationData.middle_name || ''} {applicationData.last_name}
                </p>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Email:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {applicationData.email}
                </p>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Phone:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {applicationData.phone || 'N/A'}
                </p>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Country:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {applicationData.country || 'N/A'}
                </p>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Status:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {applicationData.application_status}
                </p>
              </div>
              <div>
                <strong style={{ color: '#6b7280' }}>Submitted:</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#374151' }}>
                  {new Date(applicationData.submitted_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleResendEnrollment}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: loading ? '#9ca3af' : '#1e40af',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 6px rgba(30, 64, 175, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#1e3a8a';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = '#1e40af';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Sending...' : '📧 Resend Enrollment Link'}
            </button>
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fffbeb',
          borderRadius: '8px',
          border: '1px solid #fbbf24'
        }}>
          <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
            ℹ️ <strong>Note:</strong> The enrollment link will be sent to the user's email address. 
            Make sure the SMTP settings are properly configured.
          </p>
        </div>
      </div>
    </div>
  );
}
