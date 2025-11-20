
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { email } = req.body;

    if (!email || email !== user.email) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if user has a transaction PIN set
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('transaction_pin, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return res.status(400).json({ error: 'User profile not found' });
    }

    if (!profile?.transaction_pin) {
      return res.status(400).json({ error: 'No transaction PIN is set for this account' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await bcrypt.hash(verificationCode, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store verification code in database
    const { error: insertError } = await supabaseAdmin
      .from('pin_reset_codes')
      .insert({
        user_id: user.id,
        email: email,
        code_hash: hashedCode,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return res.status(500).json({ error: 'Failed to generate verification code' });
    }

    // Get user profile for personalized email
    const userName = profile?.first_name 
      ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
      : 'Valued Customer';

    // Send verification code via email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Transaction PIN Reset Request</h1>
            </div>
            
            <div style="padding: 40px;">
              <p style="font-size: 16px; color: #1e293b; margin-bottom: 20px;">
                Dear ${userName},
              </p>
              
              <p style="font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 25px;">
                We received a request to reset your Transaction PIN for your Oakline Bank account. For your security, please use the verification code below to complete the reset process:
              </p>
              
              <div style="background: #f1f5f9; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="font-size: 14px; color: #64748b; margin: 0 0 10px 0; font-weight: 600;">VERIFICATION CODE</p>
                <p style="font-size: 42px; font-weight: bold; color: #1e40af; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${verificationCode}
                </p>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 5px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>⚠️ Important Security Notice:</strong><br>
                  • This code will expire in 15 minutes<br>
                  • Never share this code with anyone, including Oakline Bank staff<br>
                  • If you didn't request this PIN reset, please contact our security team immediately at security@theoaklinebank.com
                </p>
              </div>
              
              <p style="font-size: 13px; color: #94a3b8; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                This is an automated security notification from Oakline Bank. For questions or concerns, please contact our support team.
              </p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 5px 0;">Oakline Bank - Your Financial Partner</p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 5px 0;">This is an automated security notification.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
      Transaction PIN Reset Request - Oakline Bank
      
      Dear ${userName},
      
      We received a request to reset your Transaction PIN for your Oakline Bank account.
      
      Your Verification Code: ${verificationCode}
      
      This code will expire in 15 minutes.
      
      IMPORTANT SECURITY NOTICE:
      - Never share this code with anyone, including bank staff
      - If you didn't request this reset, please contact us immediately at security@theoaklinebank.com
      
      Oakline Bank - Your Financial Partner
    `;

    await sendEmail({
      to: email,
      subject: 'Transaction PIN Reset - Verification Code',
      html: emailHtml,
      text: emailText,
      emailType: 'security',
      userId: user.id
    });

    // Log the action
    await supabaseAdmin.from('system_logs').insert({
      user_id: user.id,
      level: 'info',
      type: 'auth',
      message: 'Transaction PIN reset code requested',
      details: { email, timestamp: new Date().toISOString() }
    });

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully'
    });

  } catch (error) {
    console.error('Request PIN reset code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
