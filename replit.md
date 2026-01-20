# Oakline Bank - Complete Project Documentation

## Project Overview
Oakline Bank is a professional mobile-responsive loan deposit and banking system built with Next.js and deployed on Vercel. The application now includes Capacitor mobile app support for iOS and Android.

**Production URL**: https://theoaklinebank.com  
**Mobile App ID**: com.oakline.bank  
**Mobile App Name**: OaklineBank  

---

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14.2, React 18, TypeScript support
- **Backend**: Next.js API routes (serverless)
- **Database**: Supabase (PostgreSQL)
- **Mobile**: Capacitor (iOS/Android WebView wrapper)
- **Payments**: Stripe integration
- **Authentication**: Supabase Auth (email/password)
- **Email**: Nodemailer (SMTP via SendGrid/Gmail)

### Key Features
1. **User Authentication**
   - Email/password registration and login
   - Supabase Auth integration
   - Session management

2. **Account Management**
   - Multiple account types (checking, savings, money market)
   - Account opening with KYC/identity verification
   - Account linking and fund transfers

3. **Loan Management**
   - Loan applications and approvals
   - 10% collateral deposit requirement
   - Cryptocurrency and bank transfer payment methods
   - Real-time blockchain confirmation tracking

4. **Cryptocurrency Deposits**
   - Bitcoin, Ethereum, USDC, USDT support
   - Multiple blockchain networks (Bitcoin, Ethereum, Polygon, Solana)
   - Transaction hash verification
   - Automatic confirmation tracking

5. **Mobile Banking**
   - Responsive design (mobile-first)
   - Transaction history and dashboard
   - Payment processing
   - Receipt generation

---

## 📁 Project Structure

```
oakline-bank/
├── pages/                       # Next.js pages and API routes
│   ├── api/                    # Backend API endpoints
│   │   ├── send-loan-deposit-notification.js
│   │   ├── loan/get-loans.js
│   │   └── [other APIs]
│   ├── loan/                   # Loan-related pages
│   │   ├── deposit-crypto.js   # Cryptocurrency deposit page
│   │   ├── dashboard.js         # Loan dashboard
│   │   └── [other loan pages]
│   ├── account/                # Account pages
│   ├── dashboard.js            # Main dashboard
│   └── [other pages]
├── components/                 # Reusable React components
├── lib/                        # Utility functions
│   ├── supabaseClient.js       # Supabase client setup
│   ├── email.js                # Email service configuration
│   └── [other utilities]
├── contexts/                   # React context providers
├── public/                     # Static assets
│   ├── index.html             # Capacitor WebView entry point
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # Service worker
│   └── images/
├── styles/                     # Global styles
├── capacitor.config.ts        # Capacitor configuration
├── capacitor.config.json      # Capacitor JSON config backup
├── CAPACITOR_SETUP_GUIDE.md  # Mobile app setup guide
└── package.json               # Dependencies

```

---

## 💾 Database Schema (Key Tables)

### `users`
- id (UUID)
- email (text, unique)
- full_name (text)
- phone (text)
- date_of_birth (date)
- created_at (timestamp)

### `accounts`
- id (UUID)
- user_id (UUID, foreign key)
- account_number (text, unique)
- account_type (enum: 'checking', 'savings', 'money_market')
- balance (numeric)
- status (enum: 'active', 'pending', 'closed')
- created_at (timestamp)

### `loans`
- id (UUID)
- user_id (UUID, foreign key)
- principal (numeric)
- interest_rate (numeric)
- term_months (integer)
- status (enum: 'pending', 'approved', 'active', 'closed')
- deposit_status (enum: 'pending', 'verified', 'failed')
- deposit_method (text: 'crypto', 'bank_transfer')
- deposit_amount (numeric)
- created_at (timestamp)

