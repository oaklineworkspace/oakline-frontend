# Oakline Pay Setup Instructions

## Overview
Oakline Pay is your exclusive peer-to-peer payment system for Oakline Bank customers - similar to Zelle®, Cash App, or Venmo, but built specifically for your bank.

## Key Features
✅ Send money using:
- **Email address**
- **Phone number**
- **Oakline Tag** (@username) - Unique to your bank!

✅ Quick payments to saved contacts
✅ Payment requests
✅ Transaction history
✅ Customizable limits and settings
✅ Email verification for security
✅ QR code sharing

## Database Setup

### Step 1: Add Tables to Supabase
1. Open your Supabase dashboard → SQL Editor
2. Copy the entire contents of `sql_scripts/create_oakline_pay_tables.sql`
3. Paste and click "Run"

This creates 5 tables:
- `oakline_pay_profiles` - User profiles with unique @tags
- `oakline_pay_contacts` - Saved contacts
- `oakline_pay_transactions` - Transaction history
- `oakline_pay_settings` - User preferences and limits
- `oakline_pay_requests` - Money requests

### Step 2: Verify Tables
Go to Table Editor and confirm you see all 5 tables.

## How It Works

### Oakline Tags
- Users get a unique tag like `@johndoe` or `@sarahsmith`
- Tags must be 3-20 characters (letters, numbers, underscores only)
- Tags start with @ symbol
- Makes sending money as easy as social media!

### Payment Flow
1. User enters recipient (email, phone, or @tag)
2. System looks up recipient in Oakline Bank
3. Verification code sent to sender's email
4. Enter code to confirm
5. Money transfers instantly between accounts
6. Both users get notifications

### Security Features
- Email verification codes
- Daily/monthly spending limits
- Transaction verification
- Contact verification
- Real-time balance updates

## Default Limits
- **Per Transaction**: $2,500
- **Daily**: $5,000
- **Monthly**: $25,000

Users can customize these in settings (within bank-defined maximums).

## Next Steps
After adding the tables, you'll need to:
1. ✅ Create API endpoints (I'll handle this)
2. ✅ Build frontend page (I'll handle this)
3. ✅ Add to navigation (I'll handle this)
4. Set up Row Level Security policies
5. Test with real users

## Differences from Zelle
- **Oakline Tags**: Unique username system (@tag)
- **Bank Exclusive**: Only works between Oakline Bank customers
- **Customizable**: You control branding, limits, and features
- **Integrated**: Deep integration with your account system
- **Payment Requests**: Request money from others
- **Split Payments**: Coming soon feature

Let me know when you've added the tables and I'll implement the frontend and API!
