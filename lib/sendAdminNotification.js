
/**
 * Sends email notification to admin when a new application is submitted
 * @param {string} applicationId - The ID of the submitted application
 * @param {string} applicantName - Full name of the applicant
 * @param {string} applicantEmail - Email of the applicant
 */
export async function sendAdminNotification(applicationId, applicantName, applicantEmail) {
  try {
    const response = await fetch('/api/send-admin-application-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId,
        applicantName,
        applicantEmail
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send admin notification');
    }

    console.log('✅ Admin notification sent successfully');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send admin notification:', error);
    // Don't throw - we don't want to fail the application submission if email fails
    return { success: false, error: error.message };
  }
}
