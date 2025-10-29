import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendPasswordResetLink } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive a password reset link shortly.'
      });
    }

    const userData = users?.find(user => user.email === email);

    if (!userData) {
      // For security, don't reveal if email exists
      return res.status(200).json({
        message: 'If an account exists with this email, you will receive a password reset link shortly.'
      });
    }

    // Generate password reset link using Supabase Auth
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/reset-password`
      }
    });

    if (error) {
      console.error('Error generating reset link:', error);
      return res.status(500).json({ error: 'Failed to generate reset link' });
    }

    // Send email with reset link
    try {
      await sendPasswordResetLink(email, data.properties.action_link);

      res.status(200).json({
        message: 'Password reset instructions have been sent to your email address.'
      });
    } catch (emailError) {
      console.error('Error sending reset email:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}