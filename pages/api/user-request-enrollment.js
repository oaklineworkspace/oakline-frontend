
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find the most recent application for this email
    const { data: applications, error: appError } = await supabaseAdmin
      .from('applications')
      .select('*')
      .eq('email', normalizedEmail)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (appError || !applications || applications.length === 0) {
      return res.status(404).json({ 
        error: 'No application found for this email address. Please check your email or contact support.' 
      });
    }

    const application = applications[0];

    // Check if user has already completed enrollment
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('enrollment_completed')
      .eq('email', normalizedEmail)
      .single();

    if (profile && profile.enrollment_completed) {
      return res.status(400).json({ 
        error: 'Your enrollment has already been completed. Please use the login page to access your account.' 
      });
    }

    // Use the resend-enrollment API to send a new link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers['x-forwarded-host'] || req.headers.host}`;

    const resendResponse = await fetch(`${siteUrl}/api/resend-enrollment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: application.id,
        email: application.email,
        firstName: application.first_name,
        middleName: application.middle_name,
        lastName: application.last_name,
        country: application.country
      })
    });

    const resendResult = await resendResponse.json();

    if (resendResponse.ok) {
      res.status(200).json({
        success: true,
        message: `A new enrollment link has been sent to ${normalizedEmail}. Please check your email and follow the link to complete your enrollment.`
      });
    } else {
      console.error('Error from resend-enrollment:', resendResult);
      res.status(500).json({ 
        error: resendResult.error || 'Failed to send enrollment link. Please try again or contact support.' 
      });
    }

  } catch (error) {
    console.error('Error requesting enrollment link:', error);
    res.status(500).json({ 
      error: 'An error occurred while processing your request. Please try again later or contact support.' 
    });
  }
}
