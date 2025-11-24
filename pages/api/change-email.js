import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { validateVerificationCode, clearVerificationCode } from '../../lib/verificationStorage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newEmail, verificationCode, ssn } = req.body;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const token = authHeader.substring(7);

    // Verify the token by getting the user
    const { data: { user: currentUser }, error: tokenError } = await supabase.auth.getUser(token);
    if (tokenError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    // Validate new email
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (newEmail === currentUser.email) {
      return res.status(400).json({ error: 'New email must be different from current email' });
    }

    // Verify user identity with either verification code or SSN
    let isCodeVerified = false;
    if (verificationCode) {
      // Check verification code
      const codeValidation = await validateVerificationCode(currentUser.id, verificationCode);
      
      if (!codeValidation.valid) {
        return res.status(400).json({ error: codeValidation.error });
      }

      // Mark code as verified, but don't clear it yet (will clear after successful email update)
      isCodeVerified = true;
    } else if (ssn) {
      // Verify SSN
      if (!ssn || ssn.length !== 4) {
        return res.status(400).json({ error: 'Invalid SSN format. Please enter last 4 digits.' });
      }

      // Get user's SSN from applications table
      try {
        const { data: appData, error: appError } = await supabaseAdmin
          .from('applications')
          .select('ssn')
          .eq('user_id', currentUser.id)
          .single();

        if (appError || !appData) {
          return res.status(400).json({ error: 'Could not verify identity. Please use email verification instead.' });
        }

        // Check if last 4 digits match
        const lastFour = appData.ssn ? appData.ssn.slice(-4) : null;
        if (lastFour !== ssn) {
          return res.status(400).json({ error: 'SSN does not match our records' });
        }
      } catch (error) {
        console.error('SSN verification error:', error);
        return res.status(400).json({ error: 'Could not verify identity' });
      }
    } else {
      return res.status(400).json({ error: 'Please verify your identity with either a verification code or SSN' });
    }

    // Clear the verification code after identity is verified
    if (isCodeVerified) {
      await clearVerificationCode(currentUser.id);
    }

    console.log('✅ Identity verified for user:', currentUser.id, 'for email change to:', newEmail);

    // Send verification code to new email address instead
    const newEmailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store code
    try {
      const { error: storeError } = await supabaseAdmin
        .from('email_verification_codes')
        .insert({
          user_id: currentUser.id,
          new_email: newEmail,
          code: newEmailVerificationCode,
          expires_at: codeExpiry.toISOString(),
          verified: false
        });

      if (storeError) {
        console.error('Failed to store verification code:', storeError);
      }
    } catch (storageError) {
      console.error('Error storing verification code:', storageError);
    }

    // Send email
    try {
      const { sendEmail } = await import('../../lib/email');
      
      const verificationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%); padding: 40px 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Verify Your New Email</h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Confirm this is your email address</p>
          </div>

          <div style="background: #ffffff; padding: 40px 24px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">Hello,</p>

            <p style="font-size: 14px; color: #555; margin: 0 0 28px 0; line-height: 1.8;">
              You requested to change your Oakline Bank account email address. To complete this change, please verify this email by entering the code below.
            </p>

            <div style="background: #f0f7ff; border: 2px solid #0052A3; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
              <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">Your verification code:</p>
              <div style="font-size: 36px; font-weight: bold; color: #0052A3; letter-spacing: 8px; margin: 10px 0;">
                ${newEmailVerificationCode}
              </div>
              <p style="font-size: 12px; color: #999; margin: 12px 0 0 0;">This code expires in 15 minutes</p>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 28px 0;">
              <p style="color: #856404; font-size: 13px; font-weight: 500; margin: 0;">
                <strong>🔒 Security Notice:</strong> Never share this code with anyone.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const verificationText = `
        VERIFY YOUR NEW EMAIL - Oakline Bank

        You requested to change your Oakline Bank email. Your verification code is:

        ${newEmailVerificationCode}

        Code expires in 15 minutes.

        Never share this code with anyone.
      `;

      console.log('📧 Sending verification email to:', newEmail);
      await sendEmail({
        to: newEmail,
        subject: '🔐 Verify Your New Email Address - Oakline Bank',
        text: verificationText,
        html: verificationHtml,
        emailType: 'security',
        userId: currentUser.id
      });
      console.log('✅ Verification email sent successfully to:', newEmail);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: '✅ Verification code sent to your new email. Check your inbox to confirm the email change.',
      newEmail
    });
  } catch (error) {
    console.error('Email change error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
