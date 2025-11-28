import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ComingSoon() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    setMounted(true);
    fetchBankDetails();
    // Target date - 90 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 90);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchBankDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .limit(1)
        .single();
      
      if (!error && data) {
        setBankDetails(data);
      }
    } catch (err) {
      console.error('Error fetching bank details:', err);
    }
  };

  if (!mounted) return null;

  const getFeatureContent = () => {
    const query = router.query.feature || 'zelle';
    const contentMap = {
      zelle: {
        name: 'Zelle® Payments',
        description: 'Instant money transfers to any U.S. bank account',
        heading: 'Send Money Instantly with Zelle®',
        subtitle: 'Experience the fastest way to transfer funds to friends, family, and colleagues',
        whyExpect: [
          { icon: '⚡', title: 'Real-Time Transfers', desc: 'Send and receive money instantly, available 24/7' },
          { icon: '🔒', title: 'Bank-Grade Security', desc: 'Protected with advanced encryption and fraud detection' },
          { icon: '👥', title: 'Easy Recipient Setup', desc: 'Simply use email or phone number to identify recipients' },
          { icon: '💰', title: 'No Hidden Fees', desc: 'Transparent pricing with no surprise charges' },
          { icon: '📱', title: 'Mobile Friendly', desc: 'Complete transfers on any device, anytime' },
          { icon: '🌟', title: 'Verified Transfers', desc: 'Secure verification for every transaction' }
        ],
        reasons: [
          { number: '01', title: 'Fastest in Market', desc: 'Money reaches in seconds, not days like traditional transfers' },
          { number: '02', title: 'Trusted Network', desc: 'Part of the nationwide Zelle network with millions of users' },
          { number: '03', title: 'Fraud Protection', desc: 'Advanced monitoring and dispute resolution available' },
          { number: '04', title: 'Simple Interface', desc: 'Intuitive design makes transfers effortless for everyone' }
        ]
      },
      'oakline-pay': {
        name: 'Oakline Pay',
        description: 'Send and receive money to friends and family with @username tags',
        heading: 'Revolutionize How You Pay with Oakline Pay',
        subtitle: 'Send money to anyone using simple @username tags - no complicated account numbers needed',
        whyExpect: [
          { icon: '💳', title: 'Username Tags', desc: 'Transfer with just a @username - simple and intuitive' },
          { icon: '⚡', title: 'Instant for Members', desc: 'Immediate transfers between Oakline accounts' },
          { icon: '📧', title: 'Email Claim Links', desc: 'Non-members receive secure claim notifications' },
          { icon: '🎯', title: 'Multiple Redemption Options', desc: 'Debit card, ACH transfer, or create account' },
          { icon: '🔐', title: 'PIN-Protected', desc: 'Two-factor PIN verification for every transfer' },
          { icon: '🌍', title: 'Global Ready', desc: 'Works for customers worldwide with local redemption' }
        ],
        reasons: [
          { number: '01', title: 'Social Banking', desc: 'Transfer money as easily as messaging with @usernames' },
          { number: '02', title: 'Flexible Redemption', desc: 'Recipients choose how they receive their money' },
          { number: '03', title: 'International Reach', desc: 'Send to friends across the world with ease' },
          { number: '04', title: 'Instant for Members', desc: 'Oakline users receive funds immediately' }
        ]
      },
      investment: {
        name: 'Investment Services',
        description: 'Build wealth with our comprehensive investment tools and professional advisory',
        heading: 'Grow Your Wealth with Professional Investment Services',
        subtitle: 'Access expert-guided investment opportunities tailored to your financial goals',
        whyExpect: [
          { icon: '📊', title: 'Portfolio Management', desc: 'Professional tools to track and optimize your investments' },
          { icon: '👨‍💼', title: 'Expert Advisory', desc: 'Personalized guidance from certified financial advisors' },
          { icon: '📈', title: 'Market Analytics', desc: 'Real-time market data and investment insights' },
          { icon: '🎓', title: 'Investment Education', desc: 'Learn investment strategies from industry experts' },
          { icon: '💰', title: 'Diverse Options', desc: 'Stocks, bonds, ETFs, and more in one platform' },
          { icon: '🛡️', title: 'Risk Management', desc: 'Tools to manage and balance your investment risk' }
        ],
        reasons: [
          { number: '01', title: 'Expert Guidance', desc: 'Access to professional advisors who understand your goals' },
          { number: '02', title: 'Comprehensive Tools', desc: 'Everything you need to build and manage your portfolio' },
          { number: '03', title: 'Competitive Returns', desc: 'Access to investment opportunities with strong performance' },
          { number: '04', title: 'Financial Growth', desc: 'Build long-term wealth with proven investment strategies' }
        ]
      },
      deposit: {
        name: 'Mobile Check Deposit',
        description: 'Deposit checks anywhere, anytime using your mobile device',
        heading: 'Deposit Checks Instantly from Your Phone',
        subtitle: 'Snap a photo and deposit checks without visiting a branch',
        whyExpect: [
          { icon: '📱', title: 'Mobile Convenience', desc: 'Deposit checks from anywhere, anytime without leaving home' },
          { icon: '📸', title: 'Easy Photo Upload', desc: 'Simply take clear photos of front and back of check' },
          { icon: '⚡', title: 'Instant Processing', desc: 'Funds typically available within 1-2 business days' },
          { icon: '🔒', title: 'Secure Deposits', desc: 'End-to-end encryption protects your check images' },
          { icon: '📋', title: 'Deposit History', desc: 'Track all your mobile deposits with detailed records' },
          { icon: '✓', title: 'Real-Time Confirmation', desc: 'Immediate confirmation after successful deposit' }
        ],
        reasons: [
          { number: '01', title: 'Save Time', desc: 'No more lines at the branch - deposit in seconds' },
          { number: '02', title: 'Always Available', desc: 'Deposit checks at 3 AM, 3 PM, or anytime you need' },
          { number: '03', title: 'High Limits', desc: 'Deposit multiple checks up to your daily limit' },
          { number: '04', title: 'Peace of Mind', desc: 'Secure encryption and fraud protection on every deposit' }
        ]
      },
      'bill-pay': {
        name: 'Bill Pay Services',
        description: 'Pay all your bills online securely with automatic payment options',
        heading: 'Manage All Your Bills in One Place',
        subtitle: 'Schedule, automate, and track all your payments from your Oakline account',
        whyExpect: [
          { icon: '🧾', title: 'One-Time Payments', desc: 'Pay any bill whenever you want with just a few clicks' },
          { icon: '📅', title: 'Automatic Scheduling', desc: 'Set up recurring payments for regular bills' },
          { icon: '💳', title: 'Multiple Payees', desc: 'Save and manage unlimited payee information' },
          { icon: '📧', title: 'Bill Reminders', desc: 'Get notifications before bills are due' },
          { icon: '📊', title: 'Payment History', desc: 'View detailed records of all payments made' },
          { icon: '🔐', title: 'Bank-Level Security', desc: 'Your payments protected with industry-standard encryption' }
        ],
        reasons: [
          { number: '01', title: 'Never Miss a Due Date', desc: 'Automatic reminders and scheduling keep you on track' },
          { number: '02', title: 'Save Time', desc: 'Pay multiple bills in minutes, not hours' },
          { number: '03', title: 'Financial Control', desc: 'View all bills and payments in one dashboard' },
          { number: '04', title: 'Complete Peace of Mind', desc: 'Secure, encrypted payments with full audit trail' }
        ]
      },
      withdraw: {
        name: 'Withdrawal Services',
        description: 'Access your funds with flexible withdrawal options',
        heading: 'Withdraw Your Funds Your Way',
        subtitle: 'Multiple convenient options to access your money when you need it',
        whyExpect: [
          { icon: '💸', title: 'ATM Withdrawals', desc: 'Access funds at 500,000+ ATMs nationwide' },
          { icon: '🏦', title: 'Branch Withdrawals', desc: 'Visit any branch for in-person withdrawals' },
          { icon: '💳', title: 'Debit Card Access', desc: 'Use your card at merchants to get cash back' },
          { icon: '🌍', title: 'International Access', desc: 'Withdraw funds worldwide at partner locations' },
          { icon: '📱', title: 'Mobile Withdrawals', desc: 'Digital wallet options for contactless access' },
          { icon: '⏰', title: '24/7 Availability', desc: 'Access your funds anytime, day or night' }
        ],
        reasons: [
          { number: '01', title: 'Maximum Flexibility', desc: 'Multiple ways to access your funds on your schedule' },
          { number: '02', title: 'Wide Network', desc: 'Withdraw from locations convenient to you' },
          { number: '03', title: 'Always Available', desc: 'Your money is accessible 24/7/365' },
          { number: '04', title: 'No Hassle', desc: 'Quick, simple withdrawals without complications' }
        ]
      },
      'my-loans': {
        name: 'My Loans Dashboard',
        description: 'Manage all your loans in one central dashboard',
        heading: 'Take Control of Your Loans',
        subtitle: 'View balances, payment schedules, and manage all your loans from one dashboard',
        whyExpect: [
          { icon: '📊', title: 'Loan Overview', desc: 'See all your loans at a glance with current balances' },
          { icon: '📅', title: 'Payment Schedule', desc: 'View upcoming payments and due dates' },
          { icon: '💰', title: 'Payoff Calculations', desc: 'Plan ahead with payoff date projections' },
          { icon: '📈', title: 'Interest Tracking', desc: 'Monitor interest paid over time' },
          { icon: '🔔', title: 'Smart Reminders', desc: 'Get notified before payments are due' },
          { icon: '💳', title: 'Quick Payments', desc: 'Make loan payments with one click' }
        ],
        reasons: [
          { number: '01', title: 'One Dashboard', desc: 'Manage all your loans in one convenient place' },
          { number: '02', title: 'Stay Organized', desc: 'Never miss a payment or forget a deadline' },
          { number: '03', title: 'Financial Clarity', desc: 'Understand your loan details and progress' },
          { number: '04', title: 'Better Planning', desc: 'Make informed decisions about your debt' }
        ]
      },
      'apply-loan': {
        name: 'Loan Application',
        description: 'Apply for personal, auto, home, or business loans',
        heading: 'Get the Funds You Need',
        subtitle: 'Quick and easy loan applications with competitive rates and flexible terms',
        whyExpect: [
          { icon: '⚡', title: 'Fast Application', desc: 'Complete your application in just 5 minutes' },
          { icon: '💰', title: 'Competitive Rates', desc: 'Industry-leading rates based on your profile' },
          { icon: '📋', title: 'Flexible Terms', desc: 'Choose loan terms that work for your budget' },
          { icon: '✓', title: 'Quick Approval', desc: 'Instant decisions on most applications' },
          { icon: '🎯', title: 'Multiple Loan Types', desc: 'Personal, auto, home, and business loans' },
          { icon: '📞', title: 'Expert Support', desc: 'Loan officers ready to help you throughout' }
        ],
        reasons: [
          { number: '01', title: 'Best Rates', desc: 'Competitive pricing that saves you money' },
          { number: '02', title: 'Flexible Options', desc: 'Loans designed for different needs and goals' },
          { number: '03', title: 'Quick Process', desc: 'Fast approval and funding to your account' },
          { number: '04', title: 'Expert Guidance', desc: 'Our team helps you find the right loan' }
        ]
      }
    };
    return contentMap[query] || contentMap.zelle;
  };

  const content = getFeatureContent();

  return (
    <>
      <Head>
        <title>Coming Soon - {content.name} | Oakline Bank</title>
        <meta name="description" content={`${content.name} is coming to Oakline Bank. Stay tuned for this exciting new feature.`} />
        <meta property="og:title" content={`Coming Soon - ${content.name}`} />
        <meta property="og:description" content={content.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.badge}>🚀 Exciting Feature Coming Soon</div>
            <h1 style={styles.heading}>{content.heading}</h1>
            <p style={styles.subtitle}>{content.subtitle}</p>
            
            {/* Countdown Timer */}
            <div style={styles.countdownSection}>
              <p style={styles.countdownLabel}>Launching In:</p>
              <div style={styles.countdown}>
                <div style={styles.timeUnit}>
                  <div style={styles.timeValue}>{timeLeft.days}</div>
                  <div style={styles.timeLabel}>Days</div>
                </div>
                <div style={styles.timeSeparator}>:</div>
                <div style={styles.timeUnit}>
                  <div style={styles.timeValue}>{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>Hours</div>
                </div>
                <div style={styles.timeSeparator}>:</div>
                <div style={styles.timeUnit}>
                  <div style={styles.timeValue}>{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>Minutes</div>
                </div>
                <div style={styles.timeSeparator}>:</div>
                <div style={styles.timeUnit}>
                  <div style={styles.timeValue}>{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div style={styles.timeLabel}>Seconds</div>
                </div>
              </div>
            </div>
          </div>

          {/* Illustration */}
          <div style={styles.illustration}>
            <div style={styles.illuShape1}></div>
            <div style={styles.illuShape2}></div>
            <div style={styles.illuShape3}></div>
          </div>
        </div>

        {/* Features Preview */}
        <div style={styles.featuresSection}>
          <h2 style={styles.sectionTitle}>What to Expect</h2>
          <div style={styles.featuresGrid}>
            {content.whyExpect.map((feature, idx) => (
              <div key={idx} style={styles.featureCard}>
                <div style={styles.featureIcon}>{feature.icon}</div>
                <h3 style={styles.featureTitle}>{feature.title}</h3>
                <p style={styles.featureDesc}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Section */}
        <div style={styles.notificationSection}>
          <div style={styles.notificationBox}>
            <div style={styles.notificationHeader}>
              <span style={styles.notificationIcon}>📧</span>
              <h3 style={styles.notificationTitle}>Get Notified When We Launch</h3>
            </div>
            <p style={styles.notificationDesc}>Be among the first to know when {content.name} becomes available. We'll send you an exclusive notification.</p>
            <div style={styles.notificationButtons}>
              <button style={styles.notifyButton}>
                Notify Me
              </button>
              <button style={styles.browsButton}>
                Explore Other Features
              </button>
            </div>
          </div>
        </div>

        {/* Why Section */}
        <div style={styles.whyWaitSection}>
          <h2 style={styles.sectionTitle}>Why {content.name}?</h2>
          <div style={styles.reasonsGrid}>
            {content.reasons.map((reason, idx) => (
              <div key={idx} style={styles.reasonCard}>
                <div style={styles.reasonNumber}>{reason.number}</div>
                <h4 style={styles.reasonTitle}>{reason.title}</h4>
                <p style={styles.reasonDesc}>{reason.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>Explore Our Current Services</h2>
          <p style={styles.ctaDesc}>While you wait, discover all the amazing features available right now.</p>
          <div style={styles.ctaButtons}>
            <Link href="/dashboard" style={styles.ctaPrimary}>
              Go to Dashboard
            </Link>
            <Link href="/transfer" style={styles.ctaSecondary}>
              View Transfer Options
            </Link>
            <Link href="/" style={styles.ctaTertiary}>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <div style={styles.footerInfo}>
          <p style={styles.footerText}>
            Questions? <Link href="/support" style={styles.footerLink}>Contact our support team</Link>
          </p>
          {bankDetails?.support_email && (
            <p style={styles.footerText}>
              Email: <a href={`mailto:${bankDetails.support_email}`} style={styles.footerLink}>{bankDetails.support_email}</a>
            </p>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2E5C9E 50%, #1A3E6F 100%)',
    overflow: 'hidden',
    paddingBottom: '60px',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '80px 20px 40px',
    gap: '40px',
    position: 'relative',
    zIndex: 2,
  },
  heroContent: {
    flex: 1,
    color: 'white',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '20px',
    backdropFilter: 'blur(10px)',
  },
  heading: {
    fontSize: '48px',
    fontWeight: '700',
    margin: '20px 0',
    lineHeight: '1.2',
    letterSpacing: '-1px',
    background: 'linear-gradient(135deg, #FFFFFF 0%, #E0E7FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  countdownSection: {
    marginTop: '50px',
  },
  countdownLabel: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '15px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    fontWeight: '600',
  },
  countdown: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    flexWrap: 'wrap',
  },
  timeUnit: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '15px 12px',
    minWidth: '70px',
    textAlign: 'center',
    backdropFilter: 'blur(10px)',
  },
  timeValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: '1',
  },
  timeLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: '5px',
    textTransform: 'uppercase',
  },
  timeSeparator: {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.4)',
    margin: '0 2px',
    marginBottom: '15px',
  },
  illustration: {
    flex: 1,
    position: 'relative',
    height: '300px',
    display: 'none',
  },
  illuShape1: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '50%',
    top: '20px',
    right: '30px',
    animation: 'float 6s ease-in-out infinite',
  },
  illuShape2: {
    position: 'absolute',
    width: '150px',
    height: '150px',
    background: 'rgba(224, 231, 255, 0.1)',
    borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
    bottom: '40px',
    left: '40px',
    animation: 'float 8s ease-in-out infinite reverse',
  },
  illuShape3: {
    position: 'absolute',
    width: '120px',
    height: '120px',
    background: 'rgba(147, 197, 253, 0.1)',
    borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
    top: '100px',
    right: '-30px',
    animation: 'float 7s ease-in-out infinite',
  },
  featuresSection: {
    maxWidth: '1200px',
    margin: '80px auto 0',
    padding: '60px 20px',
    color: 'white',
  },
  sectionTitle: {
    fontSize: '32px',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '50px',
    color: 'white',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  featureCard: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '16px',
    padding: '30px',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: '15px',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: 'white',
  },
  featureDesc: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: '1.6',
  },
  notificationSection: {
    maxWidth: '900px',
    margin: '60px auto',
    padding: '0 20px',
  },
  notificationBox: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    padding: '40px',
    backdropFilter: 'blur(10px)',
    textAlign: 'center',
    color: 'white',
  },
  notificationHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '15px',
  },
  notificationIcon: {
    fontSize: '28px',
  },
  notificationTitle: {
    fontSize: '22px',
    fontWeight: '700',
    margin: '0',
  },
  notificationDesc: {
    fontSize: '15px',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '25px',
    lineHeight: '1.6',
  },
  notificationButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  notifyButton: {
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 32px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  browsButton: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '10px',
    padding: '12px 32px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  whyWaitSection: {
    maxWidth: '1200px',
    margin: '60px auto',
    padding: '60px 20px',
    color: 'white',
  },
  reasonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  reasonCard: {
    position: 'relative',
    paddingLeft: '60px',
    paddingTop: '20px',
  },
  reasonNumber: {
    position: 'absolute',
    left: '0',
    top: '0',
    fontSize: '36px',
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.1)',
  },
  reasonTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '10px',
    color: 'white',
  },
  reasonDesc: {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: '1.6',
  },
  ctaSection: {
    maxWidth: '900px',
    margin: '80px auto',
    padding: '60px 20px',
    textAlign: 'center',
    color: 'white',
  },
  ctaTitle: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '15px',
  },
  ctaDesc: {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '30px',
  },
  ctaButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ctaPrimary: {
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: 'white',
    padding: '14px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    cursor: 'pointer',
  },
  ctaSecondary: {
    background: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    padding: '14px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  ctaTertiary: {
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '14px 32px',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    display: 'inline-block',
    cursor: 'pointer',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  footerInfo: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '14px',
    paddingBottom: '20px',
  },
  footerText: {
    margin: '10px 0',
  },
  footerLink: {
    color: '#93C5FD',
    textDecoration: 'none',
    fontWeight: '600',
    transition: 'color 0.3s ease',
  },
};

// Add global styles for animations
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @media (min-width: 768px) {
      [style*="illustration"] { display: block !important; }
    }
  `;
  document.head.appendChild(style);
}
