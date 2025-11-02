import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import styles from '../styles/Home.module.css';

export default function CustomerStories() {
  const [activeCategory, setActiveCategory] = useState('all');

  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      category: 'business',
      image: 'https://i.pravatar.cc/150?img=5',
      rating: 5,
      story: 'Oakline Bank believed in my bakery business when others didn\'t. Their small business loan and financial guidance helped me expand from a small shop to three locations. The business banking team treats me like family, not just another account number.',
      achievement: 'Grew from 1 to 3 locations in 2 years',
      product: 'Small Business Loan'
    },
    {
      id: 2,
      name: 'Marcus Williams',
      role: 'First-Time Homebuyer',
      category: 'mortgage',
      image: 'https://i.pravatar.cc/150?img=12',
      rating: 5,
      story: 'As a first-time buyer, I was overwhelmed by the mortgage process. Oakline Bank\'s mortgage advisor walked me through every step, explained all my options, and helped me secure a great rate. I\'m now a proud homeowner thanks to their support!',
      achievement: 'Purchased first home at age 28',
      product: 'First-Time Homebuyer Mortgage'
    },
    {
      id: 3,
      name: 'Emily Chen',
      role: 'Retirement Planning',
      category: 'retirement',
      image: 'https://i.pravatar.cc/150?img=47',
      rating: 5,
      story: 'I was worried I had started saving for retirement too late. Oakline\'s financial advisor created a personalized plan that put me on track. Now I\'m confident I can retire comfortably. The peace of mind is priceless.',
      achievement: 'On track to retire at 65 with full benefits',
      product: 'IRA & Retirement Planning'
    },
    {
      id: 4,
      name: 'David Martinez',
      role: 'Tech Entrepreneur',
      category: 'business',
      image: 'https://i.pravatar.cc/150?img=33',
      rating: 5,
      story: 'My startup needed flexible banking solutions that traditional banks couldn\'t provide. Oakline\'s business checking, merchant services, and line of credit gave me the financial flexibility to scale quickly. They understand modern businesses.',
      achievement: 'Scaled startup to $2M in annual revenue',
      product: 'Business Line of Credit'
    },
    {
      id: 5,
      name: 'Jennifer Taylor',
      role: 'Young Professional',
      category: 'savings',
      image: 'https://i.pravatar.cc/150?img=32',
      rating: 5,
      story: 'The high-yield savings account helped me build my emergency fund faster than I thought possible. The mobile app makes it easy to track my goals, and I love the automatic savings features. I\'ve saved $15,000 in just 18 months!',
      achievement: 'Built $15,000 emergency fund',
      product: 'High-Yield Savings Account'
    },
    {
      id: 6,
      name: 'Robert Anderson',
      role: 'Retired Teacher',
      category: 'retirement',
      image: 'https://i.pravatar.cc/150?img=59',
      rating: 5,
      story: 'After 35 years of teaching, Oakline Bank helped me transition into retirement smoothly. Their retirement income strategy ensures I can enjoy my golden years without financial stress. The personalized service is exceptional.',
      achievement: 'Comfortable retirement after 35 years',
      product: 'Retirement Income Planning'
    },
    {
      id: 7,
      name: 'Lisa Thompson',
      role: 'Single Parent',
      category: 'savings',
      image: 'https://i.pravatar.cc/150?img=20',
      rating: 5,
      story: 'As a single mom, every dollar counts. Oakline\'s no-fee checking and budgeting tools helped me take control of my finances. I\'ve paid off $8,000 in debt and started a college fund for my daughter. They really care about their customers.',
      achievement: 'Paid off $8,000 debt, started college fund',
      product: 'Free Checking & Savings'
    },
    {
      id: 8,
      name: 'James Park',
      role: 'International Student',
      category: 'other',
      image: 'https://i.pravatar.cc/150?img=68',
      rating: 5,
      story: 'Moving to the US for college, I needed a bank that understood international students. Oakline made it easy to open an account, send money home, and manage my finances. The multilingual support was incredibly helpful.',
      achievement: 'Successfully managing finances abroad',
      product: 'International Student Banking'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Stories', icon: '📖' },
    { id: 'business', name: 'Business', icon: '🏢' },
    { id: 'mortgage', name: 'Home Buying', icon: '🏠' },
    { id: 'retirement', name: 'Retirement', icon: '🏖️' },
    { id: 'savings', name: 'Savings', icon: '💰' },
    { id: 'other', name: 'Other', icon: '✨' }
  ];

  const filteredTestimonials = activeCategory === 'all' 
    ? testimonials 
    : testimonials.filter(t => t.category === activeCategory);

  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Customer Stories & Testimonials | Oakline Bank</title>
        <meta name="description" content="Read real stories from Oakline Bank customers. Discover how we've helped people achieve their financial goals and dreams" />
      </Head>

      <main className={styles.main}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          <Link href="/" style={{ color: '#0066cc', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
            ← Back to Home
          </Link>

          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: '#1a1a1a' }}>
            Customer Stories & Testimonials
          </h1>

          <div style={{ position: 'relative', width: '100%', height: '400px', marginBottom: '40px', borderRadius: '10px', overflow: 'hidden' }}>
            <Image
              src="/images/pages/Happy_diverse_customer_testimonials_e4a6bf62.png"
              alt="Happy customers"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          <p style={{ fontSize: '1.2rem', lineHeight: '1.8', marginBottom: '40px', color: '#444', textAlign: 'center' }}>
            Real people. Real success stories. Discover how Oakline Bank has helped customers like you achieve their financial goals and build brighter futures.
          </p>

          <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '10px', marginBottom: '40px', textAlign: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '30px' }}>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#0066cc', marginBottom: '5px' }}>4.9/5</div>
                <p style={{ color: '#666', margin: 0 }}>Average customer rating</p>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2ecc71', marginBottom: '5px' }}>50,000+</div>
                <p style={{ color: '#666', margin: 0 }}>Happy customers</p>
              </div>
              <div>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e74c3c', marginBottom: '5px' }}>98%</div>
                <p style={{ color: '#666', margin: 0 }}>Would recommend us</p>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '15px', color: '#1a1a1a' }}>Filter by Category:</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  style={{
                    background: activeCategory === category.id ? '#0066cc' : 'white',
                    color: activeCategory === category.id ? 'white' : '#666',
                    border: `2px solid ${activeCategory === category.id ? '#0066cc' : '#ddd'}`,
                    padding: '10px 20px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: activeCategory === category.id ? 'bold' : 'normal',
                    transition: 'all 0.3s'
                  }}
                >
                  {category.icon} {category.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '30px', marginBottom: '40px' }}>
            {filteredTestimonials.map((testimonial) => (
              <div key={testimonial.id} style={{ background: 'white', border: '2px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '30px' }}>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'start', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#e0e0e0' }}>
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <h3 style={{ fontSize: '1.4rem', color: '#1a1a1a', marginBottom: '5px' }}>
                        {testimonial.name}
                      </h3>
                      <p style={{ color: '#666', marginBottom: '10px', fontSize: '0.95rem' }}>
                        {testimonial.role}
                      </p>
                      <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                        {renderStars(testimonial.rating)}
                      </div>
                      <span style={{ background: '#e3f2fd', color: '#1976d2', padding: '5px 15px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {testimonial.product}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#444', marginBottom: '20px', fontStyle: 'italic' }}>
                    "{testimonial.story}"
                  </p>
                  <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
                    <p style={{ color: '#2e7d32', fontWeight: 'bold', margin: 0, fontSize: '0.95rem' }}>
                      ✅ Achievement: {testimonial.achievement}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>Ready to Write Your Own Success Story?</h2>
            <p style={{ fontSize: '1.1rem', marginBottom: '25px', opacity: 0.9 }}>
              Join thousands of satisfied customers who have achieved their financial goals with Oakline Bank.
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/apply" style={{ background: 'white', color: '#667eea', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                Open an Account
              </Link>
              <Link href="/support" style={{ background: 'transparent', color: 'white', padding: '15px 30px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold', border: '2px solid white' }}>
                Speak with an Advisor
              </Link>
            </div>
          </div>

          <div style={{ background: '#fff3cd', padding: '30px', borderRadius: '10px', borderLeft: '4px solid #ffc107', marginBottom: '40px' }}>
            <h3 style={{ color: '#856404', marginBottom: '15px' }}>📝 Share Your Story</h3>
            <p style={{ color: '#856404', lineHeight: '1.7', marginBottom: '15px' }}>
              Have a success story with Oakline Bank? We'd love to hear it! Your experience could inspire others to take control of their financial future.
            </p>
            <Link href="/support" style={{ color: '#856404', fontWeight: 'bold', textDecoration: 'underline' }}>
              Submit Your Testimonial →
            </Link>
          </div>

          <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', lineHeight: '1.6' }}>
            <p>* Testimonials represent individual customer experiences and may not reflect typical results. All customer names and details have been verified. Results may vary.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
