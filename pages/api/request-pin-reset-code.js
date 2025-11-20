import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

    const { email } = req.body;

    if (!email || email !== user.email) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if user has a transaction PIN set
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('transaction_pin, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(400).json({ error: 'User profile not found' });
    }

    if (!profile?.transaction_pin) {
      return res.status(400).json({ error: 'No transaction PIN is set for this account' });
    }

    // Generate 6-digit verification code
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);

    // Store the hashed code in database (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: insertError } = await supabaseAdmin
      .from('pin_reset_codes')
      .insert({
        user_id: user.id,
        email: email,
        code_hash: hashedCode,
        expires_at: expiresAt.toISOString(),
        used: false
      });

    if (insertError) {
      // If table doesn't exist, try to create it first
      if (insertError.code === '42P01') {
        const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS pin_reset_codes (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id uuid NOT NULL REFERENCES auth.users(id),
              email text NOT NULL,
              code_hash text NOT NULL,
              expires_at timestamptz NOT NULL,
              used boolean DEFAULT false,
              created_at timestamptz DEFAULT now()
            );
          `
        });
        
        if (!createError) {
          // Retry insert
          const { error: retryError } = await supabaseAdmin
            .from('pin_reset_codes')
            .insert({
              user_id: user.id,
              email: email,
              code_hash: hashedCode,
              expires_at: expiresAt.toISOString(),
              used: false
            });
          
          if (retryError) {
            console.error('Retry insert error:', retryError);
            return res.status(500).json({ error: 'Failed to create reset code' });
          }
        }
      } else {
        console.error('Insert error:', insertError);
        return res.status(500).json({ error: 'Failed to create reset code' });
      }
    }

    // Send email with verification code
    const userName = profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Valued Customer';
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Transaction PIN Reset</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${userName},</p>
          
          <p style="font-size: 15px; color: #64748b; margin-bottom: 25px;">
            We received a request to reset your Transaction PIN for your Oakline Bank account. For security purposes, please use the verification code below to complete the reset process:
          </p>
          
          <div style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 10px; padding: 25px; text-align: center; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; font-weight: 600;">Your Verification Code</p>
            <p style="font-size: 36px; font-weight: bold; color: #1e40af; letter-spacing: 8px; margin: 0;">${verificationCode}</p>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⚠️ Important Security Notice:</strong><br>
              • This code will expire in 10 minutes<br>
              • Never share this code with anyone, including bank staff<br>
              • If you didn't request this reset, please contact us immediately
            </p>
          </div>
          
          <p style="font-size: 14px; color: #64748b; margin-top: 25px;">
            This is an automated security email from Oakline Bank. For questions or concerns, please contact our support team.
          </p>
          
          <div style="border-top: 2px solid #e2e8f0; margin-top: 30px; padding-top: 20px; text-align: center;">
            <p style="font-size: 13px; color: #94a3b8; margin: 5px 0;">Oakline Bank - Your Financial Partner</p>
            <p style="font-size: 12px; color: #cbd5e1; margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      Transaction PIN Reset Request
      
      Dear ${userName},
      
      We received a request to reset your Transaction PIN for your Oakline Bank account.
      
      Your Verification Code: ${verificationCode}
      
      This code will expire in 10 minutes.
      
      IMPORTANT SECURITY NOTICE:
      - Never share this code with anyone, including bank staff
      - If you didn't request this reset, please contact us immediately
      
      Oakline Bank - Your Financial Partner
    `;

    try {
      await sendEmail({
        to: email,
        subject: 'Transaction PIN Reset - Verification Code',
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: user.id
      });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    // Log the action
    await supabaseAdmin.from('system_logs').insert({
      user_id: user.id,
      level: 'info',
      type: 'auth',
      message: 'Transaction PIN reset code requested',
      details: { email, timestamp: new Date().toISOString() }
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Request PIN reset code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