### `loan_payments`
- id (UUID)
- loan_id (UUID, foreign key)
- user_id (UUID, foreign key)
- amount (numeric)
- payment_type (enum: 'regular', 'late_fee', 'early_payoff', 'deposit')
- status (enum: 'pending', 'completed', 'failed')
- is_deposit (boolean) - True for 10% collateral deposits
- deposit_method (text: 'crypto', 'account_balance', 'bank_transfer')
- tx_hash (text) - Transaction hash for crypto deposits
- fee (numeric) - Network/processing fee
- gross_amount (numeric) - Amount including fees
- proof_path (text) - Proof document path
- metadata (jsonb) - Additional data (crypto_type, network, wallet_address)
- confirmations (integer) - Blockchain confirmations
- required_confirmations (integer) - Required confirmations (default: 3)
- created_at (timestamp)

### `crypto_deposits` (Legacy - being replaced by loan_payments)
- Used for account opening deposits only
- Contains historical crypto deposit data

### `transactions`
- id (UUID)
- user_id (UUID, foreign key)
- amount (numeric)
- transaction_type (enum: 'transfer', 'payment', 'deposit')
- status (enum: 'pending', 'completed', 'failed')
- created_at (timestamp)

---

## 🔑 Important Files & Recent Changes

### Loan Deposit System (Updated Dec 1, 2025)
**Decision**: Using `loan_payments` table exclusively for 10% loan deposits
- **Migration**: `supabase_migrations/1764603732_add_loan_deposit_columns.sql`
- **Fields**: deposit_method, tx_hash, fee, gross_amount, proof_path, metadata, confirmations, is_deposit
- **Files Modified**:
  - `pages/loan/deposit-crypto.js` - Receipt now shows wallet address; professional 2-column grid layout
  - `pages/dashboard.js` - Fetches loan deposits from loan_payments table
  - `pages/api/send-loan-deposit-notification.js` - Enhanced logging for email delivery debugging

### Email Notification System
- **Status**: Functional but may need email service verification
- **Service**: Nodemailer (SendGrid/Gmail SMTP)
- **Logging**: Added console logs to track email sending
- **File**: `lib/email.js` - Email service configuration

### Receipt Component
- **Location**: `pages/loan/deposit-crypto.js` (SuccessReceipt component)
- **Features**: 
  - Professional green success design
  - 2-column grid layout for fields
  - Displays wallet address (if provided)
  - Shows transaction hash
  - Professional timing format
  - Loading spinner during processing

---

## 📱 Capacitor Mobile App Setup

### Installed Components
- `@capacitor/core` - Framework
- `@capacitor/cli` - CLI tools
- `@capacitor/ios` - iOS platform
- `@capacitor/android` - Android platform

### Configuration Files
- `capacitor.config.ts` - TypeScript configuration
- `capacitor.config.json` - JSON backup configuration
- `public/index.html` - WebView entry point with loading screen

### Available Commands
```bash
npm run capacitor:sync        # Sync changes to native projects
npm run capacitor:open:ios    # Open iOS project in Xcode
npm run capacitor:open:android # Open Android project in Android Studio
npm run capacitor:build       # Build web assets and sync
```

### Build Setup (Requires macOS + Local Development)
1. Follow `CAPACITOR_SETUP_GUIDE.md` for detailed instructions
2. Requires Xcode for iOS and Android Studio for Android
3. Produces native `.ipa` (iOS) and `.aab`/`.apk` (Android) files
4. Ready for App Store Connect and Google Play Console submissions

---

## 🔐 Security & Environment Variables

