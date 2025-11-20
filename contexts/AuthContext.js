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

  // Real-time ban detection - sign out user if they get banned
  useEffect(() => {
    if (!user?.id) return;

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
          // Check if user was banned
          if (payload.new.is_banned === true && payload.old.is_banned === false) {
            console.log('User has been banned, signing out...');
            
            // Sign out immediately
            await supabase.auth.signOut();
            
            // Redirect to login with ban message
            router.push('/sign-in');
          }
        }
      )
      .subscribe();

    return () => {
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};