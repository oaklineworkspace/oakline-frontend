import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function ComingSoon() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  if (!mounted) return null;

  const getFeatureName = () => {
    const query = router.query.feature || 'zelle';
    const featureMap = {
      zelle: { name: 'Zelle® Payments', description: 'Instant money transfers to any U.S. bank account' },
      'oakline-pay': { name: 'Oakline Pay', description: 'Send and receive money to friends and family with @username tags' },
      investment: { name: 'Investment Services', description: 'Build wealth with our comprehensive investment tools and professional advisory' },
      'advanced-trading': { name: 'Advanced Trading', description: 'Professional trading tools and insights' },
      'crypto-advanced': { name: 'Advanced Crypto', description: 'Professional cryptocurrency trading' },
      'portfolio-analysis': { name: 'Portfolio Analysis', description: 'Advanced investment analysis tools' },
    };
    return featureMap[query] || featureMap.zelle;
  };

  const feature = getFeatureName();

  return (
    <>
      <Head>
        <title>Coming Soon - {feature.name} | Oakline Bank</title>
        <meta name="description" content={`${feature.name} is coming to Oakline Bank. Stay tuned for this exciting new feature.`} />
        <meta property="og:title" content={`Coming Soon - ${feature.name}`} />
        <meta property="og:description" content={feature.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <div style={styles.heroContent}>
            <div style={styles.badge}>🚀 Exciting Feature Coming Soon</div>
            <h1 style={styles.heading}>{feature.name}</h1>
            <p style={styles.subtitle}>{feature.description}</p>
            
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
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>Lightning Fast</h3>
              <p style={styles.featureDesc}>Experience instant processing times with our optimized infrastructure.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🔒</div>
              <h3 style={styles.featureTitle}>Bank-Grade Security</h3>
              <p style={styles.featureDesc}>Your transactions protected with 256-bit SSL encryption and advanced fraud detection.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>📱</div>
              <h3 style={styles.featureTitle}>Mobile Optimized</h3>
              <p style={styles.featureDesc}>Seamless experience across all devices with our responsive design.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>🌍</div>
              <h3 style={styles.featureTitle}>Global Ready</h3>
              <p style={styles.featureDesc}>Multi-language support and international compliance from day one.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>💰</div>
              <h3 style={styles.featureTitle}>Competitive Pricing</h3>
              <p style={styles.featureDesc}>Transparent fees with no hidden charges or surprise costs.</p>
            </div>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>👥</div>
              <h3 style={styles.featureTitle}>Expert Support</h3>
              <p style={styles.featureDesc}>24/7 customer support to help you every step of the way.</p>
            </div>
          </div>
        </div>

        {/* Notification Section */}
        <div style={styles.notificationSection}>
          <div style={styles.notificationBox}>
            <div style={styles.notificationHeader}>
              <span style={styles.notificationIcon}>📧</span>
              <h3 style={styles.notificationTitle}>Get Notified When We Launch</h3>
            </div>
            <p style={styles.notificationDesc}>Be among the first to know when {feature.name} becomes available. We'll send you an exclusive notification.</p>
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

        {/* Why Wait Section */}
        <div style={styles.whyWaitSection}>
          <h2 style={styles.sectionTitle}>Why {feature.name}?</h2>
          <div style={styles.reasonsGrid}>
            <div style={styles.reasonCard}>
              <div style={styles.reasonNumber}>01</div>
              <h4 style={styles.reasonTitle}>Seamless Integration</h4>
              <p style={styles.reasonDesc}>Integrates perfectly with your existing Oakline Bank accounts and services.</p>
            </div>
            <div style={styles.reasonCard}>
              <div style={styles.reasonNumber}>02</div>
              <h4 style={styles.reasonTitle}>Enhanced Security</h4>
              <p style={styles.reasonDesc}>Multi-layer protection with PIN verification and transaction monitoring.</p>
            </div>
            <div style={styles.reasonCard}>
              <div style={styles.reasonNumber}>03</div>
              <h4 style={styles.reasonTitle}>Better Tracking</h4>
              <p style={styles.reasonDesc}>Real-time notifications and detailed transaction history.</p>
            </div>
            <div style={styles.reasonCard}>
              <div style={styles.reasonNumber}>04</div>
              <h4 style={styles.reasonTitle}>24/7 Availability</h4>
              <p style={styles.reasonDesc}>Access whenever you need it, all day, every day.</p>
            </div>
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
          <p style={styles.footerText}>
            Follow us on <a href="https://twitter.com/oaklinebank" target="_blank" rel="noopener noreferrer" style={styles.footerLink}>Twitter</a> for updates
          </p>
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
    '@media (min-width: 768px)': {
      display: 'block',
    },
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
    ':hover': {
      transform: 'translateY(-8px)',
      background: 'rgba(255, 255, 255, 0.12)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
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
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 30px rgba(79, 70, 229, 0.3)',
    },
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
    ':hover': {
      background: 'rgba(255, 255, 255, 0.25)',
    },
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
  `;
  document.head.appendChild(style);
}
