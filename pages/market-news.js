
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function MarketNews() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    const now = new Date();
    setLastUpdated(now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, []);

  const newsCategories = [
    { id: 'all', name: 'All News', icon: '📰' },
    { id: 'markets', name: 'Markets', icon: '📈' },
    { id: 'banking', name: 'Banking', icon: '🏦' },
    { id: 'interest-rates', name: 'Interest Rates', icon: '📊' },
    { id: 'economy', name: 'Economy', icon: '🌍' },
    { id: 'personal-finance', name: 'Personal Finance', icon: '💰' }
  ];

  const newsArticles = [
    {
      id: 1,
      category: 'interest-rates',
      title: 'Federal Reserve Maintains Current Interest Rate at 5.25%',
      excerpt: 'The Federal Reserve announced its decision to keep the federal funds rate unchanged, citing stable inflation and strong employment data.',
      author: 'Oakline Economics Team',
      date: '2024-01-15',
      readTime: '3 min read',
      featured: true,
      image: '/images/professional-mobile-banking-1.png'
    },
    {
      id: 2,
      category: 'banking',
      title: 'New FDIC Insurance Limits and What They Mean for Your Savings',
      excerpt: 'Understanding the latest FDIC insurance guidelines and how they protect your deposits up to $250,000 per account type.',
      author: 'Sarah Johnson, CFP',
      date: '2024-01-14',
      readTime: '5 min read',
      featured: true,
      image: '/images/savings-goal-achievement.svg'
    },
    {
      id: 3,
      category: 'markets',
      title: 'Stock Market Reaches New Highs Amid Economic Optimism',
      excerpt: 'Major indices continue their upward trend as investors remain confident about economic growth prospects.',
      author: 'Market Analysis Desk',
      date: '2024-01-13',
      readTime: '4 min read',
      featured: false,
      image: '/images/investment-success-banner.svg'
    },
    {
      id: 4,
      category: 'personal-finance',
      title: 'How Rising CD Rates Can Boost Your Savings Strategy',
      excerpt: 'Certificate of Deposit rates have reached multi-year highs. Here\'s how to take advantage of this opportunity.',
      author: 'Michael Chen, Financial Advisor',
      date: '2024-01-12',
      readTime: '6 min read',
      featured: false,
      image: '/images/realistic-debit-card-1.svg'
    },
    {
      id: 5,
      category: 'economy',
      title: 'Inflation Continues Steady Decline Toward Target Range',
      excerpt: 'Latest Consumer Price Index data shows continued progress in bringing inflation down to the Fed\'s 2% target.',
      author: 'Economic Research Team',
      date: '2024-01-11',
      readTime: '4 min read',
      featured: false,
      image: '/images/business-loan-approved.svg'
    },
    {
      id: 6,
      category: 'banking',
      title: 'Digital Banking Trends: The Future of Financial Services',
      excerpt: 'Exploring how mobile banking, AI, and fintech innovations are reshaping the banking landscape.',
      author: 'Technology Desk',
      date: '2024-01-10',
      readTime: '7 min read',
      featured: false,
      image: '/images/mobile-banking-professional.svg'
    },
    {
      id: 7,
      category: 'personal-finance',
      title: 'Tax Season 2024: Key Changes and Planning Strategies',
      excerpt: 'Important updates to tax laws and deductions that could affect your 2024 tax filing and planning.',
      author: 'Lisa Rodriguez, CPA',
      date: '2024-01-09',
      readTime: '8 min read',
      featured: false,
      image: '/images/loan-approval-celebration-1.svg'
    },
    {
      id: 8,
      category: 'markets',
      title: 'Real Estate Market Shows Signs of Stabilization',
      excerpt: 'Housing market data suggests prices are leveling off after years of rapid growth, creating new opportunities for buyers.',
      author: 'Real Estate Analysis Team',
      date: '2024-01-08',
      readTime: '5 min read',
      featured: false,
      image: '/images/mortgage-approval-family.svg'
    }
  ];

  const marketData = [
    { index: 'S&P 500', value: '4,783.45', change: '+0.8%', positive: true },
    { index: 'Dow Jones', value: '37,863.80', change: '+0.5%', positive: true },
    { index: 'NASDAQ', value: '15,310.97', change: '+1.2%', positive: true },
    { index: '10-Year Treasury', value: '4.12%', change: '-0.03%', positive: false }
  ];

  const filteredNews = selectedCategory === 'all' 
    ? newsArticles 
    : newsArticles.filter(article => article.category === selectedCategory);

  const featuredArticles = newsArticles.filter(article => article.featured);
  const regularArticles = filteredNews.filter(article => !article.featured);

  return (
    <>
      <Head>
        <title>Market News & Financial Updates - Oakline Bank</title>
        <meta name="description" content="Stay informed with the latest market news, economic updates, and financial insights from Oakline Bank's expert team." />
      </Head>

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/logo-primary.png" alt="Oakline Bank" style={styles.logo} />
              <span style={styles.brandName}>Oakline Bank</span>
            </Link>
            <Link href="/" style={styles.backButton}>← Back to Home</Link>
          </div>
        </header>

        {/* Hero Section */}
        <section style={styles.heroSection}>
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>Market News & Financial Insights</h1>
            <p style={styles.heroSubtitle}>
              Stay informed with expert analysis and the latest financial market updates.
            </p>
            <div style={styles.updateInfo}>
              Last updated: {lastUpdated}
            </div>
          </div>
        </section>

        {/* Market Overview */}
        <section style={styles.marketOverview}>
          <div style={styles.marketContainer}>
            <h2 style={styles.marketTitle}>Market Overview</h2>
            <div style={styles.marketGrid}>
              {marketData.map((item, index) => (
                <div key={index} style={styles.marketItem}>
                  <div style={styles.marketIndex}>{item.index}</div>
                  <div style={styles.marketValue}>{item.value}</div>
                  <div style={{
                    ...styles.marketChange,
                    color: item.positive ? '#10b981' : '#ef4444'
                  }}>
                    {item.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section style={styles.filterSection}>
          <div style={styles.filterContainer}>
            <h3 style={styles.filterTitle}>Browse by Category</h3>
            <div style={styles.categoryButtons}>
              {newsCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  style={{
                    ...styles.categoryButton,
                    ...(selectedCategory === category.id ? styles.categoryButtonActive : {})
                  }}
                >
                  <span style={styles.categoryIcon}>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <main style={styles.main}>
          {/* Featured Articles */}
          {selectedCategory === 'all' && featuredArticles.length > 0 && (
            <section style={styles.featuredSection}>
              <h2 style={styles.sectionTitle}>Featured Stories</h2>
              <div style={styles.featuredGrid}>
                {featuredArticles.map(article => (
                  <article key={article.id} style={styles.featuredArticle}>
                    <div style={styles.articleImage}>
                      <img src={article.image} alt={article.title} style={styles.articleImg} />
                      <div style={styles.categoryBadge}>
                        {newsCategories.find(cat => cat.id === article.category)?.icon} {newsCategories.find(cat => cat.id === article.category)?.name}
                      </div>
                    </div>
                    <div style={styles.articleContent}>
                      <h3 style={styles.articleTitle}>{article.title}</h3>
                      <p style={styles.articleExcerpt}>{article.excerpt}</p>
                      <div style={styles.articleMeta}>
                        <span style={styles.articleAuthor}>By {article.author}</span>
                        <span style={styles.articleDate}>{new Date(article.date).toLocaleDateString()}</span>
                        <span style={styles.readTime}>{article.readTime}</span>
                      </div>
                      <button style={styles.readMoreButton}>Read Full Article</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Regular Articles */}
          <section style={styles.articlesSection}>
            <h2 style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'Latest News' : `${newsCategories.find(cat => cat.id === selectedCategory)?.name} News`}
            </h2>
            <div style={styles.articlesGrid}>
              {regularArticles.map(article => (
                <article key={article.id} style={styles.regularArticle}>
                  <div style={styles.regularArticleImage}>
                    <img src={article.image} alt={article.title} style={styles.regularImg} />
                  </div>
                  <div style={styles.regularContent}>
                    <div style={styles.regularCategoryBadge}>
                      {newsCategories.find(cat => cat.id === article.category)?.icon} {newsCategories.find(cat => cat.id === article.category)?.name}
                    </div>
                    <h3 style={styles.regularTitle}>{article.title}</h3>
                    <p style={styles.regularExcerpt}>{article.excerpt}</p>
                    <div style={styles.regularMeta}>
                      <span style={styles.regularAuthor}>{article.author}</span>
                      <span style={styles.regularDate}>{new Date(article.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        {/* Newsletter Signup */}
        <section style={styles.newsletterSection}>
          <div style={styles.newsletterCard}>
            <h2 style={styles.newsletterTitle}>Stay Informed</h2>
            <p style={styles.newsletterSubtitle}>
              Get daily market updates and financial insights delivered to your inbox.
            </p>
            <div style={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Enter your email address"
                style={styles.newsletterInput}
              />
              <button style={styles.newsletterButton}>Subscribe</button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <p style={styles.footerText}>
              © 2024 Oakline Bank. All rights reserved. Member FDIC. Investment products are not FDIC insured.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#1a365d',
    padding: '1rem 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none'
  },
  logo: {
    height: '40px',
    width: 'auto'
  },
  brandName: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  backButton: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    transition: 'all 0.2s'
  },
  heroSection: {
    background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white'
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  heroSubtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    opacity: 0.9,
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  updateInfo: {
    fontSize: '0.9rem',
    opacity: 0.8,
    fontStyle: 'italic'
  },
  marketOverview: {
    padding: '3rem 2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  },
  marketContainer: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  marketTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  marketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem'
  },
  marketItem: {
    textAlign: 'center',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  marketIndex: {
    fontSize: '0.9rem',
    color: '#64748b',
    marginBottom: '0.5rem'
  },
  marketValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.5rem'
  },
  marketChange: {
    fontSize: '1rem',
    fontWeight: '600'
  },
  filterSection: {
    padding: '2rem',
    backgroundColor: 'white'
  },
  filterContainer: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  filterTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem'
  },
  categoryButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  categoryButton: {
    padding: '0.75rem 1.5rem',
    border: '2px solid #e2e8f0',
    backgroundColor: 'white',
    borderRadius: '25px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#64748b'
  },
  categoryButtonActive: {
    backgroundColor: '#1a365d',
    borderColor: '#1a365d',
    color: 'white'
  },
  categoryIcon: {
    fontSize: '1rem'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  featuredSection: {
    marginBottom: '4rem'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '2rem'
  },
  featuredGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  },
  featuredArticle: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  articleImage: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden'
  },
  articleImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  categoryBadge: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    backgroundColor: 'rgba(26, 54, 93, 0.9)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  articleContent: {
    padding: '1.5rem'
  },
  articleTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1rem',
    lineHeight: '1.4'
  },
  articleExcerpt: {
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '1rem'
  },
  articleMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '1.5rem'
  },
  articleAuthor: {
    fontWeight: '600'
  },
  articleDate: {},
  readTime: {},
  readMoreButton: {
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  articlesSection: {
    marginTop: '3rem'
  },
  articlesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem'
  },
  regularArticle: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    transition: 'all 0.2s'
  },
  regularArticleImage: {
    height: '150px',
    overflow: 'hidden'
  },
  regularImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  regularContent: {
    padding: '1.5rem'
  },
  regularCategoryBadge: {
    backgroundColor: '#f1f5f9',
    color: '#1a365d',
    padding: '0.25rem 0.75rem',
    borderRadius: '15px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '1rem'
  },
  regularTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '0.75rem',
    lineHeight: '1.4'
  },
  regularExcerpt: {
    color: '#64748b',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    marginBottom: '1rem'
  },
  regularMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
    color: '#64748b'
  },
  regularAuthor: {
    fontWeight: '600'
  },
  regularDate: {},
  newsletterSection: {
    padding: '4rem 2rem',
    backgroundColor: '#1a365d'
  },
  newsletterCard: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center',
    color: 'white'
  },
  newsletterTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  newsletterSubtitle: {
    fontSize: '1.1rem',
    opacity: 0.9,
    marginBottom: '2rem'
  },
  newsletterForm: {
    display: 'flex',
    gap: '1rem',
    maxWidth: '400px',
    margin: '0 auto'
  },
  newsletterInput: {
    flex: 1,
    padding: '1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem'
  },
  newsletterButton: {
    padding: '1rem 1.5rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  footer: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '2rem',
    textAlign: 'center',
    borderTop: '1px solid #2d4a69'
  },
  footerContent: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  footerText: {
    color: '#cbd5e0',
    fontSize: '0.9rem'
  }
};
