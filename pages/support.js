import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function Support() {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [bankDetails, setBankDetails] = useState(null);

  useEffect(() => {
    const fetchBankDetails = async () => {
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching bank details:', error);
      } else {
        setBankDetails(data);
      }
    };

    fetchBankDetails();
  }, []);

  const faqCategories = {
    general: 'General Banking',
    accounts: 'Accounts & Services',
    digital: 'Digital Banking',
    security: 'Security & Privacy',
    loans: 'Loans & Credit',
    fees: 'Fees & Charges'
  };

  const faqs = {
    general: [
      {
        question: 'What are Oakline Bank\'s operating hours?',
        answer: 'Our Oklahoma City branch is open Monday-Friday 9:00 AM - 5:00 PM, Saturday 9:00 AM - 1:00 PM, and closed on Sundays. Online banking and ATMs are available 24/7.'
      },
      {
        question: 'How do I contact customer service?',
        answer: 'You can reach us by calling +1 (636) 635-6122, using our live chat feature, visiting our Oklahoma City branch, or emailing contact-us@theoaklinebank.com.'
      },
      {
        question: 'Where can I find an ATM?',
        answer: 'We have over 55,000 fee-free ATMs nationwide. Use our mobile app or website ATM locator to find the nearest location to you.'
      }
    ],
    accounts: [
      {
        question: 'What types of accounts do you offer?',
        answer: 'We offer 23 different account types including checking, savings, business accounts, investment accounts, retirement accounts, and specialized accounts like HSAs and education savings.'
      },
      {
        question: 'How do I open an account?',
        answer: 'You can open an account online in minutes through our website, by visiting any branch, or by calling our customer service team. You\'ll need a valid ID, Social Security number, and initial deposit.'
      },
      {
        question: 'What is the minimum balance requirement?',
        answer: 'Minimum balance requirements vary by account type. Many of our accounts have no minimum balance requirement, including our standard checking account.'
      }
    ],
    digital: [
      {
        question: 'How do I set up online banking?',
        answer: 'Visit our website and click "Sign In" then "Enroll Now". You\'ll need your account number, Social Security number, and email address to complete enrollment.'
      },
      {
        question: 'Is mobile banking safe?',
        answer: 'Yes, our mobile banking uses bank-level security with 256-bit SSL encryption, multi-factor authentication, and real-time fraud monitoring to protect your information.'
      },
      {
        question: 'Can I deposit checks using my phone?',
        answer: 'Yes, our mobile app includes mobile check deposit. Simply take photos of the front and back of your check and follow the prompts in the app.'
      }
    ],
    security: [
      {
        question: 'How do you protect my account?',
        answer: 'We use multiple layers of security including encryption, fraud monitoring, multi-factor authentication, and account alerts to protect your information and funds.'
      },
      {
        question: 'What should I do if I suspect fraud?',
        answer: 'Contact us immediately at +1 (636) 635-6122 or email notify@theoaklinebank.com. We\'ll investigate and protect your account while resolving any unauthorized transactions.'
      },
      {
        question: 'How do I set up account alerts?',
        answer: 'Log into online banking or use our mobile app to set up customized alerts for transactions, balances, and account activity via email or text message.'
      }
    ],
    loans: [
      {
        question: 'What types of loans do you offer?',
        answer: 'We offer personal loans, auto loans, home mortgages, business loans, and lines of credit with competitive rates and flexible terms.'
      },
      {
        question: 'How do I apply for a loan?',
        answer: 'You can apply online, visit any branch, or call our loan department. We\'ll review your application and provide a decision quickly, often within 24 hours.'
      },
      {
        question: 'What are your current interest rates?',
        answer: 'Interest rates vary based on loan type, term, and creditworthiness. Visit our rates page or contact us for current rates and to discuss your specific situation.'
      }
    ],
    fees: [
      {
        question: 'What fees do you charge?',
        answer: 'We believe in transparent, fair pricing. Many of our services are free, including online banking, mobile banking, and basic checking accounts. See our fee schedule for complete details.'
      },
      {
        question: 'Are there any monthly maintenance fees?',
        answer: 'Most of our accounts have no monthly maintenance fees. Some premium accounts may have fees that can be waived with minimum balance requirements.'
      },
      {
        question: 'Do you charge ATM fees?',
        answer: 'We don\'t charge fees for using our ATMs or our extensive network of partner ATMs. We also reimburse up to $10 per month in fees charged by other ATM operators.'
      }
    ]
  };

  const contactMethods = [
    {
      icon: '📞',
      title: 'Phone/Text',
      description: 'Customer support and banking services',
      contact: bankDetails?.phone || '+1 (636) 635-6122',
      hours: 'Mon-Fri 9AM-5PM, Sat 9AM-1PM'
    },
    {
      icon: '💬',
      title: 'Live Chat',
      description: 'Instant support from our banking specialists',
      contact: 'Chat now',
      hours: 'Mon-Fri 9AM-5PM, Sat 9AM-1PM'
    },
    {
      icon: '🏦',
      title: 'Visit Us',
      description: 'Oklahoma City Branch - In-person banking services',
      contact: bankDetails?.address || '12201 N. May Avenue, OKC, OK 73120',
      hours: 'Mon-Fri 9AM-5PM, Sat 9AM-1PM'
    },
    {
      icon: '✉️',
      title: 'Email Support',
      description: 'Written support for non-urgent inquiries',
      contact: bankDetails?.email_info || 'contact-us@theoaklinebank.com',
      hours: 'Response within 24 hours'
    }
  ];

  return (
    <>
      <Head>
        <title>Customer Support - Oakline Bank</title>
        <meta name="description" content="Get help with your banking needs. Contact Oakline Bank customer support via phone, chat, email, or visit a branch location." />
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
            <h1 style={styles.heroTitle}>How Can We Help You?</h1>
            <p style={styles.heroSubtitle}>
              Our customer support team is here to assist you with all your banking needs.
              Find answers, get support, and manage your account with ease.
            </p>
          </div>
        </section>

        {/* Quick Actions */}
        <section style={styles.quickActions}>
          <div style={styles.container}>
            <h2 style={styles.sectionTitle}>Get Help Quickly</h2>
            <div style={styles.actionGrid}>
              {contactMethods.map((method, index) => (
                <div key={index} style={styles.actionCard}>
                  <span style={styles.actionIcon}>{method.icon}</span>
                  <h3 style={styles.actionTitle}>{method.title}</h3>
                  <p style={styles.actionDescription}>{method.description}</p>
                  <div style={styles.contactInfo}>
                    <strong style={styles.contactDetails}>{method.contact}</strong>
                    <span style={styles.hours}>{method.hours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section style={styles.faqSection}>
          <div style={styles.container}>
            <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>

            {/* Category Filter */}
            <div style={styles.categoryFilter}>
              {Object.entries(faqCategories).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  style={{
                    ...styles.categoryButton,
                    ...(selectedCategory === key ? styles.activeCategoryButton : {})
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* FAQ Items */}
            <div style={styles.faqList}>
              {faqs[selectedCategory]?.map((faq, index) => (
                <div key={index} style={styles.faqItem}>
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    style={styles.faqQuestion}
                  >
                    <span>{faq.question}</span>
                    <span style={{
                      ...styles.faqIcon,
                      transform: expandedFaq === index ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>▼</span>
                  </button>
                  {expandedFaq === index && (
                    <div style={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section style={styles.emergencySection}>
          <div style={styles.container}>
            <div style={styles.emergencyCard}>
              <h2 style={styles.emergencyTitle}>Need Immediate Help?</h2>
              <p style={styles.emergencyText}>
                For urgent issues like lost cards, suspected fraud, or account emergencies:
              </p>
              <div style={styles.emergencyActions}>
                <a href={`tel:${bankDetails?.emergency_phone || '1-800-625-5463'}`} style={styles.emergencyButton}>
                  📞 Call {bankDetails?.emergency_phone_label || '1-800-OAKLINE'}
                </a>
                <button style={styles.chatButton}>
                  💬 Start Live Chat
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.container}>
            <div style={styles.footerContent}>
              <div style={styles.footerSection}>
                <h4>Contact Information</h4>
                <p>Phone: {bankDetails?.phone || '+1 (636) 635-6122'}</p>
                <p>Email: {bankDetails?.email_info || 'contact-us@theoaklinebank.com'}</p>
                <p>Routing Number: {bankDetails?.routing_number || '075915826'}</p>
                <p>Address: {bankDetails?.address || '12201 N. May Avenue, OKC, OK 73120'}</p>
              </div>
              <div style={styles.footerSection}>
                <h4>Quick Links</h4>
                <Link href="/sign-in">Online Banking</Link>
                <Link href="/apply">Open Account</Link>
                <Link href="/account-types">Account Types</Link>
              </div>
              <div style={styles.footerSection}>
                <h4>Resources</h4>
                <Link href="/security">Security Center</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
              </div>
            </div>
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
    lineHeight: '1.6'
  },
  quickActions: {
    padding: '4rem 2rem',
    backgroundColor: 'white'
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '3rem',
    color: '#1a365d'
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    maxWidth: '1000px',
    margin: '0 auto'
  },
  actionCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '12px',
    textAlign: 'center',
    border: '2px solid #e2e8f0',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  actionIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
    display: 'block'
  },
  actionTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    color: '#1a365d'
  },
  actionDescription: {
    color: '#64748b',
    marginBottom: '1rem',
    lineHeight: '1.5'
  },
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  contactDetails: {
    color: '#1a365d',
    fontSize: '1.1rem',
    fontWeight: '700'
  },
  hours: {
    color: '#475569',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  faqSection: {
    padding: '4rem 2rem',
    backgroundColor: '#ffffff'
  },
  categoryFilter: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: '3rem'
  },
  categoryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ffffff',
    color: '#1a365d',
    border: '2px solid #e2e8f0',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  activeCategoryButton: {
    backgroundColor: '#1a365d',
    color: 'white',
    borderColor: '#1a365d'
  },
  faqList: {
    maxWidth: '800px',
    margin: '0 auto'
  },
  faqItem: {
    backgroundColor: 'white',
    marginBottom: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden'
  },
  faqQuestion: {
    width: '100%',
    padding: '1.5rem',
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1a365d',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  faqIcon: {
    transition: 'transform 0.2s',
    color: '#64748b'
  },
  faqAnswer: {
    padding: '0 1.5rem 1.5rem',
    color: '#64748b',
    lineHeight: '1.6'
  },
  emergencySection: {
    padding: '4rem 2rem',
    backgroundColor: '#1a365d'
  },
  emergencyCard: {
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center',
    color: 'white'
  },
  emergencyTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  emergencyText: {
    fontSize: '1.1rem',
    marginBottom: '2rem',
    opacity: 0.9
  },
  emergencyActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  emergencyButton: {
    padding: '1rem 2rem',
    backgroundColor: '#dc2626',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  chatButton: {
    padding: '1rem 2rem',
    backgroundColor: 'white',
    color: '#1a365d',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  footer: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '3rem 2rem 2rem'
  },
  footerContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem'
  },
  footerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  }
};