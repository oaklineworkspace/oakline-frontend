import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

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

    const { loginDetails } = req.body;

    // Check if user has login notifications enabled
    const { data: securitySettings, error: settingsError } = await supabaseAdmin
      .from('user_security_settings')
      .select('login_notifications')
      .eq('user_id', user.id)
      .single();

    // If no settings exist or login_notifications is disabled, don't send notification
    if (settingsError || !securitySettings || !securitySettings.login_notifications || securitySettings.login_notifications === 'none') {
      return res.status(200).json({
        success: true,
        message: 'Login notifications disabled'
      });
    }

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Valued Customer';

    // Get bank details for phone number
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('phone')
      .limit(1)
      .single();

    const supportPhone = bankDetails?.phone || '+1 (636) 635-6122';

    // Get login details from the activity log
    const {
      device_type,
      device_model,
      browser: clientBrowser,
      os: clientOs,
      city,
      country,
      timezone,
      isp,
      timestamp = new Date().toISOString()
    } = loginDetails || {};

    // Extract real IP from request headers
    let actualIp = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.socket?.remoteAddress || 
                   'Unknown';
    
    // Handle x-forwarded-for which can be comma-separated
    if (actualIp && actualIp.includes(',')) {
      actualIp = actualIp.split(',')[0].trim();
    }
    
    let actualCity = city || 'Unknown';
    let actualCountry = country || 'Unknown';
    let actualOs = clientOs || 'Unknown';

    // Only try server-side lookup if we truly don't have location data
    if (actualCity === 'Unknown' && actualIp && actualIp !== 'Unknown') {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${actualIp}/json/`, {
          headers: {
            'User-Agent': 'Oakline-Bank-App/1.0'
          }
        });

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (!geoData.error) {
            actualCity = geoData.city || 'Unknown';
            actualCountry = geoData.country_name || 'Unknown';
          }
        }
      } catch (geoError) {
        console.error('Failed to get geolocation:', geoError);
      }
    }

    const loginDate = new Date(timestamp);
    const formattedDate = loginDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e40af; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🔐 Account Login Alert</h1>
        </div>

        <div style="background: #fff; padding: 25px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 15px; margin-bottom: 8px;">Dear ${userName},</p>

          <p style="font-size: 14px; color: #555; margin-bottom: 18px;">
            Your account was accessed. Review the details:
          </p>

          <div style="background: #f5f5f5; border: 2px solid #3b82f6; border-radius: 8px; padding: 18px; margin: 18px 0;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #666; width: 30%;">📅 Time:</td>
                <td style="padding: 6px 0; color: #000;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">📍 Location:</td>
                <td style="padding: 6px 0; color: #000;">${actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Not available'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">📱 Device:</td>
                <td style="padding: 6px 0; color: #000;">${device_model || device_type || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">💻 System:</td>
                <td style="padding: 6px 0; color: #000;">${actualOs}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">🌐 Browser:</td>
                <td style="padding: 6px 0; color: #000;">${clientBrowser || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #666;">🔢 IP:</td>
                <td style="padding: 6px 0; color: #000;">${actualIp || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 12px 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #065f46;">
              <strong>✅ This was you?</strong><br>No action needed.
            </p>
          </div>

          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #991b1b;">
              <strong>⚠️ Not you?</strong><br>Change password now & contact security@theoaklinebank.com or ${supportPhone}
            </p>
          </div>

          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666; margin: 3px 0;">Oakline Bank</p>
            <p style="font-size: 11px; color: #999; margin: 3px 0;">Automated notification. Do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      ACCOUNT LOGIN ALERT - Oakline Bank

      Dear ${userName},

      Your account was accessed. Review the details:

      DETAILS:
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Time: ${formattedDate}
      Location: ${actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Not available'}
      Device: ${device_model || device_type || 'Unknown'}
      System: ${actualOs}
      Browser: ${clientBrowser || 'Unknown'}
      IP: ${actualIp || 'N/A'}
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      ✅ This was you?
      No action needed.

      ⚠️ Not you?
      Change password now & contact security@theoaklinebank.com or ${supportPhone}

      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Oakline Bank
      Automated notification. Do not reply.
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: '🔐 New Login to Your Oakline Bank Account',
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: user.id
      });

      console.log(`Login notification sent to ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'Login notification sent successfully'
      });
    } catch (emailError) {
      console.error('Failed to send login notification email:', emailError);
      // Don't fail the login if email sending fails
      return res.status(200).json({
        success: true,
        message: 'Login successful but notification email failed'
      });
    }

  } catch (error) {
    console.error('Send login notification error:', error);
    // Don't fail the login if notification fails
    return res.status(200).json({
      success: true,
      message: 'Login successful'
    });
  }
}