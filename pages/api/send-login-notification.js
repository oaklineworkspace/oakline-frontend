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

    // Get bank details for phone number
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('phone')
      .limit(1)
      .single();

    const supportPhone = bankDetails?.phone || '+1 (636) 635-6122';

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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 600;">🔐 Account Access Notification</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <p style="font-size: 16px; margin-bottom: 10px; font-weight: 500;">Dear ${userName},</p>
          
          <p style="font-size: 15px; color: #475569; margin-bottom: 25px; line-height: 1.7;">
            We are writing to inform you that a successful login to your Oakline Bank account has been detected. As part of our commitment to maintaining the highest standards of account security, we have recorded the following access details for your review:
          </p>
          
          <div style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 10px; padding: 25px; margin: 25px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 18px 0; color: #1e40af; font-size: 18px; font-weight: 600; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Access Details</h3>
            
            <table style="width: 100%; font-size: 14px; border-collapse: separate; border-spacing: 0 8px;">
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; width: 35%; vertical-align: top;">📅 Date & Time:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; vertical-align: top;">📍 Location:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${actualCity && actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Location not available'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; vertical-align: top;">📱 Device Type:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${loginDetails?.device_model || device_type || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; vertical-align: top;">💻 Operating System:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${os || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; vertical-align: top;">🌐 Browser:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${browser || 'Unknown'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; color: #64748b; font-weight: 600; vertical-align: top;">🔢 IP Address:</td>
                <td style="padding: 10px 12px; color: #1e293b; font-weight: 500; background: #ffffff; border-radius: 6px;">${actualIp || 'Not available'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dcfce7; border-left: 5px solid #16a34a; padding: 16px 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">
              <strong style="display: block; margin-bottom: 5px;">✅ If You Recognize This Activity</strong>
              No further action is required. You may disregard this notification.
            </p>
          </div>
          
          <div style="background: #fee2e2; border-left: 5px solid #dc2626; padding: 16px 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
              <strong style="display: block; margin-bottom: 5px;">⚠️ If You Do Not Recognize This Activity</strong>
              Please take immediate action to secure your account by changing your password and contacting our security team at <a href="mailto:security@theoaklinebank.com" style="color: #991b1b; font-weight: 600; text-decoration: none;">security@theoaklinebank.com</a> or call us at ${supportPhone}.
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; margin: 25px 0; border-radius: 8px; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; line-height: 1.6;">
              <strong style="color: #475569;">Security Reminder:</strong> Oakline Bank will never ask you to share your password, PIN, or verification codes via email or phone. Please report any suspicious communications immediately.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
            <p style="font-size: 13px; color: #64748b; margin: 5px 0; font-weight: 500;">Oakline Bank - Your Trusted Financial Partner</p>
            <p style="font-size: 12px; color: #94a3b8; margin: 5px 0;">This is an automated security notification. Please do not reply to this email.</p>
            <p style="font-size: 11px; color: #cbd5e1; margin: 8px 0 0 0;">© ${new Date().getFullYear()} Oakline Bank. All rights reserved. Member FDIC.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      ACCOUNT ACCESS NOTIFICATION - Oakline Bank
      
      Dear ${userName},
      
      We are writing to inform you that a successful login to your Oakline Bank account has been detected. As part of our commitment to maintaining the highest standards of account security, we have recorded the following access details for your review:
      
      ACCESS DETAILS:
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Date & Time: ${formattedDate}
      Location: ${actualCity && actualCity !== 'Unknown' ? `${actualCity}, ${actualCountry}` : 'Location not available'}
      Device Type: ${loginDetails?.device_model || device_type || 'Unknown'}
      Operating System: ${os || 'Unknown'}
      Browser: ${browser || 'Unknown'}
      IP Address: ${actualIp || 'Not available'}
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      
      ✅ IF YOU RECOGNIZE THIS ACTIVITY:
      No further action is required. You may disregard this notification.
      
      ⚠️ IF YOU DO NOT RECOGNIZE THIS ACTIVITY:
      Please take immediate action to secure your account by:
      1. Changing your password immediately
      2. Contacting our security team at security@theoaklinebank.com
      3. Or calling us at ${supportPhone}
      
      SECURITY REMINDER:
      Oakline Bank will never ask you to share your password, PIN, or verification codes via email or phone. Please report any suspicious communications immediately.
      
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      Oakline Bank - Your Trusted Financial Partner
      This is an automated security notification. Please do not reply to this email.
      © ${new Date().getFullYear()} Oakline Bank. All rights reserved. Member FDIC.
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
