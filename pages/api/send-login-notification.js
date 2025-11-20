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

    // Get login details
    const {
      ip_address = 'Unknown',
      device_type = 'Unknown',
      browser = 'Unknown',
      os = 'Unknown',
      city = 'Unknown',
      country = 'Unknown',
      timestamp = new Date().toISOString()
    } = loginDetails || {};

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
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 New Login Detected</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${userName},</p>
          
          <p style="font-size: 15px; color: #64748b; margin-bottom: 25px;">
            We're writing to inform you that your Oakline Bank account was accessed. For your security, we wanted to make you aware of this login activity.
          </p>
          
          <div style="background: #f8fafc; border: 2px solid #3b82f6; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">Login Details</h3>
            
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">📅 Date & Time:</td>
                <td style="padding: 8px 0; color: #1e293b;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">📍 Location:</td>
                <td style="padding: 8px 0; color: #1e293b;">${city}, ${country}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">💻 Device:</td>
                <td style="padding: 8px 0; color: #1e293b;">${device_type}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">🌐 Browser:</td>
                <td style="padding: 8px 0; color: #1e293b;">${browser}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">🖥️ Operating System:</td>
                <td style="padding: 8px 0; color: #1e293b;">${os}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">🔢 IP Address:</td>
                <td style="padding: 8px 0; color: #1e293b;">${ip_address}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>✅ Was this you?</strong><br>
              If you recognize this activity, no further action is needed. Your account is secure.
            </p>
          </div>
          
          <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>⚠️ Don't recognize this login?</strong><br>
              If you did not authorize this login, please take immediate action:<br>
              • Change your password immediately<br>
              • Review your recent account activity<br>
              • Contact our security team: security@theoaklinebank.com
            </p>
          </div>
          
          <p style="font-size: 13px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            You can manage your security notification settings in your account's Security Settings page.
          </p>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
            <p style="font-size: 13px; color: #94a3b8; margin: 5px 0;">Oakline Bank - Your Financial Partner</p>
            <p style="font-size: 12px; color: #cbd5e1; margin: 5px 0;">This is an automated security notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
      New Login Detected - Oakline Bank
      
      Dear ${userName},
      
      We're writing to inform you that your Oakline Bank account was accessed.
      
      LOGIN DETAILS:
      Date & Time: ${formattedDate}
      Location: ${city}, ${country}
      Device: ${device_type}
      Browser: ${browser}
      Operating System: ${os}
      IP Address: ${ip_address}
      
      WAS THIS YOU?
      If you recognize this activity, no further action is needed. Your account is secure.
      
      DON'T RECOGNIZE THIS LOGIN?
      If you did not authorize this login, please take immediate action:
      - Change your password immediately
      - Review your recent account activity
      - Contact our security team: security@theoaklinebank.com
      
      You can manage your security notification settings in your account's Security Settings page.
      
      Oakline Bank - Your Financial Partner
      This is an automated security notification.
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
