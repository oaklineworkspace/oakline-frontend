import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newEmail } = req.body;
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

    // Create a Supabase client with the user's token
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { 
        global: { 
          headers: { 
            Authorization: authHeader 
          } 
        } 
      }
    );

    // Update email using user's token
    const { error: updateError } = await userSupabase.auth.updateUser({
      email: newEmail
    });

    if (updateError) {
      console.error('Auth update error:', updateError);
      return res.status(400).json({ error: updateError.message || 'Failed to change email' });
    }

    // Update email in profiles table using the admin key for backend update
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
      await supabaseAdmin
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', currentUser.id);
    } catch (profileError) {
      console.log('Note: profiles table update skipped or unavailable');
    }

    // Update email in applications table
    try {
      await supabaseAdmin
        .from('applications')
        .update({ email: newEmail })
        .eq('user_id', currentUser.id);
    } catch (appError) {
      console.log('Note: applications table update skipped or unavailable');
    }

    return res.status(200).json({
      success: true,
      message: 'Email changed successfully. Check your new email for confirmation.',
      newEmail
    });
  } catch (error) {
    console.error('Email change error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
