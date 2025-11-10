import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

// Define EMAIL_TYPES if it's not globally available or imported elsewhere.
// Assuming it's an object like { VERIFY: 'verify' }
const EMAIL_TYPES = {
  VERIFY: 'verify',
  // Add other types if they exist, e.g., PASSWORD_RESET: 'password-reset'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const { data: existingApp } = await supabaseAdmin
      .from('applications')
      .select('email')
      .eq('email', normalizedEmail)
      .single();

    if (existingApp) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please sign in or use a different email.'
      });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { data: existingVerification } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existingVerification) {
      const { error: updateError } = await supabaseAdmin
        .from('email_verifications')
        .update({
          verification_code: verificationCode,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (updateError) {
        console.error('Error updating verification:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('email_verifications')
        .insert([{
          email: normalizedEmail,
          verification_code: verificationCode,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating verification:', insertError);
        throw insertError;
      }
    }

    try {
      // Check if SMTP is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
        return res.status(500).json({
          error: 'Email service is not configured. Please contact support.',
          details: 'SMTP credentials are missing'
        });
      }

      console.log('Attempting to send verification email to:', normalizedEmail);

      // Define the email HTML structure
      const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f6f8;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Oakline Bank</h1>
                <p style="color: #FFC857; margin: 5px 0 0 0; font-size: 14px;">Your Financial Partner</p>
              </div>

              <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1A3E6F; margin-top: 0;">Email Verification</h2>
                <p style="color: #333; line-height: 1.6;">Thank you for choosing Oakline Bank! Please use the verification code below to complete your application:</p>

                <div style="background: #f5f6f8; border-left: 4px solid #FFC857; padding: 20px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #1A3E6F; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                    ${verificationCode}
                  </div>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">This code will expire in 15 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #999; font-size: 12px; margin: 5px 0;">
                    © 2025 Oakline Bank. All rights reserved.<br>
                    Member FDIC | Equal Housing Lender
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

      // Use the verify email type for verification codes
      await sendEmail({
        to: normalizedEmail,
        subject: '🔐 Your Oakline Bank Verification Code',
        html: emailHtml,
        emailType: EMAIL_TYPES.VERIFY // Using the defined constant
      });

      console.log('✅ Verification email sent successfully to:', normalizedEmail);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });

      return res.status(500).json({
        error: 'Failed to send verification email. Please check your email address and try again.',
        details: process.env.NODE_ENV === 'development' ? emailError.message : 'Email service error'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 900
    });

  } catch (error) {
    console.error('Error in send-verification-code:', error);
    return res.status(500).json({
      error: 'Failed to send verification code',
      details: error.message
    });
  }
}