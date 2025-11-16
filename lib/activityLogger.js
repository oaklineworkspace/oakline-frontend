import { supabase } from './supabaseClient';

const getClientIP = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return 'Unknown';
  }
};

export const logActivity = async ({
  type,
  action,
  category,
  message,
  details = {}
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user session found, skipping activity log');
      return;
    }

    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;

    const activityData = {
      user_id: user.id,
      type,
      action,
      category,
      message,
      details: {
        ...details,
        ip_address,
        user_agent,
        timestamp: new Date().toISOString()
      }
    };

    await fetch('/api/log-activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Activity tracking helpers
export const ActivityTypes = {
  AUTH: 'auth',
  TRANSACTION: 'transaction',
  SYSTEM: 'system',
  CARD: 'card',
  USER: 'user'
};

export const ActivityActions = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
  
  // Transactions
  TRANSFER: 'transfer',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  PAYMENT: 'payment',
  
  // Card Operations
  CARD_ACTIVATED: 'card_activated',
  CARD_BLOCKED: 'card_blocked',
  CARD_UNBLOCKED: 'card_unblocked',
  CARD_REPLACED: 'card_replaced',
  
  // Account Operations
  ACCOUNT_VIEW: 'account_view',
  ACCOUNT_UPDATE: 'account_update',
  SETTINGS_CHANGE: 'settings_change',
  
  // Security
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  FAILED_LOGIN: 'failed_login',
  IP_CHANGE: 'ip_change'
};

// Specific activity loggers
export const logAuthActivity = async (action, details = {}) => {
  return logActivity({
    type: ActivityTypes.AUTH,
    action,
    category: 'authentication',
    message: `User ${action}`,
    details
  });
};

export const logTransactionActivity = async (action, amount, accountNumber, details = {}) => {
  return logActivity({
    type: ActivityTypes.TRANSACTION,
    action,
    category: 'transaction',
    message: `${action} of $${amount} from account ${maskAccountNumber(accountNumber)}`,
    details: {
      ...details,
      amount,
      masked_account: maskAccountNumber(accountNumber)
    }
  });
};

export const logCardActivity = async (action, cardNumber, details = {}) => {
  return logActivity({
    type: ActivityTypes.CARD,
    action,
    category: 'card',
    message: `Card ${action} - ${maskCardNumber(cardNumber)}`,
    details: {
      ...details,
      masked_card: maskCardNumber(cardNumber)
    }
  });
};

export const logSecurityEvent = async (action, details = {}) => {
  return logActivity({
    type: ActivityTypes.SYSTEM,
    action,
    category: 'security',
    message: `Security event: ${action}`,
    details
  });
};

export const logUserActivity = async (action, details = {}) => {
  return logActivity({
    type: ActivityTypes.USER,
    action,
    category: 'user',
    message: `User action: ${action}`,
    details
  });
};

export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
};

export const maskCardNumber = (cardNumber) => {
  if (!cardNumber || cardNumber.length < 4) return '****-****-****-****';
  const cleaned = cardNumber.replace(/\s/g, '');
  return `****-****-****-${cleaned.slice(-4)}`;
};
