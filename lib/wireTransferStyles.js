// Wire Transfer Styles - Extracted for performance
export const getWireTransferStyles = (isMobile) => {
  const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
    paddingTop: isMobile ? '1rem' : '2rem',
    paddingBottom: '4rem'
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: isMobile ? '1rem' : '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  logo: {
    fontSize: isMobile ? '1.25rem' : '1.5rem',
    fontWeight: 'bold',
    color: 'white',
    textDecoration: 'none'
  },
  backButton: {
    padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.2rem',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: isMobile ? '0.85rem' : '0.95rem',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'all 0.3s ease',
    cursor: 'pointer'
  },
  main: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: isMobile ? '1rem 0.75rem' : '2rem'
  },
  pageTitle: {
    fontSize: isMobile ? '1.75rem' : '2.25rem',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '1rem',
    textAlign: 'center',
    letterSpacing: '-0.02em'
  },
  pageSubtitle: {
    fontSize: isMobile ? '0.9375rem' : '1.0625rem',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    marginBottom: '2rem',
    maxWidth: '800px',
    margin: '0 auto 2rem auto',
    lineHeight: '1.6',
    fontWeight: '400'
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: isMobile ? '1.5rem' : '2rem',
    marginBottom: '2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  infoTitle: {
    fontSize: isMobile ? '1.125rem' : '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    letterSpacing: '-0.01em'
  },
  infoText: {
    fontSize: '0.9375rem',
    color: '#4b5563',
    lineHeight: '1.7',
    marginBottom: '0.875rem',
    fontWeight: '400'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
    gap: '1rem',
    marginTop: '1rem'
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    padding: '1.125rem',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  },
  infoBoxTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#059669',
    marginBottom: '0.625rem',
    letterSpacing: '-0.01em'
  },
  infoBoxText: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: '1.8',
    fontWeight: '400'
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: '16px',
    padding: isMobile ? '1.5rem' : '2rem',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    border: '1px solid #059669'
  },
  cardTitle: {
    fontSize: isMobile ? '1.1rem' : '1.25rem',
    fontWeight: '700',
    color: '#1a365d',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #059669'
  },
  button: {
    flex: 1,
    padding: '1rem',
    border: 'none',
    borderRadius: '12px',
    fontSize: isMobile ? '0.875rem' : '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  receiptModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 31, 68, 0.95)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '1rem',
    backdropFilter: 'blur(8px)'
  },
  receipt: {
    backgroundColor: 'white',
    borderRadius: '20px',
    padding: '2.5rem',
    maxWidth: '550px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    border: '2px solid #059669'
  },
  receiptHeader: {
    textAlign: 'center',
    borderBottom: '3px solid #059669',
    paddingBottom: '1.5rem',
    marginBottom: '2rem',
    background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)',
    margin: '-2.5rem -2.5rem 2rem -2.5rem',
    padding: '2rem 2.5rem',
    borderRadius: '18px 18px 0 0',
    color: 'white'
  },
  receiptTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '0.5rem'
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.75rem 0',
    borderBottom: '1px solid #e2e8f0'
  },
  receiptLabel: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500'
  },
  receiptValue: {
    fontSize: '0.875rem',
    color: '#1e293b',
    fontWeight: '600',
    textAlign: 'right'
  },
  receiptButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem'
  },
  receiptButton: {
    flex: 1,
    padding: '1rem',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #1e40af',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#64748b'
  },
  transfersList: {
    maxHeight: '600px',
    overflowY: 'auto'
  },
  transferItem: {
    backgroundColor: '#f8fafc',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease'
  },
  transferItemHover: {
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
  },
  transferHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    marginBottom: '0.5rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  transferRecipient: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  transferAmount: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#059669'
  },
  transferDetails: {
    fontSize: '0.8rem',
    color: '#64748b',
    marginTop: '0.5rem'
  },
  transferStatus: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginTop: '0.5rem',
    color: 'white'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1.25rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.5rem',
    letterSpacing: '-0.01em'
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    fontWeight: '500',
    color: '#1e293b'
  },
  select: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '2px solid transparent',
    borderRadius: '12px',
    fontSize: '0.9375rem',
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%) border-box',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    fontWeight: '500',
    color: '#1e293b',
    cursor: 'pointer'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.25rem'
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1.5rem'
  },
  infoBoxTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  infoBoxText: {
    fontSize: '0.875rem',
    color: '#1e40af',
    lineHeight: '1.6'
  },
  sectionHeader: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#1e293b',
    marginTop: '2rem',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #e2e8f0'
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '10px',
    padding: '0.875rem',
    marginBottom: '1.25rem'
  },
  successBoxTitle: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#059669',
    marginBottom: '0.375rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  successBoxValue: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#047857',
    letterSpacing: '-0.01em'
  },
  successBoxNote: {
    fontSize: '0.75rem',
    color: '#059669',
    marginTop: '0.375rem'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.8rem',
    marginTop: '0.375rem',
    fontWeight: '500'
  },
  stepIndicator: {
    display: isMobile ? 'flex' : 'grid',
    gridTemplateColumns: isMobile ? 'unset' : 'repeat(5, 1fr)',
    gap: isMobile ? '0.5rem' : '0.75rem',
    marginBottom: '2.5rem',
    padding: isMobile ? '1rem' : '1.5rem',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    alignItems: isMobile ? 'center' : 'flex-start',
    justifyContent: isMobile ? 'center' : 'space-between',
    flexWrap: isMobile ? 'wrap' : 'nowrap',
    flexDirection: isMobile ? 'row' : 'column'
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    position: 'relative',
    flex: 1,
    minWidth: '80px'
  },
  stepCircle: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.125rem',
    fontWeight: '700',
    border: '2px solid transparent',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    flexShrink: 0
  },
  stepLabel: {
    fontSize: isMobile ? '0.7rem' : '0.8125rem',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
    fontWeight: '500',
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    lineHeight: '1.3',
    maxWidth: '100px',
    transition: 'all 0.3s ease'
  },
  stepDivider: {
    height: '2px',
    width: isMobile ? '20px' : '0px',
    margin: isMobile ? '0 0.25rem' : '0',
    backgroundColor: 'rgba(255,255,255,0.3)',
    transition: 'background-color 0.3s ease'
  },
  reviewSection: {
    backgroundColor: '#eff6ff',
    border: '2px solid #3b82f6',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  reviewTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '1.25rem',
    paddingBottom: '0.75rem',
    borderBottom: '2px solid #3b82f6'
  },
  reviewRow: {
    display: 'grid',
    gridTemplateColumns: '180px 1fr',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '0.75rem 0',
    borderBottom: '1px solid #dbeafe'
  },
  reviewLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e40af',
    display: 'block'
  },
  reviewValue: {
    fontSize: '0.875rem',
    color: '#1e40af',
    fontWeight: '500',
    display: 'block',
    textAlign: 'right'
  },
  balanceInfo: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #059669',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  balanceLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#059669',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  balanceValue: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#047857',
    letterSpacing: '-0.01em',
    marginBottom: '1rem'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'white',
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
  }
  };
  return styles;
};
