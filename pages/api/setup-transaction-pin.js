
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const { currentPin, newPin } = req.body;

    if (!newPin) {
      return res.status(400).json({ error: 'New PIN is required' });
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must be 4 or 6 digits' });
    }

    // Fetch current user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return res.status(400).json({ error: 'User profile not found' });
    }

    // If user has existing PIN, verify current PIN
    if (profile?.transaction_pin) {
      if (!currentPin) {
        return res.status(400).json({ error: 'Current PIN is required' });
      }

      const isCurrentPinValid = await bcrypt.compare(currentPin, profile.transaction_pin);
      if (!isCurrentPinValid) {
        // Log failed attempt
        await supabaseAdmin.from('system_logs').insert([{
          user_id: user.id,
          level: 'warning',
          type: 'auth',
          message: 'Failed attempt to change transaction PIN',
          details: { timestamp: new Date().toISOString() }
        }]);

        return res.status(400).json({ error: 'Current PIN is incorrect' });
      }
    }

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update the profile with new PIN
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        transaction_pin: hashedPin,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating PIN:', updateError);
      return res.status(500).json({ error: 'Failed to update transaction PIN' });
    }

    // Log successful PIN setup/change
    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: 'auth',
      message: profile?.transaction_pin ? 'Transaction PIN changed successfully' : 'Transaction PIN created successfully',
      details: { timestamp: new Date().toISOString() }
    }]);

    return res.status(200).json({
      success: true,
      message: profile?.transaction_pin ? 'Transaction PIN updated successfully' : 'Transaction PIN created successfully'
    });

  } catch (error) {
    console.error('Error setting up transaction PIN:', error);
    return res.status(500).json({
      error: 'Failed to set up transaction PIN',
      message: error.message
    });
  }
}
