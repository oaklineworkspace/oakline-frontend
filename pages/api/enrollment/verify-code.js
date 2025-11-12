import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountNumber, code } = req.body;

  if (!accountNumber || !code) {
    return res.status(400).json({ error: 'Account number and code are required' });
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

    // Check if code matches
    if (application.enrollment_verification_code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code is expired
    const expiresAt = new Date(application.enrollment_code_expires_at);
    if (expiresAt < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Mark code as verified (update a field to track this step)
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        enrollment_email_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      console.error('Error updating verification status:', updateError);
    }

    return res.status(200).json({ success: true, message: 'Email verified successfully' });

  } catch (error) {
    console.error('Code verification error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  }
}
