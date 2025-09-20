
'use client'; // Important: client-side only

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function Cards() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return router.push('/login');
        setUser(session.user);

        // Fetch cards
        const { data: userCards, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('user_id', session.user.id);

        if (cardsError) throw cardsError;
        setCards(userCards || []);

        // Fetch card applications (optional table)
        const { data: userApps, error: appsError } = await supabase
          .from('card_applications')
          .select('*')
          .eq('user_id', session.user.id);

        if (!appsError) setApplications(userApps || []);
      } catch (err) {
        console.error(err);
        setError('Error loading cards or applications');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchCardTransactions = async (cardId) => {
    try {
      const { data: transactionsData, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(transactionsData || []);
      setShowTransactions(true);
    } catch (err) {
      console.error(err);
      setError('Error fetching transactions');
    }
  };

  if (loading) return <div style={styles.container}><div style={styles.loading}>Loading cards...</div></div>;
  if (error) return <div style={styles.container}><div style={styles.error}>{error}</div></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 My Debit Cards</h1>
        <button onClick={() => router.push('/apply-card')} style={{ ...styles.applyButton, background: '#1e40af', fontWeight: 'bold', fontSize: '18px' }}>
          + Apply for New Card
        </button>
      </div>

      {applications.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>📋 Card Applications</h2>
          <div style={styles.applicationsGrid}>
            {applications.map((app) => (
              <div key={app.id} style={styles.applicationCard}>
                <div style={styles.applicationHeader}>
                  <h3>Card Application</h3>
                  <span style={{ ...styles.statusBadge, backgroundColor: app.status === 'pending' ? '#fbbf24' : app.status === 'approved' ? '#10b981' : '#ef4444' }}>
                    {app.status || 'Unknown'}
                  </span>
                </div>
                <div style={styles.applicationDetails}>
                  <p><strong>Type:</strong> {app.card_type || 'N/A'}</p>
                  <p><strong>Applied:</strong> {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>💳 Active Cards</h2>
        {cards.length === 0 ? (
          <div style={styles.noCards}>
            <h3>No cards found</h3>
            <p>Apply for your first debit card to get started.</p>
            <button onClick={() => router.push('/apply-card')} style={{ ...styles.primaryButton, fontWeight: 'bold', fontSize: '16px' }}>
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
                  <div style={styles.cardExpiry}>Expires: {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'MM/YY'}</div>
                  <div style={styles.cardType}>{(card.card_type || 'Debit').toUpperCase()}</div>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailRow}><span>Status:</span><span>{card.status || 'Unknown'}</span></div>
                  <div style={styles.detailRow}><span>Balance:</span><span>${card.balance ? parseFloat(card.balance).toFixed(2) : '0.00'}</span></div>
                </div>

                <div style={styles.cardActions}>
                  <button onClick={() => fetchCardTransactions(card.id)} style={styles.actionButton}>📋 View Transactions</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showTransactions && (
        <div style={styles.modal} onClick={() => setShowTransactions(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2>Card Transactions</h2>
              <button onClick={() => setShowTransactions(false)} style={styles.closeButton}>✕</button>
            </div>
            <div style={styles.transactionsList}>
              {transactions.length === 0 ? <p>No transactions found.</p> :
                transactions.map((t) => (
                  <div key={t.id} style={styles.transactionItem}>
                    <div style={styles.transactionInfo}><strong>{t.merchant || 'N/A'}</strong><span style={styles.transactionLocation}>{t.location || 'N/A'}</span></div>
                    <div style={styles.transactionAmount}>-${t.amount ? parseFloat(t.amount).toFixed(2) : '0.00'}</div>
                    <div style={styles.transactionDate}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      <div style={styles.navigation}>
        <button onClick={() => router.push('/dashboard')} style={styles.navButton}>← Back to Dashboard</button>
      </div>
    </div>
  );
}

const styles = { /* your previous styles object here */ };
