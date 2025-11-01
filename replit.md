# Oakline Bank Frontend

## Overview
Oakline Bank is a comprehensive Next.js/React-based banking web application providing a complete digital banking experience. It serves retail and business clients with features like account management, transactions, card services, loan applications, cryptocurrency trading, bill payments, and investment services. The platform emphasizes security, user experience, and real-time data synchronization. The project includes a professional internationalization page and robust administrative features.

## Recent Updates

### November 2025 - Transaction Type Standardization & Platform Migration
- **Transaction Type Standardization**: Completed comprehensive migration to standardized transaction types across all transfer functionality:
  - All transfer operations now use `debit` (money out) and `credit` (money in) transaction types instead of legacy `transfer_out` and `transfer_in`
  - All transactions now record complete audit trail: `balance_before`, `balance_after`, `reference` number, `user_id`, and `created_at`
  - Updated transaction categorization logic consistently across `dashboard.js`, `transactions.js`, and `account-details.js`
  - Added reference number display with copy-to-clipboard functionality (with fallback for browsers without clipboard API)
  - Transaction icons now properly mapped for all types: deposit, withdrawal, credit, debit, bill_payment, purchase, refund, interest, crypto_deposit, zelle_send/receive
  - All legacy transaction type references removed from codebase
- **Platform Migration**: Successfully migrated from Vercel to Replit with proper port configuration (5000), environment variable setup, and workflow configuration.
  - Removed all admin pages (`pages/admin/` and `pages/api/admin/`) as they belong in separate admin repository
  - Confirmed all Supabase environment variables configured in Replit Secrets
  - Development server running on port 5000 with host 0.0.0.0 for Replit compatibility
- **Zelle Payment System**: Comprehensive Zelle® integration with real-time Supabase data synchronization:
  - **Main Features** (`/pages/zelle.js`): Send money, manage contacts, view transaction history with tabbed interface
  - **Zelle Settings** (`/pages/zelle-settings.js`): Contact management, spending limit tracking (daily $2,500, monthly $20,000), security settings
  - **API Endpoints**: `/api/zelle-transactions.js` for transaction processing, `/api/zelle-send-money.js` for verified transfers
  - **Database Tables**: `zelle_transactions`, `zelle_contacts`, `zelle_settings`, with integration to `accounts`, `profiles`, `transactions`, `notifications`, `verification_codes`, `system_logs`
  - **Features**: QR code generation for receiving money, contact quick-select, real-time balance updates, email verification codes, transaction notifications, automatic account debits/credits via `process_zelle_transfer` RPC function
  - **Security**: Two-factor verification for all transfers, daily/monthly spending limits, transaction audit logging
- **Button Styling Fix**: Resolved global button styling issue where `styles/button-fixes.css` contained a `button { background: none !important; }` rule that was removing all button backgrounds across the app. This was causing buttons on deposit-crypto and other pages to appear white with invisible text. The fix removed the global override while preserving specific `.serviceCard` styling.
- **Crypto Wallet Verification**: Verified and confirmed that `/pages/deposit-crypto.js` correctly fetches crypto wallets from **both** `user_crypto_wallets` AND `admin_assigned_wallets` tables. The implementation:
  - First queries `user_crypto_wallets` for user-specific wallet assignments
  - Falls back to `admin_assigned_wallets` if no user wallet is found
  - Displays wallet address with QR code when found from either table
  - Shows clear "No Wallet Assigned" message when neither table has a matching wallet
  - Includes comprehensive error handling and permission checking
  - Filters by `user_id`, `crypto_type`, and `network_type` for precise wallet matching

### October 2025
**New Features Added:**
- **Bill Pay System** (`/pages/bill-pay.js`): Full-featured bill payment page with beneficiary management, scheduled payments, payment history tracking, and automatic transaction recording in both `bill_payments` and `transactions` tables.
- **Investment Portfolio** (`/pages/investment.js`): Comprehensive investment management with product listings, portfolio tracking, transaction history, and real-time portfolio value calculations.
- **Crypto Deposit System** (`/pages/deposit-crypto.js`): Professional 3-step cryptocurrency deposit flow with account selection, multi-crypto support (BTC, USDT, ETH, BNB with color-coded icons), wallet address display with QR codes (using `react-qr-code`), payment instructions, user payment confirmation, and deposit submission to `crypto_deposits` table with `pending` status. Features include: progress stepper UI, professional gradient header, wallet address copy-to-clipboard, comprehensive validation, and deposit history table. Fetches wallets from both `user_crypto_wallets` and `admin_assigned_wallets` tables.

