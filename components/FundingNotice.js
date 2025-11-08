import { useRouter } from 'next/router';
import styles from '../styles/FundingNotice.module.css';

export default function FundingNotice({ account }) {
  const router = useRouter();
  
  const handleDepositClick = () => {
    router.push(`/deposit-crypto?account_id=${account.id}&min_deposit=${account.min_deposit}&mode=funding`);
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
    <div className={styles.notice}>
      <div className={styles.iconContainer}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
        </svg>
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>Account Activation Required</h3>
          <span className={styles.badge}>Pending Funding</span>
        </div>
        <p className={styles.message}>
          Your <strong>{account.account_type}</strong> account requires a minimum deposit of <strong>{formatCurrency(account.min_deposit)}</strong> to be activated.
        </p>
        <div className={styles.actions}>
          <button onClick={handleDepositClick} className={styles.depositButton}>
            Make Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
