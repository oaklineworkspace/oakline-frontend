import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Query profiles table for user status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status, is_banned, ban_reason')
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
          account_locked: false,
          locked_reason: null,
          isBlocked: false
        });
      }
      throw profileError;
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

    // Determine if account is blocked
    const isBlocked = 
      profile?.is_banned === true ||
      profile?.status === 'suspended' ||
      profile?.status === 'closed' ||
      securitySettings?.account_locked === true;

    // Determine the blocking type for UI
    let blockingType = null;
    if (profile?.is_banned) blockingType = 'banned';
    else if (securitySettings?.account_locked) blockingType = 'locked';
    else if (profile?.status === 'suspended') blockingType = 'suspended';
    else if (profile?.status === 'closed') blockingType = 'closed';

    return res.status(200).json({
      status: profile?.status || 'active',
      is_banned: profile?.is_banned || false,
      ban_reason: profile?.ban_reason || null,
      account_locked: securitySettings?.account_locked || false,
      locked_reason: securitySettings?.locked_reason || null,
      isBlocked,
      blockingType
    });

  } catch (error) {
    console.error('Account status check error:', error);
    return res.status(500).json({ error: 'Failed to check account status' });
  }
}
