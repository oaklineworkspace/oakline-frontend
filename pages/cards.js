import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function CardsContent() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [flippedCards, setFlippedCards] = useState({});
  const [showCardDetails, setShowCardDetails] = useState({});
  const [showBalance, setShowBalance] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedCardForPin, setSelectedCardForPin] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [cardTransactions, setCardTransactions] = useState({});
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [selectedCardTransactions, setSelectedCardTransactions] = useState([]);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setAccounts(accountsData || []);

      const { data: cardsData } = await supabase
        .from('cards')
        .select(`
          *,
          accounts:account_id (
            id,
            account_number,
            account_type,
            balance
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setCards(cardsData || []);

      // Fetch card transactions for each card
      if (cardsData && cardsData.length > 0) {
        const transactionsMap = {};
        for (const card of cardsData) {
          const { data: txData } = await supabase
            .from('card_transactions')
            .select('*')
            .eq('card_id', card.id)
            .order('created_at', { ascending: false })
            .limit(10);
          
          transactionsMap[card.id] = txData || [];
        }
        setCardTransactions(transactionsMap);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load card data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardAction = async (cardId, action) => {
    try {
      setError('');
      setSuccess('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to perform this action');
        return;
      }

      const response = await fetch('/api/cards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardId,
          action
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        await loadUserData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update card');
      }
    } catch (err) {
      console.error('Error updating card:', err);
      setError('Failed to update card');
    }
  };

  const handleSetupPin = (cardId) => {
    setSelectedCardForPin(cardId);
    setShowPinModal(true);
    setPinInput('');
    setConfirmPinInput('');
  };

  const handleViewTransactions = (cardId) => {
    const transactions = cardTransactions[cardId] || [];
    setSelectedCardTransactions(transactions);
    setShowTransactionsModal(true);
  };

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pinInput !== confirmPinInput) {
      setError('PINs do not match');
      return;
    }

    try {
      setError('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to set up PIN');
        return;
      }

      const response = await fetch('/api/cards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          cardId: selectedCardForPin,
          action: 'set_pin',
          pin: pinInput
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('PIN set successfully');
        setShowPinModal(false);
        setPinInput('');
        setConfirmPinInput('');
        setSelectedCardForPin(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to set PIN');
      }
    } catch (err) {
      console.error('Error setting PIN:', err);
      setError('Failed to set PIN');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount || 0));
  };

  const getCardholderName = () => {
    if (userProfile) {
      return `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim().toUpperCase();
    }
    return user?.email?.split('@')[0]?.toUpperCase() || 'CARDHOLDER';
  };

  const getStatusColor = (status, isLocked) => {
    if (isLocked) return '#ef4444';
    switch (status?.toLowerCase()) {
      case 'active':
        return '#10b981';
      case 'inactive':
      case 'deactivated':
        return '#6b7280';
      case 'blocked':
      case 'suspended':
        return '#ef4444';
      case 'expired':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (card) => {
    if (card.is_locked) return '🔒 Locked';
    switch (card.status?.toLowerCase()) {
      case 'active':
        return '✓ Active';
      case 'inactive':
        return 'Inactive';
      case 'deactivated':
        return 'Deactivated';
      case 'blocked':
        return '⚠️ Blocked';
      case 'suspended':
        return 'Suspended';
      case 'expired':
        return 'Expired';
      case 'replaced':
        return 'Replaced';
      default:
        return card.status || 'Unknown';
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your cards...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <Link href="/" style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <span style={styles.brandTagline}>Card Management</span>
              </div>
            </Link>
          </div>
          <div style={styles.headerRight}>
            <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.pageHeader}>
          <div>
            <h1 style={styles.pageTitle}>💳 My Cards</h1>
            <p style={styles.pageSubtitle}>Manage your debit and credit cards</p>
          </div>
          <button 
            onClick={() => router.push('/apply-card')} 
            style={styles.applyButton}
          >
            <span style={styles.buttonIcon}>+</span>
            Apply for New Card
          </button>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            <span style={styles.messageIcon}>⚠️</span>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.successMessage}>
            <span style={styles.messageIcon}>✓</span>
            {success}
          </div>
        )}

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>💳 Active Cards</h2>
            <span style={styles.cardCount}>{cards.length} Card{cards.length !== 1 ? 's' : ''}</span>
          </div>

          {cards.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>💳</span>
              <h3 style={styles.emptyTitle}>No Cards Yet</h3>
              <p style={styles.emptyDesc}>
                You don't have any cards yet. Apply for your first card to get started.
              </p>
              <button 
                onClick={() => router.push('/apply-card')} 
                style={styles.emptyActionButton}
              >
                Apply for Card
              </button>
            </div>
          ) : (
            <div style={styles.cardsGrid}>
              {cards.map((card) => (
                <div key={card.id} style={styles.cardContainer}>
                  <div 
                    style={{
                      ...styles.cardFlipWrapper,
                      transform: flippedCards[card.id] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                    onClick={() => setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                  >
                    <div style={{
                      ...styles.cardFace,
                      ...styles.cardFront,
                      opacity: flippedCards[card.id] ? 0 : 1
                    }}>
                      <div style={styles.cardHeader}>
                        <span style={styles.bankNameCard}>OAKLINE BANK</span>
                        <span style={styles.cardTypeLabel}>
                          {card.card_brand?.toUpperCase() || 'DEBIT'}
                        </span>
                      </div>

                      <div style={styles.chipSection}>
                        <div style={styles.chip}></div>
                        <div style={styles.contactless}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6" stroke="white" strokeWidth="2"/>
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2" stroke="white" strokeWidth="2"/>
                            <path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10" stroke="white" strokeWidth="2"/>
                          </svg>
                        </div>
                      </div>

                      <div style={styles.cardNumberDisplay}>
                        {showCardDetails[card.id] 
                          ? (card.card_number ? card.card_number.replace(/(\d{4})(?=\d)/g, '$1 ') : '**** **** **** ****')
                          : '**** **** **** ' + (card.card_number?.slice(-4) || '****')
                        }
                      </div>

                      <div style={styles.cardFooterDetails}>
                        <div style={{ flex: 1 }}>
                          <div style={styles.cardLabelSmall}>CARDHOLDER</div>
                          <div style={styles.cardValueSmall}>{getCardholderName()}</div>
                        </div>
                        <div style={{ marginRight: '1.5rem' }}>
                          <div style={styles.cardLabelSmall}>EXPIRES</div>
                          <div style={styles.cardValueSmall}>
                            {card.expiry_date ? new Date(card.expiry_date).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' }) : 'MM/YY'}
                          </div>
                        </div>
                        <div>
                          <div style={styles.cardLabelSmall}>CVV</div>
                          <div style={styles.cardValueSmall}>
                            {showCardDetails[card.id] ? (card.cvc || '***') : '***'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      ...styles.cardFace,
                      ...styles.cardBack,
                      opacity: flippedCards[card.id] ? 1 : 0,
                      transform: 'rotateY(180deg)'
                    }}>
                      <div style={styles.magneticStripe}></div>
                      <div style={styles.cvvSection}>
                        <div style={styles.cvvLabel}>CVV</div>
                        <div style={styles.cvvBox}>
                          {showCardDetails[card.id] ? (card.cvc || '***') : '***'}
                        </div>
                      </div>
                      <div style={styles.cardBackInfo}>
                        <p style={styles.cardBackText}>For customer service call 1-800-OAKLINE</p>
                        <p style={styles.cardBackText}>This card is property of Oakline Bank</p>
                      </div>
                    </div>
                  </div>

                  <div style={styles.cardInfo}>
                    <div style={styles.cardStatusRow}>
                      <span style={styles.statusLabel}>Status:</span>
                      <span style={{
                        ...styles.statusValue,
                        color: getStatusColor(card.status, card.is_locked)
                      }}>
                        {getStatusText(card)}
                      </span>
                    </div>

                    <div style={styles.cardDetailsGrid}>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Account Type</span>
                        <span style={styles.infoValue}>
                          {card.accounts?.account_type?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Account Balance</span>
                        <span style={styles.infoValue}>
                          {formatCurrency(card.accounts?.balance || 0)}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Daily Limit</span>
                        <span style={styles.infoValue}>
                          {formatCurrency(card.daily_limit || 5000)}
                        </span>
                      </div>
                      <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Monthly Limit</span>
                        <span style={styles.infoValue}>
                          {formatCurrency(card.monthly_limit || 20000)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCardDetails(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                      }}
                      style={styles.toggleDetailsButton}
                    >
                      {showCardDetails[card.id] ? '👁️ Hide Details' : '👁️ Show Details'}
                    </button>
                  </div>

                  <div style={styles.cardActions}>
                    <div style={styles.actionGroup}>
                      <h4 style={styles.actionGroupTitle}>Security Controls</h4>
                      <div style={styles.actionButtons}>
                        {card.is_locked ? (
                          <button
                            onClick={() => handleCardAction(card.id, 'unlock')}
                            style={{ ...styles.actionButton, ...styles.unlockButton }}
                          >
                            🔓 Unlock Card
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCardAction(card.id, 'lock')}
                            style={{ ...styles.actionButton, ...styles.lockButton }}
                          >
                            🔒 Lock Card
                          </button>
                        )}
                        <button
                          onClick={() => handleSetupPin(card.id)}
                          style={{ ...styles.actionButton, ...styles.pinButton }}
                        >
                          🔑 Set PIN
                        </button>
                      </div>
                    </div>

                    <div style={styles.actionGroup}>
                      <h4 style={styles.actionGroupTitle}>Status Management</h4>
                      <div style={styles.actionButtons}>
                        {card.status === 'active' && !card.is_locked && (
                          <button
                            onClick={() => handleCardAction(card.id, 'deactivate')}
                            style={{ ...styles.actionButton, ...styles.deactivateButton }}
                          >
                            ⏸️ Deactivate
                          </button>
                        )}

                        {(card.status === 'inactive' || card.status === 'deactivated') && (
                          <button
                            onClick={() => handleCardAction(card.id, 'activate')}
                            style={{ ...styles.actionButton, ...styles.activateButton }}
                          >
                            ✓ Activate
                          </button>
                        )}

                        {card.status === 'active' && (
                          <button
                            onClick={() => handleCardAction(card.id, 'block')}
                            style={{ ...styles.actionButton, ...styles.blockButton }}
                          >
                            ⛔ Block Card
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={styles.actionGroup}>
                      <h4 style={styles.actionGroupTitle}>Card Services</h4>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleCardAction(card.id, 'replace')}
                          style={{ ...styles.actionButton, ...styles.replaceButton }}
                        >
                          🔄 Request Replacement
                        </button>
                        <button
                          onClick={() => handleViewTransactions(card.id)}
                          style={{ ...styles.actionButton, ...styles.transactionsButton }}
                        >
                          📊 View Transactions ({cardTransactions[card.id]?.length || 0})
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showTransactionsModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTransactionsModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>💳 Card Transactions</h2>
              <button
                onClick={() => setShowTransactionsModal(false)}
                style={styles.modalCloseButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {selectedCardTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>📝</p>
                  <p>No transactions found for this card</p>
                </div>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedCardTransactions.map((tx) => (
                    <div key={tx.id} style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' }}>
                          {tx.merchant || 'Unknown Merchant'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {tx.transaction_type?.toUpperCase() || 'PURCHASE'}
                        </div>
                        {tx.location && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            📍 {tx.location}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: '700', color: '#dc2626' }}>
                        -{formatCurrency(tx.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div style={styles.modalOverlay} onClick={() => setShowPinModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>🔑 Set Card PIN</h2>
              <button
                onClick={() => setShowPinModal(false)}
                style={styles.modalCloseButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.modalDescription}>
                Create a secure 4-digit PIN for ATM and point-of-sale transactions.
              </p>
              
              <div style={styles.pinInputGroup}>
                <label style={styles.pinLabel}>Enter PIN (4 digits)</label>
                <input
                  type="password"
                  maxLength="4"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  style={styles.pinInputField}
                  placeholder="••••"
                />
              </div>

              <div style={styles.pinInputGroup}>
                <label style={styles.pinLabel}>Confirm PIN</label>
                <input
                  type="password"
                  maxLength="4"
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  style={styles.pinInputField}
                  placeholder="••••"
                />
              </div>

              <div style={styles.pinRequirements}>
                <p style={styles.requirementsTitle}>PIN Requirements:</p>
                <ul style={styles.requirementsList}>
                  <li style={pinInput.length === 4 ? styles.requirementMet : styles.requirementNotMet}>
                    {pinInput.length === 4 ? '✓' : '○'} Must be exactly 4 digits
                  </li>
                  <li style={pinInput === confirmPinInput && pinInput.length === 4 ? styles.requirementMet : styles.requirementNotMet}>
                    {pinInput === confirmPinInput && pinInput.length === 4 ? '✓' : '○'} PINs must match
                  </li>
                </ul>
              </div>

              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowPinModal(false)}
                  style={{ ...styles.modalButton, ...styles.cancelButton }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePinSubmit}
                  style={{ ...styles.modalButton, ...styles.submitButton }}
                  disabled={pinInput.length !== 4 || pinInput !== confirmPinInput}
                >
                  Set PIN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Cards() {
  return (
    <ProtectedRoute>
      <CardsContent />
    </ProtectedRoute>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f7f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #2d5a87 50%, #059669 100%)',
    color: 'white'
  },
  loadingSpinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid #059669',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  loadingText: {
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  header: {
    background: '#1a365d',
    borderBottom: '3px solid #059669',
    boxShadow: '0 4px 12px rgba(26, 54, 93, 0.2)'
  },
  headerContainer: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    textDecoration: 'none',
    color: 'white'
  },
  logo: {
    height: '50px',
    width: 'auto'
  },
  brandInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  brandName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0,
    color: 'white'
  },
  brandTagline: {
    fontSize: '0.8rem',
    color: '#bfdbfe',
    fontWeight: '500'
  },
  headerRight: {
    display: 'flex',
    gap: '1rem'
  },
  backButton: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  main: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: '2rem'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a365d',
    margin: '0 0 0.5rem 0'
  },
  pageSubtitle: {
    fontSize: '1rem',
    color: '#64748b',
    margin: 0
  },
  applyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 2rem',
    background: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s',
    boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
  },
  buttonIcon: {
    fontSize: '1.2rem'
  },
  errorMessage: {
    padding: '1rem 1.5rem',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  successMessage: {
    padding: '1rem 1.5rem',
    background: '#d1fae5',
    color: '#059669',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  messageIcon: {
    fontSize: '1.2rem'
  },
  section: {
    marginBottom: '3rem'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1a365d',
    margin: 0
  },
  cardCount: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: '600'
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    padding: '4rem 2rem',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
    display: 'block'
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  emptyDesc: {
    fontSize: '1rem',
    color: '#64748b',
    margin: '0 0 2rem 0'
  },
  emptyActionButton: {
    padding: '1rem 2rem',
    background: '#1e40af',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '2rem'
  },
  cardContainer: {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  cardFlipWrapper: {
    perspective: '1000px',
    width: '100%',
    maxWidth: '380px',
    height: '240px',
    position: 'relative',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.6s',
    cursor: 'pointer',
    margin: '0 auto 1.5rem'
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    borderRadius: '16px',
    padding: '1.5rem',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    boxShadow: '0 8px 32px rgba(30, 64, 175, 0.3)',
    transition: 'opacity 0.3s'
  },
  cardFront: {
    zIndex: 2,
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #1e3a8a 100%)'
  },
  cardBack: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  bankNameCard: {
    fontSize: '1rem',
    fontWeight: 'bold',
    letterSpacing: '1px'
  },
  cardTypeLabel: {
    fontSize: '0.875rem',
    fontWeight: 'bold',
    opacity: 0.9
  },
  chipSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    margin: '0.5rem 0'
  },
  chip: {
    width: '50px',
    height: '40px',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    borderRadius: '8px'
  },
  contactless: {
    opacity: 0.8
  },
  cardNumberDisplay: {
    fontSize: '1.4rem',
    fontWeight: '600',
    letterSpacing: '3px',
    fontFamily: '"Courier New", Courier, monospace',
    textAlign: 'center',
    margin: '1rem 0',
    whiteSpace: 'nowrap',
    color: 'white'
  },
  cardFooterDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '0.5rem'
  },
  cardLabelSmall: {
    fontSize: '0.65rem',
    opacity: 0.85,
    marginBottom: '4px',
    letterSpacing: '0.5px',
    fontWeight: '500'
  },
  cardValueSmall: {
    fontSize: '0.95rem',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  magneticStripe: {
    width: '100%',
    height: '45px',
    backgroundColor: '#000',
    marginTop: '20px'
  },
  cvvSection: {
    backgroundColor: 'white',
    color: 'black',
    padding: '1rem',
    margin: '20px 0',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  cvvLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  cvvBox: {
    backgroundColor: '#f3f4f6',
    padding: '6px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  cardBackInfo: {
    fontSize: '0.7rem',
    opacity: 0.8
  },
  cardBackText: {
    margin: '4px 0'
  },
  cardInfo: {
    marginBottom: '1.5rem'
  },
  cardStatusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    marginBottom: '1rem'
  },
  statusLabel: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#64748b'
  },
  statusValue: {
    fontSize: '0.95rem',
    fontWeight: 'bold'
  },
  cardDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem'
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.75rem',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  infoLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  infoValue: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  toggleDetailsButton: {
    width: '100%',
    padding: '0.75rem',
    background: '#e0e7ff',
    color: '#1e40af',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '1rem'
  },
  actionGroup: {
    background: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  actionGroupTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.75rem 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  actionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  actionButton: {
    padding: '0.75rem 1rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem'
  },
  lockButton: {
    background: '#fef3c7',
    color: '#f59e0b',
    border: '2px solid #fbbf24'
  },
  unlockButton: {
    background: '#d1fae5',
    color: '#059669',
    border: '2px solid #10b981'
  },
  activateButton: {
    background: '#d1fae5',
    color: '#059669',
    border: '2px solid #10b981'
  },
  deactivateButton: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '2px solid #ef4444'
  },
  blockButton: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '2px solid #ef4444'
  },
  replaceButton: {
    background: '#e0e7ff',
    color: '#1e40af',
    border: '2px solid #3b82f6'
  },
  pinButton: {
    background: '#ddd6fe',
    color: '#7c3aed',
    border: '2px solid #8b5cf6'
  },
  transactionsButton: {
    background: '#e0f2fe',
    color: '#0284c7',
    border: '2px solid #0ea5e9'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden'
  },
  modalHeader: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    color: 'white',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0
  },
  modalCloseButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    fontSize: '1.5rem',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s'
  },
  modalBody: {
    padding: '2rem'
  },
  modalDescription: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '1.5rem',
    lineHeight: '1.5'
  },
  pinInputGroup: {
    marginBottom: '1.5rem'
  },
  pinLabel: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  pinInputField: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.5rem',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    textAlign: 'center',
    letterSpacing: '1rem',
    fontFamily: 'monospace',
    transition: 'border-color 0.2s'
  },
  pinRequirements: {
    background: '#f8fafc',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem'
  },
  requirementsTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.5rem'
  },
  requirementsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  requirementMet: {
    fontSize: '0.85rem',
    color: '#059669',
    padding: '0.25rem 0',
    fontWeight: '500'
  },
  requirementNotMet: {
    fontSize: '0.85rem',
    color: '#64748b',
    padding: '0.25rem 0'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem'
  },
  modalButton: {
    flex: 1,
    padding: '0.875rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  cancelButton: {
    background: '#e2e8f0',
    color: '#475569'
  },
  submitButton: {
    background: '#1e40af',
    color: 'white'
  }
};