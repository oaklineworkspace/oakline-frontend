// Shared verification code storage
const verificationCodes = new Map();

export function storeVerificationCode(userId, code, email) {
  verificationCodes.set(userId, {
    code,
    email,
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });
}

export function getVerificationCode(userId) {
  return verificationCodes.get(userId);
}

export function clearVerificationCode(userId) {
  verificationCodes.delete(userId);
}

export function validateVerificationCode(userId, code) {
  const stored = verificationCodes.get(userId);
  
  if (!stored) {
    return { valid: false, error: 'No verification code sent. Please request a new one.' };
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(userId);
    return { valid: false, error: 'Verification code expired. Please request a new one.' };
  }

  if (stored.code !== code) {
    return { valid: false, error: 'Invalid verification code' };
  }

  return { valid: true };
}
