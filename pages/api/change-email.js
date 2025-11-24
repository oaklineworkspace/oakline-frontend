import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { validateVerificationCode, clearVerificationCode } from '../../lib/verificationStorage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newEmail, verificationCode, ssn } = req.body;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const token = authHeader.substring(7);

    // Verify the token by getting the user
    const { data: { user: currentUser }, error: tokenError } = await supabase.auth.getUser(token);
    if (tokenError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Validate new email
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (newEmail === currentUser.email) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Verify user identity with either verification code or SSN
    let isCodeVerified = false;
    if (verificationCode) {
      // Check verification code
      const codeValidation = await validateVerificationCode(currentUser.id, verificationCode);
      
      if (!codeValidation.valid) {
        return res.status(400).json({ error: codeValidation.error });
      }

      // Mark code as verified, but don't clear it yet (will clear after successful email update)
      isCodeVerified = true;
    } else if (ssn) {
      // Verify SSN
      if (!ssn || ssn.length !== 4) {
        return res.status(400).json({ error: 'Invalid SSN format. Please enter last 4 digits.' });
      }

      // Get user's SSN from applications table
      try {
        const { data: appData, error: appError } = await supabaseAdmin
          .from('applications')
          .select('ssn')
          .eq('user_id', currentUser.id)
          .single();

        if (appError || !appData) {
          return res.status(400).json({ error: 'Could not verify identity. Please use email verification instead.' });
        }

        // Check if last 4 digits match
        const lastFour = appData.ssn ? appData.ssn.slice(-4) : null;
        if (lastFour !== ssn) {
          return res.status(400).json({ error: 'SSN does not match our records' });
        }
      } catch (error) {
        console.error('SSN verification error:', error);
        return res.status(400).json({ error: 'Could not verify identity' });
      }
    } else {
      return res.status(400).json({ error: 'Please verify your identity with either a verification code or SSN' });
    }

    // Update email using admin API (server-side approach)
    console.log('Updating email for user:', currentUser.id, 'to:', newEmail);
    
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      currentUser.id,
      { email: newEmail }
    );

    if (updateError) {
      console.error('Auth update error:', updateError);
      return res.status(400).json({ error: updateError.message || 'Failed to change email' });
    }
    
    console.log('✅ Email updated successfully in auth');

    // Email update successful - NOW clear the verification code
    if (isCodeVerified) {
      await clearVerificationCode(currentUser.id);
    }

    // Update email in profiles table if it exists
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', currentUser.id);
    } catch (profileError) {
      console.log('Note: profiles table update skipped');
    }

    // Update email in applications table
    try {
      await supabaseAdmin
        .from('applications')
        .update({ email: newEmail })
        .eq('user_id', currentUser.id);
    } catch (appError) {
      console.log('Note: applications table update skipped');
    }

    return res.status(200).json({
      success: true,
      message: 'Email changed successfully. Check your new email for confirmation.',
      newEmail
    });
  } catch (error) {
    console.error('Email change error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
