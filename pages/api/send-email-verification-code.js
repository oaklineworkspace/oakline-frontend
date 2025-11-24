import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../lib/email';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Store verification codes in memory (in production, use Redis or DB)
const verificationCodes = new Map();

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
    verificationCodes.set(currentUser.id, {
      code: verificationCode,
      email: currentUser.email,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email with verification code using the sendEmail function
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🔐 Email Change Verification</h1>
        </div>

        <div style="background: #fff; padding: 32px 24px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; margin-bottom: 8px;">Dear Valued Customer,</p>

          <p style="font-size: 14px; color: #555; margin-bottom: 18px;">
            You requested to change your email address on your Oakline Bank account. Use the verification code below to complete this change.
          </p>

          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0066cc; border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center;">
            <p style="color: #1a365d; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </p>
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 280px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);">
              <p style="color: #0066cc; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 16px 0 0 0;">
              This code will expire in 10 minutes
            </p>
          </div>

          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px;">
            <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
              <strong>⚠️ Security Notice:</strong> Never share this code with anyone. Oakline Bank staff will never ask for your verification code.
            </p>
          </div>

          <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 20px 0;">
            If you did not request to change your email, please contact our security team immediately at security@theoaklinebank.com or call +1 (636) 635-6122.
          </p>

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666; margin: 3px 0;">Oakline Bank</p>
            <p style="font-size: 11px; color: #999; margin: 3px 0;">Automated notification. Do not reply.</p>
            <p style="font-size: 11px; color: #999; margin: 10px 0 0 0;">
              © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
              Member FDIC | Equal Housing Lender | Routing: 075915826
            </p>
          </div>
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

export { verificationCodes };
