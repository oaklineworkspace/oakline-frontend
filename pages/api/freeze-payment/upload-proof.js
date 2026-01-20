import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({ 
      multiples: false,
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
      filter: ({ mimetype }) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        return allowedTypes.includes(mimetype);
      }
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const { fields, files } = await parseForm(req);
    const payment_method = Array.isArray(fields.payment_method) ? fields.payment_method[0] : fields.payment_method;
    const amount = Array.isArray(fields.amount) ? fields.amount[0] : fields.amount;
    const tx_hash = Array.isArray(fields.tx_hash) ? fields.tx_hash[0] : fields.tx_hash;
    const crypto_type = Array.isArray(fields.crypto_type) ? fields.crypto_type[0] : fields.crypto_type;
    const network_type = Array.isArray(fields.network_type) ? fields.network_type[0] : fields.network_type;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email, freeze_amount_required')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const fileData = fs.readFileSync(file.filepath);
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `freeze-proof-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `freeze_proofs/${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('crypto-deposit-proofs')
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'freeze_payment',
        title: 'Payment Proof Submitted',
        message: `Your freeze payment proof of ${amount ? `$${parseFloat(amount).toLocaleString()}` : 'your balance'} has been submitted successfully. Our team will review it within 24-48 hours.`,
        read: false,
        created_at: new Date().toISOString()
      }]);

    const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Valued Customer';
    const userEmail = profile.email || user.email;

    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">${bankDetails?.name || 'Oakline Bank'}</div>
            <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Balance Restoration Department</div>
          </div>

          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
              Payment Proof Received
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${userName},
            </p>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We have received your payment proof for the balance restoration fee. Our verification team will review your submission within 24-48 business hours.
            </p>

            <div style="background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Submission Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Payment Method:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${payment_method?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</td>
                </tr>
                ${amount ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">$${parseFloat(amount).toLocaleString()}</td>
                </tr>
                ` : ''}
                ${crypto_type ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Cryptocurrency:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${crypto_type}</td>
                </tr>
                ` : ''}
                ${network_type ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Network:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${network_type}</td>
                </tr>
                ` : ''}
                ${tx_hash ? `
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Transaction Hash:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 12px; font-weight: 500; text-align: right; word-break: break-all;">${tx_hash}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Submitted:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Reference:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${user.id.slice(0, 8).toUpperCase()}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                <strong>What happens next?</strong><br/>
                Once your payment is verified, your account balance will be unfrozen and you will receive a confirmation email. This typically takes 24-48 business hours.
              </p>
            </div>

            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              If you have any questions about your submission, please contact our support team.
            </p>
          </div>

          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Need assistance? Contact our support team:
            </p>
            <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              ${bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'} | ${bankDetails?.phone || '(636) 635-6122'}
            </p>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} ${bankDetails?.name || 'Oakline Bank'}. All rights reserved.<br>
                Member FDIC | Equal Housing Lender | Routing: ${bankDetails?.routing_number || '075915826'}<br>
                ${bankDetails?.address || '12201 N May Avenue, Oklahoma City, OK 73120'}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: userEmail,
        subject: 'Payment Proof Received - Balance Restoration',
        html: emailHtml,
        emailType: 'support',
        userId: user.id
      });
      console.log('Freeze payment proof email sent successfully to:', userEmail);
    } catch (emailError) {
      console.error('Failed to send freeze payment proof email:', emailError);
    }

    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      success: true,
      message: 'Payment proof uploaded successfully',
      reference: user.id.slice(0, 8).toUpperCase()
    });

  } catch (error) {
    console.error('Error uploading freeze payment proof:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
