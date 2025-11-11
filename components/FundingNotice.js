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
  const [pendingDeposits, setPendingDeposits] = useState({});

  useEffect(() => {
    if (!accounts || accounts.length === 0) return;

    const checkPendingDeposits = async () => {
      const { supabase } = await import('../lib/supabaseClient');

      for (const account of accounts) {
        if (account.status !== 'pending_funding') continue;

        // Check account_opening_crypto_deposits table for account activation deposits
        const { data, error } = await supabase
          .from('account_opening_crypto_deposits')
          .select('id, status, amount')
          .eq('account_id', account.id)
          .in('status', ['pending', 'awaiting_confirmations', 'under_review', 'confirmed'])
          .single();

        if (data && !error) {
          setPendingDeposits(prev => ({
            ...prev,
            [account.id]: data
          }));
        }
      }
    };

    checkPendingDeposits();
  }, [accounts]);

  const handleDepositClick = (accountId, minDeposit, mode, hasPending) => {
    if (hasPending) {
      // If there's a pending deposit, go to account details to view status
      router.push(`/account-details?id=${accountId}&show_deposit=true`);
    } else {
      // Otherwise, go to deposit page
      router.push(`/deposit-crypto?account_id=${accountId}&min_deposit=${minDeposit}&mode=${mode}`);
    }
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

            const hasPendingDeposit = pendingDeposits[account.id];
            const depositStatus = hasPendingDeposit?.status;
            const accountTypeName = account.account_type ? account.account_type.toUpperCase().replace(/_/g, ' ') : 'Account';
            
            const getStatusDisplay = () => {
              if (depositStatus === 'pending' || depositStatus === 'awaiting_confirmations') {
                return {
                  title: 'Account Activation Deposit Submitted',
                  message: `Your deposit of ${formatCurrency(hasPendingDeposit.amount)} for ${accountTypeName} (${account.account_number}) is pending blockchain confirmation`,
                  buttonText: '📋 View Status',
                  showButton: true,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
                  icon: '⏱️'
                };
              }
              
              if (depositStatus === 'under_review' || depositStatus === 'confirmed') {
                return {
                  title: 'Deposit Under Review',
                  message: `Your deposit of ${formatCurrency(hasPendingDeposit.amount)} for ${accountTypeName} (${account.account_number}) is being verified by our team`,
                  buttonText: '📋 View Status',
                  showButton: true,
                  background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
                  icon: '🔍'
                };
              }
              
              // Default: No pending deposit or other status
              return {
                title: 'Account Activation Required',
                message: `Deposit ${formatCurrency(remaining)} to activate ${accountTypeName} - ${account.account_number}`,
                buttonText: '💰 Add Funds',
                showButton: true,
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                icon: '💳'
              };
            };
            
            const statusDisplay = getStatusDisplay();

            return (
              <div
                key={account.id}
                style={{
                  background: statusDisplay.background,
                  borderRadius: '8px',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(30, 64, 175, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      flexShrink: 0
                    }}
                  >
                    {statusDisplay.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '4px'
                      }}
                    >
                      {statusDisplay.title}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        lineHeight: '1.4'
                      }}
                    >
                      {statusDisplay.message}
                    </p>
                  </div>
                  {statusDisplay.showButton && (
                    <button
                      onClick={() => handleDepositClick(account.id, minDeposit, 'funding', hasPendingDeposit)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: hasPendingDeposit ? '#0891b2' : '#1e40af',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {statusDisplay.buttonText}
                    </button>
                  )}
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