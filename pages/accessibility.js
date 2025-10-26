export default function Accessibility() {
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: '2rem 0'
    },
    content: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '0 2rem'
    },
    header: {
      textAlign: 'center',
      marginBottom: '3rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: '1rem'
    },
    subtitle: {
      color: '#94a3b8',
      fontSize: '1.1rem'
    },
    section: {
      marginBottom: '2.5rem'
    },
    sectionTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#3b82f6',
      marginBottom: '1rem'
    },
    text: {
      lineHeight: '1.7',
      color: '#e2e8f0',
      marginBottom: '1rem'
    },
    list: {
      paddingLeft: '1.5rem',
      marginBottom: '1rem'
    },
    listItem: {
      marginBottom: '0.5rem',
      color: '#e2e8f0'
    },
    accessibilityCard: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      marginBottom: '1.5rem'
    },
    contactBox: {
      backgroundColor: 'rgba(30, 64, 175, 0.1)',
      padding: '1.5rem',
      borderRadius: '8px',
      border: '1px solid rgba(30, 64, 175, 0.3)'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Accessibility Statement</h1>
          <p style={styles.subtitle}>Oakline Bank's commitment to digital accessibility for all customers</p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Our Commitment</h2>
          <div style={styles.accessibilityCard}>
            <p style={styles.text}>
              Oakline Bank is committed to ensuring digital accessibility for people with disabilities. 
              We are continually improving the user experience for everyone and applying the relevant 
              accessibility standards to ensure we provide equal access to all our customers.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accessibility Standards</h2>
          <p style={styles.text}>
            We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. 
            These guidelines explain how to make web content more accessible for people with disabilities.
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Perceivable - Information must be presentable to users in ways they can perceive</li>
            <li style={styles.listItem}>Operable - Interface components must be operable by all users</li>
            <li style={styles.listItem}>Understandable - Information and UI operation must be understandable</li>
            <li style={styles.listItem}>Robust - Content must be robust enough for various assistive technologies</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Accessibility Features</h2>
          <p style={styles.text}>Our website and mobile applications include:</p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Alternative text for images and graphics</li>
            <li style={styles.listItem}>Keyboard navigation support</li>
            <li style={styles.listItem}>Screen reader compatibility</li>
            <li style={styles.listItem}>High contrast color schemes</li>
            <li style={styles.listItem}>Resizable text and zoom functionality</li>
            <li style={styles.listItem}>Clear headings and page structure</li>
            <li style={styles.listItem}>Descriptive link text</li>
            <li style={styles.listItem}>Form labels and error identification</li>
            <li style={styles.listItem}>Captions for video content</li>
            <li style={styles.listItem}>Consistent navigation patterns</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Assistive Technology Support</h2>
          <p style={styles.text}>
            Our digital platforms are designed to work with assistive technologies including:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Screen readers (JAWS, NVDA, VoiceOver)</li>
            <li style={styles.listItem}>Voice recognition software</li>
            <li style={styles.listItem}>Keyboard-only navigation</li>
            <li style={styles.listItem}>Switch navigation devices</li>
            <li style={styles.listItem}>Magnification software</li>
            <li style={styles.listItem}>Alternative pointing devices</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Branch and ATM Accessibility</h2>
          <p style={styles.text}>
            Our physical locations are designed to be accessible:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>ADA-compliant entrances and facilities</li>
            <li style={styles.listItem}>Accessible parking spaces</li>
            <li style={styles.listItem}>Audio-enabled ATMs with headphone jacks</li>
            <li style={styles.listItem}>Braille and large-print options</li>
            <li style={styles.listItem}>Wheelchair-accessible service areas</li>
            <li style={styles.listItem}>Staff trained in disability awareness</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Alternative Formats</h2>
          <p style={styles.text}>
            We provide information in alternative formats upon request:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Large print statements and documents</li>
            <li style={styles.listItem}>Braille materials</li>
            <li style={styles.listItem}>Audio recordings</li>
            <li style={styles.listItem}>Electronic formats compatible with screen readers</li>
            <li style={styles.listItem}>Plain language versions of complex documents</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Customer Support</h2>
          <p style={styles.text}>
            Our customer service team is trained to assist customers with disabilities:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>TTY/TDD service: 1-800-855-2880</li>
            <li style={styles.listItem}>Video relay service support</li>
            <li style={styles.listItem}>Extended call times for customers who need them</li>
            <li style={styles.listItem}>Alternative communication methods</li>
            <li style={styles.listItem}>Specialist assistance for complex needs</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Ongoing Improvements</h2>
          <p style={styles.text}>
            We are continuously working to improve accessibility:
          </p>
          <ul style={styles.list}>
            <li style={styles.listItem}>Regular accessibility audits and testing</li>
            <li style={styles.listItem}>User feedback integration</li>
            <li style={styles.listItem}>Staff training on accessibility best practices</li>
            <li style={styles.listItem}>Technology updates and improvements</li>
            <li style={styles.listItem}>Partnership with disability advocacy groups</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Feedback and Assistance</h2>
          <div style={styles.contactBox}>
            <p style={styles.text}>
              We welcome your feedback on the accessibility of our services. If you encounter 
              accessibility barriers or need assistance:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Email: accessibility@oaklinebank.com</li>
              <li style={styles.listItem}>Phone: 1-800-OAKLINE (625-5463)</li>
              <li style={styles.listItem}>TTY: 1-800-855-2880</li>
              <li style={styles.listItem}>Mail: Accessibility Coordinator, Oakline Bank, 123 Financial District, NY 10001</li>
            </ul>
            <p style={styles.text}>
              We aim to respond to accessibility feedback within 3 business days.
            </p>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Third-Party Content</h2>
          <p style={styles.text}>
            While we strive to ensure that third-party content meets accessibility standards, 
            some external links or embedded content may not fully conform to WCAG guidelines. 
            We work with our partners to improve accessibility across all touchpoints.
          </p>
        </div>
      </div>
    </div>
  );
}