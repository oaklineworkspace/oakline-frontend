// lib/emailLogger.js
import { supabase } from './supabaseClient';

/**
 * Logs email to the email_logs table
 * Call this wrapper around your email sending function
 */
export async function sendEmailWithLogging({ 
  to, 
  subject, 
  html, 
  text,
  emailType = 'default',
  userId = null, // Optional: user ID if available
  sendEmailFunction // Your actual email sending function
}) {
  // Step 1: Create initial log entry with 'pending' status
  const { data: logEntry, error: logError } = await supabase
    .from('email_logs')
    .insert({
      recipient_email: to,
      recipient_user_id: userId,
      subject: subject,
      email_type: emailType,
      provider: 'pending',
      status: 'pending'
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create email log entry:', logError);
  }

  try {
    // Step 2: Send the actual email
    const result = await sendEmailFunction({ to, subject, html, text, emailType });
    
    // Step 3: Update log with success
    if (logEntry) {
      await supabase
        .from('email_logs')
        .update({
          provider: result?.provider || 'smtp',
          status: 'sent',
          message_id: result?.messageId || result?.id
        })
        .eq('id', logEntry.id);
    }

    return result;
  } catch (error) {
    // Step 4: Update log with failure
    if (logEntry) {
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', logEntry.id);
    }

    throw error; // Re-throw so calling code can handle it
  }
}
