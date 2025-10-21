
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

    // Check email_verifications table
    const { data: verification, error: verifyError } = await supabaseAdmin
      .from('email_verifications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    // Check if application already exists
    const { data: existingApp, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    return res.status(200).json({
      email: normalizedEmail,
      verification: verification || null,
      verificationError: verifyError?.message || null,
      existingApplication: existingApp || null,
      applicationError: appError?.message || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Debug check failed',
      details: error.message 
    });
  }
}
