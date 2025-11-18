import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, type, code } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Only check for existing applications if this is NOT a wire transfer or withdrawal verification
    const skipApplicationCheck = type === 'wire_transfer' || type === 'withdrawal';
    
    if (!skipApplicationCheck) {
      const { data: existingApp } = await supabaseAdmin
        .from('applications')
        .select('email')
        .eq('email', normalizedEmail)
        .single();

      if (existingApp) {
        return res.status(400).json({
          error: 'An account with this email already exists. Please sign in or use a different email.'
        });
      }
    }

    // Use code from request if provided, otherwise generate one
    const verificationCode = code || Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const { data: existingVerification } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (existingVerification) {
      const { error: updateError } = await supabaseAdmin
        .from('email_verifications')
        .update({
          verification_code: verificationCode,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (updateError) {
        console.error('Error updating verification:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('email_verifications')
        .insert([{
          email: normalizedEmail,
          verification_code: verificationCode,
          verification_token: verificationToken,
          expires_at: expiresAt.toISOString(),
          verified_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('Error creating verification:', insertError);
        throw insertError;
      }
    }

    try {
      // Check if SMTP is configured
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('SMTP configuration missing. Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
        return res.status(500).json({
          error: 'Email service is not configured. Please contact support.',
          details: 'SMTP credentials are missing'
        });
      }

      console.log('Attempting to send verification email to:', normalizedEmail);

      // Get type from request body
      const { type, userId } = req.body;
      
      // Define email subject and content based on type
      const isWireTransfer = type === 'wire_transfer';
      const isWithdrawal = type === 'withdrawal';
      
      let emailSubject = '🔐 Your Oakline Bank Verification Code';
      let verificationTitle = 'Email Verification';
      let verificationMessage = 'Thank you for choosing Oakline Bank! Please use the verification code below to complete your application:';
      let securityNotice = '';
      
      if (isWireTransfer) {
        emailSubject = '🔐 Wire Transfer Verification Code - Oakline Bank';
        verificationTitle = 'Wire Transfer Verification';
        verificationMessage = 'To protect your account and ensure the security of your wire transfer, please verify this transaction with the code below:';
        securityNotice = `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>🔒 Security Notice:</strong> This verification is required to authorize your wire transfer request.
            </p>
          </div>
        `;
      } else if (isWithdrawal) {
        emailSubject = '🔐 Withdrawal Verification Code - Oakline Bank';
        verificationTitle = 'Withdrawal Verification';
        verificationMessage = 'To protect your account and ensure the security of your withdrawal, please verify this transaction with the code below:';
        securityNotice = `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>🔒 Security Notice:</strong> This verification is required to authorize your withdrawal request.
            </p>
          </div>
        `;
      }

      // Define the email HTML structure
      const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f6f8;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Oakline Bank</h1>
                <p style="color: #FFC857; margin: 5px 0 0 0; font-size: 14px;">Your Financial Partner</p>
              </div>

              <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #1A3E6F; margin-top: 0;">${verificationTitle}</h2>
                <p style="color: #333; line-height: 1.6;">${verificationMessage}</p>

                ${securityNotice}

                <div style="background: #f5f6f8; border-left: 4px solid #FFC857; padding: 20px; margin: 25px 0; text-align: center;">
                  <div style="font-size: 32px; font-weight: bold; color: #1A3E6F; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                    ${verificationCode}
                  </div>
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 20px;">This code will expire in 15 minutes.</p>
                <p style="color: #666; font-size: 14px;">${isWireTransfer || isWithdrawal
                  ? 'If you did not initiate this transaction, please contact our security team immediately.'
                  : 'If you didn\'t request this code, please ignore this email.'
                }</p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #999; font-size: 12px; margin: 5px 0;">
                    © 2025 Oakline Bank. All rights reserved.<br>
                    Member FDIC | Equal Housing Lender
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

      // Use the verify email type for verification codes
      const emailType = (isWireTransfer || isWithdrawal) ? EMAIL_TYPES.SECURITY : EMAIL_TYPES.VERIFY;
      
      await sendEmail({
        to: normalizedEmail,
        subject: emailSubject,
        html: emailHtml,
        emailType: emailType,
        userId: userId
      });

      console.log('✅ Verification email sent successfully to:', normalizedEmail);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command
      });

      return res.status(500).json({
        error: 'Failed to send verification email. Please check your email address and try again.',
        details: process.env.NODE_ENV === 'development' ? emailError.message : 'Email service error'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully',
      code: verificationCode,
      expiresIn: 900
    });

  } catch (error) {
    console.error('Error in send-verification-code:', error);
    return res.status(500).json({
      error: 'Failed to send verification code',
      details: error.message
    });
  }
}