import { sendEmail, EMAIL_TYPES, getEmailAddress } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      email, 
      userName, 
      userId,
      transferType,
      recipientName,
      recipientBank,
      amount,
      fee,
      totalAmount,
      reference,
      urgent,
      description,
      fromAccount,
      swiftCode,
      routingNumber
    } = req.body;

    if (!email || !amount || !recipientName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch bank details from Supabase
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
          <div style="background: linear-gradient(135deg, #1a365d 0%, #059669 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Wire Transfer Confirmation</div>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              ✓ Wire Transfer Submitted Successfully
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${userName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Your ${transferType === 'domestic' ? 'domestic' : 'international'} wire transfer has been successfully submitted and is now being processed by our Wire Transfer Department.
            </p>

            <!-- Transfer Amount -->
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 2rem; border-radius: 12px; text-align: center; border: 3px solid #065f46; margin: 24px 0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
              <div style="color: #ffffff; font-size: 14px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.95;">
                TRANSFER AMOUNT
              </div>
              <div style="color: #ffffff; font-size: 42px; font-weight: 900; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.02em;">
                ${formatCurrency(amount)}
              </div>
            </div>

            <!-- Transfer Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 Wire Transfer Details
              </h3>

              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Reference Number
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; font-family: monospace;">
                  ${reference}
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Transfer Type
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600;">
                  ${transferType === 'domestic' ? '🇺🇸 Domestic (United States)' : '🌍 International'}
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Recipient Name
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600;">
                  ${recipientName}
                </div>
              </div>

              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Recipient Bank
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600;">
                  ${recipientBank}
                </div>
              </div>

              ${swiftCode ? `
              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  SWIFT/BIC Code
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; font-family: monospace;">
                  ${swiftCode}
                </div>
              </div>
              ` : ''}

              ${routingNumber ? `
              <div style="margin-bottom: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Routing Number
                </div>
                <div style="color: #1a365d; font-size: 16px; font-weight: 600; font-family: monospace;">
                  ${routingNumber}
                </div>
              </div>
              ` : ''}

              <div style="border-top: 1px solid #e2e8f0; margin: 16px 0; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">Transfer Amount:</span>
                  <span style="color: #1a365d; font-size: 14px; font-weight: 600;">${formatCurrency(amount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">Processing Fee:</span>
                  <span style="color: #1a365d; font-size: 14px; font-weight: 600;">${formatCurrency(fee)}</span>
                </div>
                ${urgent ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">⚡ Expedited Processing:</span>
                  <span style="color: #f59e0b; font-size: 14px; font-weight: 600;">ACTIVE</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid #1a365d; margin-top: 12px;">
                  <span style="color: #1a365d; font-size: 16px; font-weight: 700;">Total Debited:</span>
                  <span style="color: #1a365d; font-size: 16px; font-weight: 700;">${formatCurrency(totalAmount)}</span>
                </div>
              </div>

              ${description ? `
              <div style="margin-top: 16px; padding: 12px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <div style="color: #92400e; font-size: 14px;">
                  <strong>Description:</strong> ${description}
                </div>
              </div>
              ` : ''}

              <div style="margin-top: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                  <span style="color: #64748b; font-size: 14px;">From Account:</span>
                  <span style="color: #1a365d; font-size: 14px; font-weight: 600;">${fromAccount.type?.toUpperCase()} - ••••${fromAccount.number?.slice(-4)}</span>
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

            <!-- Processing Timeline -->
            <div style="background-color: ${urgent ? '#fef3c7' : '#eff6ff'}; border-left: 4px solid ${urgent ? '#f59e0b' : '#3b82f6'}; padding: 16px; margin: 24px 0;">
              <p style="color: ${urgent ? '#92400e' : '#1e40af'}; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                ${urgent ? '⚡ Expedited Processing Timeline' : '⏰ Standard Processing Timeline'}
              </p>
              <p style="color: ${urgent ? '#92400e' : '#1e40af'}; font-size: 14px; margin: 0;">
                ${urgent 
                  ? (transferType === 'domestic' 
                    ? 'Your wire transfer will be completed within 2 hours during business hours.' 
                    : 'Your international wire transfer will be completed within 24-48 hours.')
                  : (transferType === 'domestic' 
                    ? 'Your wire transfer will be completed by end of business day if submitted before 3:00 PM ET.' 
                    : 'Your international wire transfer will be completed within 1-3 business days.')
                }
              </p>
            </div>

            <!-- Security Notice -->
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
              <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
                🔒 <strong>Important Security Information:</strong> Wire transfers cannot be cancelled or reversed once processed. If you did not authorize this transfer, please contact our Wire Transfer Department immediately at ${bankDetails.email_contact || bankDetails.email_support || 'contact-us@theoaklinebank.com'} or call ${bankDetails.phone || '+1 (636) 635-6122'}.
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #047857; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                📌 What Happens Next:
              </h3>
              <ul style="color: #065f46; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Your wire transfer is now in the processing queue</li>
                <li style="margin-bottom: 8px;">You will receive a confirmation email once the transfer is completed</li>
                <li style="margin-bottom: 8px;">Track your transfer status in your account dashboard</li>
                <li>For questions, contact our Wire Transfer Department 24/7</li>
              </ul>
            </div>
          </div>

          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Questions about your wire transfer? Contact our Wire Transfer Department:
            </p>
            <p style="color: #4a5568; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
              📧 ${bankDetails.email_contact || bankDetails.email_support || 'contact-us@theoaklinebank.com'} | 📞 ${bankDetails.phone || '+1 (636) 635-6122'}
            </p>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                Member FDIC | Equal Housing Lender | Routing: ${bankDetails.routing_number}<br>
                ${bankDetails.address}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: email,
      subject: `✓ Wire Transfer Submitted - Reference ${reference}`,
      html: emailHtml,
      emailType: EMAIL_TYPES.NOTIFY,
      from: getEmailAddress(EMAIL_TYPES.NOTIFY),
      userId: userId
    });

    return res.status(200).json({ success: true, message: 'Wire transfer notification sent' });
  } catch (error) {
    console.error('Wire transfer notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}