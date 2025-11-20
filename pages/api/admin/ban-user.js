
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, banReason, adminId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update user profile to set banned status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_banned: true,
        ban_reason: banReason || 'Account suspended for security reasons',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return res.status(500).json({ error: 'Failed to ban user' });
    }

    // Sign out user from all devices/sessions
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);

    if (signOutError) {
      console.error('Error signing out user:', signOutError);
      // Continue anyway as profile is already updated
    }

    // Log the ban action
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action: 'BAN_USER',
        target_user_id: userId,
        details: {
          ban_reason: banReason,
          timestamp: new Date().toISOString()
        }
      });

    return res.status(200).json({
      success: true,
      message: 'User banned successfully and signed out from all devices',
      profile
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
