
import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function FAQ() {
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqData = [
    {
      category: "Account Opening",
      questions: [
        {
          question: "How do I open an account with Oakline Bank?",
          answer: "You can open an account online by visiting our Apply page, visiting any of our branch locations, or calling our customer service at 1-800-OAKLINE. You'll need a valid government-issued ID, Social Security number, and initial deposit."
        },
        {
          question: "What documents do I need to open an account?",
          answer: "You'll need: 1) Valid government-issued photo ID (driver's license or passport), 2) Social Security number or Individual Taxpayer Identification Number (ITIN), 3) Proof of address (utility bill or lease agreement), and 4) Initial deposit amount."
        },
        {
          question: "What's the minimum deposit to open an account?",
          answer: "Minimum deposits vary by account type: Checking accounts - $25, Savings accounts - $50, Money Market - $2,500, CDs - $1,000. Some student accounts have no minimum deposit requirement."
        },
        {
          question: "How long does it take to open an account?",
          answer: "Online applications typically take 5-10 minutes to complete. Account approval usually happens within 1-2 business days. You can start using your account immediately after approval."
        }
      ]
    },
    {
      category: "Online Banking",
      questions: [
        {
          question: "How do I enroll in online banking?",
          answer: "After opening your account, you'll receive an enrollment email with instructions. You can also enroll by visiting our website and clicking 'Enroll Online' or by calling customer service."
        },
        {
          question: "Is online banking secure?",
          answer: "Yes, we use 256-bit SSL encryption, multi-factor authentication, and continuous monitoring to protect your information. We also offer account alerts and the ability to lock/unlock your cards instantly."
        },
        {
          question: "Can I deposit checks through my phone?",
          answer: "Yes! Our mobile app includes mobile check deposit. Simply take photos of the front and back of your check, enter the amount, and submit. Funds are typically available the next business day."
        },
        {
          question: "What can I do with online banking?",
          answer: "You can check balances, transfer money, pay bills, deposit checks, set up alerts, view statements, manage cards, and much more. Our online platform offers nearly all banking services 24/7."
        }
      ]
    },
    {
      category: "Fees and Rates",
      questions: [
        {
          question: "What fees does Oakline Bank charge?",
          answer: "We believe in transparent pricing. Most of our accounts have no monthly maintenance fees. We may charge fees for overdrafts ($35), out-of-network ATM usage ($2.50), wire transfers ($25), and stop payments ($35). Many fees are waivable with qualifying balances or activities."
        },
        {
          question: "How often do interest rates change?",
          answer: "Interest rates on savings and money market accounts may change at any time based on market conditions. CD rates are fixed for the term. We'll notify you of any rate changes on your accounts."
        },
        {
          question: "Are there ATM fees?",
          answer: "We have over 55,000 fee-free ATMs nationwide. Using out-of-network ATMs may result in a $2.50 fee from us, plus any fees charged by the ATM owner. We reimburse up to $15/month in ATM fees for premium account holders."
        },
        {
          question: "What are your overdraft policies?",
          answer: "We offer overdraft protection options including linking to a savings account or line of credit. Standard overdraft fees are $35 per item. We also offer a grace period and will waive fees for first-time occurrences."
        }
      ]
    },
    {
      category: "Cards and Payments",
      questions: [
        {
          question: "When will I receive my debit card?",
          answer: "Your debit card will be mailed within 7-10 business days after account opening. You can request expedited shipping for $25 to receive it in 2-3 business days."
        },
        {
          question: "Can I use my card internationally?",
          answer: "Yes, our debit and credit cards work worldwide. We recommend notifying us of travel plans to prevent card blocks. International transactions may include foreign transaction fees (typically 1-3% depending on your card type)."
        },
        {
          question: "What if my card is lost or stolen?",
          answer: "Report lost or stolen cards immediately by calling 1-800-OAKLINE or through our mobile app. We'll cancel the card and issue a replacement. You're not liable for unauthorized transactions reported promptly."
        },
        {
          question: "How do I set up direct deposit?",
          answer: "Provide your employer with our routing number (075915826) and your account number. You can find these details in online banking or on your checks. Direct deposits are typically available the same day they're received."
        }
      ]
    },
    {
      category: "Loans and Credit",
      questions: [
        {
          question: "What types of loans do you offer?",
          answer: "We offer personal loans, auto loans, home mortgages, home equity loans, business loans, and student loans. Each has different terms, rates, and qualification requirements."
        },
        {
          question: "How do I apply for a loan?",
          answer: "You can apply online, by phone, or at any branch. You'll need income verification, employment history, credit authorization, and details about the loan purpose. Pre-qualification is available for most loan types."
        },
        {
          question: "What credit score do I need?",
          answer: "Credit requirements vary by loan type. Generally, we work with customers with credit scores from 580 and up. We consider your full financial picture, not just your credit score."
        },
        {
          question: "How long does loan approval take?",
          answer: "Personal loans: 1-3 business days, Auto loans: Same day to 2 days, Mortgages: 30-45 days, Business loans: 5-10 business days. Pre-approval is often faster."
        }
      ]
    },
    {
      category: "Customer Service",
      questions: [
        {
          question: "What are your customer service hours?",
          answer: "Phone support: Monday-Friday 7 AM - 8 PM, Saturday 8 AM - 4 PM, Sunday 10 AM - 4 PM (EST). Online chat is available 24/7. Branch hours vary by location."
        },
        {
          question: "How can I contact customer service?",
          answer: "Phone: 1-800-OAKLINE, Email: support@theoaklinebank.com, Live chat through our website or mobile app, or visit any branch location."
        },
        {
          question: "Do you have branches in my area?",
          answer: "We have branches in major cities across the United States. Use our Branch Locator tool on our website to find the nearest location, hours, and services offered."
        },
        {
          question: "Can I speak to someone in my language?",
          answer: "We offer customer service in Spanish, and can arrange interpreters for other languages. Our website and mobile app support multiple languages as well."
        }
      ]
    }
  ];

  const toggleFAQ = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`;
    setOpenFAQ(openFAQ === key ? null : key);
  };

  return (
    <>
      <Head>
        <title>Frequently Asked Questions - Oakline Bank</title>
        <meta name="description" content="Find answers to common questions about Oakline Bank accounts, services, fees, and more." />
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
            <h1 style={styles.heroTitle}>Frequently Asked Questions</h1>
            <p style={styles.heroSubtitle}>
              Find quick answers to common questions about our banking services and policies.
            </p>
          </div>
        </section>

        {/* Search Bar */}
        <section style={styles.searchSection}>
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search FAQs..."
              style={styles.searchInput}
            />
            <button style={styles.searchButton}>🔍</button>
          </div>
        </section>

        {/* FAQ Content */}
        <main style={styles.main}>
          {faqData.map((category, categoryIndex) => (
            <section key={categoryIndex} style={styles.faqCategory}>
              <h2 style={styles.categoryTitle}>{category.category}</h2>
              
              {category.questions.map((faq, questionIndex) => (
                <div key={questionIndex} style={styles.faqItem}>
                  <button
                    style={{
                      ...styles.faqQuestion,
                      ...(openFAQ === `${categoryIndex}-${questionIndex}` ? styles.faqQuestionActive : {})
                    }}
                    onClick={() => toggleFAQ(categoryIndex, questionIndex)}
                  >
                    <span>{faq.question}</span>
                    <span style={styles.faqToggle}>
                      {openFAQ === `${categoryIndex}-${questionIndex}` ? '−' : '+'}
                    </span>
                  </button>
                  
                  {openFAQ === `${categoryIndex}-${questionIndex}` && (
                    <div style={styles.faqAnswer}>
                      <p>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </main>

        {/* Still Have Questions Section */}
        <section style={styles.contactSection}>
          <div style={styles.contactCard}>
            <h2 style={styles.contactTitle}>Still Have Questions?</h2>
            <p style={styles.contactSubtitle}>
              Can't find what you're looking for? Our customer service team is here to help.
            </p>
            <div style={styles.contactOptions}>
              <div style={styles.contactOption}>
                <div style={styles.contactIcon}>📞</div>
                <div>
                  <h3 style={styles.contactOptionTitle}>Call Us</h3>
                  <p style={styles.contactOptionDesc}>1-800-OAKLINE</p>
                  <p style={styles.contactOptionHours}>Mon-Fri 7 AM - 8 PM EST</p>
                </div>
              </div>
              
              <div style={styles.contactOption}>
                <div style={styles.contactIcon}>💬</div>
                <div>
                  <h3 style={styles.contactOptionTitle}>Live Chat</h3>
                  <p style={styles.contactOptionDesc}>Chat with us online</p>
                  <p style={styles.contactOptionHours}>Available 24/7</p>
                </div>
              </div>
              
              <div style={styles.contactOption}>
                <div style={styles.contactIcon}>✉️</div>
                <div>
                  <h3 style={styles.contactOptionTitle}>Email Support</h3>
                  <p style={styles.contactOptionDesc}>support@theoaklinebank.com</p>
                  <p style={styles.contactOptionHours}>Response within 24 hours</p>
                </div>
              </div>
            </div>
            
            <div style={styles.contactButtons}>
              <Link href="/support" style={styles.primaryButton}>Contact Support</Link>
              <Link href="/apply" style={styles.secondaryButton}>Open Account</Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerContent}>
            <p style={styles.footerText}>
              © 2024 Oakline Bank. All rights reserved. Member FDIC. Equal Housing Lender.
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
    lineHeight: '1.6'
  },
  searchSection: {
    padding: '2rem',
    backgroundColor: 'white',
    borderBottom: '1px solid #e2e8f0'
  },
  searchContainer: {
    maxWidth: '600px',
    margin: '0 auto',
    display: 'flex',
    gap: '1rem'
  },
  searchInput: {
    flex: 1,
    padding: '1rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '1rem'
  },
  searchButton: {
    padding: '1rem 1.5rem',
    backgroundColor: '#1a365d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem'
  },
  faqCategory: {
    marginBottom: '3rem'
  },
  categoryTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: '1.5rem',
    paddingBottom: '0.5rem',
    borderBottom: '2px solid #e2e8f0'
  },
  faqItem: {
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '1rem',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
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
    alignItems: 'center',
    transition: 'all 0.2s'
  },
  faqQuestionActive: {
    backgroundColor: '#f0f4f8'
  },
  faqToggle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d'
  },
  faqAnswer: {
    padding: '0 1.5rem 1.5rem',
    backgroundColor: '#f8fafc'
  },
  contactSection: {
    padding: '4rem 2rem',
    backgroundColor: '#1a365d'
  },
  contactCard: {
    maxWidth: '1000px',
    margin: '0 auto',
    textAlign: 'center',
    color: 'white'
  },
  contactTitle: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem'
  },
  contactSubtitle: {
    fontSize: '1.2rem',
    opacity: 0.9,
    marginBottom: '3rem'
  },
  contactOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem'
  },
  contactOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textAlign: 'left'
  },
  contactIcon: {
    fontSize: '2.5rem',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '1rem',
    borderRadius: '50%',
    width: '70px',
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  contactOptionTitle: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  contactOptionDesc: {
    fontSize: '1rem',
    marginBottom: '0.25rem'
  },
  contactOptionHours: {
    fontSize: '0.9rem',
    opacity: 0.8
  },
  contactButtons: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '1rem 2rem',
    backgroundColor: '#10b981',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  secondaryButton: {
    padding: '1rem 2rem',
    backgroundColor: 'transparent',
    color: 'white',
    textDecoration: 'none',
    border: '2px solid white',
    borderRadius: '8px',
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
