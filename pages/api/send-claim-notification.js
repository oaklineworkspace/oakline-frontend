import { sendEmail, EMAIL_TYPES, getEmailAddress } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { receiver_email, receiver_name, sender_name, amount, claim_method, claim_token } = req.body;

    if (!receiver_email || !sender_name || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const trackingUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com'}/claim-debit-card?token=${claim_token}`;

    const claimMethodText = claim_method === 'debit_card' ? 'Debit Card Deposit' : claim_method === 'ach' ? 'ACH Bank Transfer' : 'Account Creation';
    const timelineText = claim_method === 'debit_card' ? 'within 1 hour' : claim_method === 'ach' ? 'within 1-3 business days' : 'immediately after account verification';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px; border-radius: 8px; }
    .header { background: linear-gradient(135deg, #0052a3 0%, #003a7a 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 10px 0 0 0; opacity: 0.95; font-size: 14px; }
    .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 25px; }
    .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #555; margin-bottom: 15px; }
    .detail { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
    .detail:last-child { border-bottom: none; }
    .detail-label { font-size: 12px; color: #999; font-weight: 500; margin-bottom: 5px; }
    .detail-value { font-size: 16px; font-weight: 600; color: #1e293b; }
    .amount { font-size: 28px; font-weight: 900; color: #0052a3; }
    .status-box { background: #f0feff; border: 2px solid #0066cc; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .status-box-title { color: #0052a3; font-weight: 600; margin-bottom: 8px; }
    .status-box-text { color: #0c7a99; font-size: 13px; line-height: 1.6; }
    .timeline-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .timeline-title { color: #854d0e; font-weight: 600; margin-bottom: 8px; }
    .timeline-text { color: #92400e; font-size: 13px; line-height: 1.6; }
    .button { display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #004999 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 600; margin-bottom: 20px; }
    .footer { text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #999; }
    .security-note { background: #f3f4f6; border-left: 4px solid #0066cc; padding: 12px 15px; font-size: 12px; color: #555; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏦 Payment Claim Submitted</h1>
      <p>Your Oakline Bank payment claim is being processed</p>
    </div>

    <div class="content">
      <p>Dear ${receiver_name || 'Recipient'},</p>

      <p>Thank you for submitting your claim! We've received your request and are processing your payment from <strong>${sender_name}</strong>. We are currently verifying your information. Your claim will be processed ${timelineText}.</p>

      <div class="section">
        <div class="section-title">Claim Details</div>
        <div class="detail">
          <div class="detail-label">Amount</div>
          <div class="amount">$${parseFloat(amount).toFixed(2)}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Sender</div>
          <div class="detail-value">${sender_name}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Claim Method</div>
          <div class="detail-value">${claimMethodText}</div>
        </div>
      </div>

      <div class="status-box">
        <div class="status-box-title">⏳ Processing Status</div>
        <div class="status-box-text">
          Your claim has been successfully submitted and is currently under review. Funds will be available ${timelineText}. 
          You'll receive another email with your payment confirmation.
        </div>
      </div>

      <div class="timeline-box">
        <div class="timeline-title">📋 What Happens Next</div>
        <div class="timeline-text">
          1. Our team reviews your information<br>
          2. Payment is verified and approved<br>
          3. Funds are transferred to your ${claimMethodText.toLowerCase()}<br>
          4. You receive confirmation email
        </div>
      </div>

      <div class="security-note">
        <strong>🔒 Security:</strong> Your payment information is encrypted with 256-bit SSL and fully PCI DSS compliant. Never share your claim link with anyone.
      </div>

      <p>
        <a href="${trackingUrl}" class="button">View Claim Status</a>
      </p>

      <p>If you have any questions or concerns, please don't hesitate to contact our support team at <strong>${getEmailAddress(EMAIL_TYPES.SUPPORT)}</strong>.</p>

      <p>Best regards,<br><strong>Oakline Bank Team</strong></p>

      <div class="footer">
        <p>This is an automated message from Oakline Bank. Please do not reply directly to this email.</p>
        <p>Oakline Bank | 12201 N May Avenue, Oklahoma City, OK 73120 | (636) 635-6122</p>
        <p style="margin-top: 10px;">© 2025 Oakline Bank. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    await sendEmail({
      to: receiver_email,
      subject: `Payment Claim Submitted - $${parseFloat(amount).toFixed(2)} from ${sender_name}`,
      html: htmlContent,
      text: `Payment Claim Submitted\n\nDear ${receiver_name || 'Recipient'},\n\nThank you for submitting your claim! We've received your request and are processing your payment from ${sender_name}. We are currently verifying your information. Your claim will be processed ${timelineText}.\n\nAmount: $${parseFloat(amount).toFixed(2)}\nClaim Method: ${claimMethodText}\n\nYour claim has been successfully submitted and is currently under review. Funds will be available ${timelineText}.\n\nYou'll receive another email with your payment confirmation.\n\nBest regards,\nOakline Bank Team`,
      emailType: 'oakline_pay'
    });

    return res.status(200).json({
      success: true,
      message: 'Notification email sent successfully'
    });
  } catch (error) {
    console.error('Error sending notification email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification email'
    });
  }
}