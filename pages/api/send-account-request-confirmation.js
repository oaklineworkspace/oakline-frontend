
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, accountType, accountDescription, minDeposit } = req.body;

    if (!email || !firstName || !accountType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const depositInfo = minDeposit && parseFloat(minDeposit) > 0
      ? `<strong>Minimum Opening Deposit:</strong> $${parseFloat(minDeposit).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : '<strong>No minimum opening deposit required</strong>';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">✅</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Account Request Received</div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              Request Submitted Successfully!
            </h1>
            
            <p style="color: #4a5568; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${firstName} ${lastName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thank you for requesting an additional account with Oakline Bank. Your request has been successfully submitted and is now being reviewed by our admin team.
            </p>
            
            <!-- Request Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 Request Details
              </h3>
              <div style="color: #4a5568; font-size: 15px; line-height: 1.8;">
                <strong>Account Type:</strong> ${accountType}<br/>
                <strong>Description:</strong> ${accountDescription || 'Premium banking account'}<br/>
                ${depositInfo}
              </div>
            </div>
            
            <!-- Next Steps -->
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <h3 style="color: #0c4a6e; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📧 What Happens Next?
              </h3>
              <ol style="color: #0c4a6e; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Our admin team will review your request within 24-48 hours</li>
                <li style="margin-bottom: 8px;">You'll receive an email notification once approved</li>
                <li style="margin-bottom: 8px;">Upon approval, your new account and debit card will be created automatically</li>
                <li>You can track your request status in your dashboard</li>
              </ol>
            </div>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/dashboard"
                 style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                        font-weight: 600; font-size: 16px;">
                View Dashboard
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Need help? Contact our support team 24/7:
            </p>
            <p style="color: #4a5568; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
            </p>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                Member FDIC | Equal Housing Lender
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: '✅ Account Request Received - Oakline Bank',
      html: emailHtml,
      emailType: 'notify'
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending account request confirmation email:', error);
    return res.status(500).json({ 
      error: 'Failed to send confirmation email',
      message: error.message 
    });
  }
}
