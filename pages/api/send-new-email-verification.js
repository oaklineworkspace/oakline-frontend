import crypto from 'crypto';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { newEmail } = req.body;
  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    if (!newEmail) {
      return res.status(400).json({ error: 'New email required' });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const codeHash = crypto.createHash('sha256').update(verificationCode).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code in temporary storage (using a simple approach)
    // In production, you might want to use a cache or dedicated table
    const { error: storeError } = await supabaseAdmin
      .from('email_verification_codes')
      .insert({
        user_id: user.id,
        new_email: newEmail,
        code: verificationCode,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
        verified: false
      })
      .catch(async () => {
        // If table doesn't exist, try to delete old codes and insert
        try {
          await supabaseAdmin
            .from('email_verification_codes')
            .delete()
            .eq('user_id', user.id)
            .eq('verified', false);
        } catch (e) {}
        
        return await supabaseAdmin
          .from('email_verification_codes')
          .insert({
            user_id: user.id,
            new_email: newEmail,
            code: verificationCode,
            code_hash: codeHash,
            expires_at: expiresAt.toISOString(),
            verified: false
          });
      });

    // Get user profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_security, phone')
      .limit(1)
      .single();

    const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Valued Customer';
    const supportEmail = bankDetails?.email_security || 'security@theoaklinebank.com';

    // Send verification code to NEW email
    const emailHtml = `
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
          <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">Hi ${userName},</p>

          <p style="font-size: 14px; color: #555; margin: 0 0 28px 0; line-height: 1.8;">
            You requested to change your Oakline Bank account email address. To complete this change, please verify this email by entering the code below in your account settings.
          </p>

          <div style="background: #f0f7ff; border: 2px solid #0052A3; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">Your verification code:</p>
            <div style="font-size: 36px; font-weight: bold; color: #0052A3; letter-spacing: 8px; margin: 10px 0;">
              ${verificationCode}
            </div>
            <p style="font-size: 12px; color: #999; margin: 12px 0 0 0;">This code expires in 15 minutes</p>
          </div>

          <p style="font-size: 14px; color: #555; margin: 28px 0; line-height: 1.8;">
            If you did not request this change, please ignore this email. Your email address will not be changed unless you verify it.
          </p>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 28px 0;">
            <p style="color: #856404; font-size: 13px; font-weight: 500; margin: 0;">
              <strong>🔒 Security Notice:</strong> Never share this code with anyone, including Oakline Bank staff.
            </p>
          </div>

          <p style="font-size: 13px; color: #666; margin: 28px 0 8px 0;">
            Need help? Contact our support team:
          </p>
          <p style="font-size: 13px; color: #0052A3; margin: 0; font-weight: 500;">
            📧 ${supportEmail}
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
      VERIFY YOUR NEW EMAIL - Oakline Bank

      Hi ${userName},

      You requested to change your Oakline Bank email address. Your verification code is:

      ${verificationCode}

      Code expires in 15 minutes.

      If you did not request this change, please ignore this email.

      Security Notice: Never share this code with anyone.

      Oakline Bank | Automated notification. Do not reply.
    `;

    // Send email
    try {
      const { sendEmail } = await import('../../lib/email');
      await sendEmail({
        to: newEmail,
        subject: '🔐 Verify Your New Email Address - Oakline Bank',
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: user.id
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your new email'
    });
  } catch (error) {
    console.error('Send new email verification error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
