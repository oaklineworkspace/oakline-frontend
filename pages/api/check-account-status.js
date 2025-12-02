import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing Supabase credentials');
      return res.status(500).json({ error: 'Server configuration error. Please contact support.' });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader?.replace('Bearer ', '') || 
                  req.cookies['sb-access-token'] ||
                  req.cookies['supabase-auth-token'];

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    if (user.id !== userId) {
      return res.status(403).json({ error: 'Forbidden. You can only check your own account status.' });
    }

    // Fetch bank details for contact email
    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('email_security, email_support, email_contact, email_info')
      .limit(1)
      .single();

    const supportEmail = bankDetails?.email_security || bankDetails?.email_support || bankDetails?.email_contact || 'security@theoaklinebank.com';

    // Fetch complete profile information including all reason fields and verification status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status, is_banned, ban_reason, suspension_reason, restriction_display_message, requires_verification, verification_reason')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      // If profile doesn't exist, return default active status
      if (profileError.code === 'PGRST116') {
        return res.status(200).json({
          status: 'active',
          is_banned: false,
          ban_reason: null,
          status_reason: null,
          account_locked: false,
          locked_reason: null,
          isBlocked: false,
          supportEmail: supportEmail
        });
      }
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    // Query user_security_settings for lock status
    const { data: securitySettings, error: securityError } = await supabaseAdmin
      .from('user_security_settings')
      .select('account_locked, locked_reason')
      .eq('user_id', userId)
      .single();

    if (securityError && securityError.code !== 'PGRST116') {
      console.error('Security settings query error:', securityError);
    }

    // Determine if account is blocked (including verification requirement)
    const isBlocked = 
      profile?.is_banned === true ||
      profile?.status === 'suspended' ||
      profile?.suspension_reason ||
      profile?.status === 'closed' ||
      profile?.closure_reason ||
      securitySettings?.account_locked === true ||
      profile?.requires_verification === true;

    // Determine the blocking type for UI
    // Priority: verification_required is checked FIRST so users can verify identity before other restrictions are applied
    let blockingType = null;
    if (profile?.requires_verification) blockingType = 'verification_required';
    else if (profile?.is_banned) blockingType = 'banned';
    else if (securitySettings?.account_locked) blockingType = 'locked';
    else if (profile?.status === 'suspended' || profile?.suspension_reason) blockingType = 'suspended';
    else if (profile?.status === 'closed' || profile?.closure_reason) blockingType = 'closed';

    // Get the actual reason from the profile table
    const reason = profile?.ban_reason || null;

    return res.status(200).json({
      status: profile?.status || 'active',
      is_banned: profile?.is_banned || false,
      ban_reason: profile?.ban_reason || null,
      suspension_reason: profile?.suspension_reason || null,
      restriction_display_message: profile?.restriction_display_message || null,
      account_locked: securitySettings?.account_locked || false,
      locked_reason: securitySettings?.locked_reason || null,
      requires_verification: profile?.requires_verification || false,
      verification_reason: profile?.verification_reason || null,
      isBlocked,
      blockingType,
      reason,
      supportEmail: supportEmail
    });

  } catch (error) {
    console.error('Account status check error:', error);
    return res.status(500).json({ error: 'Failed to check account status' });
  }
}