
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      user_id, 
      success, 
      ip_address, 
      user_agent,
      device_type,
      browser,
      os,
      city,
      country,
      latitude,
      longitude,
      failure_reason 
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }

    // Insert into login_history table
    const { error: loginHistoryError } = await supabaseAdmin
      .from('login_history')
      .insert({
        user_id,
        login_time: new Date().toISOString(),
        success: success !== false,
        ip_address,
        user_agent,
        device_type,
        browser,
        os,
        city,
        country,
        latitude,
        longitude,
        failure_reason
      });

    if (loginHistoryError) {
      console.error('Error inserting login history:', loginHistoryError);
      throw loginHistoryError;
    }

    // If successful login, also create/update user session
    if (success !== false) {
      const { error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .insert({
          user_id,
          ip_address,
          user_agent,
          device_type,
          is_active: true,
          last_activity: new Date().toISOString()
        });

      if (sessionError) {
        console.error('Error creating user session:', sessionError);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Login history logging error:', error);
    return res.status(500).json({ error: 'Failed to log login history' });
  }
}
