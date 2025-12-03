
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to automatically logout users after period of inactivity
 * @param {number} timeoutMinutes - Minutes of inactivity before logout (default from user settings)
 */
export const useSessionTimeout = () => {
  const { user, signOut } = useAuth();
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const timeoutMinutesRef = useRef(30); // Default 30 minutes

  // Fetch user's session timeout preference
  useEffect(() => {
    if (!user?.id) return;

    const fetchTimeout = async () => {
      const { data } = await supabase
        .from('user_security_settings')
        .select('session_timeout')
        .eq('user_id', user.id)
        .single();

      if (data?.session_timeout) {
        timeoutMinutesRef.current = data.session_timeout;
      }
    };

    fetchTimeout();
  }, [user?.id]);

  const handleLogout = useCallback(async () => {
    console.log('Session timeout - logging out user');
    await signOut();
    
    // Show notification to user
    if (typeof window !== 'undefined') {
      alert('Your session has expired due to inactivity. Please log in again.');
    }
  }, [signOut]);

  const showWarning = useCallback(() => {
    console.log('Session timeout warning - 2 minutes remaining');
    
    // Optional: Show a modal or toast warning
    if (typeof window !== 'undefined' && window.confirm) {
      const continueSession = window.confirm(
        'Your session will expire in 2 minutes due to inactivity. Click OK to continue your session.'
      );
      
      if (continueSession) {
        resetTimeout();
      }
    }
  }, []);

  const resetTimeout = useCallback(() => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();

    if (!user) return;

    const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
    const warningMs = timeoutMs - (2 * 60 * 1000); // Warning 2 minutes before timeout

    // Set warning timeout
    if (warningMs > 0) {
      warningTimeoutRef.current = setTimeout(showWarning, warningMs);
    }

    // Set logout timeout
    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [user, handleLogout, showWarning]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'wheel'
    ];

    const throttledResetTimeout = (() => {
      let timeoutId;
      return () => {
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            resetTimeout();
            timeoutId = null;
          }, 1000); // Throttle to once per second
        }
      };
    })();

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledResetTimeout, true);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledResetTimeout, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, resetTimeout]);

  return {
    resetTimeout,
    lastActivity: lastActivityRef.current,
    timeoutMinutes: timeoutMinutesRef.current
  };
};
