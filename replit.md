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