### Required Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
SUPABASE_SERVICE_ROLE_KEY=[key]
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=[key]
STRIPE_SECRET_KEY=[key]
NEXT_PUBLIC_APP_URL=https://theoaklinebank.com
EMAIL_USER=[smtp_user]
EMAIL_PASSWORD=[smtp_password]
```

### Data Security
- Passwords hashed with bcryptjs
- Supabase Row Level Security (RLS) for database access
- Supabase Auth for session management
- HTTPS only for production
- Capacitor configured for HTTPS only in production

---

## 🚀 Deployment

### Production (Vercel)
- Deployed at https://theoaklinebank.com
- Automatic deployments from main branch
- Next.js optimizations enabled
- Serverless API routes

### Mobile App Distribution
**App Store (iOS)**: TestFlight → App Store Connect → Submission
**Play Store (Android)**: Internal Testing → Beta → Production

See `CAPACITOR_SETUP_GUIDE.md` for detailed store requirements and checklist.

---

## 📊 Recent Fixes & Improvements

### Jan 20, 2026 - Account Freeze System Enhancements
- ✅ **Pending Payment Status Display**: Freeze modals on wire-transfer and withdrawal pages now show "Payment Pending Confirmation" when user has submitted payment
- ✅ **Dashboard Pending Banner**: Dashboard freeze banner changes to amber/yellow with "Payment Pending Verification" message when payment is submitted
- ✅ **Payment Details in Modal**: Pending payment modal shows submission date, amount, payment method, cryptocurrency type/network, and transaction hash
- ✅ **Animated Status Indicator**: Blinking indicator shows payment is actively being processed
- ✅ **Database Integration**: Freeze payment status and details stored in profiles table (freeze_payment_status, freeze_payment_submitted_at, etc.)
- ✅ **Wire Transfer Freeze Modal**: Redesigned as scrollable overlay showing page header, with professional styling and numbered explanation list
- ✅ **Withdrawal Freeze Modal**: Added freeze check and modal to withdrawal page (checks is_frozen column in profiles)
- ✅ **Dashboard Freeze Banner**: Added "Balance Frozen" notification banner below balance display with "Resolve Now" button
- ✅ **Freeze Payment Flow**: pages/freeze-payment/index.js and pages/freeze-payment/[method].js for payment resolution
- ✅ **Payment Proof Upload**: Users can now upload payment proof (JPG, PNG, PDF) for all payment methods
- ✅ **Buy Crypto Links**: Crypto payment method shows links to Coinbase, Binance, Kraken, MoonPay, Transak, Simplex
- ✅ **Email Notifications**: Users receive email confirmation when submitting payment proof
- ✅ **Secure Storage**: Payment proofs stored securely in crypto-deposit-proofs bucket (no public URLs)
- ✅ **API Endpoint**: pages/api/freeze-payment/upload-proof.js for handling proof uploads with auth

### Dec 1, 2025 - Loan Deposit Enhancements
- ✅ **Wallet Address in Receipt**: Receipt now displays the cryptocurrency wallet address users sent their deposit to
- ✅ **Professional Receipt Layout**: Updated to 2-column grid layout with proper spacing and typography
- ✅ **Email Logging**: Added detailed console logging to track email delivery issues
- ✅ **Transaction Hash Display**: Full transaction hash shown in receipt (not truncated)
- ✅ **Loan Payments Table Migration**: Created migration for new deposit-specific columns (tx_hash, fees, proof_path, etc.)

### Outstanding Issues to Address
- **Email Delivery**: Verify email service is properly configured; check logs when testing deposits
- **Database Migration**: Must run SQL migration in Supabase to add new columns to loan_payments table
- **Blockchain Confirmation Tracking**: Monitoring confirmations requires blockchain API integration

---

## 🛠️ Development Workflow

### Running Locally
```bash
npm install              # Install dependencies
npm run dev              # Start Next.js dev server (http://localhost:5000)
npm run build            # Build for production
npm run lint             # Run ESLint
```

### Testing Deposits
1. Navigate to Loan → Collateral Deposit page
2. Enter deposit amount (min 10% of loan)
3. Select payment method (crypto or account balance)
4. Submit deposit
5. Check email for confirmation (may need to verify email service)
6. Monitor dashboard for transaction status

### Mobile App Testing
```bash
npm run capacitor:sync              # Copy web assets to native projects
npm run capacitor:open:ios          # Test on iOS simulator/device
npm run capacitor:open:android      # Test on Android simulator/device
```

---

## 📞 Support & Resources

- **Capacitor Docs**: https://capacitorjs.com
- **Next.js Docs**: https://nextjs.org
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console

---

## ✅ Project Status

**Loan Deposit System**: ✅ Production Ready (requires DB migration)  
**Mobile App**: 🟡 Structure Ready (needs Xcode/Android Studio for native builds)  
**Email Notifications**: 🟡 Functional (needs email service verification)  
**App Store Readiness**: 🟡 Ready for build (requires icons, splash screens, screenshots)  

---

*Last Updated: December 1, 2025*  
*Next Focus*: Complete mobile app build configuration and store submissions
