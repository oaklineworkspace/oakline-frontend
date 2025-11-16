
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, limit = 50 } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' });
    }

    // Verify admin access
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch login history
    const { data: loginHistory, error: loginError } = await supabaseAdmin
      .from('login_history')
      .select('*')
      .eq('user_id', user_id)
      .order('login_time', { ascending: false })
      .limit(parseInt(limit));

    if (loginError) throw loginError;

    // Fetch active sessions
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('last_activity', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Fetch system logs
    const { data: systemLogs, error: logsError } = await supabaseAdmin
      .from('system_logs')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (logsError) throw logsError;

    // Get last login info
    const lastLogin = loginHistory && loginHistory.length > 0 ? loginHistory[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        last_login: lastLogin,
        login_history: loginHistory,
        active_sessions: sessions,
        activity_logs: systemLogs,
        summary: {
          total_logins: loginHistory?.length || 0,
          failed_logins: loginHistory?.filter(l => !l.success).length || 0,
          active_sessions_count: sessions?.length || 0,
          last_login_time: lastLogin?.login_time,
          last_login_location: lastLogin ? `${lastLogin.city || 'Unknown'}, ${lastLogin.country || 'Unknown'}` : 'Unknown',
          last_login_device: lastLogin ? `${lastLogin.browser} on ${lastLogin.os}` : 'Unknown'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ error: 'Failed to fetch user activity' });
  }
}
