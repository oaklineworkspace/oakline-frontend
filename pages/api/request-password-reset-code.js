import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendPasswordResetCode } from '../../lib/email';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown';

    const now = new Date();
    const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS);

    const { data: rateLimit, error: rateLimitError } = await supabaseAdmin
      .from('password_reset_rate_limits')
      .select('*')
      .eq('email', email)
      .eq('ip_address', clientIp)
      .single();

    if (rateLimit) {
      const rateLimitWindowStart = new Date(rateLimit.window_start);
      
      if (now.getTime() - rateLimitWindowStart.getTime() < RATE_LIMIT_WINDOW_MS) {
        if (rateLimit.request_count >= MAX_REQUESTS_PER_WINDOW) {
          const remainingMinutes = Math.ceil((RATE_LIMIT_WINDOW_MS - (now.getTime() - rateLimitWindowStart.getTime())) / 60000);
          return res.status(429).json({ 
            error: `Too many password reset requests. Please try again in ${remainingMinutes} minutes.` 
          });
        }

        await supabaseAdmin
          .from('password_reset_rate_limits')
          .update({ 
            request_count: rateLimit.request_count + 1,
            updated_at: now.toISOString()
          })
          .eq('email', email)
          .eq('ip_address', clientIp);
      } else {
        await supabaseAdmin
          .from('password_reset_rate_limits')
          .update({ 
            request_count: 1,
            window_start: now.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('email', email)
          .eq('ip_address', clientIp);
      }
    } else {
      await supabaseAdmin
        .from('password_reset_rate_limits')
        .insert({
          email,
          ip_address: clientIp,
          request_count: 1,
          window_start: now.toISOString()
        });
    }

    await supabaseAdmin
      .from('password_reset_rate_limits')
      .delete()
      .lt('window_start', windowStart.toISOString());

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

    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = await bcrypt.hash(otpCode, 12);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const { data: existingOTP } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (existingOTP) {
      const { error: updateError } = await supabaseAdmin
        .from('password_reset_otps')
        .update({
          otp: hashedOtp,
          expires_at: expiresAt.toISOString(),
          used: false,
          created_at: now.toISOString()
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
          otp: hashedOtp,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (insertError) {
        console.error('Error inserting OTP:', insertError);
        return res.status(500).json({ error: 'Failed to generate reset code' });
      }
    }

    await supabaseAdmin
      .from('password_reset_attempts')
      .delete()
      .eq('email', email)
      .eq('ip_address', clientIp);

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
