import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, userName, bankName, accountNumber, accountType, userType, status } = req.body;

    if (!to || !userName || !bankName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bankType = userType === 'international' ? '🌍 International' : '🇺🇸 US';

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
          <div style="background: linear-gradient(135deg, #1a365d 0%, #059669 100%); padding: 2rem; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Bank Account Linked Successfully</h1>
            <p style="margin: 0.5rem 0 0 0; font-size: 14px; opacity: 0.9;">Oakline Bank</p>
          </div>

          <!-- Content -->
          <div style="padding: 2rem;">
            <p style="font-size: 16px; color: #1f2937; margin: 0 0 1.5rem 0;">
              Hi <strong>${userName}</strong>,
            </p>

            <p style="font-size: 15px; color: #4b5563; margin: 0 0 1.5rem 0; line-height: 1.6;">
              Your bank account has been successfully linked to your Oakline Bank account. Here are the details:
            </p>

            <!-- Account Details Box -->
            <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Bank Name</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${bankName}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Account Type</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${accountType.toUpperCase()}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Account Number</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${accountNumber}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Account Region</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${bankType}</p>
                </div>
              </div>
            </div>

            <!-- Status -->
            <div style="background-color: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
              <p style="font-size: 14px; color: #1e40af; margin: 0; line-height: 1.6;">
                <strong>Status:</strong> ${status === 'pending' ? '⏳ Pending Verification' : '✅ Verified'}
              </p>
              ${status === 'pending' ? `
                <p style="font-size: 13px; color: #1e40af; margin: 0.75rem 0 0 0; line-height: 1.6;">
                  We'll send 2-3 small deposits to verify your account. Please check your account and confirm the amounts to complete verification.
                </p>
              ` : ''}
            </div>

            <!-- Next Steps -->
            <p style="font-size: 15px; color: #4b5563; margin: 0 0 1.5rem 0; line-height: 1.6;">
              <strong>What happens next?</strong><br>
              • You can now use this bank account for withdrawals and transfers<br>
              • ${status === 'pending' ? 'Wait for verification deposits' : 'Your account is ready to use'}<br>
              • Check your Oakline Bank dashboard for transaction history
            </p>

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border: 2px solid #fcd34d; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
              <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.6;">
                🔒 <strong>Security Notice:</strong> We encrypt all your bank account information with 256-bit SSL encryption. Your account details are never stored in plain text.
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.theoaklinebank.com'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #059669 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Go to Dashboard
              </a>
            </div>

            <!-- Support -->
            <p style="font-size: 13px; color: #64748b; margin: 0; text-align: center; line-height: 1.6;">
              Questions? Contact our support team at <a href="mailto:support@theoaklinebank.com" style="color: #1a365d; text-decoration: none;">support@theoaklinebank.com</a><br>
              Available 24/7 to help you
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #1a365d; color: #fff; padding: 1.5rem; text-align: center; font-size: 12px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 0.5rem 0;">Oakline Bank - Your Financial Partner</p>
            <p style="margin: 0; opacity: 0.8;">© ${new Date().getFullYear()} Oakline Bank. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to,
      subject: `Bank Account Linked: ${bankName}`,
      html: emailHtml,
      emailType: 'notify'
    });

    return res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Error sending bank linked notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
