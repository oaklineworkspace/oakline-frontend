
import { sendEmail } from '../../lib/email';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { applicationId, applicantName, applicantEmail } = req.body;

    if (!applicationId || !applicantName || !applicantEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch bank details for admin email
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('email_info, name')
      .limit(1)
      .single();

    const adminEmail = bankDetails?.email_info || 'info@theoaklinebank.com';
    const bankName = bankDetails?.name || 'Oakline Bank';

    // Fetch application details
    const { data: application } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    const accountTypes = application?.account_types || [];
    const accountTypesList = accountTypes.length > 0
      ? accountTypes.map(type => `• ${type.replace(/_/g, ' ').toUpperCase()}`).join('\n')
      : '• Not specified';

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
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🔔</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">${bankName}</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">New Application Notification</div>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              New Application Received
            </h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              A new account application has been submitted and requires your review.
            </p>
            
            <!-- Application Details -->
            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                📋 Application Details
              </h3>
              <div style="color: #4a5568; font-size: 15px; line-height: 1.8;">
                <strong>Application ID:</strong> ${applicationId}<br/>
                <strong>Applicant Name:</strong> ${applicantName}<br/>
                <strong>Email:</strong> ${applicantEmail}<br/>
                <strong>Phone:</strong> ${application?.phone || 'Not provided'}<br/><br/>
                <strong>Account Types Requested:</strong><br/>
                ${accountTypesList}<br/><br/>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </div>
            </div>
            
            <!-- Action Required -->
            <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                ⏰ <strong>Action Required:</strong> Please review this application in the admin dashboard and approve or reject it.
              </p>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_ADMIN_URL || 'https://oakline-controller.theoaklinebank.com'}/admin/applications/${applicationId}"
                 style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                        color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);">
                Review Application
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              This is an automated notification from ${bankName}
            </p>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br>
                Member FDIC | Equal Housing Lender
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: adminEmail,
      subject: `🔔 New Application Submitted - ${applicantName}`,
      html: emailHtml,
      emailType: 'notify'
    });

    console.log('✅ Admin notification email sent to:', adminEmail);

    return res.status(200).json({ 
      success: true, 
      message: 'Admin notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return res.status(500).json({ 
      error: 'Failed to send admin notification',
      message: error.message 
    });
  }
}
