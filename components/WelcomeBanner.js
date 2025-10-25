import { useState, useEffect } from 'react';

export default function WelcomeBanner() {
  return (
    <div style={styles.banner}>
      <div style={styles.scrollContainer}>
        <div style={styles.scrollContent}>
          <span style={styles.messageText}>
            🎉 Welcome to Oakline Bank - Your trusted financial partner since 1995 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            💳 Explore all 23 account types with detailed comparisons and benefits 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🏦 Join over 500,000+ satisfied customers who trust Oakline Bank 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            📱 Award-winning mobile app - Bank anywhere, anytime 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🔒 FDIC Insured • Equal Housing Lender • Deposits protected up to $500,000 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🌟 Rated #1 Customer Service - Banking the way it should be 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
          </span>
          <span style={styles.messageText} aria-hidden="true">
            🎉 Welcome to Oakline Bank - Your trusted financial partner since 1995 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            💳 Explore all 23 account types with detailed comparisons and benefits 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🏦 Join over 500,000+ satisfied customers who trust Oakline Bank 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            📱 Award-winning mobile app - Bank anywhere, anytime 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🔒 FDIC Insured • Equal Housing Lender • Deposits protected up to $500,000 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
            🌟 Rated #1 Customer Service - Banking the way it should be 
            &nbsp;&nbsp;|&nbsp;&nbsp; 
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
    color: 'white',
    padding: '1rem 0',
    position: 'relative',
    overflow: 'hidden',
    width: '100%'
  },
  scrollContainer: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative'
  },
  scrollContent: {
    display: 'flex',
    whiteSpace: 'nowrap',
    animation: 'scroll 60s linear infinite',
    willChange: 'transform'
  },
  messageText: {
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    fontWeight: '500',
    lineHeight: '1.4',
    display: 'inline-block',
    paddingRight: '50px'
  }
};

// Add CSS animation keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.styleSheets[0];
  const keyframes = `
    @keyframes scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-50%);
      }
    }
  `;

  try {
    styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
  } catch (e) {
    // Keyframes might already exist
  }
}