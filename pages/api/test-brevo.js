
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      return res.status(500).json({ 
        error: 'BREVO_API_KEY not configured',
        message: 'Please add your Brevo API key to Secrets'
      });
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Oakline Bank',
          email: 'info@theoaklinebank.com'
        },
        to: [{ 
          email: 'oaklineworkspace@gmail.com',
          name: 'Test Recipient'
        }],
        subject: 'Hello from Brevo - Oakline Bank Test',
        htmlContent: '<h1>Hello from Oakline Bank!</h1><p>This is your first email sent via Brevo API.</p><p>Brevo is now successfully configured as your email provider! 🎉</p>'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API error:', data);
      return res.status(response.status).json({ 
        error: 'Failed to send email',
        details: data
      });
    }

    console.log('Email sent successfully via Brevo:', data);
    return res.status(200).json({ 
      success: true,
      message: 'Email sent successfully via Brevo!',
      messageId: data.messageId,
      data: data
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({ 
      error: 'Failed to send test email',
      message: error.message 
    });
  }
}