**Security Enhancements:**
- All account balance updates now include `user_id` verification to prevent unauthorized account access.
- Implemented rollback logic for multi-step financial operations to maintain data integrity.
- All bill payments (immediate and scheduled) create transaction records with appropriate status flags.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses **Next.js 14.2.3** with React 18.2.0, leveraging SSR/SSG, custom App and Document components with PWA capabilities. State management is handled by **TanStack React Query** for server state and **AuthContext** for global authentication. Form handling uses **React Hook Form** with **Zod** for validation. The architecture is modular, feature-based, and responsive, with file-based routing and protected routes. Performance optimizations include SWC minification, code splitting, image optimization, and HTTP caching. Mobile and PWA features are integrated, including Apple mobile web app capabilities and a PWA manifest.

### Authentication & Authorization
**Supabase Auth** manages email/password and magic link authentication, session persistence, and real-time updates. The system supports customer profiles with application-based account creation, and admin profiles with role-based access (admin, super_admin, manager). Authorization checks are implemented throughout the application.

### System Design Choices
- **UI/UX**: Professional, modern banking interface with smooth hover animations, enhanced shadows, and subtle lift effects. Transaction color coding provides visual differentiation for various transaction types (Credit, Debit, Pending, Reversals, Bonuses). Dates and times are professionally formatted. The UI is mobile-responsive with optimized padding, spacing, font sizes, and touch-friendly hover effects.
- **Navigation**: Context-aware navigation redirects users based on authentication state, ensuring protected features require login while public pages remain accessible. Application form agreement links open in new tabs to prevent data loss.
- **Internationalization**: A dedicated page offers multi-language selection (8 languages), an interactive currency converter with real-time exchange rate calculations (demonstrative rates), international banking services showcase, global presence display, and transparent fee structures.
- **Security**: Hardcoded admin passwords have been removed, replaced by environment variable validation. Role-based access control is implemented using Supabase `admin_profiles` table, with server-side and client-side verification. Sensitive bank information (routing numbers, SWIFT codes) is protected and only visible to authenticated users. All admin pages require server-side JWT token verification.
- **Database Schema**: Key tables include `accounts`, `applications`, `admin_profiles`, `enrollments`, `transactions`, `cards`, `card_applications`, `user_profiles`, `bills`, `crypto_deposits`, and `user_crypto_wallets`, integrated with Supabase Auth.
- **Data Flow**: User enrollment involves KYC, account creation, email notification with magic link, password setup, and account activation. Transaction processing includes real-time balance updates, validation, fraud monitoring, instant notifications, and history synchronization. The system supports multi-account management for 23 account types.

## External Dependencies

### Database & Backend
- **Supabase**: Provides PostgreSQL database (hosting schema tables like `accounts`, `transactions`, `user_profiles`, `admin_profiles`), authentication, and real-time capabilities via `@supabase/supabase-js`.

### Payment Processing
- **Stripe**: Used for payment processing, integrated via `@stripe/stripe-js` and `@stripe/react-stripe-js` for secure card tokenization and transactions.

### Email Services
- **Nodemailer**: Used for transactional emails (enrollment, password reset, notifications) with SMTP configuration and multiple aliases (e.g., `info@theoaklinebank.com`, `welcome@theoaklinebank.com`).

### Security & Validation
- **Validator**: For input validation.
- **XSS**: For cross-site scripting prevention.
- Features 256-bit SSL encryption, FDIC insurance compliance indicators, and PCI DSS compliance.

### Chart & Visualization
- **Chart.js**: Integrated via React Chart.js 2 wrappers for financial data visualization (Bar, Line, Doughnut charts).

### Deployment
- **Replit**: Primary deployment platform, configured for autoscale deployment with `npm run build` and `npm run start` commands. Environment secrets for Supabase, Plaid, and SMTP are managed through Replit Secrets.

### API Integration
- **Internal API Routes**: Used for fetching user-specific data (e.g., `/api/get-user-bills`).
- **Backend Communication**: RESTful API communication with environment-based backend URL configuration and authorization headers using Supabase session tokens.