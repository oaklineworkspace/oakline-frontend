
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

    const { pin, type } = req.body;

    if (!pin || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch user's PIN from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ error: 'User profile not found' });
    }

    if (!profile.transaction_pin) {
      return res.status(400).json({ 
        error: 'Transaction PIN not set. Please set up your PIN in Security settings.' 
      });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, profile.transaction_pin);

    if (!isPinValid) {
      // Log failed attempt
      await supabaseAdmin.from('system_logs').insert([{
        user_id: user.id,
        level: 'warning',
        type: 'transaction_pin_failed',
        message: `Failed transaction PIN verification for ${type}`,
        details: { type, timestamp: new Date().toISOString() }
      }]);

      return res.status(400).json({
        error: 'Invalid PIN. Please try again.'
      });
    }

    // Log successful verification
    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: 'transaction_pin_success',
      message: `Successful transaction PIN verification for ${type}`,
      details: { type, timestamp: new Date().toISOString() }
    }]);

    return res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });

  } catch (error) {
    console.error('Error verifying transaction PIN:', error);
    return res.status(500).json({
      error: 'Failed to verify PIN',
      message: error.message
    });
  }
}
