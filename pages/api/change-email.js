import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newEmail, currentPassword } = req.body;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const token = authHeader.substring(7);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate new email
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if new email is already in use
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(u => u.email === newEmail);
    if (emailExists) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Update email in auth
    const { error: updateError } = await supabase.auth.updateUser(
      { email: newEmail },
      { validate: false }
    );

    if (updateError) {
      return res.status(400).json({ error: updateError.message || 'Failed to change email' });
    }

    // Update email in profiles table if it exists
    try {
      await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', user.id);
    } catch (profileError) {
      console.log('Note: profiles table update skipped or failed (may not exist)');
    }

    // Update email in applications table if exists
    try {
      await supabase
        .from('applications')
        .update({ email: newEmail })
        .eq('id', user.id);
    } catch (appError) {
      console.log('Note: applications table update skipped');
    }

    return res.status(200).json({
      success: true,
      message: 'Email changed successfully. Please check your new email for confirmation.',
      newEmail
    });
  } catch (error) {
    console.error('Email change error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
