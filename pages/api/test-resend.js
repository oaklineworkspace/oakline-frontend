
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      return res.status(500).json({ 
        error: 'RESEND_API_KEY not configured',
        message: 'Please add your Resend API key to Secrets'
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Oakline Bank <onboarding@resend.dev>',
        to: ['oaklineworkspace@gmail.com'],
        subject: 'Hello World - First Resend Test',
        html: '<h1>Hello from Oakline Bank!</h1><p>This is your first email sent via Resend API.</p>'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return res.status(response.status).json({ 
        error: 'Failed to send email',
        details: data
      });
    }

    console.log('Email sent successfully via Resend:', data);
    return res.status(200).json({ 
      success: true,
      message: 'Email sent successfully!',
      emailId: data.id,
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
