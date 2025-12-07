import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, userName, loanType, loanAmount, interestRate, termMonths, monthlyPayment, depositRequired, status } = req.body;

    if (!to || !userName || !loanType || !loanAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Loan Application Received</h1>
            <p style="margin: 0.5rem 0 0 0; font-size: 14px; opacity: 0.9;">Oakline Bank</p>
          </div>

          <!-- Content -->
          <div style="padding: 2rem;">
            <p style="font-size: 16px; color: #1f2937; margin: 0 0 1.5rem 0;">
              Hi <strong>${userName}</strong>,
            </p>

            <p style="font-size: 15px; color: #4b5563; margin: 0 0 1.5rem 0; line-height: 1.6;">
              Thank you for applying for a loan with Oakline Bank! Your application has been successfully received and is now pending review. Here are your loan details:
            </p>

            <!-- Loan Details Box -->
            <div style="background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Loan Type</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${loanType}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Loan Amount</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">$${parseFloat(loanAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Interest Rate (APR)</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${parseFloat(interestRate).toFixed(2)}%</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Loan Term</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">${termMonths} months</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Monthly Payment</p>
                  <p style="font-size: 15px; color: #059669; margin: 0; font-weight: 600;">$${parseFloat(monthlyPayment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p style="font-size: 12px; color: #64748b; margin: 0 0 0.5rem 0; font-weight: 600;">Security Deposit</p>
                  <p style="font-size: 15px; color: #ef4444; margin: 0; font-weight: 600;">$${parseFloat(depositRequired).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <!-- Status -->
            <div style="background-color: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
              <p style="font-size: 14px; color: #1e40af; margin: 0; line-height: 1.6;">
                <strong>Application Status:</strong> ${status === 'pending' ? '⏳ Pending Review' : '✅ Approved'}
              </p>
              ${status === 'pending' ? `
                <p style="font-size: 13px; color: #1e40af; margin: 0.75rem 0 0 0; line-height: 1.6;">
                  To proceed with your loan, please complete the required 10% security deposit. This helps us verify your account and move forward with the review process.
                </p>
              ` : ''}
            </div>

            <!-- Next Steps -->
            <p style="font-size: 15px; color: #4b5563; margin: 0 0 1.5rem 0; line-height: 1.6;">
              <strong>What happens next?</strong><br>
              <ul>
                <li style="margin-bottom: 8px;">Your application is being reviewed by our lending team</li>
                <li style="margin-bottom: 8px;">Processing typically takes 24-48 business hours</li>
                <li style="margin-bottom: 8px;">You'll receive email updates throughout the process</li>
                <li>Track your application status in real-time via the loan dashboard</li>
              </ul>
            </p>

            <!-- Security Notice -->
            <div style="background-color: #fef3c7; border: 2px solid #fcd34d; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem;">
              <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.6;">
                🔒 <strong>Security Notice:</strong> We encrypt all your personal and financial information with 256-bit SSL encryption. Your data is protected under PCI DSS standards.
              </p>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://oaklinebank.com'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #059669 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Go to Dashboard
              </a>
            </div>

            <!-- Support -->
            <p style="font-size: 13px; color: #64748b; margin: 0; text-align: center; line-height: 1.6;">
              Questions? Contact our Loan Department at loans@oaklinebank.com<br>
              Available Monday-Friday, 9 AM - 5 PM EST
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
      subject: `Loan Application Received: ${loanType}`,
      html: emailHtml,
      emailType: 'loans'
    });

    return res.status(200).json({ success: true, message: 'Loan notification sent' });
  } catch (error) {
    console.error('Error sending loan submitted notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}