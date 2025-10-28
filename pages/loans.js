
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Loans() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main loan application page
    router.push('/loan/apply');
  }, [router]);
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '20px',
          animation: 'spin 1s linear infinite'
        }}>⏳</div>
        <p style={{ fontSize: '18px', color: '#64748b' }}>Redirecting to loan application...</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
