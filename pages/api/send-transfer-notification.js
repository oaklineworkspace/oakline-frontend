import { sendEmail, EMAIL_TYPES, getEmailAddress } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both old and new parameter formats
    const { 
      email, userName, userId, amount, fromAccount, toAccount, reference, memo,
      recipientUserId, senderName, recipientName, accountNumber, referenceNumber, notificationType
    } = req.body;

    // Determine if this is a new-style request (credit/debit alert)
    const isNewFormat = !!notificationType;
    
    if (isNewFormat) {
      // New format for credit/debit alerts
      if (!recipientUserId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
    } else {
      // Old format for internal transfers
      if (!email || !amount || !fromAccount || !toAccount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
    }

    // Fetch bank details and recipient email (for new format)
    const { data: bankDetails, error: fetchError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .single();

    if (fetchError || !bankDetails) {
      console.error('Error fetching bank details:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    let recipientEmail = email;
    if (isNewFormat) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', recipientUserId)
        .single();

      if (profileError || !profile?.email) {
        console.error('Error fetching recipient email:', profileError);
        return res.status(400).json({ error: 'Could not find recipient email' });
      }
      recipientEmail = profile.email;
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

    // Generate different email content based on notification type
    let emailSubject, emailHtml;

    if (isNewFormat && notificationType === 'credit') {
      // Credit notification
      emailSubject = `💰 Money Received - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} | Oakline Bank`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
              <div style="color: white; font-size: 48px; margin-bottom: 16px;">💰</div>
              <h1 style="color: white; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Money Received!</h1>
            </div>
            <div style="padding: 40px 32px;">
              <div style="background: #f0fdf4; border: 2px solid #d1fae5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
                <div style="color: #059669; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px;">Amount Received</div>
                <div style="color: #047857; font-size: 40px; font-weight: 800; margin: 0;">${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}</div>
              </div>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">From</div>
                  <div style="font-size: 18px; color: #1a365d; font-weight: 700;">${senderName}</div>
                </div>
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">To Your Account</div>
                  <div style="font-size: 16px; color: #1a365d; font-weight: 700;">••••${accountNumber?.slice(-4)}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Reference</div>
                  <div style="font-size: 16px; color: #1a365d; font-weight: 700; font-family: monospace;">${referenceNumber}</div>
                </div>
              </div>
              <div style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 16px; color: #1e40af; font-size: 14px; line-height: 1.6;">
                <strong>✅ Transaction Complete</strong><br/>Your funds are now available in your account and protected by industry-standard encryption.
              </div>
            </div>
            <div style="background: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Oakline Bank. Member FDIC | Routing: ${bankDetails?.routing_number}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (isNewFormat && notificationType === 'debit') {
      // Debit notification
      emailSubject = `💸 Transfer Sent - ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)} | Oakline Bank`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
              <div style="color: white; font-size: 48px; margin-bottom: 16px;">💸</div>
              <h1 style="color: white; font-size: 28px; margin: 0 0 8px 0; font-weight: 700;">Transfer Sent!</h1>
            </div>
            <div style="padding: 40px 32px;">
              <div style="background: #f0fdf4; border: 2px solid #d1fae5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
                <div style="color: #059669; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px;">Amount Sent</div>
                <div style="color: #047857; font-size: 40px; font-weight: 800; margin: 0;">-${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}</div>
              </div>
              <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">To</div>
                  <div style="font-size: 18px; color: #1a365d; font-weight: 700;">${recipientName}</div>
                </div>
                <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Recipient Account</div>
                  <div style="font-size: 16px; color: #1a365d; font-weight: 700;">••••${accountNumber?.slice(-4)}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Reference</div>
                  <div style="font-size: 16px; color: #1a365d; font-weight: 700; font-family: monospace;">${referenceNumber}</div>
                </div>
              </div>
              <div style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 16px; color: #1e40af; font-size: 14px; line-height: 1.6;">
                <strong>✅ Transaction Complete</strong><br/>Your transfer has been securely processed and successfully delivered to the recipient.
              </div>
            </div>
            <div style="background: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Oakline Bank. Member FDIC | Routing: ${bankDetails?.routing_number}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Old format - internal transfer confirmation
      emailSubject = '✓ Internal Transfer Completed - Oakline Bank';
      emailHtml = `

      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">💸</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Transfer Confirmation</div>
          </div>
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">✓ Transfer Completed Successfully</h1>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Dear ${userName},</p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">You have successfully transferred funds between your accounts. Here are the details:</p>
            <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); padding: 2rem; border-radius: 12px; text-align: center; border: 2px solid #059669; margin: 24px 0;">
              <div style="color: #047857; font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Transfer Amount</div>
              <div style="color: #047857; font-size: 36px; font-weight: 800; margin: 0;">${formatCurrency(amount)}</div>
            </div>
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">📋 Transfer Details</h3>
              <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 2px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">From Account</div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${formatAccountType(fromAccount.type)}</div>
                <div style="color: #64748b; font-size: 14px; font-family: monospace;">••••${fromAccount.number?.slice(-4)}</div>
                <div style="color: #1e40af; font-size: 14px; font-weight: 600; margin-top: 8px;">New Balance: ${formatCurrency(fromAccount.newBalance)}</div>
              </div>
              <div style="background-color: #ffffff; border-radius: 8px; padding: 16px; border: 2px solid #e2e8f0;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">To Account</div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${formatAccountType(toAccount.type)}</div>
                <div style="color: #64748b; font-size: 14px; font-family: monospace;">••••${toAccount.number?.slice(-4)}</div>
                <div style="color: #059669; font-size: 14px; font-weight: 600; margin-top: 8px;">New Balance: ${formatCurrency(toAccount.newBalance)}</div>
              </div>
              ${memo && memo !== 'Internal Transfer' ? `<div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;"><div style="color: #92400e; font-size: 14px;"><strong>Memo:</strong> ${memo}</div></div>` : ''}
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
            <div style="background-color: #eff6ff; border-left: 4px solid #1e40af; padding: 16px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; font-weight: 500; margin: 0;">
                🔒 <strong>Security Note:</strong> If you did not authorize this transfer, please contact our support team immediately at ${bankDetails.support_email} or call ${bankDetails.support_phone}.
              </p>
            </div>
          </div>
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">Need help? Contact our support team 24/7:</p>
            <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📧 ${bankDetails.support_email} | 📞 ${bankDetails.support_phone}</p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>Member FDIC | Equal Housing Lender | Routing: ${bankDetails.routing_number}<br>${bankDetails.address}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
      `;
    }

    await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      emailType: EMAIL_TYPES.NOTIFY,
      from: getEmailAddress(EMAIL_TYPES.NOTIFY),
      userId: isNewFormat ? recipientUserId : userId
    });

    return res.status(200).json({ success: true, message: 'Email notification sent' });
  } catch (error) {
    console.error('Transfer notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}