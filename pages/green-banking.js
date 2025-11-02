import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

export default function GreenBanking() {
  const sustainabilityInitiatives = [
    {
      icon: '🌱',
      title: 'Paperless Banking',
      description: 'Go digital with e-statements, mobile deposits, and online banking to reduce paper waste',
      impact: 'Save up to 6.6 pounds of paper annually per customer'
    },
    {
      icon: '☀️',
      title: 'Renewable Energy Financing',
      description: 'Special loan rates for solar panels, wind energy, and energy-efficient home improvements',
      impact: 'Over $50M in green energy loans issued'
    },
    {
      icon: '♻️',
      title: 'Carbon-Neutral Operations',
      description: 'Our branches run on 100% renewable energy with carbon offset programs',
      impact: 'Zero net carbon emissions since 2023'
    },
    {
      icon: '🌳',
      title: 'Reforestation Program',
      description: 'We plant one tree for every new account opened',
      impact: 'Over 100,000 trees planted to date'
    },
    {
      icon: '🚗',
      title: 'Green Auto Loans',
      description: 'Lower interest rates for electric and hybrid vehicle purchases',
      impact: '0.25% rate discount on eco-friendly vehicles'
    },
    {
      icon: '🏡',
      title: 'Sustainable Mortgages',
      description: 'Better rates for energy-efficient homes and green building certifications',
      impact: 'LEED and Energy Star certified homes qualify'
    }
  ];

  const greenProducts = [
    {
      name: 'Eco Savings Account',
      rate: '4.75% APY',
      features: ['High-yield returns', 'Funds invested in sustainable projects', 'Quarterly impact reports'],
      minDeposit: '$100'
    },
    {
      name: 'Green Checking',
      rate: 'No monthly fees',
      features: ['Paperless statements only', 'Biodegradable debit card option', 'Tree planted on opening'],
      minDeposit: '$25'
    },
    {
      name: 'Sustainable Investment Account',
      rate: 'Variable returns',
      features: ['ESG-focused portfolio', 'Renewable energy investments', 'Socially responsible companies only'],
      minDeposit: '$1,000'
    }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Green Banking & Sustainability | Oakline Bank</title>
        <meta name="description" content="Bank sustainably with Oakline Bank. Eco-friendly banking products, renewable energy financing, and carbon-neutral operations" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Green Banking & Sustainability
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Sustainable_green_banking_concept_4d8b41bc.png"
              alt="Sustainable green banking"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            At Oakline Bank, we believe in banking that's good for you and the planet. Our sustainable banking initiatives help you manage your finances while contributing to a greener future for everyone.
          </p>

          <div style={{ background: '#e8f5e9', padding: '30px', borderRadius: '10px', marginBottom: '40px', borderLeft: '5px solid #4caf50' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '15px', color: '#2e7d32' }}>
              Our Commitment to Sustainability
            </h2>
            <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: '#1b5e20' }}>
              We've committed to achieving complete carbon neutrality and investing in projects that create positive environmental impact. Every banking product we offer is designed with sustainability in mind.
            </p>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Our Sustainability Initiatives
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '50px' }}>
            {sustainabilityInitiatives.map((initiative, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{initiative.icon}</div>
                <h3 style={{ fontSize: '1.3rem', color: '#2e7d32', marginBottom: '10px' }}>
                  {initiative.title}
                </h3>
                <p style={{ color: '#444', lineHeight: '1.6', marginBottom: '15px' }}>
                  {initiative.description}
                </p>
                <div style={{ background: '#e8f5e9', padding: '10px', borderRadius: '5px', fontSize: '0.9rem', color: '#1b5e20', fontWeight: 'bold' }}>
                  Impact: {initiative.impact}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Sustainable Banking Products
          </h2>

          <div style={{ display: 'grid', gap: '25px', marginBottom: '40px' }}>
            {greenProducts.map((product, index) => (
              <div key={index} style={{ background: 'white', border: '2px solid #4caf50', padding: '30px', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.5rem', color: '#2e7d32', marginBottom: '5px' }}>
                      {product.name}
                    </h3>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>
                      Minimum deposit: {product.minDeposit}
                    </p>
                  </div>
                  <div style={{ background: '#4caf50', color: 'white', padding: '10px 20px', borderRadius: '5px', fontWeight: 'bold' }}>
                    {product.rate}
                  </div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {product.features.map((feature, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#444', paddingLeft: '25px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#4caf50', fontWeight: 'bold' }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Join the Green Banking Movement</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Make a positive impact on the environment while managing your finances. Open a green banking account today.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#2e7d32', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open Green Account
              </Link>
              <Link href="/loans" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Green Loans
              </Link>
            </div>
          </div>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
              Your Environmental Impact Dashboard
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>6.6 lbs</div>
                <p style={{ color: '#666' }}>Paper saved annually with paperless banking</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>1 tree</div>
                <p style={{ color: '#666' }}>Planted with your account</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>100%</div>
                <p style={{ color: '#666' }}>Renewable energy powered</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4caf50' }}>0</div>
                <p style={{ color: '#666' }}>Net carbon emissions</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
