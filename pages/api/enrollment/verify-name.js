import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountNumber, firstName, lastName } = req.body;

  if (!accountNumber || !firstName || !lastName) {
    return res.status(400).json({ error: 'Account number, first name, and last name are required' });
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

    // Check if SSN was verified first
    if (!application.enrollment_ssn_verified) {
      return res.status(400).json({ error: 'Please verify your SSN first' });
    }

    // Verify name matches (case-insensitive)
    const firstNameMatch = application.first_name.toLowerCase().trim() === firstName.toLowerCase().trim();
    const lastNameMatch = application.last_name.toLowerCase().trim() === lastName.toLowerCase().trim();

    if (!firstNameMatch || !lastNameMatch) {
      return res.status(400).json({ error: 'Name does not match our records' });
    }

    // Mark name as verified
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({
        enrollment_name_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (updateError) {
      console.error('Error updating name verification status:', updateError);
    }

    return res.status(200).json({ success: true, message: 'Name verified successfully' });

  } catch (error) {
    console.error('Name verification error:', error);
    return res.status(500).json({ error: 'An error occurred' });
  }
}
