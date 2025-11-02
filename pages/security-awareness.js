import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function SecurityAwareness() {
  const [expandedThreat, setExpandedThreat] = useState(null);

  const threats = [
    {
      id: 1,
      name: 'Phishing Emails',
      icon: '🎣',
      description: 'Fraudulent emails pretending to be from your bank or trusted sources',
      warning: 'Oakline Bank will NEVER ask for your password or PIN via email',
      protection: [
        'Verify sender email addresses carefully',
        'Never click suspicious links - type URLs directly',
        'Look for spelling and grammar errors',
        'Check for urgent or threatening language',
        'Contact us directly if unsure'
      ]
    },
    {
      id: 2,
      name: 'Phone Scams',
      icon: '📞',
      description: 'Scammers calling pretending to be bank representatives',
      warning: 'We will never ask you to transfer money to "verify" your account',
      protection: [
        'Never share account details over the phone',
        'Hang up and call our official number',
        'Don\'t trust caller ID - it can be spoofed',
        'Be wary of pressure tactics',
        'Verify requests through our official channels'
      ]
    },
    {
      id: 3,
      name: 'Identity Theft',
      icon: '🕵️',
      description: 'Criminals using your personal information to open accounts or make purchases',
      warning: 'Monitor your credit reports and account statements regularly',
      protection: [
        'Shred sensitive documents before disposal',
        'Use strong, unique passwords for all accounts',
        'Enable two-factor authentication',
        'Check credit reports annually',
        'Report suspicious activity immediately'
      ]
    },
    {
      id: 4,
      name: 'Card Skimming',
      icon: '💳',
      description: 'Devices placed on ATMs or card readers to steal card information',
      warning: 'Check ATMs and payment terminals for tampering before use',
      protection: [
        'Inspect card readers for loose parts',
        'Cover keypad when entering PIN',
        'Use ATMs in well-lit, monitored locations',
        'Check statements for unauthorized charges',
        'Report suspicious ATMs to police and bank'
      ]
    },
    {
      id: 5,
      name: 'Malware & Viruses',
      icon: '🦠',
      description: 'Malicious software that can steal banking credentials',
      warning: 'Keep all devices updated with latest security patches',
      protection: [
        'Install reputable antivirus software',
        'Keep operating system and apps updated',
        'Don\'t download files from untrusted sources',
        'Avoid using public WiFi for banking',
        'Use secure, encrypted connections only'
      ]
    },
    {
      id: 6,
      name: 'Social Engineering',
      icon: '🎭',
      description: 'Manipulation tactics to trick you into revealing sensitive information',
      warning: 'Be skeptical of unsolicited requests for personal information',
      protection: [
        'Question unexpected requests for information',
        'Verify identities through official channels',
        'Don\'t overshare on social media',
        'Be cautious with "too good to be true" offers',
        'Trust your instincts'
      ]
    }
  ];

  const bestPractices = [
    {
      category: 'Password Security',
      icon: '🔐',
      tips: [
        'Use passwords at least 12 characters long',
        'Combine uppercase, lowercase, numbers, and symbols',
        'Never reuse passwords across accounts',
        'Use a password manager for secure storage',
        'Change passwords if account is compromised'
      ]
    },
    {
      category: 'Account Monitoring',
      icon: '👀',
      tips: [
        'Review account statements weekly',
        'Set up transaction alerts',
        'Monitor credit reports regularly',
        'Report unauthorized transactions within 60 days',
        'Use Oakline Bank\'s mobile app for real-time monitoring'
      ]
    },
    {
      category: 'Device Security',
      icon: '📱',
      tips: [
        'Enable biometric authentication (fingerprint/face ID)',
        'Keep devices locked with strong passcodes',
        'Install security updates promptly',
        'Don\'t jailbreak or root devices',
        'Remote wipe capability if device is lost'
      ]
    },
    {
      category: 'Safe Banking Habits',
      icon: '✅',
      tips: [
        'Use official Oakline Bank app and website only',
        'Log out after each banking session',
        'Never save passwords in browsers',
        'Verify website security certificates (https://)',
        'Be cautious on public WiFi - use VPN if needed'
      ]
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Security Awareness & Digital Hygiene | Oakline Bank</title>
        <meta name="description" content="Stay safe online with Oakline Bank's security awareness guide. Learn to protect yourself from fraud, phishing, and identity theft" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Security Awareness & Digital Hygiene
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Digital_security_protection_concept_c26d1075.png"
              alt="Digital security"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Your financial security is our top priority. Learn how to recognize common threats and protect yourself from fraud, identity theft, and cybercrime with these essential security practices.
          </p>

          <div style={{ background: '#dc3545', color: 'white', padding: '25px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🚨</span> Important Security Alert
            </h2>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', margin: 0, opacity: 0.95 }}>
              Oakline Bank will NEVER call, email, or text asking for your password, PIN, full Social Security Number, or request that you transfer money to "verify" your account. If you receive such a request, it's a scam. Hang up and contact us directly.
            </p>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Common Security Threats & How to Avoid Them
          </h2>

          <div style={{ display: 'grid', gap: '20px', marginBottom: '50px' }}>
            {threats.map((threat) => (
              <div
                key={threat.id}
                style={{
                  background: '#f8f9fa',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedThreat(expandedThreat === threat.id ? null : threat.id)}
              >
                <div style={{ padding: '25px', background: 'white', borderBottom: '2px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '2.5rem' }}>{threat.icon}</div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.4rem', color: '#1a1a1a', marginBottom: '5px' }}>
                        {threat.name}
                      </h3>
                      <p style={{ color: '#666', margin: 0 }}>{threat.description}</p>
                    </div>
                    <span style={{ fontSize: '1.5rem', color: '#0066cc' }}>
                      {expandedThreat === threat.id ? '▲' : '▼'}
                    </span>
                  </div>
                  <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '5px', borderLeft: '4px solid #ffc107' }}>
                    <p style={{ color: '#856404', margin: 0, fontSize: '0.95rem', fontWeight: 'bold' }}>
                      ⚠️ {threat.warning}
                    </p>
                  </div>
                </div>
                {expandedThreat === threat.id && (
                  <div style={{ padding: '25px', background: '#f8f9fa' }}>
                    <h4 style={{ color: '#0066cc', marginBottom: '15px', fontSize: '1.1rem' }}>
                      How to Protect Yourself:
                    </h4>
                    <ul style={{ paddingLeft: '20px', color: '#444', lineHeight: '1.8', margin: 0 }}>
                      {threat.protection.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Security Best Practices
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            {bestPractices.map((practice, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{practice.icon}</div>
                <h3 style={{ fontSize: '1.3rem', color: '#0066cc', marginBottom: '15px' }}>
                  {practice.category}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {practice.tips.map((tip, idx) => (
                    <li key={idx} style={{ marginBottom: '10px', color: '#444', paddingLeft: '20px', position: 'relative', fontSize: '0.95rem' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#2ecc71' }}>✓</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ background: '#d1ecf1', padding: '30px', borderRadius: '10px', borderLeft: '5px solid #17a2b8', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#0c5460' }}>
              🛡️ Oakline Bank's Security Measures
            </h2>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                <span style={{ fontSize: '1.5rem' }}>🔒</span>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>256-bit Encryption</h4>
                  <p style={{ margin: 0, color: '#0c5460' }}>Bank-level encryption protects all your data</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                <span style={{ fontSize: '1.5rem' }}>🔐</span>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>Multi-Factor Authentication</h4>
                  <p style={{ margin: 0, color: '#0c5460' }}>Extra layer of security for your account access</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                <span style={{ fontSize: '1.5rem' }}>👁️</span>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>24/7 Fraud Monitoring</h4>
                  <p style={{ margin: 0, color: '#0c5460' }}>Real-time transaction monitoring and alerts</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'start' }}>
                <span style={{ fontSize: '1.5rem' }}>💰</span>
                <div>
                  <h4 style={{ margin: '0 0 5px 0', color: '#0c5460' }}>Zero Liability Protection</h4>
                  <p style={{ margin: 0, color: '#0c5460' }}>You're protected from unauthorized transactions</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Suspicious Activity? Report It Immediately</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              If you notice any unauthorized transactions or suspect your account has been compromised, contact us right away.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/support" style={{ background: 'white', color: '#667eea', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Report Fraud
              </Link>
              <a href="tel:+16366356122" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Call: +1 (636) 635-6122
              </a>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Additional Security Resources
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <Link href="/security" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h3 style={{ color: '#0066cc', fontSize: '1.1rem', marginBottom: '5px' }}>Security Center</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Complete security information</p>
                </div>
              </Link>
              <Link href="/faq" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h3 style={{ color: '#0066cc', fontSize: '1.1rem', marginBottom: '5px' }}>Security FAQs</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Common security questions</p>
                </div>
              </Link>
              <Link href="/privacy" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h3 style={{ color: '#0066cc', fontSize: '1.1rem', marginBottom: '5px' }}>Privacy Policy</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>How we protect your data</p>
                </div>
              </Link>
              <Link href="/mfa-setup" style={{ textDecoration: 'none' }}>
                <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '1px solid #ddd' }}>
                  <h3 style={{ color: '#0066cc', fontSize: '1.1rem', marginBottom: '5px' }}>Enable 2FA</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>Set up two-factor authentication</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
