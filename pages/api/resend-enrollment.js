import { supabaseAdmin } from '../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      applicationId,
      email,
      firstName,
      middleName,
      lastName,
      country
    } = req.body;

    if (!applicationId || !email) {
      return res.status(400).json({ error: 'Missing required fields: applicationId and email' });
    }

    // Fetch application data
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application not found:', appError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Fetch account numbers for this application
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type')
      .eq('application_id', applicationId);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
    }

    const accountNumbers = accounts?.map(acc => acc.account_number) || [];
    const accountTypes = accounts?.map(acc => acc.account_type) || [];

    // Generate enrollment token
    const enrollmentToken = `enroll_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Determine site URL dynamically - prioritize actual host for correct redirects
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    // Use actual host for redirects (important for dev/preview environments)
    // Only fall back to NEXT_PUBLIC_SITE_URL if host is not available
    const siteUrl = host ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com');

    // Generate Supabase magic link for enrollment
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: `${siteUrl}/enroll?application_id=${applicationId}&type=magic_link`,
        data: {
          application_id: applicationId,
          first_name: firstName || application.first_name,
          last_name: lastName || application.last_name
        }
      }
    });

    if (linkError) {
      console.error('Error generating magic link:', linkError);
      return res.status(500).json({ error: 'Failed to generate enrollment link', details: linkError.message });
    }

    const enrollLink = linkData.properties.action_link;

    // Update or create enrollment record
    const { data: existingEnrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .eq('application_id', applicationId)
      .maybeSingle();

    if (existingEnrollment) {
      await supabaseAdmin
        .from('enrollments')
        .update({
          token: enrollLink,
          is_used: false,
          click_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingEnrollment.id);
    } else {
      await supabaseAdmin
        .from('enrollments')
        .insert([{
          email: email.trim().toLowerCase(),
          application_id: applicationId,
          token: enrollLink,
          is_used: false,
          click_count: 0
        }]);
    }

    // Send welcome email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const fullName = `${firstName || application.first_name} ${middleName || application.middle_name || ''} ${lastName || application.last_name}`.trim();

    const accountDetailsHtml = accountNumbers.length > 0 ? `
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Your Account Numbers:</h3>
        ${accountNumbers.map((num, index) => `
          <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
            <strong>${accountTypes[index] ? accountTypes[index].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Account'}:</strong> ${num}
          </p>
        `).join('')}
        <p style="font-family: monospace; font-size: 16px; margin: 5px 0;">
          <strong>Routing Number:</strong> 075915826
        </p>
      </div>
    ` : '';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Oakline Bank Enrollment</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Welcome to Oakline Bank!</h1>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e40af;">Complete Your Enrollment</h2>
            <p>Hello ${fullName},</p>
            <p>Your application has been processed and your accounts are ready for activation.</p>

            ${accountDetailsHtml}

            <p>To complete your enrollment and activate your accounts, please click the button below:</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${enrollLink}" style="display: inline-block; padding: 15px 30px; background: #1e40af; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Complete Enrollment
              </a>
            </div>

            <p><strong>Important:</strong> During enrollment, you'll need to:</p>
            <ul>
              <li>Set your account password</li>
              <li>Provide your ${country === 'US' ? 'Social Security Number (SSN)' : 'Government ID Number'}</li>
              <li>Select one of your account numbers listed above</li>
              <li>Agree to our Terms of Service and Privacy Policy</li>
            </ul>

            <p><em>This link will expire in 7 days for security purposes.</em></p>

            <p>If you have any questions, please contact our customer support team.</p>
            <p>Thank you for choosing Oakline Bank!</p>
            <p><strong>The Oakline Bank Team</strong></p>
          </div>
          <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
            <p>© 2024 Oakline Bank. All rights reserved.</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Complete Your Oakline Bank Enrollment",
      html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email} for application ${applicationId}`);

    res.status(200).json({ 
      success: true, 
      message: 'Enrollment email sent successfully',
      enrollmentToken,
      accountNumbers
    });

  } catch (error) {
    console.error('Resend enrollment error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
