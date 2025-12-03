
import { authenticateRequest } from '../../lib/apiAuth';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, supabase } = await authenticateRequest(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Sign out user from all sessions/devices
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(user.id, 'global');

    if (signOutError) {
      console.error('Error ending sessions:', signOutError);
      return res.status(500).json({ error: 'Failed to end sessions' });
    }

    // Update user_sessions table to mark all as inactive
    const { error: sessionUpdateError } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (sessionUpdateError) {
      console.error('Error updating session records:', sessionUpdateError);
    }

    // Log the activity
    await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id: user.id,
        type: 'security',
        action: 'end_all_sessions',
        category: 'security',
        message: 'User ended all active sessions',
        details: {
          timestamp: new Date().toISOString(),
          triggered_by: 'user'
        }
      });

    return res.status(200).json({ 
      success: true,
      message: 'All sessions ended successfully'
    });
  } catch (error) {
    console.error('End sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
