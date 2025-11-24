import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import styles from '../styles/VerificationGuard.module.css';

export default function VerificationGuard({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('requires_verification, verification_reason')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error checking verification status:', error);
        setLoading(false);
        return;
      }

      if (data.requires_verification) {
        // Don't redirect if already on verification page
        if (!router.pathname.includes('/verify-identity')) {
          setRequiresVerification(true);
          setVerificationReason(data.verification_reason || '');
          router.push('/verify-identity');
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Verification check error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Checking account status...</p>
      </div>
    );
  }

  if (requiresVerification && !router.pathname.includes('/verify-identity')) {
    return (
      <div className={styles.blocked}>
        <div className={styles.blockedContent}>
          <div className={styles.icon}>🔒</div>
          <h2>Verification Required</h2>
          <p>{verificationReason || 'Your account requires identity verification.'}</p>
          <p className={styles.subtext}>Redirecting to verification page...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
