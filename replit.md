# Oakline Bank Frontend

## Overview
Oakline Bank is a comprehensive Next.js/React-based banking web application offering a full digital banking experience for retail and business clients. Key features include account management, transaction processing, card services, loan applications, cryptocurrency trading, bill payments, and investment services. The platform prioritizes security, user experience, and real-time data synchronization. It also features a professional internationalization page and robust administrative functionalities. The project's ambition is to provide a secure, user-friendly, and feature-rich digital banking solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application is built with **Next.js 14.2.3** and React 18.2.0, utilizing SSR/SSG and PWA capabilities. State management employs **TanStack React Query** for server state and **AuthContext** for global authentication. Form handling uses **React Hook Form** with **Zod** for validation. The architecture is modular, feature-based, and responsive, with file-based routing and protected routes. Performance optimizations include SWC minification, code splitting, image optimization, and HTTP caching. Mobile and PWA features, including Apple mobile web app capabilities and a PWA manifest, are integrated.

### Authentication & Authorization
**Supabase Auth** manages email/password and magic link authentication, session persistence, and real-time updates. The system supports customer profiles with application-based account creation and admin profiles with role-based access (admin, super_admin, manager). Authorization checks are implemented throughout the application, with server-side JWT token verification for admin pages.

### System Design Choices
- **UI/UX**: Features a professional, modern banking interface with smooth animations, enhanced shadows, and subtle lift effects. Transaction color coding differentiates various transaction types. Dates and times are professionally formatted. The UI is mobile-responsive with optimized styling and touch-friendly hover effects.
- **Navigation**: Context-aware navigation redirects users based on authentication state. Application form agreement links open in new tabs to prevent data loss.
- **Internationalization**: A dedicated page provides multi-language selection (8 languages), an interactive currency converter with real-time (demonstrative) rates, international banking services, global presence display, and transparent fee structures.
- **Security**: Hardcoded admin passwords are removed, replaced by environment variable validation. Role-based access control uses the Supabase `admin_profiles` table. Sensitive bank information is protected and visible only to authenticated users. Features 256-bit SSL encryption, FDIC insurance compliance indicators, and PCI DSS compliance.
- **Database Schema**: Key tables include `accounts`, `applications`, `admin_profiles`, `enrollments`, `transactions`, `cards`, `card_applications`, `user_profiles`, `bills`, `crypto_deposits`, and `user_crypto_wallets`, integrated with Supabase Auth.
- **Data Flow**: User enrollment involves KYC, account creation, email notification with magic link, password setup, and account activation. Transaction processing includes real-time balance updates, validation, fraud monitoring, instant notifications, and history synchronization. The system supports multi-account management for 23 account types.
- **Loan Workflow**: Loan processing involves a dedicated Loan Department workflow, preventing duplicate deposits for the same loan, and providing clear status messages ("Deposit received. Your loan is under review by the Loan Department"). Email notifications are sent at all loan stages. Loan application redesign is step-based with progress indicators.
- **Transaction Standardization**: All transfer operations use `debit` and `credit` transaction types, with a complete audit trail including `balance_before`, `balance_after`, `reference`, `user_id`, and `created_at`. Transaction icons are mapped for various types, and reference numbers are displayed with copy-to-clipboard functionality.
- **Zelle Payment System**: Comprehensive Zelle® integration with features like sending money, managing contacts, viewing transaction history, QR code generation, real-time balance updates, email verification codes, and transaction notifications. Security includes two-factor verification and spending limits.
- **Content Expansion**: Includes 10 new informational banking pages covering personal finance, retirement planning, green banking, digital wallets, promotions, business insights, community impact, financial tools, security awareness, and customer stories.
- **Card Application System** (Nov 2025): Enhanced apply-card page with active card detection that shows existing cards as informational notice while allowing replacement requests. Features include professional loading overlay with stage-based progress messages, success banner with animated checkmark and auto-redirect to cards page, and comprehensive validation.
- **Check Deposit System** (Nov 2025): Comprehensive deposit-real page for mobile check deposits with detailed photo-taking instructions, file validation (JPEG/PNG/HEIC, max 10MB), helpful tips for quality photos, and $5,000 maximum deposit limit with 1-2 business day processing.
- **Sign-In Page UX** (Nov 2025): Fixed scrolling security warning banner to prevent text overlap by adjusting height and overflow properties.
- **Transaction PIN Reset** (Nov 2025): Comprehensive PIN reset workflow with email verification for enhanced security. Features a 3-step process: request verification code, verify code, and set new PIN. Verification codes are bcrypt-hashed, expire after 10 minutes, and are stored in the `pin_reset_codes` table with single-use enforcement. Professional email templates include security warnings and detailed instructions. Accessible via "Forgot PIN?" link on setup-transaction-pin page.
- **Login Notifications** (Nov 2025): Security feature that sends email alerts when users successfully log into their account. Notifications include comprehensive login details (date/time, location, specific device model, browser, OS, IP address) with professional email templates. Enhanced device detection identifies specific devices like "iPhone (iOS 17)", "Samsung Phone", "iPad", etc., instead of generic "mobile" or "desktop" labels. Users can enable/disable this feature in Security Settings via the `user_security_settings.loginalerts` flag. The system uses advanced User-Agent parsing in `lib/activityLogger.js` to detect 15+ device manufacturers and models. Implemented in AuthContext with non-blocking email delivery to ensure login performance.
- **Selfie/Video Verification System** (Nov 2025): Comprehensive identity verification system for users with suspicious banking activities. When suspicious behavior is detected, users are required to complete a selfie or video verification before accessing their account. Features include:
  - **Video Recording Component** (`SelfieVerification.js`): Camera access, countdown timer, 10-second video recording with auto-stop, photo capture mode, real-time preview, retake functionality, and progress tracking.
  - **Verification Page** (`/verify-identity`): Dedicated page for users to complete verification with clear instructions, reason display, submission confirmation, and dashboard redirect after review.
  - **Database Schema** (`selfie_verifications` table): Tracks verification requests with status tracking (pending, submitted, under_review, approved, rejected, expired), media file paths, admin review data, and automatic expiration (7 days).
  - **Profile Integration**: Added verification flags to `profiles` table including `requires_verification`, `verification_reason`, `is_verified`, and timestamps.
  - **Authentication Flow**: Integrated verification checks into login process with automatic redirect to verification page, blocking access until verified, and maintaining user session during verification.
  - **API Endpoints**: `/api/verification/submit` for file upload with formidable, Supabase Storage integration, automatic status updates, and email notifications.
  - **Verification Guard** (`VerificationGuard.js`): Wrapper component that checks verification status and redirects users requiring verification.
  - **Admin Functions**: SQL functions for triggering verifications (`require_user_verification`), approving (`approve_verification`), and rejecting (`reject_verification`) with audit trail.
  - **Security**: RLS policies for user/admin access, encrypted media storage in Supabase bucket, secure file uploads with size limits (50MB), and comprehensive audit logging.
  - **Backend Admin Panel Guide**: Complete documentation in `SELFIE_VERIFICATION_BACKEND_PROMPTS.md` with 8 detailed prompts for implementing admin dashboard, review interface, bulk actions, analytics, automated triggers, and email notifications.
