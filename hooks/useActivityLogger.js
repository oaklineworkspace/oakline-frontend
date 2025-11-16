
import { useCallback } from 'react';
import { 
  logAuthActivity, 
  logTransactionActivity, 
  logCardActivity, 
  logSecurityEvent,
  logUserActivity,
  logLoginActivity,
  ActivityActions 
} from '../lib/activityLogger';

export const useActivityLogger = () => {
  const logLogin = useCallback(async (method = 'password', success = true, failureReason = null) => {
    await logLoginActivity(success, failureReason);
    if (success) {
      await logAuthActivity(ActivityActions.LOGIN, { method });
    }
  }, []);

  const logLogout = useCallback(async () => {
    await logAuthActivity(ActivityActions.LOGOUT);
  }, []);

  const logPasswordChange = useCallback(async () => {
    await logAuthActivity(ActivityActions.PASSWORD_CHANGE);
  }, []);

  const logTransaction = useCallback(async (type, amount, accountNumber, details = {}) => {
    await logTransactionActivity(type, amount, accountNumber, details);
  }, []);

  const logCardAction = useCallback(async (action, cardNumber, details = {}) => {
    await logCardActivity(action, cardNumber, details);
  }, []);

  const logSecurity = useCallback(async (event, details = {}) => {
    await logSecurityEvent(event, details);
  }, []);

  const logUser = useCallback(async (action, details = {}) => {
    await logUserActivity(action, details);
  }, []);

  return {
    logLogin,
    logLogout,
    logPasswordChange,
    logTransaction,
    logCardAction,
    logSecurity,
    logUser,
    ActivityActions
  };
};
