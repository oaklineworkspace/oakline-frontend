import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import SessionTimeoutModal from '../components/SessionTimeoutModal';

const SessionTimeoutContext = createContext({});

export const useSessionTimeoutContext = () => useContext(SessionTimeoutContext);

export function SessionTimeoutProvider({ children }) {
  const { user, signOut } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const timeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const timeoutMinutesRef = useRef(30);
  const resetTimeoutRef = useRef(null);

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
    setShowWarningModal(false);
    await signOut();
    setShowExpiredModal(true);
  }, [signOut]);

  const handleExpiredClose = useCallback(() => {
    setShowExpiredModal(false);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  const handleContinueSession = useCallback(() => {
    setShowWarningModal(false);
    if (resetTimeoutRef.current) {
      resetTimeoutRef.current();
    }
  }, []);

  const handleLogoutNow = useCallback(async () => {
    setShowWarningModal(false);
    await signOut();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, [signOut]);

  const showWarning = useCallback(() => {
    console.log('Session timeout warning - 2 minutes remaining');
    setShowWarningModal(true);
  }, []);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    lastActivityRef.current = Date.now();

    if (!user) return;

    const timeoutMs = timeoutMinutesRef.current * 60 * 1000;
    const warningMs = timeoutMs - (2 * 60 * 1000);

    if (warningMs > 0) {
      warningTimeoutRef.current = setTimeout(showWarning, warningMs);
    }

    timeoutRef.current = setTimeout(handleLogout, timeoutMs);
  }, [user, handleLogout, showWarning]);

  useEffect(() => {
    resetTimeoutRef.current = resetTimeout;
  }, [resetTimeout]);

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
          }, 1000);
        }
      };
    })();

    events.forEach(event => {
      document.addEventListener(event, throttledResetTimeout, true);
    });

    resetTimeout();

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

  return (
    <SessionTimeoutContext.Provider value={{
      resetTimeout,
      lastActivity: lastActivityRef.current,
      timeoutMinutes: timeoutMinutesRef.current
    }}>
      {children}

      <SessionTimeoutModal
        isOpen={showWarningModal}
        onClose={handleLogoutNow}
        onContinue={handleContinueSession}
        type="warning"
      />

      <SessionTimeoutModal
        isOpen={showExpiredModal}
        onClose={handleExpiredClose}
        type="expired"
      />
    </SessionTimeoutContext.Provider>
  );
}
