
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { oakline_tag, display_name, bio } = req.body;

    if (!oakline_tag) {
      return res.status(400).json({ error: 'Oakline tag is required' });
    }

    // Validate tag format
    const tagRegex = /^@[a-zA-Z0-9_]{3,20}$/;
    if (!tagRegex.test(oakline_tag)) {
      return res.status(400).json({ 
        error: 'Invalid tag format. Use @username with 3-20 characters (letters, numbers, underscores only)' 
      });
    }

    // Check if tag already exists
    const { data: existingTag } = await supabaseAdmin
      .from('oakline_pay_profiles')
      .select('oakline_tag')
      .eq('oakline_tag', oakline_tag)
      .single();

    if (existingTag) {
      return res.status(400).json({ error: 'This Oakline tag is already taken' });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabaseAdmin
      .from('oakline_pay_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from('oakline_pay_profiles')
        .update({
          oakline_tag,
          display_name: display_name || null,
          bio: bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: 'Oakline tag updated successfully',
        profile: data 
      });
    } else {
      // Create new profile
      const { data, error } = await supabaseAdmin
        .from('oakline_pay_profiles')
        .insert({
          user_id: user.id,
          oakline_tag,
          display_name: display_name || null,
          bio: bio || null,
          is_active: true,
          is_public: true,
          allow_requests: true
        })
        .select()
        .single();

      if (error) throw error;

      // Create default settings
      await supabaseAdmin
        .from('oakline_pay_settings')
        .insert({
          user_id: user.id,
          daily_limit: 5000,
          monthly_limit: 25000,
          per_transaction_limit: 2500,
          notifications_enabled: true,
          email_notifications: true,
          require_verification: true
        });

      return res.status(201).json({ 
        success: true, 
        message: 'Oakline tag created successfully',
        profile: data 
      });
    }
  } catch (error) {
    console.error('Setup profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
