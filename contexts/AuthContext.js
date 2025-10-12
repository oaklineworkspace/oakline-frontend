import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

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

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      router.push('/sign-in');
    }
    return { error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
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

