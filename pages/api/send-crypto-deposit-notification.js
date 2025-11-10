import { sendEmail } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { supabase} from '../../lib/supabaseClient'; // Assuming supabaseClient is configured to access public tables

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

    // Fetch crypto asset details to get confirmation requirements
    const { data: cryptoAsset } = await supabase
      .from('crypto_assets')
      .select('confirmations_required')
      .eq('crypto_type', cryptoType)
      .eq('network_type', networkType)
      .single();

    const requiredConfirmations = cryptoAsset?.confirmations_required || 3;

    // Build email content based on deposit type
    const emailSubject = isAccountOpening 
      ? `Cryptocurrency Deposit Submitted - Account Activation`
      : `Cryptocurrency Deposit Submitted`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .info-box {
            background: #f8fafc;
            border-left: 4px solid #1e40af;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-label {
            font-weight: 600;
            color: #64748b;
          }
          .info-value {
            color: #1e293b;
            font-weight: 500;
          }
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #64748b;
            border-radius: 0 0 10px 10px;
            border: 1px solid #e5e7eb;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #1e40af;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">
            ${isAccountOpening ? '🎉 Account Activation Deposit Received' : '💰 Cryptocurrency Deposit Received'}
          </h1>
        </div>

        <div class="content">
          <p>Dear ${userName},</p>

          ${isAccountOpening ? `
            <p>We have received your cryptocurrency deposit for account activation. Your deposit is now being processed on the blockchain.</p>
          ` : `
            <p>We have received your cryptocurrency deposit. Your deposit is now being processed on the blockchain.</p>
          `}

          <div class="info-box">
            <h3 style="margin-top: 0; color: #1e40af;">Deposit Details</h3>
            <div class="info-row">
              <span class="info-label">Account Number:</span>
              <span class="info-value">${accountNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Cryptocurrency:</span>
              <span class="info-value">${cryptoType}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Network:</span>
              <span class="info-value">${networkType}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Amount:</span>
              <span class="info-value">$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${isAccountOpening && minDeposit ? `
            <div class="info-row">
              <span class="info-label">Required Minimum:</span>
              <span class="info-value">$${parseFloat(minDeposit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Deposit Address:</span>
              <span class="info-value" style="word-break: break-all; font-family: monospace; font-size: 12px;">${walletAddress}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reference ID:</span>
              <span class="info-value">${depositId.substring(0, 8).toUpperCase()}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value" style="color: #f59e0b; font-weight: 700;">Pending Blockchain Confirmation</span>
            </div>
            <div class="info-row">
              <span class="info-label">Required Confirmations:</span>
              <span class="info-value">${requiredConfirmations}</span>
            </div>
          </div>

          ${isAccountOpening ? `
            <div class="warning-box">
              <strong>⏱️ Account Activation Timeline:</strong>
              <p style="margin: 10px 0 0 0;">Your account will be activated once your deposit receives the required blockchain confirmations and is verified by our team. This typically takes 15-60 minutes depending on network congestion.</p>
            </div>
          ` : `
            <div class="warning-box">
              <strong>⏱️ Processing Timeline:</strong>
              <p style="margin: 10px 0 0 0;">Your deposit will be credited to your account once it receives the required blockchain confirmations. This typically takes 15-60 minutes depending on network congestion.</p>
            </div>
          `}

          <p><strong>What happens next?</strong></p>
          <ol>
            <li>Your transaction is being confirmed on the blockchain</li>
            <li>Once confirmed, our team will verify the deposit</li>
            <li>${isAccountOpening ? 'Your account will be activated and you will receive a confirmation email' : 'The funds will be credited to your account balance'}</li>
            <li>You will receive an email notification when the process is complete</li>
          </ol>

          <center>
            <a href="https://theoaklinebank.com/dashboard" class="button">View Dashboard</a>
          </center>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            <strong>Need Help?</strong><br>
            If you have any questions about your deposit, please contact our support team at <a href="mailto:crypto@theoaklinebank.com">crypto@theoaklinebank.com</a>
          </p>
        </div>

        <div class="footer">
          <p style="margin: 0;">This is an automated message from Oakline Bank.</p>
          <p style="margin: 10px 0 0 0;">© ${new Date().getFullYear()} Oakline Bank. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    // Fetch correct sender email from bank_details
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_crypto')
      .single();

    const senderEmail = bankDetails?.email_crypto || process.env.SMTP_FROM_CRYPTO || 'crypto@theoaklinebank.com';

    await sendEmail({
      to: email,
      subject: emailSubject,
      html: emailHtml,
      emailType: 'crypto',
      from: senderEmail
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

    // Create transaction history entry for account opening deposits
    if (isAccountOpening && depositData) {
      const { data: accountData } = await supabaseAdmin
        .from('accounts')
        .select('id, balance')
        .eq('id', depositData.account_id)
        .single();

      if (accountData) {
        const transactionAmount = depositData.net_amount || depositData.amount || 0;
        
        await supabaseAdmin.from('transactions').insert([{
          user_id: user.id,
          account_id: accountData.id,
          type: 'crypto_deposit',
          amount: transactionAmount,
          description: `Account Opening Crypto Deposit - ${depositData.crypto_assets?.symbol || 'Crypto'} via ${depositData.crypto_assets?.network_type || 'Network'}`,
          status: depositData.status === 'completed' || depositData.status === 'approved' ? 'completed' : 'pending',
          balance_before: accountData.balance,
          balance_after: depositData.status === 'completed' || depositData.status === 'approved' 
            ? parseFloat(accountData.balance) + parseFloat(transactionAmount)
            : accountData.balance,
          reference: depositData.tx_hash || `CRYPTO-${depositData.id.substring(0, 8).toUpperCase()}`
        }]);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending crypto deposit notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}