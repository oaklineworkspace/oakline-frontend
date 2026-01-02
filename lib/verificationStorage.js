// Use global object to persist across module reloads in development
// This prevents the Map from being reset when hot reload happens
if (!global.verificationCodesStorage) {
  global.verificationCodesStorage = new Map();
  console.log('🔐 Initialized global verification codes storage');
}

// Storage for new email verification codes (for email change flow)
if (!global.newEmailVerificationStorage) {
  global.newEmailVerificationStorage = new Map();
  console.log('📧 Initialized global new email verification storage');
}

export function storeVerificationCode(userId, code, email) {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  global.verificationCodesStorage.set(userId, {
    code,
    email,
    expiresAt
  });

  console.log('✅ Verification code stored for user:', userId);
  console.log('📊 Current storage keys:', Array.from(global.verificationCodesStorage.keys()));
  return Promise.resolve();
}

export function getVerificationCode(userId) {
  return Promise.resolve(global.verificationCodesStorage.get(userId) || null);
}

export function clearVerificationCode(userId) {
  global.verificationCodesStorage.delete(userId);
  console.log('🗑️ Verification code cleared for user:', userId);
  return Promise.resolve();
}

export async function validateVerificationCode(userId, code) {
  console.log('🔍 Validating code for user:', userId);
  console.log('📊 Available codes in storage:', Array.from(global.verificationCodesStorage.keys()));
  
  const stored = global.verificationCodesStorage.get(userId);
  
  if (!stored) {
    console.error('❌ No code found for user:', userId);
    return { valid: false, error: 'No verification code sent. Please request a new one.' };
  }

  console.log('✅ Code found. Checking expiration and match...');
  console.log('🔐 Stored code:', stored.code, 'Provided code:', code.toString());

  // Check if code has expired
  if (Date.now() > stored.expiresAt) {
    global.verificationCodesStorage.delete(userId);
    console.log('⏰ Code expired for user:', userId);
    return { valid: false, error: 'Verification code expired. Please request a new one.' };
  }

  // Check if code matches
  if (stored.code !== code.toString()) {
    console.log('❌ Code mismatch. Expected:', stored.code, 'Got:', code.toString());
    return { valid: false, error: 'Invalid verification code' };
  }

  console.log('✅✅ Code validated successfully for user:', userId);
  return { valid: true };
}

// New email verification functions (for email change flow)
export function storeNewEmailVerificationCode(userId, newEmail, code) {
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  
  global.newEmailVerificationStorage.set(userId, {
    code,
    newEmail,
    expiresAt
  });

  console.log('📧 New email verification code stored for user:', userId, 'email:', newEmail);
  return Promise.resolve();
}

export function getNewEmailVerificationCode(userId) {
  return Promise.resolve(global.newEmailVerificationStorage.get(userId) || null);
}

export function clearNewEmailVerificationCode(userId) {
  global.newEmailVerificationStorage.delete(userId);
  console.log('🗑️ New email verification code cleared for user:', userId);
  return Promise.resolve();
}

export async function validateNewEmailVerificationCode(userId, newEmail, code) {
  console.log('🔍 Validating new email code for user:', userId);
  
  const stored = global.newEmailVerificationStorage.get(userId);
  
  if (!stored) {
    console.error('❌ No new email code found for user:', userId);
    return { valid: false, error: 'No verification code found. Please start the email change process again.' };
  }

  // Check if email matches
  if (stored.newEmail !== newEmail) {
    console.log('❌ Email mismatch. Expected:', stored.newEmail, 'Got:', newEmail);
    return { valid: false, error: 'Email mismatch. Please start the email change process again.' };
  }

  // Check if code has expired
  if (Date.now() > stored.expiresAt) {
    global.newEmailVerificationStorage.delete(userId);
    console.log('⏰ Code expired for user:', userId);
    return { valid: false, error: 'Verification code expired. Please start the email change process again.' };
  }

  // Check if code matches
  if (stored.code !== code.toString()) {
    console.log('❌ Code mismatch. Expected:', stored.code, 'Got:', code.toString());
    return { valid: false, error: 'Invalid verification code' };
  }

  console.log('✅✅ New email code validated successfully for user:', userId);
  return { valid: true };
}
