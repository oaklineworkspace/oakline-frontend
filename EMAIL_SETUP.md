# Email Setup and Testing Guide

## Overview
This document explains how to configure and test the email system for Oakline Bank.

## Email Aliases Configuration

Oakline Bank uses different email aliases for different purposes. All email aliases are configured via environment variables to keep the system flexible and secure.

### Available Email Aliases

The following email aliases should be configured in your `.env` file:

```env
SMTP_FROM=info@theoaklinebank.com
SMTP_FROM_WELCOME=welcome@theoaklinebank.com
SMTP_FROM_UPDATES=updates@theoaklinebank.com
SMTP_FROM_CONTACT=contact-us@theoaklinebank.com
SMTP_FROM_NOTIFY=notify@theoaklinebank.com
```

### Email Alias Usage

- **info@theoaklinebank.com** - General bank information and default sender
- **welcome@theoaklinebank.com** - New account welcome emails
- **updates@theoaklinebank.com** - Account updates, balance notifications, transaction alerts
- **contact-us@theoaklinebank.com** - Customer support and contact form submissions
- **notify@theoaklinebank.com** - System notifications and alerts

## SMTP Configuration

To send emails, you need to configure SMTP settings in your `.env` file:

```env
# SMTP Server Settings
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@theoaklinebank.com
SMTP_PASS=your-smtp-password

# Email Aliases
SMTP_FROM=info@theoaklinebank.com
SMTP_FROM_WELCOME=welcome@theoaklinebank.com
SMTP_FROM_UPDATES=updates@theoaklinebank.com
SMTP_FROM_CONTACT=contact-us@theoaklinebank.com
SMTP_FROM_NOTIFY=notify@theoaklinebank.com
```

### Popular SMTP Providers

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password
```
*Note: Use Gmail App Passwords, not your regular password*

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

#### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## Testing Email Functionality

### Method 1: Testing with Mailtrap (Recommended for Development)

Mailtrap is a free email testing service that captures all emails in a sandbox.

1. Sign up at [mailtrap.io](https://mailtrap.io)
2. Get your SMTP credentials from your inbox
3. Update your `.env`:

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

### Method 2: Testing with Real Email

If you want to test with real email delivery:

1. Set up an email account with a provider (Gmail, SendGrid, etc.)
2. Configure the SMTP settings in `.env`
3. Send a test email to your personal email address

### Example Test Code

Create a test file `test-email.js`:

```javascript
const { sendEmail } = require('./lib/email');
const { getWelcomeEmail } = require('./lib/emailTemplates');

async function testEmail() {
  try {
    const testUser = {
      email: 'your-email@example.com',
      name: 'Test User'
    };

    const { subject, html } = getWelcomeEmail(testUser.name);

    const result = await sendEmail({
      to: testUser.email,
      subject,
      html,
      from: process.env.SMTP_FROM_WELCOME || process.env.SMTP_FROM
    });

    console.log('✅ Email sent successfully:', result.messageId);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
}

testEmail();
```

Run the test:
```bash
node test-email.js
```

## Troubleshooting

### Common Issues

#### 1. "Authentication Failed"
- Check your SMTP username and password
- For Gmail, use an App Password instead of your regular password
- Verify that less secure app access is enabled (if using Gmail)

#### 2. "Connection Timeout"
- Check your SMTP_HOST and SMTP_PORT settings
- Verify that your firewall isn't blocking the SMTP port
- Try using a different port (25, 465, or 587)

#### 3. "From Address Rejected"
- Make sure SMTP_FROM matches your authenticated email domain
- Some providers require you to verify sender addresses

#### 4. Emails Not Arriving
- Check spam/junk folders
- Verify that the recipient email address is correct
- Test with a different email provider
- Check your SMTP provider's sending limits

### Email Preview (Development)

If you want to preview emails without sending them, you can log the HTML:

```javascript
const { getWelcomeEmail } = require('./lib/emailTemplates');
const fs = require('fs');

const { html } = getWelcomeEmail('Test User');
fs.writeFileSync('email-preview.html', html);
console.log('Email preview saved to email-preview.html');
```

## Production Checklist

Before deploying to production:

- [ ] Configure a production-grade SMTP service (SendGrid, Mailgun, etc.)
- [ ] Set up all email aliases with your domain
- [ ] Test all email templates
- [ ] Verify email deliverability (check spam scores)
- [ ] Set up email tracking and analytics (optional)
- [ ] Configure bounce and complaint handling
- [ ] Set appropriate rate limits
- [ ] Add unsubscribe links where required by law

## Security Best Practices

1. **Never commit SMTP credentials to git**
   - Always use `.env` files
   - Add `.env` to `.gitignore`

2. **Use environment-specific configurations**
   - Development: Use Mailtrap or similar testing service
   - Production: Use professional email service provider

3. **Protect against email injection**
   - Validate and sanitize all email inputs
   - The `lib/email.js` file includes XSS protection

4. **Monitor email sending**
   - Set up logging for email operations
   - Track bounce rates and complaints
   - Monitor sending limits

## Support

For additional help:
- Email: contact-us@theoaklinebank.com
- Phone: +1 (636) 635-6122
