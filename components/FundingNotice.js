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
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderLeft: '4px solid #f59e0b',
                  borderRadius: '8px',
                  padding: isMobile ? '1rem' : '1.25rem',
                  marginBottom: '1rem',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    ⚠️
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#1e293b', 
                        fontSize: '1rem',
                        fontWeight: '600'
                      }}>
                        Account {account.account_number} requires funding
                      </h3>
                      <span style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        Pending
                      </span>
                    </div>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.875rem', 
                      color: '#64748b',
                      lineHeight: '1.5'
                    }}>
                      Deposit {formatCurrency(remaining)} to activate this account. Current balance: {formatCurrency(balance)}
                    </p>
                  </div>
                  <Link
                    href={`/deposit-crypto?account_id=${account.id}&mode=funding`}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#1e40af',
                      color: 'white',
                      padding: '0.625rem 1.25rem',
                      borderRadius: '6px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#1e3a8a'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#1e40af'}
                  >
                    Add Funds
                  </Link>
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