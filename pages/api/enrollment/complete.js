import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { accountNumber, password } = req.body;

  if (!accountNumber || !password) {
    return res.status(400).json({ error: 'Account number and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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

    // Verify all previous steps were completed
    if (!application.enrollment_email_verified || 
        !application.enrollment_ssn_verified || 
        !application.enrollment_name_verified) {
      return res.status(400).json({ error: 'Please complete all verification steps first' });
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, enrollment_completed')
      .eq('email', application.email)
      .maybeSingle();

    if (existingProfile && existingProfile.enrollment_completed) {
      return res.status(400).json({ error: 'This account is already enrolled' });
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: application.first_name,
        last_name: application.last_name
      }
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return res.status(500).json({ error: 'Failed to create account: ' + authError.message });
    }

    const userId = authData.user.id;

    // Create or update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: application.email,
        first_name: application.first_name,
        last_name: application.last_name,
        enrollment_completed: true,
        enrollment_completed_at: new Date().toISOString(),
        password_set: true,
        application_status: 'completed',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Link all accounts to this user
    const { error: accountUpdateError } = await supabaseAdmin
      .from('accounts')
      .update({
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('application_id', application.id);

    if (accountUpdateError) {
      console.error('Account linking error:', accountUpdateError);
    }

    // Update application status
    const { error: appUpdateError } = await supabaseAdmin
      .from('applications')
      .update({
        application_status: 'completed',
        enrollment_completed: true,
        enrollment_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', application.id);

    if (appUpdateError) {
      console.error('Application update error:', appUpdateError);
    }

    // Send welcome email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #1A3E6F; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .account-box { background: white; border-left: 4px solid #1A3E6F; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Welcome to Oakline Bank!</h1>
            <p style="margin: 10px 0 0 0;">Your Account is Now Active</p>
          </div>
          <div class="content">
            <h2 style="color: #1A3E6F;">Congratulations, ${application.first_name}!</h2>
            <p>Your Oakline Bank account enrollment is complete. You can now access your account online.</p>
            
            <div class="account-box">
              <p style="margin: 5px 0;"><strong>Account Number:</strong> ${application.account_number}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${application.email}</p>
            </div>
            
            <p>To get started, simply sign in with your email and the password you just created.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://oaklinebank.com'}/login" class="button">Sign In Now</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              If you have any questions or need assistance, please don't hesitate to contact us at contact-us@theoaklinebank.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      to: application.email,
      subject: 'Welcome to Oakline Bank - Your Account is Active!',
      html: emailHtml,
      text: `Welcome to Oakline Bank, ${application.first_name}! Your enrollment is complete. You can now sign in at ${process.env.NEXT_PUBLIC_BASE_URL || 'https://oaklinebank.com'}/login`,
      from: 'welcome',
      emailType: 'enrollment_complete',
      userId: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Enrollment completed successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Enrollment completion error:', error);
    return res.status(500).json({ error: 'An error occurred during enrollment' });
  }
}
