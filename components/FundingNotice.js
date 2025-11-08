import { useRouter } from 'next/router';
import styles from '../styles/FundingNotice.module.css';

export default function FundingNotice({ account }) {
  const router = useRouter();
  
  const handleDepositClick = () => {
    router.push('/crypto-deposit');
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
      <div className={styles.icon}>⚠️</div>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>Account Activation Required</h3>
          <span className={styles.badge}>Pending Funding</span>
        </div>
        <p className={styles.message}>
          Your <strong>{account.account_type}</strong> account is inactive. 
          Please make a minimum deposit of <strong>{formatCurrency(account.min_deposit)} USD</strong> to activate it.
        </p>
        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Account Type:</span>
            <span className={styles.value}>{account.account_type}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Minimum Deposit:</span>
            <span className={styles.value}>{formatCurrency(account.min_deposit)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Accepted Currency:</span>
            <span className={styles.value}>USD, BTC, USDT, ETH, and more</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Account Number:</span>
            <span className={styles.value}>{account.account_number}</span>
          </div>
        </div>
        <button onClick={handleDepositClick} className={styles.actionButton}>
          Make Deposit Now
        </button>
      </div>
    </div>
  );
}
