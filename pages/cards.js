
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Cards() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      await fetchUserCards();
    } catch (error) {
      console.error('Auth check error:', error);
      router.push('/login');
    }
  };

  const fetchUserCards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('Fetching cards for user:', session.user.id);

      const response = await fetch('/api/get-user-cards', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      console.log('Cards API response:', data);

      if (data.success) {
        setCards(data.cards || []);
        setApplications(data.applications || []);
        console.log('Cards loaded:', data.cards?.length || 0);
        console.log('Applications loaded:', data.applications?.length || 0);
      } else {
        setError('Failed to fetch cards: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError('Error loading cards: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCardAction = async (cardId, action, additionalData = {}) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/cards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardId,
          action,
          ...additionalData
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUserCards(); // Refresh cards
        setError('');
      } else {
        setError(data.error || 'Failed to update card');
      }
    } catch (error) {
      console.error('Error updating card:', error);
      setError('Error updating card');
    }
  };

  const fetchCardTransactions = async (cardId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/card-transactions?cardId=${cardId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setShowTransactions(true);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Error loading transactions');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading cards...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 My Debit Cards</h1>
        <button 
          onClick={() => router.push('/apply-card')}
          style={{ 
            ...styles.applyButton,
            background: '#1e40af', // stronger color for visibility
            fontWeight: 'bold',
            fontSize: '18px'
          }}
        >
          + Apply for New Card
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Card Applications */}
      {applications.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Card Applications</h2>
          <div style={styles.applicationsGrid}>
            {applications.map((app) => (
              <div key={app.id} style={styles.applicationCard}>
                <div style={styles.applicationHeader}>
                  <h3>Card Application</h3>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: app.status === 'pending' ? '#fbbf24' : 
                                   app.status === 'approved' ? '#10b981' : '#ef4444'
                  }}>
                    {app.status || 'Unknown'}
                  </span>
                </div>
                <div style={styles.applicationDetails}>
                  <p><strong>Type:</strong> {app.card_type || 'N/A'}</p>
                  <p><strong>Applied:</strong> {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Account:</strong> {app.accounts?.account_type || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Cards */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💳 Active Cards</h2>
        {cards.length === 0 ? (
          <div style={styles.noCards}>
            <h3>No cards found</h3>
            <p>Apply for your first debit card to get started.</p>
            <button 
              onClick={() => router.push('/apply-card')}
              style={{ 
                ...styles.primaryButton,
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              Apply for Card
            </button>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {cards.map((card) => (
              <div key={card.id} style={styles.cardItem}>
                <div style={styles.cardVisual}>
                  <div style={styles.cardNumber}>{card.card_number || 'XXXX-XXXX-XXXX-XXXX'}</div>
                  <div style={styles.cardHolder}>{card.cardholder_name || 'Unknown Name'}</div>
                  <div style={styles.cardExpiry}>
                    Expires: {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'MM/YY'}
                  </div>
                  <div style={styles.cardType}>{(card.card_type || 'Debit').toUpperCase()}</div>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailRow}>
                    <span>Status:</span>
                    <span style={{
                      color: card.status === 'active' ? '#10b981' : '#ef4444',
                      fontWeight: 'bold'
                    }}>
                      {card.status || 'Unknown'} {card.is_locked ? '(Locked)' : ''}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Daily Limit:</span>
                    <span>${card.daily_limit ? parseFloat(card.daily_limit).toFixed(2) : '0.00'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Monthly Limit:</span>
                    <span>${card.monthly_limit ? parseFloat(card.monthly_limit).toFixed(2) : '0.00'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Account:</span>
                    <span>{card.accounts?.account_type || 'N/A'}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span>Balance:</span>
                    <span>${card.accounts?.balance ? parseFloat(card.accounts.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                  </div>
                </div>

                <div style={styles.cardActions}>
                  <button
                    onClick={() => fetchCardTransactions(card.id)}
                    style={styles.actionButton}
                  >
                    📋 View Transactions
                  </button>
                  
                  {card.is_locked ? (
                    <button
                      onClick={() => handleCardAction(card.id, 'unlock')}
                      style={styles.unlockButton}
                    >
                      🔓 Unlock Card
                    </button>
                  ) : (
                    <button
                      onClick={() => handleCardAction(card.id, 'lock')}
                      style={styles.lockButton}
                    >
                      🔒 Lock Card
                    </button>
                  )}
                  
                  {card.status === 'active' && (
                    <button
                      onClick={() => handleCardAction(card.id, 'deactivate')}
                      style={styles.deactivateButton}
                    >
                      ❌ Deactivate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTransactions && (
        <div style={styles.modal} onClick={() => setShowTransactions(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Card Transactions</h2>
              <button 
                onClick={() => setShowTransactions(false)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.transactionsList}>
              {transactions.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} style={styles.transactionItem}>
                    <div style={styles.transactionInfo}>
                      <strong>{transaction.merchant || 'N/A'}</strong>
                      <span style={styles.transactionLocation}>{transaction.location || 'N/A'}</span>
                    </div>
                    <div style={styles.transactionAmount}>
                      -${transaction.amount ? parseFloat(transaction.amount).toFixed(2) : '0.00'}
                    </div>
                    <div style={styles.transactionDate}>
                      {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div style={styles.navigation}>
        <button onClick={() => router.push('/dashboard')} style={styles.navButton}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}

// --- Keep your styles object as-is ---
