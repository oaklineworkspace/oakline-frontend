
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, type } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Recipient email required' });
  }

  // Check SMTP configuration
  const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    return res.status(500).json({ 
      error: 'SMTP not configured',
      missing: missing
    });
  }

  try {
    // Determine sender based on type
    let fromEmail = process.env.SMTP_FROM;
    switch(type) {
      case 'welcome':
        fromEmail = process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM;
        break;
      case 'updates':
        fromEmail = process.env.SMTP_FROM_UPDATES || process.env.SMTP_FROM;
        break;
      case 'contact':
        fromEmail = process.env.SMTP_FROM_CONTACT || process.env.SMTP_FROM;
        break;
      case 'notify':
        fromEmail = process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM;
        break;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f6f8;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Oakline Bank</h1>
            <p style="color: #FFC857; margin: 5px 0 0 0; font-size: 14px;">Email Delivery Test</p>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1A3E6F; margin-top: 0;">✅ Email Test Successful</h2>
            <p style="color: #333; line-height: 1.6;">
              This is a test email from Oakline Bank's ${type || 'general'} email system.
            </p>
            
            <div style="background: #f5f6f8; border-left: 4px solid #FFC857; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #666;"><strong>Sent from:</strong> ${fromEmail}</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>SMTP Server:</strong> ${process.env.SMTP_HOST}</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Branch:</strong> Oakline Bank – Oklahoma City Branch</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Address:</strong> 12201 N. May Avenue, Oklahoma City, OK 73120</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Phone:</strong> +1 (636) 635-6122</p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If you received this email, your email system is working correctly!
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #999; font-size: 12px; margin: 5px 0;">
                © 2024 Oakline Bank. All rights reserved.<br>
                Member FDIC | Routing: 075915826
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      from: fromEmail,
      subject: `🧪 Oakline Bank Email Test - ${type || 'General'}`,
      html: emailHtml
    });

    return res.status(200).json({ 
      success: true,
      message: 'Test email sent successfully',
      from: fromEmail,
      to: to,
      type: type || 'general'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message 
    });
  }
}
