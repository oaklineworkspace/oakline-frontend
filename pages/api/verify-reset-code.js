import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (otpError || !otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    if (otpRecord.used) {
      return res.status(400).json({ error: 'This verification code has already been used' });
    }

    const expiresAt = new Date(otpRecord.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (passwordError) {
      console.error('Error updating password:', passwordError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    const { error: markUsedError } = await supabaseAdmin
      .from('password_reset_otps')
      .update({ used: true })
      .eq('email', email);

    if (markUsedError) {
      console.error('Error marking OTP as used:', markUsedError);
    }

    res.status(200).json({
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });

  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
