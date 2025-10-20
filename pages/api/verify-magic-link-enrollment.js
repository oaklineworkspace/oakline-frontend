
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email, applicationId } = req.body;

  if (!userId || !email || !applicationId) {
    return res.status(400).json({ error: 'Missing required fields: userId, email, and applicationId' });
  }

  try {
    console.log('Verifying magic link enrollment for:', { userId, email, applicationId });

    // Fetch application data
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Application not found:', appError);
      return res.status(404).json({ error: 'Application not found' });
    }

    // Verify email matches
    if (application.email.toLowerCase() !== email.toLowerCase()) {
      console.error('Email mismatch:', application.email, email);
      return res.status(400).json({ error: 'Email verification failed' });
    }

    // Check if user has already completed enrollment
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id, enrollment_completed, email')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile && existingProfile.enrollment_completed) {
      return res.status(400).json({ 
        error: 'This enrollment has already been completed. Please sign in using your password at the login page.',
        enrollment_completed: true
      });
    }

    // Fetch accounts for this application
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('account_number, account_type, balance')
      .eq('application_id', applicationId);

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return res.status(500).json({ error: 'Error fetching account information' });
    }

    // Check enrollment record - but don't enforce click limits during verification
    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('is_used, click_count, created_at')
      .eq('application_id', applicationId)
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // If enrollment doesn't exist, create it (this can happen with magic links)
    if (!enrollment && !enrollmentError) {
      console.log('Creating enrollment record for magic link user');
      const { error: createError } = await supabaseAdmin
        .from('enrollments')
        .insert([{
          email: email.toLowerCase(),
          application_id: applicationId,
          is_used: false,
          click_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (createError) {
        console.error('Error creating enrollment:', createError);
      }
    }

    // Check if enrollment is already used
    if (enrollment && enrollment.is_used) {
      return res.status(400).json({ 
        error: 'This enrollment has already been completed. Please sign in using your password at the login page.',
        enrollment_completed: true
      });
    }

    // Check expiration (24 hours from creation)
    if (enrollment && enrollment.created_at) {
      const createdAt = new Date(enrollment.created_at);
      const now = new Date();
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 24) {
        return res.status(400).json({ 
          error: 'This enrollment link has expired. Please request a new enrollment link.',
          expired: true
        });
      }
    }

    // Return application and account data
    res.status(200).json({
      success: true,
      application: {
        id: application.id,
        email: application.email,
        first_name: application.first_name,
        middle_name: application.middle_name,
        last_name: application.last_name,
        country: application.country,
        ssn: application.ssn,
        id_number: application.id_number
      },
      accounts: accounts || [],
      enrollment_completed: false
    });

  } catch (error) {
    console.error('Magic link verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error during verification',
      details: error.message 
    });
  }
}
