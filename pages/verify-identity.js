import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import SelfieVerification from '../components/SelfieVerification';
import styles from '../styles/VerifyIdentity.module.css';

export default function VerifyIdentity() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState(null);
  const [verificationType, setVerificationType] = useState('video');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    try {
      // Check if user requires verification
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('requires_verification, verification_reason, is_verified')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile.requires_verification) {
        // User doesn't need verification, redirect to dashboard
        router.push('/dashboard');
        return;
      }

      // Get latest verification request
      const { data: verification, error: verificationError } = await supabase
        .from('selfie_verifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (verificationError && verificationError.code !== 'PGRST116') {
        throw verificationError;
      }

      setVerificationData({
        reason: profile.verification_reason || 'Your account requires identity verification',
        status: verification?.status || 'pending',
        verificationType: verification?.verification_type || 'selfie'
      });
      
      setVerificationType(verification?.verification_type || 'selfie');
      setSubmitted(verification?.status === 'submitted' || verification?.status === 'under_review');
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching verification status:', error);
      setLoading(false);
    }
  };

  const handleVerificationComplete = async (data) => {
    setSubmitted(true);
    // Show success message and reload status
    await fetchVerificationStatus();
  };

  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading verification status...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.title}>Verification Submitted</h2>
          <p className={styles.message}>
            Thank you for submitting your verification. Our team will review your submission within 24-48 hours.
            You'll receive an email notification once your verification has been reviewed.
          </p>
          <p className={styles.note}>
            Your account access will be restored once your verification is approved.
          </p>
          <button onClick={handleReturnToDashboard} className={styles.dashboardButton}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>Identity Verification Required</h1>
          <p className={styles.headerSubtitle}>
            {verificationData?.reason || 'To continue using your account, we need to verify your identity.'}
          </p>
        </div>
      </div>

      <SelfieVerification
        verificationType={verificationType}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
}
