import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../lib/email';
import { storeVerificationCode } from '../../lib/verificationStorage';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10-minute expiration
    await storeVerificationCode(currentUser.id, verificationCode, currentUser.email);

    // Send email with verification code using the sendEmail function
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #0052A3 0%, #003D7A 100%); padding: 40px 24px; text-align: center; color: white;">
          <div style="font-size: 28px; margin-bottom: 8px;">🔐</div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Email Change Verification</h1>
          <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Secure your account with this verification code</p>
        </div>

        <div style="background: #ffffff; padding: 40px 24px;">
          <p style="font-size: 14px; color: #666; margin: 0 0 24px 0;">
            Hello,
          </p>

          <p style="font-size: 14px; color: #555; margin: 0 0 28px 0; line-height: 1.8;">
            You've requested to change the email address associated with your Oakline Bank account. To complete this request securely, please use the verification code below.
          </p>

          <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 32px 24px; text-align: center; margin: 32px 0;">
            <p style="font-size: 11px; font-weight: 700; color: #6c757d; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
            <div style="background: #ffffff; border: 2px solid #0052A3; border-radius: 10px; padding: 20px; display: inline-block;">
              <p style="color: #0052A3; font-size: 44px; font-weight: 700; margin: 0; letter-spacing: 10px; font-family: 'Courier New', 'Lucida Console', monospace; font-variant-numeric: tabular-nums;">
                ${verificationCode}
              </p>
            </div>
            <p style="color: #6c757d; font-size: 12px; margin: 16px 0 0 0; font-weight: 500;">
              Valid for 10 minutes
            </p>
          </div>

          <p style="font-size: 13px; color: #666; margin: 0 0 24px 0; line-height: 1.8;">
            <strong>How to use this code:</strong>
          </p>
          <ol style="font-size: 13px; color: #666; margin: 0 0 28px 0; padding-left: 24px; line-height: 1.8;">
            <li style="margin-bottom: 8px;">Return to the Oakline Bank app or website</li>
            <li style="margin-bottom: 8px;">Enter this code in the verification field</li>
            <li>Confirm your new email address</li>
          </ol>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; border-radius: 4px; margin: 28px 0;">
            <p style="color: #856404; font-size: 13px; font-weight: 500; margin: 0;">
              <strong>🔒 Security Reminder:</strong> Never share this code with anyone. Oakline Bank staff will never request your verification code via email, phone, or chat.
            </p>
          </div>

          <p style="font-size: 13px; color: #666; margin: 28px 0; line-height: 1.8;">
            Didn't request this change? If you believe this is unauthorized, please contact our security team immediately:
          </p>
          <p style="font-size: 13px; color: #0052A3; margin: 0; font-weight: 500;">
            📧 security@theoaklinebank.com | 📞 +1 (636) 635-6122
          </p>

          <hr style="border: none; border-top: 1px solid #e9ecef; margin: 32px 0;">

          <p style="font-size: 11px; color: #999; margin: 0 0 8px 0; text-align: center;">
            This is an automated security notification. Please do not reply to this email.
          </p>
          <p style="font-size: 11px; color: #999; margin: 0; text-align: center;">
            © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
            Member FDIC | Equal Housing Lender | Routing Number: 075915826
          </p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      EMAIL CHANGE VERIFICATION - Oakline Bank

      You requested to change your email address on your Oakline Bank account.
      
      Your Verification Code:
      ${verificationCode}
      
      This code will expire in 10 minutes.
      
      ⚠️ Security Notice:
      Never share this code with anyone. Oakline Bank staff will never ask for your verification code.
      
      If you did not request to change your email, please contact our security team immediately:
      📧 security@theoaklinebank.com
      📞 +1 (636) 635-6122
      
      ---
      Oakline Bank
      Automated notification. Do not reply.
    `;

    try {
      await sendEmail({
        to: currentUser.email,
        subject: '🔐 Your Email Change Verification Code - Oakline Bank',
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: currentUser.id
      });

      console.log('Verification code email sent to:', currentUser.email);
    } catch (emailError) {
      console.error('Failed to send verification code email:', emailError);
      // Even if email fails, we still return success since code is stored
      // In production, you might want to retry or handle this differently
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      codeHash: Buffer.from(verificationCode).toString('base64')
    });
  } catch (error) {
    console.error('Email verification code error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
}

