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
    try {
      const { sendEmail } = await import('../../lib/email');
      
      // Generate verification code for new email
      const newEmailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store code
      await supabaseAdmin
        .from('email_verification_codes')
        .upsert({
          user_id: currentUser.id,
          new_email: newEmail,
          code: newEmailVerificationCode,
          expires_at: codeExpiry.toISOString(),
          verified: false
        }, {
          onConflict: 'user_id,new_email'
        })
        .catch(() => {});

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

      await sendEmail({
        to: newEmail,
        subject: '🔐 Verify Your New Email Address - Oakline Bank',
        text: verificationText,
        html: verificationHtml,
        emailType: 'security',
        userId: currentUser.id
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    // OLD: Send confirmation email to old email address
    // This is now done after the new email is verified in confirm-email-change.js
    const confirmationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
          <div style="background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%); padding: 40px 24px; text-align: center; color: white;">
            <div style="font-size: 28px; margin-bottom: 8px;">✅</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Email Address Changed</h1>
            <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Your account is secure</p>
          </div>

          <div style="background: #ffffff; padding: 40px 24px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">Hello,</p>

            <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 16px; border-radius: 4px; margin: 24px 0;">
              <p style="color: #2e7d32; font-size: 14px; font-weight: 500; margin: 0;">
                Your email address has been successfully changed to: <strong>${newEmail}</strong>
              </p>
            </div>

            <p style="font-size: 14px; color: #555; margin: 28px 0; line-height: 1.8;">
              This is a confirmation that your Oakline Bank account email address has been updated. You will now receive all future communications at your new email address.
            </p>

            <p style="font-size: 14px; color: #555; margin: 0 0 24px 0; line-height: 1.8;">
              <strong>What's next:</strong>
            </p>
            <ul style="font-size: 13px; color: #666; margin: 0 0 28px 0; padding-left: 24px; line-height: 1.8;">
              <li style="margin-bottom: 8px;">Log in to your account using your new email address</li>
              <li style="margin-bottom: 8px;">Update any saved contact information</li>
              <li>Keep your account secure by not sharing your login credentials</li>
            </ul>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 28px 0;">
              <p style="color: #856404; font-size: 13px; font-weight: 500; margin: 0;">
                <strong>🔒 Security Notice:</strong> If you did not make this change, please contact us immediately at security@theoaklinebank.com or +1 (636) 635-6122.
              </p>
            </div>

            <p style="font-size: 13px; color: #666; margin: 28px 0 8px 0;">
              Need help? Contact our support team:
            </p>
            <p style="font-size: 13px; color: #0052A3; margin: 0; font-weight: 500;">
              📧 support@theoaklinebank.com | 📞 +1 (636) 635-6122
            </p>

            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 32px 0;">

            <p style="font-size: 11px; color: #999; margin: 0 0 8px 0; text-align: center;">
              This is an automated notification. Please do not reply to this email.
            </p>
            <p style="font-size: 11px; color: #999; margin: 0; text-align: center;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender | Routing Number: 075915826
            </p>
          </div>
        </body>
        </html>
      `;

      const confirmationText = `
        EMAIL ADDRESS CHANGED - Oakline Bank

        Your email address has been successfully changed to: ${newEmail}

        This is a confirmation that your Oakline Bank account email address has been updated.

        What's next:
        - Log in to your account using your new email address
        - Update any saved contact information
        - Keep your account secure

        Security Notice: If you did not make this change, please contact us immediately.

        Support: security@theoaklinebank.com or +1 (636) 635-6122

        ---
        Oakline Bank
        Automated notification. Do not reply.
      `;

      await sendEmail({
        to: currentUser.email,
        subject: '✅ Your Email Address Has Been Changed - Oakline Bank',
        text: confirmationText,
        html: confirmationHtml,
        emailType: 'security',
        userId: currentUser.id
      });

      console.log('✅ Confirmation email sent to old email address:', currentUser.email);
    } catch (emailError) {
      console.error('Note: Failed to send confirmation email:', emailError);
      // Don't fail the API if confirmation email doesn't send - the change was successful
    }

    return res.status(200).json({
      success: true,
      message: 'Email changed successfully! Confirmation sent to your old email address.',
      newEmail
    });
  } catch (error) {
    console.error('Email change error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
