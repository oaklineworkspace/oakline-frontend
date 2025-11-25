# Oakline Bank Frontend

## Overview
Oakline Bank is a comprehensive Next.js/React-based banking web application providing a full digital banking experience for retail and business clients. It offers account management, transaction processing, card services, loan applications, cryptocurrency trading, bill payments, and investment services. The platform emphasizes security, user experience, and real-time data synchronization, featuring a professional internationalization page and robust administrative functionalities. The project's goal is to deliver a secure, user-friendly, and feature-rich digital banking solution.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application uses **Next.js 14.2.3** and React 18.2.0, leveraging SSR/SSG and PWA capabilities. **TanStack React Query** manages server state, and **AuthContext** handles global authentication. Forms are managed with **React Hook Form** and **Zod** for validation. The architecture is modular, feature-based, and responsive, with file-based routing and protected routes. Performance optimizations include SWC minification, code splitting, image optimization, and HTTP caching. Mobile and PWA features, including Apple mobile web app capabilities and a PWA manifest, are integrated.

### Authentication & Authorization
**Supabase Auth** is used for email/password and magic link authentication, session persistence, and real-time updates. It supports customer profiles with application-based account creation and admin profiles with role-based access (admin, super_admin, manager). Authorization checks are implemented throughout, with server-side JWT token verification for admin pages.

### System Design Choices
- **UI/UX**: Professional, modern banking interface with smooth animations, enhanced shadows, subtle lift effects, and transaction color coding. Dates and times are professionally formatted. The UI is mobile-responsive with optimized styling and touch-friendly hover effects.
- **Navigation**: Context-aware navigation redirects users based on authentication state. Application form agreement links open in new tabs.
- **Internationalization**: A dedicated page offers multi-language selection (8 languages), an interactive currency converter, international banking services, global presence display, and transparent fee structures.
- **Security**: Environment variables replace hardcoded admin passwords. Role-based access control uses the Supabase `admin_profiles` table. Sensitive bank information is protected and visible only to authenticated users. Features 256-bit SSL encryption, FDIC insurance compliance indicators, and PCI DSS compliance.
- **Database Schema**: Key tables include `accounts`, `applications`, `admin_profiles`, `enrollments`, `transactions`, `cards`, `card_applications`, `user_profiles`, `bills`, `crypto_deposits`, and `user_crypto_wallets`, integrated with Supabase Auth.
- **Data Flow**: User enrollment involves KYC, account creation, email notification with magic link, password setup, and account activation. Transaction processing includes real-time balance updates, validation, fraud monitoring, instant notifications, and history synchronization. Multi-account management supports 23 account types.
- **Loan Workflow**: Loan processing involves a dedicated Loan Department workflow, preventing duplicate deposits for the same loan, and providing clear status messages. Email notifications are sent at all loan stages. Loan application redesign is step-based with progress indicators.
- **Transaction Standardization**: All transfer operations use `debit` and `credit` transaction types, with a complete audit trail (`balance_before`, `balance_after`, `reference`, `user_id`, `created_at`). Transaction icons are mapped, and reference numbers offer copy-to-clipboard functionality.
- **Zelle Payment System**: Comprehensive Zelle® integration with features like sending money, managing contacts, transaction history, QR code generation, real-time balance updates, email verification codes, and transaction notifications. Security includes two-factor verification and spending limits.
- **Content Expansion**: Includes 10 new informational banking pages covering various personal finance and banking topics.
- **Card Application System**: Enhanced apply-card page with active card detection, replacement request options, professional loading overlay with stage-based progress messages, success banner with auto-redirect, and comprehensive validation.
- **Check Deposit System**: Comprehensive deposit-real page for mobile check deposits with detailed photo-taking instructions, file validation (JPEG/PNG/HEIC, max 10MB), helpful tips, and a $5,000 maximum deposit limit with 1-2 business day processing.
- **Transaction PIN Reset**: Comprehensive PIN reset workflow with email verification. Features a 3-step process: request verification code, verify code, and set new PIN. Verification codes are bcrypt-hashed, expire after 10 minutes, and are stored in the `pin_reset_codes` table with single-use enforcement.
- **Login Notifications**: Security feature sending email alerts upon successful logins with comprehensive details (date/time, location, device model, browser, OS, IP address). Users can enable/disable this feature in Security Settings via `user_security_settings.loginalerts`.
- **Selfie/Video Verification System**: Identity verification system for users with suspicious banking activities. Requires selfie or video verification before account access, featuring a video recording component, dedicated verification page, `selfie_verifications` database table for status tracking, profile integration, authentication flow redirection, API endpoints for file upload, and an admin panel guide for management.
- **Transaction Blocking for Verification**: Users requiring verification are automatically blocked from accessing all transaction pages and redirected to `/verify-identity` until verified. Blocked pages include internal transfers, external payments, withdrawals, crypto trading, card applications, loan applications, and crypto loan deposits.
- **Performance Optimizations**: Addressed device crashes on transfer pages through optimizations like aggressive video recording voice cancellation, `priority={true}` and `loading="eager"` for hero images, code splitting for wire transfer styles and validators, improved video recording frame collection, and mobile stability improvements for transfer pages.
- **Oakline-to-Oakline Payments Styling & Dual Email Alerts**: Overhauled send-to-Oakline user payment page with professional wire transfer styling and comprehensive dual email notifications for both sender and recipient.

## External Dependencies

### Database & Backend
- **Supabase**: Provides PostgreSQL database, authentication, and real-time capabilities via `@supabase/supabase-js`.

### Payment Processing
- **Stripe**: Used for payment processing, integrated via `@stripe/stripe-js` and `@stripe/react-stripe-js`.

### Email Services
- **Nodemailer**: Used for transactional emails with SMTP configuration and multiple aliases.
- **Email Logging**: Comprehensive audit system logs all outbound emails to the `email_logs` table, capturing recipient, subject, type, status, provider, message ID, and full message body.

### Security & Validation
- **Validator**: For input validation.
- **XSS**: For cross-site scripting prevention.

### Chart & Visualization
- **Chart.js**: Integrated via React Chart.js 2 wrappers for financial data visualization.

### Deployment
- **Replit**: Primary deployment platform, configured for autoscale deployment. Environment secrets for Supabase, Plaid, and SMTP are managed through Replit Secrets.

### API Integration
- **Internal API Routes**: Used for fetching user-specific data.
- **Backend Communication**: RESTful API communication with environment-based backend URL configuration and authorization headers using Supabase session tokens.