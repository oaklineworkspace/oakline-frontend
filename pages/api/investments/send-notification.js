import { sendEmail } from '../../../lib/email';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, productName, productType, amount, reference, accountNumber, accountType, newBalance } = req.body;

    if (!userId || !productName || !amount || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.email) {
      console.error('Failed to fetch user profile:', profileError);
      return res.status(404).json({ error: 'User not found' });
    }

    const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
    const userName = profile.full_name || 'Valued Customer';

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
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">📈</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Investment Center</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              ✅ Investment Confirmed
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${userName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your investment has been successfully processed. Here are the details of your transaction:
            </p>

            <!-- Investment Details Card -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 16px; padding: 24px; margin: 24px 0;">
              <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 14px; color: #15803d; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Investment Amount</div>
                <div style="font-size: 36px; font-weight: 800; color: #166534;">${formatCurrency(amount)}</div>
              </div>
              
              <div style="border-top: 1px solid rgba(34, 197, 94, 0.3); padding-top: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">Reference:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; font-family: monospace;">${reference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">Product:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${productName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">Type:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${productType?.replace('_', ' ').toUpperCase() || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">From Account:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${accountType?.toUpperCase() || 'Account'} ****${accountNumber?.slice(-4) || '****'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">New Balance:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(newBalance)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">Date:</td>
                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                </table>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="https://theoaklinebank.com/investment"
                 style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);">
                View Your Portfolio
              </a>
            </div>

            <!-- Info Box -->
            <div style="background-color: #f0f9ff; border-left: 4px solid #0066cc; padding: 16px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 500; margin: 0;">
                💡 <strong>Investment Tip:</strong> Diversifying your portfolio across different asset classes can help manage risk and potentially improve returns over time.
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
      to: profile.email,
      subject: `✅ Investment Confirmed - ${formatCurrency(amount)} in ${productName}`,
      html: emailHtml,
      emailType: 'notify',
      userId
    });

    console.log(`✅ Investment notification sent to ${profile.email} for ${reference}`);
    return res.status(200).json({ success: true, message: 'Notification sent' });

  } catch (error) {
    console.error('Investment notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
