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
      .select('loginalerts')
      .eq('user_id', user.id)
      .single();

    // If no settings exist or loginAlerts is disabled, don't send notification
    if (settingsError || !securitySettings || !securitySettings.loginalerts) {
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

    // Get login details from the activity log
    const {
      ip_address,
      device_type,
      browser,
      os,
      city,
      country,
      timezone,
      isp,
      timestamp = new Date().toISOString()
    } = loginDetails || {};

    // Use provided data from client, with fallback
    let actualIp = ip_address || 'Unknown';
    let actualCity = city || 'Unknown';
    let actualCountry = country || 'Unknown';

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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 New Login Detected</h1>
        </div>
        
        <div style="background: #ffffff; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 15px; margin-bottom: 15px;">Dear ${userName},</p>
          
          <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
            Your Oakline Bank account was accessed. Here are the details:
          </p>
          
          <div style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 16px;">Login Details</h3>
            
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📅 Date & Time:</td>
                <td style="padding: 6px 0; color: #1e293b;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">📍 Location:</td>
                <td style="padding: 6px 0; color: #1e293b;">${actualCity && actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Location not available'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">💻 Device:</td>
                <td style="padding: 6px 0; color: #1e293b;">${device_type || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🌐 Browser:</td>
                <td style="padding: 6px 0; color: #1e293b;">${browser || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">🔢 IP:</td>
                <td style="padding: 6px 0; color: #1e293b;">${actualIp || 'Not available'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 12px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #166534;">
              <strong>✅ Recognize this?</strong> No action needed.
            </p>
          </div>
          
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 12px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #991b1b;">
              <strong>⚠️ Don't recognize this?</strong> Change your password and contact security@theoaklinebank.com immediately.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 12px; color: #94a3b8; margin: 3px 0;">Oakline Bank - Your Financial Partner</p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 3px 0;">Automated security notification. Do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      New Login Detected - Oakline Bank
      
      Dear ${userName},
      
      Your Oakline Bank account was accessed. Here are the details:
      
      LOGIN DETAILS:
      Date & Time: ${formattedDate}
      Location: ${actualCity && actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Location not available'}
      Device: ${device_type || 'Unknown'}
      Browser: ${browser || 'Unknown'}
      IP Address: ${actualIp || 'Not available'}
      
      ✅ RECOGNIZE THIS? No action needed.
      
      ⚠️ DON'T RECOGNIZE THIS? Change your password and contact security@theoaklinebank.com immediately.
      
      Oakline Bank - Your Financial Partner
      Automated security notification. Do not reply.
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
