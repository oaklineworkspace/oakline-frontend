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

export const maskAccountNumber = (accountNumber) => {
  if (!accountNumber || accountNumber.length < 4) return '****';
  return `****${accountNumber.slice(-4)}`;
};

export const maskCardNumber = (cardNumber) => {
  if (!cardNumber || cardNumber.length < 4) return '****-****-****-****';
  const cleaned = cardNumber.replace(/\s/g, '');
  return `****-****-****-${cleaned.slice(-4)}`;
};
