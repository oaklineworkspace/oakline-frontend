import { supabaseAdmin } from './supabaseAdmin';

/**
 * Check if a user requires verification before performing sensitive operations
 * @param {string} userId - The user's ID
 * @returns {Promise<{requiresVerification: boolean, reason: string|null, error: any}>}
 */
export async function checkUserVerification(userId) {
  try {
    if (!userId) {
      return { requiresVerification: false, reason: null, error: 'No user ID provided' };
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('requires_verification, verification_reason')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, allow the operation
      if (error.code === 'PGRST116') {
        return { requiresVerification: false, reason: null, error: null };
      }
      console.error('Error checking verification status:', error);
      return { requiresVerification: false, reason: null, error: error.message };
    }

    return {
      requiresVerification: data?.requires_verification || false,
      reason: data?.verification_reason || null,
      error: null
    };
  } catch (error) {
    console.error('Exception in checkUserVerification:', error);
    return { requiresVerification: false, reason: null, error: error.message };
  }
}

/**
 * Middleware function to verify user before allowing sensitive operations
 * Returns error response if verification is required
 * @param {string} userId - The user's ID
 * @param {object} res - Next.js response object
 * @returns {Promise<boolean>} - Returns true if verification is required (and response has been sent)
 */
export async function requireVerificationCheck(userId, res) {
  const { requiresVerification, reason } = await checkUserVerification(userId);
  
  if (requiresVerification) {
    res.status(403).json({
      error: 'Verification required',
      message: 'You must complete identity verification before performing this action.',
      reason: reason || 'Your account requires identity verification for security purposes.',
      requiresVerification: true,
      redirectTo: '/verify-identity'
    });
    return true;
  }
  
  return false;
}
