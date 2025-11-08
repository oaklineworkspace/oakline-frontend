import { useRouter } from 'next/router';
import styles from '../styles/FundingNotice.module.css';
import Link from 'next/link';

export default function FundingNotice({ accounts }) {
  const router = useRouter();

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
              <div key={account.id} className={styles.noticeBox} style={{ marginBottom: '1rem' }}>
                <div className={styles.noticeContent}>
                  <div className={styles.noticeIcon}>💰</div>
                  <div className={styles.noticeText}>
                    <strong>Account {account.account_number} requires minimum deposit</strong>
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#92400e' }}>
                      Minimum Required: <strong>${minDeposit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      {' • '}
                      Current Balance: <strong>${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      {' • '}
                      Still Needed: <strong>${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </p>
                  </div>
                </div>
                <Link
                  href={`/deposit-crypto?account_id=${account.id}&mode=funding`}
                  className={styles.depositButton}
                >
                  Add Funds via Crypto
                </Link>
              </div>
            );
          })
      ) : (
        <div className={styles.notice}>
          <div className={styles.iconContainer}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.content}>
            <div className={styles.header}>
              <h3 className={styles.title}>All Accounts Funded</h3>
              <span className={styles.badge} style={{ backgroundColor: '#10b981' }}>Complete</span>
            </div>
            <p className={styles.message}>
              All your accounts have met their minimum deposit requirements.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}