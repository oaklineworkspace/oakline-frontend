import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Unauthorized() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/sign-in');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <span style={styles.icon}>🚫</span>
        </div>
        <h1 style={styles.title}>Access Denied</h1>
        <p style={styles.message}>
          You don't have permission to access this page.
        </p>
        <p style={styles.submessage}>
          This page requires admin privileges. If you believe you should have access, 
          please contact your system administrator.
        </p>
        <div style={styles.actions}>
          <Link href="/" style={styles.homeButton}>
            🏠 Go to Homepage
          </Link>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '3rem',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    border: '1px solid #334155'
  },
  iconContainer: {
    marginBottom: '1.5rem'
  },
  icon: {
    fontSize: '4rem'
  },
  title: {
    color: '#ef4444',
    fontSize: '2rem',
    marginBottom: '1rem',
    fontWeight: 'bold'
  },
  message: {
    color: '#cbd5e0',
    fontSize: '1.1rem',
    marginBottom: '1rem',
    lineHeight: '1.6'
  },
  submessage: {
    color: '#94a3b8',
    fontSize: '0.95rem',
    marginBottom: '2rem',
    lineHeight: '1.5'
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  homeButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: 'bold',
    display: 'inline-block',
    transition: 'background-color 0.2s'
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  }
};
