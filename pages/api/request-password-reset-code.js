import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendPasswordResetCode } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive a password reset code shortly.'
      });
    }

    const userData = users?.find(user => user.email === email);

    if (!userData) {
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive a password reset code shortly.'
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { data: existingOTP, error: checkError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (existingOTP) {
      const { error: updateError } = await supabaseAdmin
        .from('password_reset_otps')
        .update({
          otp: otpCode,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) {
        console.error('Error updating OTP:', updateError);
        return res.status(500).json({ error: 'Failed to generate reset code' });
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('password_reset_otps')
        .insert({
          email,
          otp: otpCode,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (insertError) {
        console.error('Error inserting OTP:', insertError);
        return res.status(500).json({ error: 'Failed to generate reset code' });
      }
    }

    try {
      await sendPasswordResetCode(email, otpCode);

      res.status(200).json({
        message: 'A 6-digit verification code has been sent to your email address. Please check your inbox.'
      });
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset code' });
    }

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
