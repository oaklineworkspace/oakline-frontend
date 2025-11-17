
import { sendEmail, EMAIL_TYPES, getEmailAddress } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userName, userId, amount, fromAccount, toAccount, reference, memo } = req.body;

    if (!email || !amount || !fromAccount || !toAccount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const formatCurrency = (amt) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amt || 0);
    };

    const formatAccountType = (type) => {
      return type?.replace(/_/g, ' ').toUpperCase() || 'ACCOUNT';
    };

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
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">💸</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Transfer Confirmation</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              ✓ Transfer Completed Successfully
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${userName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              You have successfully transferred funds between your accounts. Here are the details:
            </p>

            <!-- Transfer Amount -->
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 2rem; border-radius: 12px; text-align: center; border: 2px solid #059669; margin: 24px 0;">
              <div style="color: #047857; font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
                Transfer Amount
              </div>
              <div style="color: #047857; font-size: 36px; font-weight: 800; margin: 0;">
                ${formatCurrency(amount)}
              </div>
            </div>

            <!-- Transfer Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 Transfer Details
              </h3>

              <!-- From Account -->
              <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 2px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  From Account
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                  ${formatAccountType(fromAccount.type)}
                </div>
                <div style="color: #64748b; font-size: 14px; font-family: monospace;">
                  ••••${fromAccount.number?.slice(-4)}
                </div>
                <div style="color: #1e40af; font-size: 14px; font-weight: 600; margin-top: 8px;">
                  New Balance: ${formatCurrency(fromAccount.newBalance)}
                </div>
              </div>

              <!-- To Account -->
              <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; border: 2px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                  To Account
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                  ${formatAccountType(toAccount.type)}
                </div>
                <div style="color: #64748b; font-size: 14px; font-family: monospace;">
                  ••••${toAccount.number?.slice(-4)}
                </div>
                <div style="color: #059669; font-size: 14px; font-weight: 600; margin-top: 8px;">
                  New Balance: ${formatCurrency(toAccount.newBalance)}
                </div>
              </div>

              ${memo && memo !== 'Internal Transfer' ? `
              <div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="color: #92400e; font-size: 14px;">
                  <strong>Memo:</strong> ${memo}
                </div>
              </div>
              ` : ''}

              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">Reference Number:</span>
                  <span style="color: #1a365d; font-size: 14px; font-weight: 600; font-family: monospace;">${reference}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b; font-size: 14px;">Date & Time:</span>
                  <span style="color: #1a365d; font-size: 14px; font-weight: 600;">${new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              </div>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #eff6ff; border-left: 4px solid #1e40af; padding: 16px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 500; margin: 0;">
                🔒 <strong>Security Note:</strong> If you did not authorize this transfer, please contact our support team immediately at contact-us@theoaklinebank.com or call (636) 635-6122.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Need help? Contact our support team 24/7:
            </p>
            <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
            </p>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                Member FDIC | Equal Housing Lender | Routing: 075915826<br>
                12201 N May Avenue, Oklahoma City, OK 73120
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: '✓ Internal Transfer Completed - Oakline Bank',
      html: emailHtml,
      emailType: EMAIL_TYPES.NOTIFY,
      from: getEmailAddress(EMAIL_TYPES.NOTIFY),
      userId: userId
    });

    return res.status(200).json({ success: true, message: 'Email notification sent' });
  } catch (error) {
    console.error('Transfer notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
