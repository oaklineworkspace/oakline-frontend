import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { logAuthActivity, ActivityActions, logLoginActivity } from '../lib/activityLogger';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationReason, setVerificationReason] = useState(null);
  const [sessionTimeout, setSessionTimeout] = useState(30); // Default 30 minutes
  const router = useRouter();
  const sessionTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Auto-logout on inactivity
  const handleSessionTimeout = async () => {
    console.log('Session expired due to inactivity');
    await signOut();
  };

  const resetSessionTimeout = () => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }

    lastActivityRef.current = Date.now();

    if (user) {
      const timeoutMs = sessionTimeout * 60 * 1000;
      sessionTimeoutRef.current = setTimeout(handleSessionTimeout, timeoutMs);
    }
  };

  // Fetch user's session timeout preference
  useEffect(() => {
    if (!user?.id) return;

    const fetchSessionTimeout = async () => {
      const { data } = await supabase
        .from('user_security_settings')
        .select('session_timeout')
        .eq('user_id', user.id)
        .single();

      if (data?.session_timeout) {
        setSessionTimeout(data.session_timeout);
      }
    };

    fetchSessionTimeout();
  }, [user?.id]);

  // Track user activity and reset timeout
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttledReset = (() => {
      let timeoutId;
      return () => {
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            resetSessionTimeout();
            timeoutId = null;
          }, 1000);
        }
      };
    })();

    events.forEach(event => {
      document.addEventListener(event, throttledReset, true);
    });

    resetSessionTimeout();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledReset, true);
      });
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [user, sessionTimeout]);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Don't auto-redirect if user is in enrollment flow or on specific pages
          const noRedirectPaths = ['/enroll', '/apply', '/sign-in', '/login', '/reset-password'];
          const shouldNotRedirect = noRedirectPaths.some(path => router.pathname.includes(path));

          // Check if user has enrollment metadata (magic link enrollment)
          const hasEnrollmentMetadata = session?.user?.user_metadata?.application_id;

          // Check URL params for enrollment indicators
          const urlParams = new URLSearchParams(window.location.search);
          const isEnrollmentFlow = urlParams.get('type') === 'magiclink' || urlParams.has('application_id') || hasEnrollmentMetadata;

          console.log('Auth redirect check:', {
            shouldNotRedirect,
            hasEnrollmentMetadata,
            isEnrollmentFlow,
            pathname: router.pathname
          });

          if (!shouldNotRedirect && !isEnrollmentFlow) {
            window.location.href = 'https://theoaklinebank.com/dashboard';
          }
        } else if (event === 'SIGNED_OUT') {
          router.push('/sign-in');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Real-time account status detection - sign out user if their account is blocked
  useEffect(() => {
    if (!user?.id) return;

    const checkAccountStatus = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession?.access_token) {
          return;
        }

        const response = await fetch('/api/check-account-status', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({ userId: user.id })
        });

        if (response.ok) {
          const accountStatus = await response.json();
          
          if (accountStatus?.isBlocked) {
            // Check if it's a verification requirement (show banner, don't sign out or redirect)
            if (accountStatus.blockingType === 'verification_required') {
              console.log('Verification required, showing notification...', accountStatus.verification_reason);
              setVerificationRequired(true);
              setVerificationReason(accountStatus.verification_reason || null);
            } else {
              // For other blocks (banned, suspended, closed), sign out
              setVerificationRequired(false);
              setVerificationReason(null);
              console.log('Account is blocked, signing out...', accountStatus.blockingType);
              
              await supabase.auth.signOut();
              
              const params = new URLSearchParams({
                blocked: accountStatus.blockingType,
                reason: accountStatus.ban_reason || accountStatus.locked_reason || ''
              });
              
              // Stay on current login/sign-in page instead of redirecting
              const currentPage = router.pathname.includes('/login') ? '/login' : '/sign-in';
              router.push(`${currentPage}?${params.toString()}`);
            }
          } else {
            setVerificationRequired(false);
            setVerificationReason(null);
          }
        }
      } catch (error) {
        console.error('Account status check error:', error);
      }
    };

    checkAccountStatus();
    const statusCheckInterval = setInterval(checkAccountStatus, 60000);

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        async (payload) => {
          const statusChanged = 
            (payload.new.is_banned === true && payload.old.is_banned === false) ||
            (payload.new.status !== payload.old.status && 
             ['suspended', 'closed'].includes(payload.new.status));

          const verificationChanged = 
            (payload.new.requires_verification === true && payload.old.requires_verification === false);

          if (statusChanged || verificationChanged) {
            console.log('Account status or verification requirement changed, checking...');
            await checkAccountStatus();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(statusCheckInterval);
      supabase.removeChannel(channel);
    };
  }, [user?.id, router]);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is banned
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_banned, ban_reason')
          .eq('id', data.user.id)
          .single();

        if (profile?.is_banned) {
          // Sign out the banned user from all sessions
          await supabase.auth.admin.signOut(data.user.id);
          
          // Also sign out from current session
          await supabase.auth.signOut();

          // Fetch bank details for contact information
          const bankDetailsResponse = await fetch('/api/bank-details');
          const bankData = await bankDetailsResponse.json();

          // Log the banned login attempt
          await logAuthActivity(ActivityActions.LOGIN_FAILED, {
            email,
            userId: data.user.id,
            reason: 'Account banned - ' + (profile.ban_reason || 'Security reasons')
          });

          return {
            data: null,
            error: {
              message: 'ACCOUNT_BANNED',
              ban_reason: profile.ban_reason || 'Account suspended for security reasons',
              bank_details: bankData.bankDetails
            }
          };
        }
      }

      return { data, error: null };
    } catch (error) {
      // Log login failure with specific error details
      await logAuthActivity(ActivityActions.LOGIN_FAILED, {
        email,
        reason: error.message
      });
      return { data: null, error };
    }
  };

  const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    });
    return { data, error };
  };

  const signOut = async () => {
    try {
      // Log logout activity before signing out
      await logAuthActivity(ActivityActions.LOGOUT, {
        email: user?.email
      });

      const { error } = await supabase.auth.signOut();
      if (!error) {
        setUser(null);
        setSession(null);
        router.push('/sign-in');
      }
      return { error };
    } catch (error) {
      console.error('Error signing out:', error);
      // Optionally log the error if needed
      await logAuthActivity(ActivityActions.LOGOUT_ERROR, {
        email: user?.email,
        error: error.message
      });
      return { error };
    }
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (!error) {
      await logAuthActivity(ActivityActions.PASSWORD_RESET_REQUESTED, {
        email
      });
    }

    return { data, error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    verificationRequired,
    verificationReason,
    sessionTimeout,
    lastActivity: lastActivityRef.current,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};