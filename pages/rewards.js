
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Rewards() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rewardPoints, setRewardPoints] = useState(2547);
  const [selectedReward, setSelectedReward] = useState(null);

  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  const rewards = [
    { id: 1, name: 'Cash Back', points: 1000, value: '$10', description: 'Redeem points for cash back to your account' },
    { id: 2, name: 'Gift Card - Amazon', points: 2500, value: '$25', description: 'Amazon gift card for online shopping' },
    { id: 3, name: 'Travel Miles', points: 1500, value: '1,500 miles', description: 'Convert points to airline miles' },
    { id: 4, name: 'Dining Credit', points: 2000, value: '$20', description: 'Credit for dining and restaurants' },
    { id: 5, name: 'Gas Station Credit', points: 1800, value: '$18', description: 'Credit for fuel purchases' },
    { id: 6, name: 'Charity Donation', points: 500, value: '$5', description: 'Donate to featured charities' }
  ];

  const handleRedeem = (reward) => {
    if (rewardPoints >= reward.points) {
      setSelectedReward(reward);
      setRewardPoints(prev => prev - reward.points);
      setTimeout(() => {
        setSelectedReward(null);
        alert(`Successfully redeemed ${reward.name}!`);
      }, 2000);
    } else {
      alert('Insufficient points for this reward');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Oakline Rewards Program</h1>
          <p style={styles.subtitle}>Earn points with every transaction and redeem for amazing rewards</p>
        </div>

        {/* Points Balance */}
        <div style={styles.pointsCard}>
          <div style={styles.pointsInfo}>
            <h2 style={styles.pointsLabel}>Available Points</h2>
            <div style={styles.pointsBalance}>{rewardPoints.toLocaleString()}</div>
          </div>
          <div style={styles.pointsIcon}>🏆</div>
        </div>

        {/* How to Earn Points */}
        <div style={styles.earnSection}>
          <h3 style={styles.sectionTitle}>How to Earn Points</h3>
          <div style={styles.earnGrid}>
            <div style={styles.earnCard}>
              <span style={styles.earnIcon}>💳</span>
              <div>
                <h4 style={styles.earnTitle}>Debit Card Purchases</h4>
                <p style={styles.earnDesc}>1 point per $1 spent</p>
              </div>
            </div>
            <div style={styles.earnCard}>
              <span style={styles.earnIcon}>💰</span>
              <div>
                <h4 style={styles.earnTitle}>Account Balance</h4>
                <p style={styles.earnDesc}>10 points per month for $1000+ balance</p>
              </div>
            </div>
            <div style={styles.earnCard}>
              <span style={styles.earnIcon}>📱</span>
              <div>
                <h4 style={styles.earnTitle}>Mobile Banking</h4>
                <p style={styles.earnDesc}>5 points per mobile transaction</p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div style={styles.rewardsSection}>
          <h3 style={styles.sectionTitle}>Redeem Your Points</h3>
          <div style={styles.rewardsGrid}>
            {rewards.map(reward => (
              <div key={reward.id} style={styles.rewardCard}>
                <div style={styles.rewardHeader}>
                  <h4 style={styles.rewardName}>{reward.name}</h4>
                  <div style={styles.rewardValue}>{reward.value}</div>
                </div>
                <p style={styles.rewardDesc}>{reward.description}</p>
                <div style={styles.rewardFooter}>
                  <span style={styles.rewardPoints}>{reward.points.toLocaleString()} points</span>
                  <button
                    style={{
                      ...styles.redeemButton,
                      opacity: rewardPoints >= reward.points ? 1 : 0.5,
                      cursor: rewardPoints >= reward.points ? 'pointer' : 'not-allowed'
                    }}
                    onClick={() => handleRedeem(reward)}
                    disabled={rewardPoints < reward.points}
                  >
                    Redeem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Modal */}
        {selectedReward && (
          <div style={styles.modal}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Redeeming Reward...</h3>
              <p style={styles.modalText}>Processing your {selectedReward.name} redemption</p>
              <div style={styles.spinner}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F5F6F8',
    padding: '2rem 1rem'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    fontSize: '1.2rem',
    color: '#4A4A4A'
  },
  header: {
    textAlign: 'center',
    marginBottom: '3rem'
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '1rem'
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#4A4A4A',
    maxWidth: '600px',
    margin: '0 auto'
  },
  pointsCard: {
    background: 'linear-gradient(135deg, #1A3E6F 0%, #2A5490 100%)',
    color: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '3rem',
    boxShadow: '0 8px 24px rgba(26, 62, 111, 0.3)'
  },
  pointsInfo: {
    flex: 1
  },
  pointsLabel: {
    fontSize: '1.1rem',
    marginBottom: '0.5rem',
    opacity: 0.9
  },
  pointsBalance: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#FFC857'
  },
  pointsIcon: {
    fontSize: '4rem'
  },
  earnSection: {
    marginBottom: '3rem'
  },
  sectionTitle: {
    fontSize: '1.8rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '1.5rem'
  },
  earnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  earnCard: {
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
  },
  earnIcon: {
    fontSize: '2rem'
  },
  earnTitle: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#1E1E1E',
    marginBottom: '0.25rem'
  },
  earnDesc: {
    color: '#4A4A4A',
    fontSize: '0.9rem'
  },
  rewardsSection: {
    marginBottom: '3rem'
  },
  rewardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem'
  },
  rewardCard: {
    backgroundColor: '#FFFFFF',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease'
  },
  rewardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  rewardName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#1E1E1E'
  },
  rewardValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#FFC857',
    background: 'rgba(255, 200, 87, 0.1)',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px'
  },
  rewardDesc: {
    color: '#4A4A4A',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  rewardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  rewardPoints: {
    color: '#7A7A7A',
    fontSize: '0.9rem'
  },
  redeemButton: {
    backgroundColor: '#FFC857',
    color: '#1E1E1E',
    border: 'none',
    padding: '0.5rem 1.5rem',
    borderRadius: '8px',
    fontWeight: '600',
    transition: 'all 0.3s ease'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: '2rem',
    borderRadius: '16px',
    textAlign: 'center',
    maxWidth: '400px',
    width: '90%'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1A3E6F',
    marginBottom: '1rem'
  },
  modalText: {
    color: '#4A4A4A',
    marginBottom: '1.5rem'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #FFC857',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  }
};
