import { supabaseAdmin } from '../../lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { email, verificationCode, newPin } = req.body;

    // Validate inputs
    if (!email || !verificationCode || !newPin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (email !== user.email) {
      return res.status(400).json({ error: 'Email mismatch' });
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must be 4 or 6 digits' });
    }

    // Get the most recent unused reset code for this user
    const { data: resetCodes, error: fetchError } = await supabaseAdmin
      .from('pin_reset_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('email', email)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Fetch reset code error:', fetchError);
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    if (!resetCodes || resetCodes.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const resetCode = resetCodes[0];

    // Verify the code
    const isCodeValid = await bcrypt.compare(verificationCode, resetCode.code_hash);
    
    if (!isCodeValid) {
      // Log failed attempt
      await supabaseAdmin.from('system_logs').insert({
        user_id: user.id,
        level: 'warning',
        type: 'auth',
        message: 'Failed PIN reset attempt - invalid code',
        details: { email, timestamp: new Date().toISOString() }
      });

      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Mark the code as used
    await supabaseAdmin
      .from('pin_reset_codes')
      .update({ used: true })
      .eq('id', resetCode.id);

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update the user's PIN
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        transaction_pin: hashedPin,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('PIN update error:', updateError);
      return res.status(500).json({ error: 'Failed to reset PIN' });
    }

    // Log successful PIN reset
    await supabaseAdmin.from('system_logs').insert({
      user_id: user.id,
      level: 'info',
      type: 'auth',
      message: 'Transaction PIN reset successfully',
      details: { email, timestamp: new Date().toISOString() }
    });

    return res.status(200).json({
      success: true,
      message: 'Transaction PIN reset successfully'
    });

  } catch (error) {
    console.error('Reset PIN error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
