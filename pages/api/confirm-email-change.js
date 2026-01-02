import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { validateNewEmailVerificationCode, clearNewEmailVerificationCode } from '../../lib/verificationStorage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { verificationCode, newEmail } = req.body;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: tokenError } = await supabase.auth.getUser(token);

    if (tokenError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    if (!verificationCode || !newEmail) {
      return res.status(400).json({ error: 'Verification code and email required' });
    }

    // Validate the code using in-memory storage
    const validation = await validateNewEmailVerificationCode(currentUser.id, newEmail, verificationCode);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Update email in auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      currentUser.id,
      { email: newEmail }
    );

    if (updateError) {
      console.error('Auth update error:', updateError);
      return res.status(400).json({ error: updateError.message || 'Failed to change email' });
    }

    // Update email in profiles table
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', currentUser.id);
    } catch (profileError) {
      console.log('Note: profiles table update skipped');
    }

    // Update email in applications table
    try {
      await supabaseAdmin
        .from('applications')
        .update({ email: newEmail })
        .eq('user_id', currentUser.id);
    } catch (appError) {
      console.log('Note: applications table update skipped');
    }

    // Clear the verification code from memory
    await clearNewEmailVerificationCode(currentUser.id);
    console.log('✅ Email change completed for user:', currentUser.id, 'new email:', newEmail);

    // Send confirmation email to old email (from currentUser.email before update)
    try {
      const { sendEmail } = await import('../../lib/email');
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
                <strong>🔒 Security Notice:</strong> If you did not make this change, please contact us immediately at security@theoaklinebank.com.
              </p>
            </div>

            <p style="font-size: 13px; color: #666; margin: 28px 0 8px 0;">
              Need help? Contact our support team:
            </p>
            <p style="font-size: 13px; color: #0052A3; margin: 0; font-weight: 500;">
              📧 support@theoaklinebank.com
            </p>
          </div>

          <div style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e9ecef; font-size: 12px; color: #999;">
            <p style="margin: 0;">Oakline Bank | Secure Banking Platform</p>
            <p style="margin: 8px 0 0 0;">This is an automated security notification. Do not reply to this email.</p>
          </div>
        </body>
        </html>
      `;

      const emailText = `
        EMAIL ADDRESS CHANGED - Oakline Bank

        Hello,

        Your email address has been successfully changed to: ${newEmail}

        You will now receive all communications at your new email.

        If you did not make this change, please contact us immediately.

        Oakline Bank | Automated notification. Do not reply.
      `;

      await sendEmail({
        to: currentUser.email,
        subject: '✅ Email Address Changed - Oakline Bank',
        text: emailText,
        html: confirmationHtml,
        emailType: 'security',
        userId: currentUser.id
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Email changed successfully'
    });
  } catch (error) {
    console.error('Confirm email change error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
