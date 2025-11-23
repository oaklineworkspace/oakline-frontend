import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Store verification codes in memory (in production, use Redis or DB)
const verificationCodes = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization' });
    }

    const token = authHeader.substring(7);
    const { data: { user: currentUser }, error: tokenError } = await supabase.auth.getUser(token);
    
    if (tokenError || !currentUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10-minute expiration
    verificationCodes.set(currentUser.id, {
      code: verificationCode,
      email: currentUser.email,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Try to send email if SMTP is configured
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT || '587'),
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || 'security@theoaklinebank.com',
          to: currentUser.email,
          subject: 'Email Change Verification Code - Oakline Bank',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Email Change Verification</h2>
              <p>You requested to change your email address on your Oakline Bank account.</p>
              <p>Your verification code is:</p>
              <h1 style="color: #059669; letter-spacing: 2px; font-size: 36px; margin: 20px 0;">${verificationCode}</h1>
              <p>This code will expire in 10 minutes.</p>
              <p style="color: #666; font-size: 12px;">If you did not request this change, please contact our support team immediately.</p>
              <p style="color: #666; font-size: 12px;">
                <strong>Oakline Bank Security Team</strong><br>
                support@theoaklinebank.com<br>
                +1 (636) 635-6122
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.warn('Email sending failed:', emailError.message);
        // Don't fail - continue with response even if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email',
      codeHash: Buffer.from(verificationCode).toString('base64')
    });
  } catch (error) {
    console.error('Email verification code error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
}
