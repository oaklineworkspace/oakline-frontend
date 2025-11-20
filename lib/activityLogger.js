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

const getGeolocation = async (ip) => {
  try {
    if (!ip || ip === 'Unknown') return null;
    
    // Using ipapi.co (free HTTPS API, no key required)
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    if (data && !data.error) {
      return {
        city: data.city,
        region: data.region,
        country: data.country_name,
        countryCode: data.country_code,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get geolocation:', error);
    return null;
  }
};

const parseUserAgent = (userAgent) => {
  const ua = userAgent.toLowerCase();
  
  // Detect specific device model and manufacturer
  let deviceModel = 'Unknown Device';
  let deviceType = 'desktop';
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    deviceType = 'tablet';
    if (/ipad/i.test(userAgent)) {
      deviceModel = 'iPad';
    } else if (/android/i.test(userAgent)) {
      deviceModel = 'Android Tablet';
      if (/samsung/i.test(userAgent)) deviceModel = 'Samsung Tablet';
      else if (/huawei/i.test(userAgent)) deviceModel = 'Huawei Tablet';
    }
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    deviceType = 'mobile';
    
    // Detect iPhone
    if (/iphone/i.test(userAgent)) {
      deviceModel = 'iPhone';
    } 
    // Detect iPod
    else if (/ipod/i.test(userAgent)) {
      deviceModel = 'iPod';
    }
    // Detect Android phones with specific manufacturers
    else if (/android/i.test(userAgent)) {
      if (/samsung/i.test(userAgent)) {
        deviceModel = 'Samsung Phone';
      } else if (/huawei/i.test(userAgent)) {
        deviceModel = 'Huawei Phone';
      } else if (/xiaomi/i.test(userAgent)) {
        deviceModel = 'Xiaomi Phone';
      } else if (/oppo/i.test(userAgent)) {
        deviceModel = 'Oppo Phone';
      } else if (/vivo/i.test(userAgent)) {
        deviceModel = 'Vivo Phone';
      } else if (/oneplus/i.test(userAgent)) {
        deviceModel = 'OnePlus Phone';
      } else if (/lg/i.test(userAgent)) {
        deviceModel = 'LG Phone';
      } else if (/motorola|moto/i.test(userAgent)) {
        deviceModel = 'Motorola Phone';
      } else if (/google pixel|pixel/i.test(userAgent)) {
        deviceModel = 'Google Pixel';
      } else {
        deviceModel = 'Android Phone';
      }
    }
    // Other mobile devices
    else if (/blackberry/i.test(userAgent)) {
      deviceModel = 'BlackBerry';
    } else if (/windows phone/i.test(userAgent)) {
      deviceModel = 'Windows Phone';
    } else {
      deviceModel = 'Mobile Device';
    }
  } else {
    // Desktop devices
    deviceType = 'desktop';
    if (/mac/i.test(userAgent)) {
      deviceModel = 'Mac Computer';
    } else if (/win/i.test(userAgent)) {
      deviceModel = 'Windows PC';
    } else if (/linux/i.test(userAgent)) {
      deviceModel = 'Linux Computer';
    } else {
      deviceModel = 'Desktop Computer';
    }
  }
  
  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  return { deviceType, deviceModel, browser, os };
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
    const geolocation = await getGeolocation(ip_address);
    const deviceInfo = parseUserAgent(user_agent);

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
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        city: geolocation?.city,
        region: geolocation?.region,
        country: geolocation?.country,
        latitude: geolocation?.latitude,
        longitude: geolocation?.longitude,
        timezone: geolocation?.timezone,
        isp: geolocation?.isp,
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

// Enhanced login tracking with geolocation
export const logLoginActivity = async (success = true, failureReason = null) => {
  try {
    const ip_address = await getClientIP();
    const user_agent = navigator.userAgent;
    const geolocation = await getGeolocation(ip_address);
    const deviceInfo = parseUserAgent(user_agent);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user && success) {
      console.warn('No user found for successful login');
      return;
    }

    const loginData = {
      user_id: user?.id,
      success,
      ip_address,
      user_agent,
      device_type: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      city: geolocation?.city,
      country: geolocation?.country,
      latitude: geolocation?.latitude,
      longitude: geolocation?.longitude,
      failure_reason: failureReason
    };

    await fetch('/api/log-login-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    // Send login notification email with complete location data if login was successful
    if (user && success) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        await fetch('/api/send-login-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            loginDetails: {
              ip_address,
              device_type: deviceInfo.deviceType,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              city: geolocation?.city || 'Unknown',
              country: geolocation?.country || 'Unknown',
              latitude: geolocation?.latitude,
              longitude: geolocation?.longitude,
              timezone: geolocation?.timezone,
              isp: geolocation?.isp,
              timestamp: new Date().toISOString()
            }
          })
        });
        
        console.log('Email notification sent successfully');
      } catch (emailError) {
        console.error('Failed to send login notification email:', emailError);
      }
    }

    // Also log to system_logs
    if (user) {
      await logAuthActivity(success ? ActivityActions.LOGIN : ActivityActions.FAILED_LOGIN, {
        ip_address,
        device: `${deviceInfo.browser} on ${deviceInfo.os}`,
        location: geolocation ? `${geolocation.city}, ${geolocation.country}` : 'Unknown',
        device_type: deviceInfo.deviceType,
        failure_reason: failureReason
      });
    }
  } catch (error) {
    console.error('Failed to log login activity:', error);
  }
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
