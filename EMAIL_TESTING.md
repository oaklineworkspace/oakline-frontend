
# Email Testing Guide for Oakline Bank

## Quick Test

### 1. Set Environment Variables in Replit Secrets

```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@theoaklinebank.com
SMTP_PASS=<your-zoho-app-password>
SMTP_SENDER_NAME=Oakline Bank
SMTP_FROM=info@theoaklinebank.com
SMTP_FROM_WELCOME=welcome@theoaklinebank.com
SMTP_FROM_UPDATES=updates@theoaklinebank.com
SMTP_FROM_CONTACT=contact-us@theoaklinebank.com
SMTP_FROM_NOTIFY=notify@theoaklinebank.com
```

### 2. Test Email Delivery

Use the test API endpoint to verify email delivery:

```bash
curl -X POST https://your-repl-url.replit.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@gmail.com",
    "type": "welcome"
  }'
```

**Email Types:**
- `welcome` - Uses welcome@ alias
- `updates` - Uses updates@ alias
- `contact` - Uses contact-us@ alias
- `notify` - Uses notify@ alias
- (no type) - Uses info@ (default)

### 3. Test Different Email Providers

Send test emails to:
- ✉️ Gmail: `your-email@gmail.com`
- ✉️ Outlook: `your-email@outlook.com`
- ✉️ Yahoo: `your-email@yahoo.com`
- ✉️ Apple: `your-email@icloud.com`

### 4. Check Email Deliverability

After sending, check:
1. **Inbox** - Email should arrive in inbox, not spam
2. **Sender Name** - Should show "Oakline Bank"
3. **From Address** - Should show correct alias
4. **SPF/DKIM** - Check email headers for authentication

### 5. Verify Zoho Email Aliases

In Zoho Mail Control Panel:
1. Go to **Email Aliases**
2. Add these aliases to info@theoaklinebank.com:
   - welcome@theoaklinebank.com
   - updates@theoaklinebank.com
   - contact-us@theoaklinebank.com
   - notify@theoaklinebank.com

### 6. Test Application Flow

1. **Signup/Application**: Should receive verification code email
2. **Welcome Email**: Should receive welcome email after approval
3. **Transactions**: Should receive transaction notifications
4. **Contact Form**: Should send from contact-us@ alias

## Troubleshooting

### Email Not Delivered
- Check SMTP credentials in Replit Secrets
- Verify Zoho app password is correct
- Check spam/junk folder
- Verify email aliases are configured in Zoho

### Wrong Sender Address
- Check `SMTP_FROM_*` environment variables
- Verify aliases are added in Zoho Mail Control Panel

### Authentication Errors
- Use app-specific password, not regular password
- Enable "Less secure apps" if needed (not recommended)
- Use OAuth2 for production (Zoho supports this)

## Production Checklist

✅ All SMTP environment variables set in Deployment Secrets
✅ Email aliases configured in Zoho Mail
✅ SPF record added to DNS
✅ DKIM configured in Zoho
✅ Test emails sent to all major providers
✅ Emails arrive in inbox (not spam)
✅ Sender name displays correctly
✅ All email types tested (welcome, updates, contact, notify)
