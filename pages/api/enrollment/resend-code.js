import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountNumber } = req.body;

  if (!accountNumber) {
    return res.status(400).json({ error: 'Account number is required' });
  }

  try {
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('account_number', accountNumber)
      .eq('application_status', 'approved')
      .maybeSingle();

    if (appError || !application) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        enrollment_verification_code: verificationCode,
        enrollment_code_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      console.error('Error updating verification code:', updateError);
      return res.status(500).json({ error: 'Failed to resend code' });
    }

    // Send email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 2px solid #1A3E6F; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; color: #1A3E6F; letter-spacing: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Oakline Bank</h1>
            <p style="margin: 10px 0 0 0;">New Verification Code</p>
          </div>
          <div class="content">
            <h2 style="color: #1A3E6F;">Your New Verification Code</h2>
            <p>Hello ${application.first_name},</p>
            <p>Here is your new verification code:</p>
            
            <div class="code-box">
              <div class="code">${verificationCode}</div>
            </div>
            
            <p><strong>This code will expire in 10 minutes.</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: application.email,
      subject: 'Oakline Bank - New Verification Code',
      html: emailHtml,
      text: `Your new verification code is: ${verificationCode}. This code expires in 10 minutes.`,
      from: 'noreply',
      emailType: 'enrollment_verification'
    });

    return res.status(200).json({ success: true, message: 'Code resent successfully' });

  } catch (error) {
    console.error('Resend code error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  }
}
