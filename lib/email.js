// lib/email.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // Always use SSL for Zoho
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  debug: process.env.NODE_ENV === 'development', // Enable debug in development
  logger: process.env.NODE_ENV === 'development' // Enable logging in development
});

export async function sendEmail({ to, subject, text, html, from }) {
  try {
    const senderName = process.env.SMTP_SENDER_NAME || 'Oakline Bank';
    const fromAddress = from || process.env.SMTP_FROM || 'info@theoaklinebank.com';
    const formattedFrom = `"${senderName}" <${fromAddress}>`;

    console.log('Sending email from:', fromAddress, 'to:', to);

    const info = await transporter.sendMail({
      from: formattedFrom,
      to,
      subject,
      text,
      html,
      // Zoho requires explicit envelope configuration for aliases
      envelope: {
        from: fromAddress,
        to: to
      }
    });
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    console.error('Error sending email:', err);
    throw err;
  }
}

export const EMAIL_TYPES = {
  GENERAL: 'general',
  WELCOME: 'welcome',
  UPDATES: 'updates',
  CONTACT: 'contact',
  NOTIFY: 'notify'
};

export function getEmailAddress(type) {
  switch(type) {
    case EMAIL_TYPES.WELCOME:
      return process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM;
    case EMAIL_TYPES.UPDATES:
      return process.env.SMTP_FROM_UPDATES || process.env.SMTP_FROM;
    case EMAIL_TYPES.CONTACT:
      return process.env.SMTP_FROM_CONTACT || process.env.SMTP_FROM;
    case EMAIL_TYPES.NOTIFY:
      return process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM;
    default:
      return process.env.SMTP_FROM;
  }
}



export async function sendPasswordResetLink(email, resetLink) {
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
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Secure Password Reset</div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            🔐 Reset Your Password
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              We received a request to reset the password for your Oakline Bank account. Click the button below to create a new password. <strong>This link expires in 1 hour.</strong>
            </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%); 
                      color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; 
                      font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);">
              Reset My Password
            </a>
          </div>

          <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
            Or copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #1a365d; word-break: break-all; text-decoration: none;">${resetLink}</a>
          </p>

          <!-- Security Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
              ⚠️ <strong>Security Alert:</strong> This password reset link expires in 1 hour for your security. 
              If you didn't request this reset, please contact our security team immediately at contact-us@theoaklinebank.com or call (636) 635-6122.
            </p>
          </div>

          <!-- Security Tips -->
          <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              🔒 Password Security Tips:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Use at least 8 characters with uppercase, lowercase, numbers, and symbols</li>
              <li style="margin-bottom: 8px;">Avoid using personal information or common words</li>
              <li style="margin-bottom: 8px;">Never share your password with anyone</li>
              <li>Use a unique password for your banking account</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
            Need help? Contact our support team 24/7:
          </p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
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

  return sendEmail({
    to: email,
    subject: '🔐 Reset Your Oakline Bank Password',
    html: emailHtml,
    from: process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM
  });
}

export async function sendPasswordResetCode(email, code) {
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
          <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
          <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
          <div style="color: #ffffff; opacity: 0.9; font-size: 16px;">Secure Password Reset</div>
        </div>

        <!-- Main Content -->
        <div style="padding: 40px 32px;">
          <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
            🔐 Reset Your Password
          </h1>

          <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We received a request to reset the password for your Oakline Bank account. Use the verification code below to reset your password. <strong>This code expires in 10 minutes.</strong>
          </p>

          <!-- Verification Code Display -->
          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px solid #0066cc; border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center;">
            <p style="color: #1a365d; font-size: 14px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">
              Your Verification Code
            </p>
            <div style="background: #ffffff; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 280px; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.1);">
              <p style="color: #0066cc; font-size: 42px; font-weight: 700; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${code}
              </p>
            </div>
            <p style="color: #64748b; font-size: 13px; margin: 16px 0 0 0;">
              Enter this code on the password reset page
            </p>
          </div>

          <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 24px 0;">
            To reset your password:
          </p>
          <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0; padding-left: 20px;">
            <li>Go to the password reset page</li>
            <li>Enter your email address</li>
            <li>Enter the verification code: <strong>${code}</strong></li>
            <li>Create your new password</li>
          </ol>

          <!-- Security Notice -->
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
            <p style="color: #991b1b; font-size: 14px; font-weight: 500; margin: 0;">
              ⚠️ <strong>Security Alert:</strong> This verification code expires in 10 minutes for your security. 
              If you didn't request this reset, please contact our security team immediately at contact-us@theoaklinebank.com or call (636) 635-6122.
            </p>
          </div>

          <!-- Security Tips -->
          <div style="background-color: #f7fafc; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1a365d; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
              🔒 Password Security Tips:
            </h3>
            <ul style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Use at least 8 characters with uppercase, lowercase, numbers, and symbols</li>
              <li style="margin-bottom: 8px;">Avoid using personal information or common words</li>
              <li style="margin-bottom: 8px;">Never share your password or verification code with anyone</li>
              <li>Use a unique password for your banking account</li>
            </ul>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
            Need help? Contact our support team 24/7:
          </p>
          <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
            📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
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

  return sendEmail({
    to: email,
    subject: '🔐 Your Oakline Bank Password Reset Code',
    html: emailHtml,
    from: process.env.SMTP_FROM_NOTIFY || process.env.SMTP_FROM
  });
}