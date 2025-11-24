import { supabaseAdmin } from './supabaseAdmin';

export async function storeVerificationCode(userId, code, email) {
  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Delete any existing code for this user
    await supabaseAdmin
      .from('email_verification_codes')
      .delete()
      .eq('user_id', userId);
    
    // Insert new code
    const { error } = await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        user_id: userId,
        code,
        email,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      console.error('Failed to store verification code:', error);
      throw error;
    }

    console.log('Verification code stored for user:', userId);
  } catch (err) {
    console.error('Error storing verification code:', err);
    throw err;
  }
}

export async function getVerificationCode(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('email_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // No code found is not an error, just return null
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Failed to get verification code:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Error getting verification code:', err);
    return null;
  }
}

export async function clearVerificationCode(userId) {
  try {
    await supabaseAdmin
      .from('email_verification_codes')
      .delete()
      .eq('user_id', userId);

    console.log('Verification code cleared for user:', userId);
  } catch (err) {
    console.error('Error clearing verification code:', err);
  }
}

export async function validateVerificationCode(userId, code) {
  try {
    const stored = await getVerificationCode(userId);
    
    if (!stored) {
      return { valid: false, error: 'No verification code sent. Please request a new one.' };
    }

    // Check if code has expired
    const now = new Date();
    const expiresAt = new Date(stored.expires_at);
    
    if (now > expiresAt) {
      await clearVerificationCode(userId);
      return { valid: false, error: 'Verification code expired. Please request a new one.' };
    }

    // Check if code matches
    if (stored.code !== code.toString()) {
      return { valid: false, error: 'Invalid verification code' };
    }

    return { valid: true };
  } catch (err) {
    console.error('Error validating verification code:', err);
    return { valid: false, error: 'Error validating code. Please try again.' };
  }
}
