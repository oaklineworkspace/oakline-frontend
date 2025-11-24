
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingVerification, setCheckingVerification] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const checkVerificationStatus = async () => {
      // Skip verification check if on verification page itself
      if (router.pathname === '/verify-identity') {
        setCheckingVerification(false);
        return;
      }

      if (user?.id) {
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('requires_verification')
            .eq('id', user.id)
            .single();

          if (!error && profile?.requires_verification) {
            router.push('/verify-identity');
          } else {
            setCheckingVerification(false);
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
          setCheckingVerification(false);
        }
      } else {
        setCheckingVerification(false);
      }
    };

    if (!loading && user) {
      checkVerificationStatus();
    }
  }, [user, loading, router]);

  if (loading || checkingVerification) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 50%, #1A3E6F 100%)'
      }}>
        <div style={{
          color: 'white',
          fontSize: '1.2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          {checkingVerification ? 'Verifying account status...' : 'Loading your secure banking session...'}
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will redirect
  }

  return children;
};

export default ProtectedRoute;
