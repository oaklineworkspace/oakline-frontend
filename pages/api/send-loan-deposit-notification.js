import { sendEmail, EMAIL_TYPES, getEmailAddress } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userEmail,
      depositAmount,
      baseAmount,
      fee,
      cryptoType,
      selectedNetwork,
      walletAddress,
      txHash,
      depositId
    } = req.body;

    if (!userEmail || !depositAmount || !cryptoType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch bank details
    const { data: bankDetails, error: fetchError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .single();

    if (fetchError || !bankDetails) {
      console.error('Error fetching bank details:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    const formatCurrency = (amt) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amt || 0);
    };

    // Use bank logo URL from database, or fallback to public image URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://theoaklinebank.com';
    const logoUrl = bankDetails?.logo_url || `${baseUrl}/images/Oakline_Bank_logo_design_c1b04ae0.png`;

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
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 24px; text-align: center;">
            <img src="${logoUrl}" alt="Oakline Bank Logo" style="height: 50px; margin-bottom: 16px;" />
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Loan Deposit Confirmation</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #059669; font-size: 24px; font-weight: 700; margin: 0 0 24px 0;">
              ✓ Crypto Deposit Received
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Thank you for submitting your 10% loan collateral deposit. We have successfully received your cryptocurrency payment and it is now pending blockchain confirmation.
            </p>

            <!-- Deposit Details -->
            <div style="background-color: #f0fdf4; border: 1px solid #d1e7dd; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <h2 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Deposit Details</h2>
              
              ${baseAmount && fee ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Base Amount:</span>
                <div style="color: #166534; font-size: 16px; font-weight: 600;">${formatCurrency(baseAmount)}</div>
              </div>
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Network Fee:</span>
                <div style="color: #166534; font-size: 16px; font-weight: 600;">${formatCurrency(fee)}</div>
              </div>
              ` : ''}

              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Total Deposit Amount:</span>
                <div style="color: #166534; font-size: 18px; font-weight: 700;">${formatCurrency(depositAmount)}</div>
              </div>

              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Cryptocurrency:</span>
                <div style="color: #166534; font-size: 16px; font-weight: 600;">${cryptoType}</div>
              </div>

              ${selectedNetwork ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Network:</span>
                <div style="color: #166534; font-size: 16px; font-weight: 600;">${selectedNetwork}</div>
              </div>
              ` : ''}

              ${walletAddress ? `
              <div style="margin-bottom: 12px;">
                <span style="color: #64748b; font-size: 14px;">Wallet Address:</span>
                <div style="color: #166534; font-size: 13px; font-weight: 600; word-break: break-all; font-family: monospace; background-color: #fff; padding: 8px; border-radius: 4px; border: 1px solid #c7e9c0;">${walletAddress}</div>
              </div>
              ` : ''}

              ${txHash ? `
              <div>
                <span style="color: #64748b; font-size: 14px;">Transaction Hash:</span>
                <div style="color: #166534; font-size: 13px; font-weight: 600; word-break: break-all; font-family: monospace; background-color: #fff; padding: 8px; border-radius: 4px; border: 1px solid #c7e9c0;">${txHash}</div>
              </div>
              ` : ''}
            </div>

            <!-- Status Update -->
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <h3 style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">What Happens Next</h3>
              <ul style="color: #1e40af; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Your deposit is pending blockchain confirmation (typically 15 minutes to 2 hours)</li>
                <li>Once confirmed, our Loan Department will verify the payment</li>
                <li>You will receive an email notification once verification is complete</li>
                <li>Your loan will be activated upon successful verification</li>
              </ul>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              You can track your deposit status anytime by logging into your Oakline Bank account and visiting the Loan Dashboard.
            </p>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                If you have any questions, please contact our support team at ${bankDetails?.email_support || 'support@theoaklinebank.com'}
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the email
    console.log('Sending loan deposit email to:', userEmail);
    console.log('Email details:', { userEmail, depositAmount, cryptoType, selectedNetwork });
    
    const emailResult = await sendEmail({
      to: userEmail,
      subject: 'Loan Deposit Received - Pending Blockchain Confirmation',
      html: emailHtml,
      emailType: 'loan_deposit'
    });
    
    console.log('Email result:', emailResult);
    
    if (!emailResult || !emailResult.messageId) {
      console.warn('Email may not have been sent - no messageId returned');
    }

    return res.status(200).json({
      success: true,
      message: 'Email notification sent successfully'
    });

  } catch (error) {
    console.error('Email notification error:', error);
    // Don't fail the API, just log the warning
    return res.status(200).json({
      success: true,
      message: 'Deposit processed (email notification pending)'
    });
  }
}
