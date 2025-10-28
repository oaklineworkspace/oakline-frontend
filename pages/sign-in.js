import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data?.user) {
        router.push('/dashboard');
      }
    } catch (error) {
      setMessage(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '20px',
      padding: '3rem 2.5rem',
      maxWidth: '450px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    logo: {
      height: '60px',
      marginBottom: '1rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#64748b'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    label: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: '#374151'
    },
    input: {
      padding: '0.875rem',
      border: '2px solid #e2e8f0',
      borderRadius: '12px',
      fontSize: '1rem',
      transition: 'border-color 0.3s'
    },
    button: {
      padding: '1rem',
      backgroundColor: '#1e40af',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      marginTop: '1rem'
    },
    message: {
      padding: '1rem',
      borderRadius: '12px',
      marginBottom: '1rem',
      textAlign: 'center',
      fontSize: '0.9rem'
    },
    links: {
      marginTop: '2rem',
      textAlign: 'center',
      fontSize: '0.9rem',
      color: '#64748b'
    },
    link: {
      color: '#1e40af',
      textDecoration: 'none',
      fontWeight: '600'
    }
  };

  return (
    <>
      <Head>
        <title>Sign In - Oakline Bank</title>
      </Head>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Sign in to your account</p>
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('success') ? '#d1fae5' : '#fee2e2',
              color: message.includes('success') ? '#065f46' : '#991b1b'
            }}>
              {message}
            </div>
          )}

          <form onSubmit={handleSignIn} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={styles.links}>
            <p>Don't have an account? <Link href="/apply" style={styles.link}>Apply Now</Link></p>
            <p><Link href="/reset-password" style={styles.link}>Forgot Password?</Link></p>
          </div>
        </div>
      </div>
    </>
  );
}