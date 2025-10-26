import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

/**
 * Custom hook to check if the current user is an admin
 * Automatically redirects to home page if user is not an admin
 * @param {boolean} redirectOnFail - Whether to redirect if user is not admin (default: true)
 * @returns {object} - { isAdmin, role, loading, error, user }
 */
export function useAdminAuth(redirectOnFail = true) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Not authenticated');
        setLoading(false);
        if (redirectOnFail) {
          router.push('/sign-in');
        }
        return;
      }

      setUser(session.user);

      const response = await fetch('/api/admin/check-role', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data.isAdmin) {
        setIsAdmin(false);
        setRole(null);
        setError(data.error || 'Access denied');
        setLoading(false);
        
        if (redirectOnFail) {
          router.push('/unauthorized');
        }
        return;
      }

      setIsAdmin(true);
      setRole(data.role);
      setLoading(false);
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError(err.message);
      setLoading(false);
      
      if (redirectOnFail) {
        router.push('/');
      }
    }
  };

  return { isAdmin, role, loading, error, user };
}
