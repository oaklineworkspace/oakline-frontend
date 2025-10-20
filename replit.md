# Oakline Bank Frontend

## Overview

Oakline Bank is a comprehensive Next.js/React-based banking web application that provides a complete digital banking experience. The platform serves both retail customers and business clients with features including account management, transactions, card services, loan applications, cryptocurrency trading, and investment services. Built with modern web technologies, it emphasizes security, user experience, and real-time data synchronization.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Core Technologies**
- **Next.js 14.2.3** with React 18.2.0 as the core framework
- Server-side rendering (SSR) and static site generation (SSG) for optimal performance
- Custom App component (`_app.js`) with global providers and sticky footer integration
- Custom Document component (`_document.js`) with PWA capabilities and mobile optimizations

**State Management & Data Fetching**
- **TanStack React Query (v5.87.4)** for server state management with 5-minute stale time and 10-minute cache time
- **AuthContext** (Context API) for global authentication state management
- Real-time subscriptions through Supabase client for live data updates

**Form Handling & Validation**
- **React Hook Form (v7.62.0)** for performant form management
- **Zod (v4.1.5)** for schema validation and type safety
- **@hookform/resolvers (v5.2.1)** for integrating Zod with React Hook Form

**Component Architecture**
- Modular component design with reusable UI elements (AccountCard, Chart, Modal, etc.)
- Feature-based organization with dedicated pages for banking services
- Responsive design with mobile-first approach and custom media query hooks
- Shared components for common UI patterns (Header, Footer, Navigation)

**Routing & Navigation**
- File-based routing using Next.js Pages Router
- Protected routes using ProtectedRoute HOC component
- Dynamic routing for account details and transaction views
- Client-side navigation with Next.js Link component

**Performance Optimizations**
- SWC minification enabled for faster builds
- Console removal in production builds
- Code splitting with webpack optimization (vendor chunk separation)
- Image optimization with WebP and AVIF format support
- Package import optimization for lucide-react and Supabase
- HTTP caching headers configuration

**Mobile & PWA Features**
- Apple mobile web app capabilities
- PWA manifest configuration
- Mobile-optimized touch interactions
- Prevention of iOS form zoom with font-size constraints
- Custom viewport settings for mobile browsers

### Authentication & Authorization

**Authentication Provider (Supabase Auth)**
- Email/password authentication with magic link support
- Session persistence with localStorage
- Automatic session detection in URLs for enrollment flows
- Auth state change listeners for real-time session updates
- Protected route handling with redirect logic

**User Roles & Permissions**
- Customer profiles with application-based account creation
- Admin profiles with role-based access (admin, super_admin, manager)
- Business account handling separate from personal accounts
- Multi-level authorization checks throughout the application

### External Dependencies

**Database & Backend (Supabase)**
- **PostgreSQL database** via Supabase with the following schema:
  - `accounts`: User bank accounts with balances, statuses, and routing numbers
  - `applications`: Account opening applications with KYC data
  - `admin_profiles`: Admin user roles and permissions
  - `enrollments`: User enrollment tracking
  - `transactions`: Transaction history and records
  - `cards`: Debit/credit card information
  - `card_applications`: Card application tracking
  - `user_profiles`: Extended user profile data
  - `bills`: Bill payment information
  - Auth.users integration for user authentication

- **Supabase Client SDK (@supabase/supabase-js v2.0.0)**
  - Client-side operations with anon key
  - Admin client with service role key for privileged operations
  - Real-time subscriptions for live updates

**Payment Processing**
- **Stripe (v18.5.0)** for payment processing
- **@stripe/stripe-js (v7.9.0)** and **@stripe/react-stripe-js (v4.0.1)** for frontend integration
- Payment card tokenization and secure transaction handling

**Email Services**
- **Nodemailer (v6.9.0)** for transactional emails
- Email templates for enrollment, password reset, and notifications
- SMTP configuration with Zoho email addresses (info@theoaklinebank.com, support@theoaklinebank.com)

**Security & Validation**
- **Validator (v13.15.15)** for input validation
- **XSS (v1.0.15)** for cross-site scripting prevention
- 256-bit SSL encryption
- FDIC insurance compliance indicators
- PCI DSS compliance for payment data

**Chart & Visualization**
- **Chart.js integration** through React Chart.js 2 wrappers
- Support for Bar, Line, and Doughnut chart types
- Financial data visualization for account analytics

**Development & Deployment**
- **Vercel** as primary deployment platform
- Development server configured for Replit environment (port 5000, host 0.0.0.0)
- ESLint with Next.js configuration for code quality

### API Integration

**Internal API Routes**
- `/api/get-user-bills` - Fetch user bill payment data
- Additional API routes for user management and transactions

**Backend Communication**
- Environment-based backend URL configuration (`NEXT_PUBLIC_BACKEND_URL`)
- RESTful API communication patterns
- Authorization headers with Supabase session tokens

### Data Flow Architecture

**User Enrollment Flow**
1. Application submission with KYC data collection
2. Account creation with unique account numbers (routing: 075915826)
3. Email notification with magic link enrollment
4. User password setup and authentication
5. Account activation and dashboard access

**Transaction Processing**
1. Real-time balance updates through Supabase
2. Transaction validation and fraud monitoring
3. Instant notification delivery
4. Transaction history synchronization

**Multi-Account Management**
- Support for 23 different account types
- Account selection and switching
- Consolidated dashboard view
- Individual account detail pages with transaction history