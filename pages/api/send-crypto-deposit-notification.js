
import { sendEmail } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, userName, cryptoType, networkType, amount, walletAddress, depositId, accountNumber, isAccountOpening, minDeposit } = req.body;

    const emailTitle = isAccountOpening 
      ? '💳 Account Activation Deposit Submitted' 
      : '₿ Crypto Deposit Submitted';
    
    const introMessage = isAccountOpening
      ? `Thank you for initiating your account activation deposit. Your cryptocurrency payment has been submitted and is awaiting blockchain confirmation for account ${accountNumber}.`
      : 'Your cryptocurrency deposit has been submitted and is awaiting blockchain confirmation.';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">${emailTitle}</h1>
            <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
          </div>
          
          <div style="padding: 40px 32px;">
            <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Hello ${userName},
            </h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              ${introMessage}
            </p>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #1e40af; padding: 20px; margin: 24px 0; border-radius: 4px;">
              <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">Deposit Details</h3>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e40af;">Cryptocurrency:</strong>
                <span style="color: #1e293b; margin-left: 8px;">${cryptoType}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e40af;">Network:</strong>
                <span style="color: #1e293b; margin-left: 8px;">${networkType}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e40af;">Amount:</strong>
                <span style="color: #1e293b; font-size: 18px; font-weight: 700; margin-left: 8px;">$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e40af;">Account:</strong>
                <span style="color: #1e293b; margin-left: 8px; font-family: monospace;">${accountNumber}</span>
              </div>
              <div style="margin-bottom: 12px;">
                <strong style="color: #1e40af;">Reference ID:</strong>
                <span style="color: #1e293b; margin-left: 8px; font-family: monospace;">${String(depositId).substring(0, 8).toUpperCase()}</span>
              </div>
              <div>
                <strong style="color: #1e40af;">Status:</strong>
                <span style="color: #f59e0b; margin-left: 8px;">Pending Confirmation</span>
              </div>
            </div>
            
            <div style="background-color: ${isAccountOpening ? '#eff6ff' : '#fef3c7'}; border-left: 4px solid ${isAccountOpening ? '#3b82f6' : '#f59e0b'}; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="color: ${isAccountOpening ? '#1e40af' : '#92400e'}; font-size: 14px; font-weight: 500; margin: 0;">
                ${isAccountOpening ? '🔐 <strong>Blockchain Verification:</strong> Your payment is being verified on the blockchain. This process typically takes 15-60 minutes depending on network activity.' : '⏱️ <strong>Processing Time:</strong> Your deposit will be credited after blockchain confirmations (typically 15-60 minutes).'}
              </p>
            </div>
            
            <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
              <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                📋 ${isAccountOpening ? 'Account Activation Process' : 'What Happens Next'}:
              </h3>
              <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                ${isAccountOpening ? `
                <li>Our system monitors the blockchain for your ${cryptoType} transaction</li>
                <li>Once ${getSelectedNetwork()?.confirmations || 3} confirmations are received, your deposit is verified</li>
                <li>Your account ${accountNumber} will be automatically activated</li>
                <li style="font-weight: 600; color: #1e40af;">Minimum deposit required: $${parseFloat(minDeposit || amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</li>
                <li>You'll receive a confirmation email once your account is active</li>
                ` : `
                <li>Blockchain confirmation in progress (typically 15-60 minutes)</li>
                <li>Funds will be credited automatically after verification</li>
                <li>You'll receive another confirmation email when complete</li>
                <li>Track your deposit status in your dashboard</li>
                `}
              </ul>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
              If you have any questions or did not initiate this deposit, please contact our support team immediately.
            </p>
          </div>
          
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Need help? Contact our support team 24/7:
            </p>
            <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              📧 crypto@theoaklinebank.com | 📞 (636) 635-6122
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

    const emailSubject = isAccountOpening 
      ? '💳 Account Activation Payment Submitted - Oakline Bank'
      : '₿ Crypto Deposit Submitted - Oakline Bank';

    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      emailType: 'crypto',
      from: process.env.SMTP_FROM_CRYPTO || 'crypto@theoaklinebank.com'
    });

    // Create notification
    const notificationTitle = isAccountOpening ? 'Account Activation Deposit Submitted' : 'Crypto Deposit Received';
    const notificationMessage = isAccountOpening
      ? `Your ${cryptoType} deposit of $${parseFloat(amount).toFixed(2)} for account activation is being processed.`
      : `Your ${cryptoType} deposit of $${parseFloat(amount).toFixed(2)} is being processed.`;

    await supabaseAdmin.from('notifications').insert([{
      user_id: user.id,
      type: isAccountOpening ? 'account_activation_deposit' : 'crypto_deposit',
      title: notificationTitle,
      message: notificationMessage,
      read: false
    }]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending crypto deposit notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
