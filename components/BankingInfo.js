import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function BankingInfo() {
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthAndFetchBankDetails();
  }, []);

  const checkAuthAndFetchBankDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const response = await fetch('/api/bank-details', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBankDetails(data.bankDetails);
      }
    } catch (error) {
      console.error('Error fetching bank details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.bankingInfo}>
        <div style={styles.bankingInfoItem}>
          <span style={styles.infoIcon}>⏳</span>
          <div>
            <span style={styles.infoLabel}>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={styles.bankingInfo}>
        <div style={styles.bankingInfoItem}>
          <span style={styles.infoIcon}>🔒</span>
          <div>
            <span style={styles.infoLabel}>Sign in to view bank details</span>
            <span style={styles.infoValue}>Secure banking information</span>
          </div>
        </div>
        <div style={styles.bankingInfoItem}>
          <span style={styles.infoIcon}>🏛️</span>
          <div>
            <span style={styles.infoLabel}>FDIC Insured</span>
            <span style={styles.infoValue}>Up to $250,000</span>
          </div>
        </div>
        <div style={styles.bankingInfoItem}>
          <span style={styles.infoIcon}>⚖️</span>
          <div>
            <span style={styles.infoLabel}>Equal Housing Lender</span>
            <span style={styles.infoValue}>Member FDIC</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.bankingInfo}>
      <div style={styles.bankingInfoItem}>
        <span style={styles.infoIcon}>🏦</span>
        <div>
          <span style={styles.infoLabel}>Routing Number</span>
          <span style={styles.infoValue}>{bankDetails?.routing_number || 'N/A'}</span>
        </div>
      </div>
      <div style={styles.bankingInfoItem}>
        <span style={styles.infoIcon}>🌐</span>
        <div>
          <span style={styles.infoLabel}>SWIFT Code</span>
          <span style={styles.infoValue}>{bankDetails?.swift_code || 'N/A'}</span>
        </div>
      </div>
      <div style={styles.bankingInfoItem}>
        <span style={styles.infoIcon}>🏛️</span>
        <div>
          <span style={styles.infoLabel}>FDIC Insured</span>
          <span style={styles.infoValue}>{bankDetails?.fdic_insured_amount || 'Up to $250,000'}</span>
        </div>
      </div>
      <div style={styles.bankingInfoItem}>
        <span style={styles.infoIcon}>⚖️</span>
        <div>
          <span style={styles.infoLabel}>Equal Housing Lender</span>
          <span style={styles.infoValue}>{bankDetails?.nmls_id ? `NMLS ID: ${bankDetails.nmls_id}` : 'NMLS ID: N/A'}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  bankingInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '2rem',
    alignItems: 'center'
  },
  bankingInfoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  infoIcon: {
    fontSize: '2rem',
    opacity: 0.9
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.85rem',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '0.25rem'
  },
  infoValue: {
    display: 'block',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff'
  }
};
