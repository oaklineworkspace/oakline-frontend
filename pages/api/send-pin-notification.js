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

    const { actionType } = req.body; // 'setup' or 'reset'

    // Get user profile for name
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
      : 'Valued Customer';

    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const isSetup = actionType === 'setup';
    const action = isSetup ? 'set up' : 'reset';
    const actionTitle = isSetup ? 'Transaction PIN Set Up' : 'Transaction PIN Reset';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔒 ${actionTitle}</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${userName},</p>
          
          <p style="font-size: 15px; color: #64748b; margin-bottom: 25px;">
            This email confirms that your Transaction PIN has been successfully ${action} for your Oakline Bank account.
          </p>
          
          <div style="background: #f8fafc; border: 2px solid #16a34a; border-radius: 10px; padding: 25px; margin: 25px 0;">
            <h3 style="margin-top: 0; color: #16a34a; font-size: 18px;">✅ PIN ${isSetup ? 'Setup' : 'Reset'} Confirmed</h3>
            
            <table style="width: 100%; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">📅 Date & Time:</td>
                <td style="padding: 8px 0; color: #1e293b;">${formattedDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">🔐 Action:</td>
                <td style="padding: 8px 0; color: #1e293b;">Transaction PIN ${isSetup ? 'Setup' : 'Reset'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">📧 Account Email:</td>
                <td style="padding: 8px 0; color: #1e293b;">${user.email}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>✅ What This Means:</strong><br>
              Your Transaction PIN is now active and will be required to authorize:
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Money transfers between accounts</li>
                <li>External wire transfers</li>
                <li>Bill payments</li>
                <li>Large transactions</li>
                <li>Security-sensitive operations</li>
              </ul>
            </p>
          </div>
          
          <div style="background: ${isSetup ? '#fef3c7' : '#fee2e2'}; border-left: 4px solid ${isSetup ? '#f59e0b' : '#dc2626'}; padding: 15px; margin: 25px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: ${isSetup ? '#92400e' : '#991b1b'};">
              <strong>⚠️ ${isSetup ? 'Important Security Notice' : 'Didn\'t Make This Change?'}:</strong><br>
              ${isSetup 
                ? '• Never share your PIN with anyone, including bank staff<br>• Keep your PIN confidential and secure<br>• Use a unique PIN that you haven\'t used elsewhere'
                : 'If you did not reset your Transaction PIN, please contact our security team immediately at security@theoaklinebank.com or call us at +1 (636) 635-6122.'
              }
            </p>
          </div>
          
          <p style="font-size: 13px; color: #94a3b8; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            For your security, you can manage your Transaction PIN settings in your account's Security Settings page.
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
      ${actionTitle} - Oakline Bank
      
      Dear ${userName},
      
      This email confirms that your Transaction PIN has been successfully ${action} for your Oakline Bank account.
      
      PIN ${isSetup ? 'SETUP' : 'RESET'} DETAILS:
      Date & Time: ${formattedDate}
      Action: Transaction PIN ${isSetup ? 'Setup' : 'Reset'}
      Account Email: ${user.email}
      
      WHAT THIS MEANS:
      Your Transaction PIN is now active and will be required to authorize:
      - Money transfers between accounts
      - External wire transfers
      - Bill payments
      - Large transactions
      - Security-sensitive operations
      
      ${isSetup 
        ? 'IMPORTANT SECURITY NOTICE:\n- Never share your PIN with anyone, including bank staff\n- Keep your PIN confidential and secure\n- Use a unique PIN that you haven\'t used elsewhere'
        : 'DIDN\'T MAKE THIS CHANGE?\nIf you did not reset your Transaction PIN, please contact our security team immediately at security@theoaklinebank.com or call us at +1 (636) 635-6122.'
      }
      
      For your security, you can manage your Transaction PIN settings in your account's Security Settings page.
      
      Oakline Bank - Your Financial Partner
      This is an automated security notification.
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: `🔒 ${actionTitle} Successful`,
        text: emailText,
        html: emailHtml,
        emailType: 'security',
        userId: user.id
      });

      console.log(`PIN ${action} notification sent to ${user.email}`);

      return res.status(200).json({
        success: true,
        message: 'PIN notification sent successfully'
      });
    } catch (emailError) {
      console.error('Failed to send PIN notification email:', emailError);
      // Don't fail the request if email sending fails
      return res.status(200).json({
        success: true,
        message: 'PIN updated but notification email failed'
      });
    }

  } catch (error) {
    console.error('Send PIN notification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
