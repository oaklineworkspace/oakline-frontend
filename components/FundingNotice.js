import { useRouter } from 'next/router';
import styles from '../styles/FundingNotice.module.css';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default function FundingNotice({ accounts }) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleDepositClick = (accountId, minDeposit, mode) => {
    router.push(`/deposit-crypto?account_id=${accountId}&min_deposit=${minDeposit}&mode=${mode}`);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <div>
      {accounts && accounts.length > 0 ? (
        accounts
          .filter(acc => {
            const minDeposit = parseFloat(acc.min_deposit) || 0;
            const balance = parseFloat(acc.balance) || 0;
            return acc.status === 'pending_funding' && minDeposit > 0 && balance < minDeposit;
          })
          .map(account => {
            const minDeposit = parseFloat(account.min_deposit) || 0;
            const balance = parseFloat(account.balance) || 0;
            const remaining = Math.max(0, minDeposit - balance);

            return (
              <div 
                key={account.id} 
                style={{
                  background: 'linear-gradient(135deg, #f0f7ff 0%, #e6f2ff 100%)',
                  border: '2px solid #1A3E6F',
                  borderLeft: '6px solid #FFC857',
                  borderRadius: '12px',
                  padding: isMobile ? '1.5rem' : '2rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 12px rgba(26, 62, 111, 0.15)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    flexShrink: 0,
                    boxShadow: '0 4px 8px rgba(26, 62, 111, 0.2)'
                  }}>
                    💳
                  </div>
                  <div style={{ flex: 1, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#1A3E6F', 
                        fontSize: isMobile ? '1.2rem' : '1.4rem',
                        fontWeight: '700',
                        flex: 1,
                        minWidth: '200px'
                      }}>
                        Account Activation Required
                      </h3>
                      <span style={{
                        backgroundColor: '#FFC857',
                        color: '#1A3E6F',
                        padding: '0.4rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Pending Funding
                      </span>
                    </div>

                    <div style={{ 
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      border: '1px solid #d1e3f5'
                    }}>
                      <div style={{ 
                        fontSize: '0.85rem', 
                        color: '#64748b', 
                        marginBottom: '0.5rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Account Number
                      </div>
                      <div style={{ 
                        fontSize: '1.1rem', 
                        color: '#1A3E6F', 
                        fontFamily: 'monospace',
                        fontWeight: '700'
                      }}>
                        {account.account_number}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid #d1e3f5'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          Minimum Required
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#1A3E6F', fontWeight: '700' }}>
                          {formatCurrency(minDeposit)}
                        </div>
                      </div>
                      <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '1rem',
                        border: '1px solid #d1e3f5'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.25rem' }}>
                          Current Balance
                        </div>
                        <div style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: '700' }}>
                          {formatCurrency(balance)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#FFC857',
                      borderRadius: '8px',
                      padding: '1rem',
                      textAlign: 'center',
                      marginBottom: '1rem'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#1A3E6F', marginBottom: '0.25rem', fontWeight: '600' }}>
                        Amount Needed to Activate
                      </div>
                      <div style={{ fontSize: '1.8rem', color: '#1A3E6F', fontWeight: '700' }}>
                        {formatCurrency(remaining)}
                      </div>
                    </div>

                    <Link
                      href={`/deposit-crypto?account_id=${account.id}&mode=funding`}
                      style={{
                        display: 'block',
                        backgroundColor: '#1A3E6F',
                        color: 'white',
                        padding: '1rem 1.5rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        textDecoration: 'none',
                        fontWeight: '700',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(26, 62, 111, 0.2)',
                        marginBottom: '1rem'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#2A5490'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#1A3E6F'}
                    >
                      Complete Funding Now
                    </Link>

                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(26, 62, 111, 0.05)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#1A3E6F',
                      lineHeight: '1.5'
                    }}>
                      ℹ️ Your account will be activated immediately once the minimum deposit is received and confirmed.
                    </div>
                  </div>
                </div>
              </div>
            );
          })
      ) : (
        <div style={{ display: 'none' }}></div>
      )}
    </div>
  );
}