- **Transaction Blocking for Verification** (Nov 2025): Users requiring verification are automatically blocked from accessing ANY transaction pages. When a user needing verification attempts to access transaction operations, they are redirected to `/verify-identity` with automatic verification checks in place. Blocked transaction pages include:
  - **Internal Transfers**: `pages/transfer.js`, `pages/internal-transfer.js` - Blocks all money transfers between accounts
  - **External Payments**: `pages/oakline-pay.js` - Blocks Zelle payments and payment requests
  - **Withdrawals**: `pages/withdrawal.js` - Blocks fund withdrawals via crypto, bank, or card
  - **Crypto Trading**: `pages/crypto.js` - Blocks cryptocurrency buy/sell operations
  - **Card Applications**: `pages/apply-card.js` - Blocks new card application requests
  - **Loan Applications**: `pages/loan/apply.js` - Blocks loan application submissions
  - **Crypto Loan Deposits**: `pages/loan/deposit-crypto.js` - Blocks cryptocurrency deposits for loan payments
  - **Implementation**: All pages check `profiles.requires_verification` flag early in component lifecycle and redirect to verification page before any transaction UI or data loads. This prevents users from accidentally starting transactions they cannot complete.
- **Performance Optimizations** (Nov 2025): Fixed device crashes on transfer pages through multiple optimizations:
  - **Video Recording Voice**: Fixed immediate voice stopping by using aggressive cancellation with voiceActiveRef checks, interval clearing, and multiple cancel() calls
  - **Home Page Images**: Added priority={true} and loading="eager" to hero images for improved LCP (Largest Contentful Paint)
  - **Wire Transfer Code Splitting**: Extracted large styles object (465 lines, 50KB) into `lib/wireTransferStyles.js` (accepts isMobile parameter) and validators into `lib/wireTransferValidators.js`. Reduced wire-transfer.js from 124KB to 108KB (3010 lines to 2465 lines)
  - **Video Recording Optimization**: Improved frame collection using start() without timeslice + manual requestData() every 1 second for active frame capture
  - **Mobile Stability**: Transfer pages (transfer.js 51KB, internal-transfer.js 44KB, wire-transfer.js 108KB) now load reliably without crashes on mobile devices with compilation times under 2.5 seconds

## External Dependencies

### Database & Backend
- **Supabase**: Provides PostgreSQL database (for schema tables like `accounts`, `transactions`, `user_profiles`, `admin_profiles`), authentication, and real-time capabilities via `@supabase/supabase-js`.

### Payment Processing
- **Stripe**: Used for payment processing, integrated via `@stripe/stripe-js` and `@stripe/react-stripe-js`.

### Email Services
- **Nodemailer**: Used for transactional emails (enrollment, password reset, notifications) with SMTP configuration and multiple aliases.
- **Email Logging**: Comprehensive email audit system logs all outbound emails to the `email_logs` table, capturing recipient, subject, type, status, provider, message ID, and full message body (HTML/text). Integrated directly into `lib/email.js` for automatic tracking across all 21+ API endpoints. Resilient error handling ensures logging failures don't prevent email delivery. Admin panel at `/admin/email-logs` provides full visibility into email communications.

### Security & Validation
- **Validator**: For input validation.
- **XSS**: For cross-site scripting prevention.

### Chart & Visualization
- **Chart.js**: Integrated via React Chart.js 2 wrappers for financial data visualization (Bar, Line, Doughnut charts).

### Deployment
- **Replit**: Primary deployment platform, configured for autoscale deployment. Environment secrets for Supabase, Plaid, and SMTP are managed through Replit Secrets.

### API Integration
- **Internal API Routes**: Used for fetching user-specific data (e.g., `/api/get-user-bills`).
- **Backend Communication**: RESTful API communication with environment-based backend URL configuration and authorization headers using Supabase session tokens.