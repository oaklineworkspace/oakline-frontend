import { createContext, useContext, useEffect, useState } from 'react';
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
  const router = useRouter();

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

  const sendLoginNotification = async (session, loginDetails) => {
    try {
      const response = await fetch('/api/send-login-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ loginDetails })
      });

      if (!response.ok) {
        console.error('Failed to send login notification');
      }
    } catch (error) {
      console.error('Error sending login notification:', error);
    }
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await logAuthActivity(ActivityActions.LOGIN_FAILED, {
        email,
        reason: error.message
      });
    } else if (data.user && data.session) {
      await logAuthActivity(ActivityActions.LOGIN_SUCCESS, {
        email: data.user.email,
        login_method: 'email_password'
      });

      // Enhanced login activity logging with geolocation
      // This will also send the login notification email with complete location data
      await logLoginActivity(true);

      // Send login notification email (non-blocking)
      const loginDetails = {
        ip_address: 'Unknown',
        device_type: /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
        browser: navigator.userAgent.match(/(firefox|msie|chrome|safari|trident)/i)?.[0] || 'Unknown',
        os: navigator.platform || 'Unknown',
        timestamp: new Date().toISOString()
      };

      sendLoginNotification(data.session, loginDetails).catch(err => {
        console.error('Login notification failed:', err);
      });
    }

    return { data, error };
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};