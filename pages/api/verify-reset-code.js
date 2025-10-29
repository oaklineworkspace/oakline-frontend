import { supabaseAdmin } from '../../lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    const passwordErrors = validatePasswordStrength(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: passwordErrors.join('. ') });
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     'unknown';

    const now = new Date();

    let { data: attemptData } = await supabaseAdmin
      .from('password_reset_attempts')
      .select('*')
      .eq('email', email)
      .eq('ip_address', clientIp)
      .single();

    if (attemptData) {
      if (attemptData.locked_until) {
        const lockedUntil = new Date(attemptData.locked_until);
        if (now < lockedUntil) {
          const remainingMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
          return res.status(429).json({ 
            error: `Too many failed attempts. Your account is locked. Please try again in ${remainingMinutes} minutes.` 
          });
        } else {
          await supabaseAdmin
            .from('password_reset_attempts')
            .update({ 
              attempt_count: 0, 
              locked_until: null,
              updated_at: now.toISOString()
            })
            .eq('email', email)
            .eq('ip_address', clientIp);
          attemptData.attempt_count = 0;
          attemptData.locked_until = null;
        }
      }
    } else {
      const { data: newAttempt } = await supabaseAdmin
        .from('password_reset_attempts')
        .insert({
          email,
          ip_address: clientIp,
          attempt_count: 0
        })
        .select()
        .single();
      attemptData = newAttempt;
    }

    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from('password_reset_otps')
      .select('*')
      .eq('email', email)
      .single();

    if (otpError || !otpRecord) {
      const newAttemptCount = (attemptData?.attempt_count || 0) + 1;
      
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        await supabaseAdmin
          .from('password_reset_attempts')
          .update({ 
            attempt_count: newAttemptCount,
            locked_until: lockedUntil.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('email', email)
          .eq('ip_address', clientIp);
        
        return res.status(429).json({ 
          error: 'Too many failed attempts. Your account has been temporarily locked for 30 minutes.' 
        });
      }

      await supabaseAdmin
        .from('password_reset_attempts')
        .update({ 
          attempt_count: newAttemptCount,
          updated_at: now.toISOString()
        })
        .eq('email', email)
        .eq('ip_address', clientIp);

      const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
      return res.status(400).json({ 
        error: `Invalid or expired verification code. ${remainingAttempts} attempts remaining.` 
      });
    }

    if (otpRecord.used) {
      return res.status(400).json({ error: 'This verification code has already been used' });
    }

    const expiresAt = new Date(otpRecord.expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const isValidCode = await bcrypt.compare(code, otpRecord.otp);

    if (!isValidCode) {
      const newAttemptCount = (attemptData?.attempt_count || 0) + 1;
      
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        await supabaseAdmin
          .from('password_reset_attempts')
          .update({ 
            attempt_count: newAttemptCount,
            locked_until: lockedUntil.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('email', email)
          .eq('ip_address', clientIp);
        
        return res.status(429).json({ 
          error: 'Too many failed attempts. Your account has been temporarily locked for 30 minutes.' 
        });
      }
      
      await supabaseAdmin
        .from('password_reset_attempts')
        .update({ 
          attempt_count: newAttemptCount,
          updated_at: now.toISOString()
        })
        .eq('email', email)
        .eq('ip_address', clientIp);

      const remainingAttempts = MAX_ATTEMPTS - newAttemptCount;
      return res.status(400).json({ 
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.` 
      });
    }

    await supabaseAdmin
      .from('password_reset_attempts')
      .delete()
      .eq('email', email)
      .eq('ip_address', clientIp);

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
