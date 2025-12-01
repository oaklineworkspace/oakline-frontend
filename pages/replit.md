# Oakline Bank Frontend

## Overview
Oakline Bank is a comprehensive Next.js/React-based banking web application providing a full digital banking experience for retail and business clients. It offers account management, transaction processing, card services, loan applications, cryptocurrency trading, bill payments, and investment services. The platform emphasizes security, user experience, and real-time data synchronization, featuring a professional internationalization page and robust administrative functionalities. The project's goal is to deliver a secure, user-friendly, and feature-rich digital banking solution.

## User Preferences
Preferred communication style: Simple, everyday language.
Professional banking design with 70%+ UI/UX improvements.

## System Architecture

### Frontend Architecture
The application uses **Next.js 14.2.3** and React 18.2.0, leveraging SSR/SSG and PWA capabilities. **TanStack React Query** manages server state, and **AuthContext** handles global authentication. Forms are managed with **React Hook Form** and **Zod** for validation. The architecture is modular, feature-based, and responsive, with file-based routing and protected routes. Performance optimizations include SWC minification, code splitting, image optimization, and HTTP caching. Mobile and PWA features, including Apple mobile web app capabilities and a PWA manifest, are integrated.

### Authentication & Authorization
**Supabase Auth** is used for email/password and magic link authentication, session persistence, and real-time updates. It supports customer profiles with application-based account creation and admin profiles with role-based access (admin, super_admin, manager). Authorization checks are implemented throughout, with server-side JWT token verification for admin pages.

### System Design Choices
- **UI/UX**: Professional banking interface with premium gradients, smooth animations, enhanced shadows, and transaction color coding. Cards feature sophisticated hover effects and responsive layouts. Dates and times are professionally formatted. Mobile-responsive with touch-friendly design.
- **Navigation**: Context-aware navigation redirects users based on authentication state. Application form agreement links open in new tabs.
- **Internationalization**: A dedicated page offers multi-language selection (8 languages), an interactive currency converter, international banking services, global presence display, and transparent fee structures.
- **Security**: Environment variables replace hardcoded admin passwords. Role-based access control uses the Supabase `admin_profiles` table. Sensitive bank information is protected and visible only to authenticated users. Features 256-bit SSL encryption, FDIC insurance compliance indicators, and PCI DSS compliance.
- **Loan System**: Professional loan management with dual payment options (crypto & balance), deposit status tracking based on real transactions, comprehensive email notifications, and real-time loan status updates.
- **Notifications**: Users receive real-time email and in-app notifications on:
  - Loan application submission
  - Deposit submission (crypto and balance)
  - Deposit confirmation
  - Loan approval/rejection
  - Payment confirmations
- **Database Schema**: Key tables include `accounts`, `applications`, `admin_profiles`, `enrollments`, `transactions`, `cards`, `card_applications`, `user_profiles`, `bills`, `crypto_deposits`, `loans`, and `user_crypto_wallets`, integrated with Supabase Auth.

## External Dependencies

### Database & Backend
- **Supabase**: Provides PostgreSQL database, authentication, and real-time capabilities via `@supabase/supabase-js`.

### Payment Processing
- **Stripe**: Used for payment processing, integrated via `@stripe/stripe-js` and `@stripe/react-stripe-js`.

### Email Services
- **Nodemailer**: Used for transactional emails with SMTP configuration and multiple aliases.

### Security & Validation
- **Validator**: For input validation.
- **XSS**: For cross-site scripting prevention.

### Deployment
- **Replit**: Primary deployment platform, configured for autoscale deployment. Environment secrets for Supabase, Plaid, and SMTP are managed through Replit Secrets.
