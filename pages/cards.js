
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

function CardsContent() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [flippedCards, setFlippedCards] = useState({});
  const [showCardDetails, setShowCardDetails] = useState({});
  const router = useRouter();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setUserProfile(profileData);
      }

      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      setAccounts(accountsData || []);

      // Fetch cards with account info
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

      // Fetch card applications
      const { data: appsData } = await supabase
        .from('card_applications')
        .select(`
          *,
          accounts:account_id (
            id,
            account_number,
            account_type
          )
        `)
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      setApplications(appsData || []);
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

      let updateData = {};
      let successMessage = '';

      switch (action) {
        case 'lock':
          updateData = { is_locked: true };
          successMessage = 'Card locked successfully';
          break;
        case 'unlock':
          updateData = { is_locked: false };
          successMessage = 'Card unlocked successfully';
          break;
        case 'activate':
          updateData = { status: 'active', activated_at: new Date().toISOString() };
          successMessage = 'Card activated successfully';
          break;
        case 'deactivate':
          updateData = { status: 'deactivated' };
          successMessage = 'Card deactivated successfully';
          break;
        case 'block':
          updateData = { status: 'blocked', is_locked: true };
          successMessage = 'Card blocked successfully';
          break;
        case 'replace':
          updateData = { status: 'replaced' };
          successMessage = 'Card marked for replacement';
          break;
        default:
          setError('Invalid action');
          return;
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setSuccess(successMessage);
      await loadUserData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating card:', err);
      setError(err.message || 'Failed to update card');
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

  const getCardholderName = (card) => {
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
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <div style={styles.headerLeft}>
            <div style={styles.logoContainer}>
              <img src="/images/Oakline_Bank_logo_design_c1b04ae0.png" alt="Oakline Bank" style={styles.logo} />
              <div style={styles.brandInfo}>
                <h1 style={styles.brandName}>Oakline Bank</h1>
                <span style={styles.brandTagline}>Card Management</span>
              </div>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button onClick={() => router.push('/dashboard')} style={styles.backButton}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Page Title & Actions */}
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

        {/* Messages */}
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

        {/* Card Applications Section */}
        {applications.length > 0 && (
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>📋 Pending Applications</h2>
            <div style={styles.applicationsGrid}>
              {applications.map((app) => (
                <div key={app.id} style={styles.applicationCard}>
                  <div style={styles.applicationHeader}>
                    <div>
                      <h3 style={styles.applicationTitle}>Card Application</h3>
                      <p style={styles.applicationDate}>
                        Applied: {new Date(app.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: 
                        app.application_status === 'approved' ? '#d1fae5' :
                        app.application_status === 'pending' ? '#fef3c7' : '#fee2e2',
                      color:
                        app.application_status === 'approved' ? '#059669' :
                        app.application_status === 'pending' ? '#f59e0b' : '#dc2626'
                    }}>
                      {app.application_status}
                    </span>
                  </div>
                  <div style={styles.applicationDetails}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Card Type:</span>
                      <span style={styles.detailValue}>{app.card_type?.toUpperCase() || 'Debit'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Account:</span>
                      <span style={styles.detailValue}>
                        ****{app.accounts?.account_number?.slice(-4)} ({app.accounts?.account_type})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active Cards Section */}
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>💳 My Cards</h2>
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
                  {/* Card Visual */}
                  <div 
                    style={{
                      ...styles.cardFlipWrapper,
                      transform: flippedCards[card.id] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                    }}
                    onClick={() => setFlippedCards(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                  >
                    {/* Front of card */}
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
                          <div style={styles.cardValueSmall}>{getCardholderName(card)}</div>
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

                    {/* Back of card */}
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

                  {/* Card Information */}
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

                  {/* Action Buttons */}
                  <div style={styles.cardActions}>
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

                    <button
                      onClick={() => handleCardAction(card.id, 'replace')}
                      style={{ ...styles.actionButton, ...styles.replaceButton }}
                    >
                      🔄 Request Replacement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
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
    maxWidth: '1400px',
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
    gap: '1rem'
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
    maxWidth: '1400px',
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
  applicationsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  applicationCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0'
  },
  applicationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  applicationTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  applicationDate: {
    fontSize: '0.85rem',
    color: '#64748b',
    margin: 0
  },
  statusBadge: {
    padding: '0.4rem 0.8rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  applicationDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  detailLabel: {
    fontSize: '0.9rem',
    color: '#64748b'
  },
  detailValue: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b'
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
    color: '#f59e0b'
  },
  unlockButton: {
    background: '#d1fae5',
    color: '#059669'
  },
  activateButton: {
    background: '#d1fae5',
    color: '#059669'
  },
  deactivateButton: {
    background: '#fee2e2',
    color: '#dc2626'
  },
  blockButton: {
    background: '#fee2e2',
    color: '#dc2626'
  },
  replaceButton: {
    background: '#e0e7ff',
    color: '#1e40af'
  }
};
