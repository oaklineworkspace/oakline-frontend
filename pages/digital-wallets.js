import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

export default function DigitalWallets() {
  const walletFeatures = [
    {
      icon: '📱',
      title: 'Mobile Payments',
      description: 'Pay with your phone using Apple Pay, Google Pay, and Samsung Pay',
      benefit: 'Contactless, secure, and fast transactions'
    },
    {
      icon: '💳',
      title: 'Virtual Cards',
      description: 'Create instant virtual debit cards for online shopping',
      benefit: 'Enhanced security with single-use card numbers'
    },
    {
      icon: '🔐',
      title: 'Biometric Security',
      description: 'Fingerprint and face recognition for payments',
      benefit: 'No passwords needed - just your unique biometrics'
    },
    {
      icon: '⚡',
      title: 'Instant Transfers',
      description: 'Send money to friends and family in seconds',
      benefit: 'Real-time person-to-person payments'
    },
    {
      icon: '🌐',
      title: 'Multi-Currency Support',
      description: 'Hold and spend in multiple currencies',
      benefit: 'Travel abroad without exchange fees'
    },
    {
      icon: '₿',
      title: 'Crypto Integration',
      description: 'Buy, sell, and store cryptocurrency',
      benefit: 'Seamlessly manage digital and traditional assets'
    }
  ];

  const supportedCryptos = [
    { name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin Network' },
    { name: 'Ethereum', symbol: 'ETH', network: 'Ethereum Network' },
    { name: 'USD Coin', symbol: 'USDC', network: 'Multiple Networks' },
    { name: 'Litecoin', symbol: 'LTC', network: 'Litecoin Network' },
    { name: 'Ripple', symbol: 'XRP', network: 'Ripple Network' },
    { name: 'Stellar', symbol: 'XLM', network: 'Stellar Network' }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Digital Wallets & Crypto Integration | Oakline Bank</title>
        <meta name="description" content="Modern digital wallet solutions with cryptocurrency integration. Mobile payments, virtual cards, and secure crypto storage with Oakline Bank" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Digital Wallets & Crypto Integration
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Digital_wallet_technology_interface_8ba295ff.png"
              alt="Digital wallet technology"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            Welcome to the future of banking. Oakline Bank's digital wallet combines traditional banking with cutting-edge cryptocurrency support, giving you complete control over all your financial assets in one secure platform.
          </p>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>
              The All-in-One Digital Wallet
            </h2>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', opacity: 0.95 }}>
              Manage traditional currency and cryptocurrency from a single app. Make payments, transfer money, and invest in digital assets with enterprise-grade security.
            </p>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Digital Wallet Features
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px', marginBottom: '50px' }}>
            {walletFeatures.map((feature, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.3rem', color: '#667eea', marginBottom: '10px' }}>
                  {feature.title}
                </h3>
                <p style={{ color: '#444', lineHeight: '1.6', marginBottom: '15px' }}>
                  {feature.description}
                </p>
                <div style={{ background: '#e8eaf6', padding: '10px', borderRadius: '5px', fontSize: '0.9rem', color: '#5e35b1', fontWeight: '600' }}>
                  {feature.benefit}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Supported Cryptocurrencies
          </h2>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '40px' }}>
            <p style={{ marginBottom: '25px', color: '#666' }}>
              Buy, sell, store, and transfer popular cryptocurrencies directly from your Oakline Bank account
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {supportedCryptos.map((crypto, index) => (
                <div key={index} style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', margin: 0 }}>{crypto.name}</h3>
                    <span style={{ background: '#667eea', color: 'white', padding: '5px 12px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {crypto.symbol}
                    </span>
                  </div>
                  <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>{crypto.network}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            <div style={{ background: 'white', border: '2px solid #667eea', padding: '30px', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#667eea', marginBottom: '15px' }}>
                Security First
              </h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '10px', paddingLeft: '25px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#667eea' }}>🔒</span>
                  Bank-level encryption
                </li>
                <li style={{ marginBottom: '10px', paddingLeft: '25px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#667eea' }}>🔐</span>
                  Multi-factor authentication
                </li>
                <li style={{ marginBottom: '10px', paddingLeft: '25px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#667eea' }}>🛡️</span>
                  Cold storage for crypto assets
                </li>
                <li style={{ marginBottom: '10px', paddingLeft: '25px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#667eea' }}>🔔</span>
                  Real-time fraud monitoring
                </li>
              </ul>
            </div>

            <div style={{ background: 'white', border: '2px solid #667eea', padding: '30px', borderRadius: '10px' }}>
              <h3 style={{ fontSize: '1.4rem', color: '#667eea', marginBottom: '15px' }}>
                How It Works
              </h3>
              <ol style={{ paddingLeft: '20px', color: '#444', lineHeight: '1.8' }}>
                <li>Download the Oakline Bank mobile app</li>
                <li>Link your existing account or open a new one</li>
                <li>Add payment methods and verify your identity</li>
                <li>Start making payments and managing crypto</li>
              </ol>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Get Started with Digital Wallets</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Join thousands of customers already using Oakline Bank's digital wallet for seamless payments and crypto management.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#667eea', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Account
              </Link>
              <Link href="/crypto" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Explore Crypto Banking
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff3cd', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
            <h3 style={{ color: '#856404', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>⚠️</span> Important Information
            </h3>
            <p style={{ color: '#856404', lineHeight: '1.6', marginBottom: '10px' }}>
              Cryptocurrency investments carry risk and may fluctuate in value. Oakline Bank provides crypto services through secure third-party partners. Digital assets are not FDIC insured. Please invest responsibly and only what you can afford to lose.
            </p>
            <p style={{ color: '#856404', lineHeight: '1.6', margin: 0 }}>
              Traditional banking deposits remain FDIC insured up to $250,000 per depositor.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
