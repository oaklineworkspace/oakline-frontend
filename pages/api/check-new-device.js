import { supabaseAdmin } from '../../lib/supabaseAdmin';
import crypto from 'crypto';

// Generate device fingerprint from user agent and other data
function generateDeviceFingerprint(deviceInfo) {
  const data = JSON.stringify({
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    deviceType: deviceInfo.deviceType
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    const { deviceInfo } = req.body;
    if (!deviceInfo) {
      return res.status(400).json({ error: 'Device info required' });
    }

    // Generate device fingerprint
    const fingerprint = generateDeviceFingerprint(deviceInfo);

    // Check if device exists in user's trusted devices
    const { data: trustedDevices } = await supabaseAdmin
      .from('trusted_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .single();

    // If device is trusted, return success
    if (trustedDevices) {
      return res.status(200).json({
        isNewDevice: false,
        message: 'Device already trusted'
      });
    }

    // New device detected - generate and send verification code
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code
    const { error: codeError } = await supabaseAdmin
      .from('device_verification_codes')
      .insert({
        user_id: user.id,
        device_fingerprint: fingerprint,
        verification_code: verificationCode,
        expires_at: codeExpiry.toISOString(),
        device_info: JSON.stringify(deviceInfo)
      });

    if (codeError) {
      console.error('Failed to store verification code:', codeError);
      return res.status(500).json({ error: 'Failed to generate code' });
    }

    // Get user profile and bank details for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_security, phone')
      .limit(1)
      .single();

    const userName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'Valued Customer';
    const supportEmail = bankDetails?.email_security || 'security@theoaklinebank.com';
    const supportPhone = bankDetails?.phone || '+1 (636) 635-6122';

    // Send verification code via email
    const emailHtml = `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 30px; }
          .code-box { background-color: #eff6ff; border: 2px solid #3b82f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; }
          .device-info { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; font-size: 13px; }
          .warning { color: #dc2626; font-weight: bold; }
          .footer { background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 New Device Login Alert</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>A new device is attempting to access your Oakline Bank account. For your security, we need you to verify this device.</p>
            
            <p><strong>Your verification code:</strong></p>
            <div class="code-box">
              <div class="code">${verificationCode}</div>
              <p style="margin-top: 10px; color: #666;">Code expires in 10 minutes</p>
            </div>

            <div class="device-info">
              <strong>Device Details:</strong><br>
              Device Type: ${deviceInfo.deviceType}<br>
              Operating System: ${deviceInfo.os}<br>
              Browser: ${deviceInfo.browser}
            </div>

            <p><strong class="warning">⚠️ Didn't try to log in?</strong></p>
            <p>If this wasn't you, your account may be at risk. Please:</p>
            <ul>
              <li>Change your password immediately</li>
              <li>Contact our security team: ${supportEmail} or ${supportPhone}</li>
              <li>Review recent activity in your account settings</li>
            </ul>

            <p>For your security, never share this code with anyone, including Oakline Bank staff.</p>
          </div>
          <div class="footer">
            <p>Oakline Bank | Secure Banking Platform</p>
            <p>This is an automated security notification. Do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      NEW DEVICE LOGIN ALERT - Oakline Bank

      Hi ${userName},

      A new device is attempting to access your Oakline Bank account. Your verification code is:

      ${verificationCode}

      Code expires in 10 minutes.

      DEVICE DETAILS:
      Device Type: ${deviceInfo.deviceType}
      Operating System: ${deviceInfo.os}
      Browser: ${deviceInfo.browser}

      ⚠️ Didn't try to log in?
      If this wasn't you, change your password immediately and contact:
      ${supportEmail} or ${supportPhone}

      Never share this code with anyone.

      Oakline Bank | Automated notification. Do not reply.
    `;

    // Send email
    try {
      const { sendEmail } = await import('../../lib/email');
      await sendEmail({
        to: user.email,
        subject: '🔐 Verify New Device Login - Oakline Bank',
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: user.id
      });
    } catch (emailError) {
      console.error('Failed to send device verification email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      isNewDevice: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Check new device error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
