// In-memory storage for verification codes
// This persists in the Node.js process and works fine since both APIs run in the same process
const verificationCodes = new Map();

export function storeVerificationCode(userId, code, email) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  verificationCodes.set(userId, {
    code,
    email,
    expiresAt
  });

  console.log('Verification code stored for user:', userId);
  return Promise.resolve();
}

export function getVerificationCode(userId) {
  return Promise.resolve(verificationCodes.get(userId) || null);
}

export function clearVerificationCode(userId) {
  verificationCodes.delete(userId);
  console.log('Verification code cleared for user:', userId);
  return Promise.resolve();
}

export async function validateVerificationCode(userId, code) {
  const stored = verificationCodes.get(userId);
  
  if (!stored) {
    return { valid: false, error: 'No verification code sent. Please request a new one.' };
  }

  // Check if code has expired
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(userId);
    return { valid: false, error: 'Verification code expired. Please request a new one.' };
  }

  // Check if code matches
  if (stored.code !== code.toString()) {
    return { valid: false, error: 'Invalid verification code' };
  }

  return { valid: true };
}
