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
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchUserCards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch cards with account info
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`*, accounts:account_id(id, account_number, account_type, balance)`)
        .eq('user_id', session.user.id);

      if (cardsError) throw cardsError;
      setCards(cardsData || []);

      // Fetch card applications with account info
      const { data: appsData, error: appsError } = await supabase
        .from('card_applications')
        .select(`*, accounts:account_id(id, account_number, account_type)`)
        .eq('user_id', session.user.id);

      if (appsError) throw appsError;
      setApplications(appsData || []);
    } catch (err) {
      console.error(err);
      setError('Error loading cards/applications: ' + err.message);
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
        body: JSON.stringify({ cardId, action, ...additionalData })
      });

      const data = await response.json();
      if (data.success) {
        await fetchUserCards();
        setError('');
      } else {
        setError(data.error || 'Failed to update card');
      }
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Error updating card');
    }
  };

  const fetchCardTransactions = async (cardId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/card-transactions?cardId=${cardId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        setShowTransactions(true);
      } else {
        setError('Failed to fetch transactions');
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Error loading transactions');
    }
  };

  if (loading) return <div style={styles.container}><div style={styles.loading}>Loading cards...</div></div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>💳 My Debit Cards</h1>
        <button onClick={() => router.push('/apply-card')} style={{ ...styles.applyButton, background: '#1e40af', fontWeight: 'bold', fontSize: '18px' }}>
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
                    backgroundColor: app.application_status === 'pending' ? '#fbbf24' : app.application_status === 'approved' ? '#10b981' : '#ef4444'
                  }}>
                    {app.application_status || 'Unknown'}
                  </span>
                </div>
                <div style={styles.applicationDetails}>
                  <p><strong>Type:</strong> {app.card_type || 'N/A'}</p>
                  <p><strong>Applied:</strong> {app.requested_at ? new Date(app.requested_at).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Account:</strong> {app.accounts?.account_number || 'N/A'} ({app.accounts?.account_type || 'N/A'})</p>
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
                  <div style={styles.cardHolder}>{user?.email || 'Unknown Name'}</div>
                  <div style={styles.cardExpiry}>Expires: {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString() : 'MM/YY'}</div>
                  <div style={styles.cardType}>{(card.card_type || 'Debit').toUpperCase()}</div>
                </div>

                <div style={styles.cardDetails}>
                  <div style={styles.detailRow}>
                    <span>Status:</span>
                    <span style={{ color: card.status === 'active' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                      {card.status || 'Unknown'} {card.is_locked ? '(Locked)' : ''}
                    </span>
                  </div>
                  <div style={styles.detailRow}><span>Daily Limit:</span><span>${card.daily_limit?.toFixed(2) || '0.00'}</span></div>
                  <div style={styles.detailRow}><span>Monthly Limit:</span><span>${card.monthly_limit?.toFixed(2) || '0.00'}</span></div>
                  <div style={styles.detailRow}><span>Account:</span><span>{card.accounts?.account_number || 'N/A'} ({card.accounts?.account_type || 'N/A'})</span></div>
                  <div style={styles.detailRow}><span>Balance:</span><span>${card.accounts?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</span></div>
                </div>

                <div style={styles.cardActions}>
                  <button onClick={() => fetchCardTransactions(card.id)} style={styles.actionButton}>📋 View Transactions</button>
                  {card.is_locked ? (
                    <button onClick={() => handleCardAction(card.id, 'unlock')} style={styles.unlockButton}>🔓 Unlock Card</button>
                  ) : (
                    <button onClick={() => handleCardAction(card.id, 'lock')} style={styles.lockButton}>🔒 Lock Card</button>
                  )}
                  {card.status === 'active' && <button onClick={() => handleCardAction(card.id, 'deactivate')} style={styles.deactivateButton}>❌ Deactivate</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions Modal */}
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
                    <div style={styles.transactionAmount}>-${t.amount?.toFixed(2) || '0.00'}</div>
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
const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#1e3c72', margin: 0 },
  applyButton: { background: '#28a745', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' },
  error: { color: '#dc3545', background: '#f8d7da', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
  section: { marginBottom: '30px' },
  sectionTitle: { fontSize: '20px', fontWeight: 'bold', color: '#1e3c72', marginBottom: '15px' },
  applicationsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px', marginBottom: '30px' },
  applicationCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  applicationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  statusBadge: { padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', color: 'white' },
  applicationDetails: { fontSize: '14px', color: '#666' },
  noCards: { background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  primaryButton: { background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', marginTop: '15px' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
  cardItem: { background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  cardVisual: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', position: 'relative', minHeight: '120px' },
  cardNumber: { fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px' },
  cardHolder: { fontSize: '14px', opacity: 0.9 },
  cardExpiry: { fontSize: '12px', position: 'absolute', bottom: '20px', left: '20px', opacity: 0.8 },
  cardType: { fontSize: '12px', position: 'absolute', bottom: '20px', right: '20px', fontWeight: 'bold' },
  cardDetails: { marginBottom: '20px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: '14px' },
  cardActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  actionButton: { background: '#007bff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: '1', minWidth: '120px' },
  lockButton: { background: '#ffc107', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: '1', minWidth: '120px' },
  unlockButton: { background: '#28a745', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: '1', minWidth: '120px' },
  deactivateButton: { background: '#dc3545', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', flex: '1', minWidth: '120px' },
  modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeButton: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  transactionsList: { maxHeight: '400px', overflowY: 'auto' },
  transactionItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #eee' },
  transactionInfo: { display: 'flex', flexDirection: 'column', flex: 1 },
  transactionLocation: { fontSize: '12px', color: '#666', marginTop: '4px' },
  transactionAmount: { fontWeight: 'bold', color: '#dc3545', fontSize: '16px' },
  transactionDate: { fontSize: '12px', color: '#666', marginLeft: '15px' },
  navigation: { marginTop: '30px', textAlign: 'center' },
  navButton: { background: '#6c757d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }
};
