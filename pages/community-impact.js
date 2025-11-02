import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/Home.module.css';

export default function CommunityImpact() {
  const initiatives = [
    {
      title: 'Financial Literacy Programs',
      icon: '📚',
      description: 'Free workshops teaching budgeting, saving, and investing to underserved communities',
      impact: '15,000+ people educated annually',
      color: '#3498db'
    },
    {
      title: 'Small Business Grants',
      icon: '🏪',
      description: 'Annual grants totaling $500,000 to support minority-owned small businesses',
      impact: '200+ businesses funded since 2020',
      color: '#e74c3c'
    },
    {
      title: 'Affordable Housing Initiative',
      icon: '🏠',
      description: 'Special mortgage programs and down payment assistance for first-time homebuyers',
      impact: '1,000+ families helped into homes',
      color: '#2ecc71'
    },
    {
      title: 'Youth Banking Education',
      icon: '🎓',
      description: 'Partnership with schools to teach financial literacy to students',
      impact: '50+ schools, 10,000+ students reached',
      color: '#f39c12'
    },
    {
      title: 'Community Investment Fund',
      icon: '💰',
      description: 'Investing in local infrastructure, parks, and community development projects',
      impact: '$10M invested in community projects',
      color: '#9b59b6'
    },
    {
      title: 'Disaster Relief Support',
      icon: '🆘',
      description: 'Rapid response loans and grants for communities affected by natural disasters',
      impact: 'Emergency funds for 500+ families',
      color: '#e67e22'
    }
  ];

  const volunteerPrograms = [
    {
      name: 'Bank at School Day',
      description: 'Employees visit schools to teach financial basics and career exploration',
      frequency: 'Monthly'
    },
    {
      name: 'Community Clean-Up',
      description: 'Quarterly events where staff volunteer to clean local parks and neighborhoods',
      frequency: 'Quarterly'
    },
    {
      name: 'Food Bank Support',
      description: 'Regular volunteering at local food banks and donation drives',
      frequency: 'Weekly'
    },
    {
      name: 'Tax Preparation Assistance',
      description: 'Free tax filing help for low-income families during tax season',
      frequency: 'Seasonally'
    }
  ];

  const partnerships = [
    { name: 'United Way', focus: 'Community development' },
    { name: 'Habitat for Humanity', focus: 'Affordable housing' },
    { name: 'Junior Achievement', focus: 'Youth financial education' },
    { name: 'Local Food Banks', focus: 'Hunger relief' },
    { name: 'SCORE', focus: 'Small business mentorship' },
    { name: 'Big Brothers Big Sisters', focus: 'Youth mentoring' }
  ];

  return (
    <div className={styles.container}>
      <Head>
        <title>Community Impact & Corporate Responsibility | Oakline Bank</title>
        <meta name="description" content="Oakline Bank's commitment to community development, social responsibility, and giving back to the communities we serve" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Community Impact & Corporate Social Responsibility
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Community_service_and_volunteering_b0b0cd5a.png"
              alt="Community service"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444' }}>
            At Oakline Bank, we believe that strong communities create thriving economies. We're committed to making a positive impact through community investment, employee volunteerism, and partnerships with organizations that share our values.
          </p>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', marginBottom: '40px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Our Mission: Banking with Purpose</h2>
            <p style={{ fontSize: '1.2rem', lineHeight: '1.7', opacity: 0.95, maxWidth: '800px', margin: '0 auto' }}>
              We measure our success not just in profits, but in the positive change we create in the communities we serve. Every account, every loan, every transaction contributes to building stronger neighborhoods.
            </p>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Community Initiatives
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px', marginBottom: '50px' }}>
            {initiatives.map((initiative, index) => (
              <div key={index} style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${initiative.color}` }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>{initiative.icon}</div>
                <h3 style={{ fontSize: '1.4rem', color: initiative.color, marginBottom: '15px' }}>
                  {initiative.title}
                </h3>
                <p style={{ color: '#444', lineHeight: '1.7', marginBottom: '20px' }}>
                  {initiative.description}
                </p>
                <div style={{ background: 'white', padding: '12px', borderRadius: '6px', fontSize: '0.95rem', color: '#666', fontWeight: 'bold', textAlign: 'center' }}>
                  {initiative.impact}
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8f9fa', padding: '40px', borderRadius: '10px', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a', textAlign: 'center' }}>
              Employee Volunteer Programs
            </h2>
            <p style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
              Our employees contribute over 10,000 volunteer hours annually to causes that matter
            </p>
            <div style={{ display: 'grid', gap: '20px' }}>
              {volunteerPrograms.map((program, index) => (
                <div key={index} style={{ background: 'white', padding: '25px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#0066cc', marginBottom: '8px' }}>
                      {program.name}
                    </h3>
                    <p style={{ color: '#666', margin: 0 }}>{program.description}</p>
                  </div>
                  <div style={{ background: '#e3f2fd', color: '#1976d2', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {program.frequency}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '25px', color: '#1a1a1a' }}>
            Community Partnerships
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            {partnerships.map((partner, index) => (
              <div key={index} style={{ background: 'white', border: '2px solid #e0e0e0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#1a1a1a', marginBottom: '8px' }}>
                  {partner.name}
                </h3>
                <p style={{ color: '#999', fontSize: '0.9rem', margin: 0 }}>{partner.focus}</p>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff3cd', padding: '30px', borderRadius: '10px', borderLeft: '5px solid #ffc107', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: '#856404' }}>
              💡 Get Involved
            </h2>
            <p style={{ color: '#856404', lineHeight: '1.7', marginBottom: '15px' }}>
              Want to make a difference in your community? Here's how you can participate:
            </p>
            <ul style={{ color: '#856404', lineHeight: '1.8', paddingLeft: '20px' }}>
              <li>Join our volunteer programs - all Oakline Bank customers are welcome</li>
              <li>Participate in our annual charity drives and fundraising events</li>
              <li>Nominate local nonprofits for our community grant program</li>
              <li>Attend our free financial literacy workshops and bring a friend</li>
            </ul>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Join Us in Making a Difference</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              When you bank with Oakline, you're not just a customer - you're a partner in building stronger communities.
            </p>
            <Link href="/apply" style={{ background: 'white', color: '#f5576c', padding: '15px 40px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', display: 'inline-block' }}>
              Open an Account
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '25px', marginBottom: '40px' }}>
            <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '10px' }}>$25M</div>
              <p style={{ color: '#666', fontWeight: '600' }}>Community investment since 2020</p>
            </div>
            <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3498db', marginBottom: '10px' }}>10K+</div>
              <p style={{ color: '#666', fontWeight: '600' }}>Volunteer hours annually</p>
            </div>
            <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '10px' }}>50+</div>
              <p style={{ color: '#666', fontWeight: '600' }}>Community partners</p>
            </div>
            <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '30px', borderRadius: '10px' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f39c12', marginBottom: '10px' }}>100%</div>
              <p style={{ color: '#666', fontWeight: '600' }}>Employee participation</p>
            </div>
          </div>

          <div style={{ background: '#e8f5e9', padding: '30px', borderRadius: '10px', borderLeft: '4px solid #4caf50' }}>
            <h3 style={{ color: '#2e7d32', marginBottom: '15px' }}>Sustainability Commitment</h3>
            <p style={{ color: '#1b5e20', lineHeight: '1.7' }}>
              Beyond financial support, we're committed to environmental sustainability. All our community projects incorporate eco-friendly practices, and we prioritize partnerships with organizations that share our commitment to environmental stewardship.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
