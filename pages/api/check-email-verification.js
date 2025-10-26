
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email verification exists and is verified
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (fetchError || !verification) {
      console.error('Verification not found:', fetchError);
      return res.status(200).json({ 
        verified: false,
        message: 'No verification found for this email'
      });
    }

    // Check if verified
    if (!verification.verified_at) {
      console.log('Email not verified yet:', normalizedEmail);
      return res.status(200).json({ 
        verified: false,
        message: 'Email has not been verified yet'
      });
    }

    // Check if expired (60 minutes from verification time)
    const verifiedAt = new Date(verification.verified_at);
    const now = new Date();
    const minutesSinceVerification = (now - verifiedAt) / (1000 * 60);

    console.log('Verification age (minutes):', minutesSinceVerification);

    if (minutesSinceVerification > 60) { // 60 minutes validity
      console.log('Verification expired for:', normalizedEmail);
      return res.status(200).json({ 
        verified: false,
        message: 'Email verification has expired. Please verify again.'
      });
    }

    console.log('✅ Email verification valid:', normalizedEmail);
    return res.status(200).json({ 
      verified: true,
      email: normalizedEmail,
      verified_at: verification.verified_at
    });

  } catch (error) {
    console.error('Error checking email verification:', error);
    return res.status(500).json({ 
      error: 'Failed to check email verification',
      details: error.message 
    });
  }
}
