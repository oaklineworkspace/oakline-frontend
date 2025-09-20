
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Cards() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      await fetchUserCards(session.user.id);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchUserCards = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id,
          card_number,
          card_type,
          cardholder_name,
          expiry_date,
          status,
          is_locked,
          daily_limit,
          monthly_limit,
          account:account_id(account_name, account_type, balance)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      setCards(data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError('Failed to fetch cards.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardAction = async (cardId, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('cards')
        .update(action === 'lock' ? { is_locked: true } : { is_locked: false })
        .eq('id', cardId);

      if (error) throw error;
      await fetchUserCards(session.user.id);
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Failed to update card.');
    }
  };

  if (loading) return <div style={styles.container}><p>Loading cards...</p></div>;

  return (
    <div style={styles.container}>
      <h1>💳 My Cards</h1>

      {error && <div style={styles.error}>{error}</div>}

      {cards.length === 0 ? (
        <p>No cards found.</p>
      ) : (
        <div style={styles.cardsGrid}>
          {cards.map((card) => (
            <div key={card.id} style={styles.cardItem}>
              <div>
                <strong>{card.card_number}</strong> - {card.card_type} <br />
                Holder: {card.cardholder_name} <br />
                Expiry: {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'MM/YY'} <br />
                Status: {card.status} {card.is_locked ? '(Locked)' : ''} <br />
                Daily Limit: ${card.daily_limit} <br />
                Monthly Limit: ${card.monthly_limit} <br />
                Account: {card.account?.account_name} ({card.account?.account_type}) <br />
                Balance: ${card.account?.balance?.toFixed(2)}
              </div>

              <div style={styles.cardActions}>
                {card.is_locked ? (
                  <button onClick={() => handleCardAction(card.id, 'unlock')}>🔓 Unlock</button>
                ) : (
                  <button onClick={() => handleCardAction(card.id, 'lock')}>🔒 Lock</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: '20px', fontFamily: 'sans-serif' },
  error: { color: 'red', marginBottom: '15px' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  cardItem: { background: '#f5f5f5', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  cardActions: { marginTop: '10px', display: 'flex', gap: '10px' }
};
