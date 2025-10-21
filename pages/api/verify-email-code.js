import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !verification) {
      console.error('Verification not found:', fetchError);
      return res.status(404).json({ error: 'No verification request found for this email' });
    }

    if (verification.verified_at) {
      return res.status(400).json({ error: 'This email has already been verified' });
    }

    const expiresAt = new Date(verification.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (verification.verification_code !== normalizedCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('email_verifications')
      .update({
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
      throw updateError;
    }

    console.log('✅ Email verified successfully:', normalizedEmail);

    return res.status(200).json({ 
      success: true,
      message: 'Email verified successfully',
      email: normalizedEmail
    });

  } catch (error) {
    console.error('Error in verify-email-code:', error);
    return res.status(500).json({ 
      error: 'Failed to verify email',
      details: error.message 
    });
  }
}
