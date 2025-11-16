import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, type, action, category, message, details } = req.body;

    if (!user_id || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine log level based on action
    let level = 'info';
    if (action?.includes('failed') || action?.includes('suspicious') || action?.includes('blocked')) {
      level = 'warning';
    }
    if (action?.includes('error') || action?.includes('fraud')) {
      level = 'error';
    }

    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id,
        level,
        type,
        message,
        details: {
          ...details,
          action,
          category
        },
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
