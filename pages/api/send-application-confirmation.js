
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, lastName, accountTypes } = req.body;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate total minimum deposit required
    let totalMinDeposit = 0;
    const accountTypesWithDeposits = [];
    
    if (accountTypes && accountTypes.length > 0) {
      accountTypes.forEach(account => {
        const accountName = typeof account === 'string' ? account : account.name;
        const minDeposit = typeof account === 'object' && account.min_opening_deposit 
          ? parseFloat(account.min_opening_deposit) 
          : 0;
        
        totalMinDeposit += minDeposit;
        
        if (minDeposit > 0) {
          accountTypesWithDeposits.push(`• ${accountName} - Min. Deposit: $${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        } else {
          accountTypesWithDeposits.push(`• ${accountName} - No minimum deposit`);
        }
      });
    }

    const accountTypesList = accountTypesWithDeposits.length > 0
      ? accountTypesWithDeposits.join('\n')
      : '• Account types will be confirmed upon approval';
    
    const depositInfo = totalMinDeposit > 0
      ? `<strong>Total Minimum Deposit Required:</strong> $${totalMinDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      : '<strong>No minimum deposit required</strong>';

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
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Application Submitted Successfully</div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              Welcome to the Oakline Bank Family!
            </h1>
            
            <p style="color: #4a5568; font-size: 18px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${firstName} ${lastName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thank you for choosing Oakline Bank! We're thrilled that you've decided to join our banking family. Your application has been successfully submitted and is now being reviewed by our team.
            </p>
            
            <!-- Application Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 32px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 Application Details
              </h3>
              <div style="color: #4a5568; font-size: 15px; line-height: 1.8;">
                <strong>Applicant:</strong> ${firstName} ${lastName}<br/>
                <strong>Email:</strong> ${email}<br/>
                <strong>Account Types Requested:</strong><br/>
                ${accountTypesList}<br/><br/>
                ${depositInfo}
              </div>
            </div>
            
            ${totalMinDeposit > 0 ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                💰 <strong>Funding Required:</strong> After your application is approved, you'll need to fund your accounts with a total minimum deposit of $${totalMinDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })} before they become fully active.
              </p>
            </div>
            ` : ''}
            
            <!-- Next Steps -->
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 24px 0; border-radius: 8px;">
              <h3 style="color: #0c4a6e; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📧 What Happens Next?
              </h3>
              <ol style="color: #0c4a6e; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Our team will review your application within 24-48 hours</li>
                <li style="margin-bottom: 8px;">You'll receive an approval email with your account credentials</li>
                <li style="margin-bottom: 8px;">Once approved, you can immediately start using your new banking accounts</li>
              </ol>
            </div>

            <!-- Important Notice -->
            <div style="background-color: #fef5e7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px;">
              <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                ⏰ <strong>Processing Time:</strong> Please allow 24-48 hours for application review. You will receive an email notification once your application has been processed.
              </p>
            </div>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">
              If you have any questions in the meantime, please don't hesitate to contact our customer support team.
            </p>
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
      subject: '✅ Application Submitted - Welcome to Oakline Bank!',
      html: emailHtml,
      emailType: 'welcome'
    });

    console.log('Application confirmation email sent to:', email);

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending application confirmation email:', error);
    return res.status(500).json({ 
      error: 'Failed to send confirmation email',
      message: error.message 
    });
  }
}
