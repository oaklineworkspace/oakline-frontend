import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountNumber, ssnLast4 } = req.body;

  if (!accountNumber || !ssnLast4) {
    return res.status(400).json({ error: 'Account number and SSN last 4 digits are required' });
  }

  if (!/^\d{4}$/.test(ssnLast4)) {
    return res.status(400).json({ error: 'SSN must be exactly 4 digits' });
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

    // Check if email was verified first
    if (!application.enrollment_email_verified) {
      return res.status(400).json({ error: 'Please verify your email first' });
    }

    // Verify SSN last 4 digits
    const ssnLast4FromDB = application.ssn ? application.ssn.slice(-4) : null;
    
    if (!ssnLast4FromDB || ssnLast4FromDB !== ssnLast4) {
      return res.status(400).json({ error: 'SSN does not match our records' });
    }

    // Mark SSN as verified
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        enrollment_ssn_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      console.error('Error updating SSN verification status:', updateError);
    }

    return res.status(200).json({ success: true, message: 'SSN verified successfully' });

  } catch (error) {
    console.error('SSN verification error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  }
}
