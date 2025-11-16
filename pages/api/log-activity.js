import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, type, action, category, message, details } = req.body;

    if (!user_id || !type || !action || !category || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id,
        type,
        action,
        category,
        message,
        details,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error inserting activity log:', error);
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Activity logging error:', error);
    return res.status(500).json({ error: 'Failed to log activity' });
  }
}
