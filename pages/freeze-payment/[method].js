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
  const [cryptoAssets, setCryptoAssets] = useState([]);
  const [adminWallets, setAdminWallets] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

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

  useEffect(() => {
    if (method === 'crypto' && user) {
      fetchCryptoData();
    } else if (method && user) {
      setTimeout(() => setLoadingDetails(false), 1000);
    }
  }, [method, user]);

  const fetchCryptoData = async () => {
    setLoadingDetails(true);
    try {
      const [assetsRes, userWalletsRes, globalWalletsRes] = await Promise.all([
        supabase
          .from('crypto_assets')
          .select('*')
          .eq('status', 'active')
          .order('crypto_type'),
        supabase
          .from('admin_assigned_wallets')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('admin_assigned_wallets')
          .select('*')
          .is('user_id', null)
      ]);

      if (assetsRes.data) {
        const uniqueCryptos = [];
        const seen = new Set();
        assetsRes.data.forEach(asset => {
          const key = `${asset.crypto_type}-${asset.network_type}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCryptos.push(asset);
          }
        });
        setCryptoAssets(uniqueCryptos);
      }

      const allWallets = [
        ...(userWalletsRes.data || []),
        ...(globalWalletsRes.data || [])
      ];
      
      const uniqueWallets = [];
      const seenWallets = new Set();
      allWallets.forEach(wallet => {
        const key = `${wallet.crypto_type}-${wallet.network_type}`;
        if (!seenWallets.has(key)) {
          seenWallets.add(key);
          uniqueWallets.push(wallet);
        }
      });
      
      setAdminWallets(uniqueWallets);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getWalletForCrypto = (cryptoType, networkType) => {
    return adminWallets.find(
      w => w.crypto_type === cryptoType && w.network_type === networkType
    );
  };

  const cryptoIcons = {
    'Bitcoin': '₿',
    'Ethereum': 'Ξ',
    'Tether USD': '₮',
    'USD Coin': '$',
    'BNB': 'B',
    'Solana': 'S',
    'Cardano': 'A',
    'Polygon': 'M',
    'Avalanche': 'A',
    'Litecoin': 'Ł',
    'XRP': 'X',
    'TON': 'T'
  };

  const cryptoColors = {
    'Bitcoin': '#F7931A',
    'Ethereum': '#627EEA',
    'Tether USD': '#26A17B',
    'USD Coin': '#2775CA',
    'BNB': '#F3BA2F',
    'Solana': '#9945FF',
    'Cardano': '#0033AD',
    'Polygon': '#8247E5',
    'Avalanche': '#E84142',
    'Litecoin': '#345D9D',
    'XRP': '#23292F',
    'TON': '#0088CC'
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
              {/* Loading State */}
              {loadingDetails && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 1rem'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid #e5e7eb',
                    borderTop: '3px solid #059669',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '1rem'
                  }} />
                  <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    margin: 0
                  }}>
                    Loading payment details...
                  </p>
                </div>
              )}

              {/* Wire Transfer - Contact Bank */}
              {!loadingDetails && method === 'wire' && (
                <>
                  <div style={{
                    backgroundColor: '#f0f9ff',
                    border: '2px solid #0ea5e9',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#e0f2fe',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      fontSize: '1.75rem'
                    }}>
                      📞
                    </div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#0c4a6e',
                      margin: '0 0 0.75rem 0'
                    }}>
                      Contact Us for Wire Transfer Details
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#0369a1',
                      margin: '0 0 1.25rem 0',
                      lineHeight: '1.6'
                    }}>
                      To receive wire transfer instructions and bank account details for your payment, please contact our support team. We will provide you with the specific account information for your transaction.
                    </p>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}>
                      <a href={`mailto:${bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        ✉️ {bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}
                      </a>
                      {bankDetails?.phone && (
                        <a href={`tel:${bankDetails.phone}`} style={{
                          color: '#0369a1',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          textDecoration: 'none'
                        }}>
                          📱 {bankDetails.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>Your Reference Number</p>
                    <p style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>{user?.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
                  </div>
                </>
              )}

              {/* Cryptocurrency - Show crypto types and wallets */}
              {!loadingDetails && method === 'crypto' && (
                <>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a365d',
                    margin: '0 0 1rem 0'
                  }}>
                    Select Cryptocurrency
                  </h3>
                  
                  {cryptoAssets.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No cryptocurrencies available at this time.</p>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                      gap: '0.75rem',
                      marginBottom: '1.5rem'
                    }}>
                      {cryptoAssets.map((asset) => {
                        const wallet = getWalletForCrypto(asset.crypto_type, asset.network_type);
                        if (!wallet) return null;
                        
                        return (
                          <button
                            key={asset.id}
                            onClick={() => setSelectedCrypto(selectedCrypto?.id === asset.id ? null : asset)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '1rem',
                              backgroundColor: selectedCrypto?.id === asset.id ? '#ecfdf5' : '#ffffff',
                              border: selectedCrypto?.id === asset.id ? '2px solid #059669' : '1px solid #e5e7eb',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <span style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: cryptoColors[asset.crypto_type] || '#64748b',
                              color: '#ffffff',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.25rem',
                              fontWeight: '700'
                            }}>
                              {cryptoIcons[asset.crypto_type] || asset.crypto_type[0]}
                            </span>
                            <div style={{ flex: 1 }}>
                              <p style={{
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                color: '#1a365d',
                                margin: '0 0 0.125rem 0'
                              }}>
                                {asset.crypto_type}
                              </p>
                              <p style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                margin: 0
                              }}>
                                {asset.network_type}
                              </p>
                            </div>
                            {selectedCrypto?.id === asset.id && (
                              <span style={{ color: '#059669', fontSize: '1.25rem' }}>✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Show wallet address when crypto is selected */}
                  {selectedCrypto && (
                    <div style={{
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      border: '2px solid #22c55e'
                    }}>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#15803d',
                        margin: '0 0 1rem 0'
                      }}>
                        Send {selectedCrypto.crypto_type} to this address
                      </h4>
                      <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginBottom: '0.75rem'
                      }}>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>Network</p>
                        <p style={{ fontSize: '0.9rem', color: '#1e293b', margin: '0 0 0.75rem 0', fontWeight: '600' }}>{selectedCrypto.network_type}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>Wallet Address</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <p style={{
                            fontSize: '0.85rem',
                            color: '#1e293b',
                            margin: 0,
                            fontWeight: '600',
                            wordBreak: 'break-all',
                            flex: 1
                          }}>
                            {getWalletForCrypto(selectedCrypto.crypto_type, selectedCrypto.network_type)?.wallet_address || 'N/A'}
                          </p>
                          <CopyButton 
                            text={getWalletForCrypto(selectedCrypto.crypto_type, selectedCrypto.network_type)?.wallet_address || ''} 
                            label="wallet" 
                          />
                        </div>
                        {getWalletForCrypto(selectedCrypto.crypto_type, selectedCrypto.network_type)?.memo && (
                          <>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.75rem 0 0.25rem 0', fontWeight: '500' }}>Memo/Tag (Required)</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <p style={{ fontSize: '0.9rem', color: '#dc2626', margin: 0, fontWeight: '700' }}>
                                {getWalletForCrypto(selectedCrypto.crypto_type, selectedCrypto.network_type)?.memo}
                              </p>
                              <CopyButton 
                                text={getWalletForCrypto(selectedCrypto.crypto_type, selectedCrypto.network_type)?.memo || ''} 
                                label="memo" 
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <p style={{
                        fontSize: '0.8rem',
                        color: '#166534',
                        margin: 0,
                        lineHeight: '1.5'
                      }}>
                        Send exactly <strong>{formatCurrency(freezeAmount)}</strong> worth of {selectedCrypto.crypto_type}. Exchange rates are calculated at time of confirmation.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Zelle - Contact Bank */}
              {!loadingDetails && method === 'zelle' && (
                <>
                  <div style={{
                    backgroundColor: '#faf5ff',
                    border: '2px solid #a855f7',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#f3e8ff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      fontSize: '1.75rem'
                    }}>
                      💸
                    </div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#581c87',
                      margin: '0 0 0.75rem 0'
                    }}>
                      Contact Us for Zelle Payment Details
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#7e22ce',
                      margin: '0 0 1.25rem 0',
                      lineHeight: '1.6'
                    }}>
                      To receive the Zelle payment email or phone number for your transaction, please contact our support team. We will provide you with the specific details for your payment.
                    </p>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}>
                      <a href={`mailto:${bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#9333ea',
                        color: '#ffffff',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        ✉️ {bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}
                      </a>
                      {bankDetails?.phone && (
                        <a href={`tel:${bankDetails.phone}`} style={{
                          color: '#7e22ce',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          textDecoration: 'none'
                        }}>
                          📱 {bankDetails.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>Your Reference Number</p>
                    <p style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>{user?.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
                  </div>
                </>
              )}

              {/* Cash App - Contact Bank */}
              {!loadingDetails && method === 'cashapp' && (
                <>
                  <div style={{
                    backgroundColor: '#f0fdf4',
                    border: '2px solid #22c55e',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#dcfce7',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                      fontSize: '1.75rem'
                    }}>
                      💵
                    </div>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#14532d',
                      margin: '0 0 0.75rem 0'
                    }}>
                      Contact Us for Cash App Payment Details
                    </h3>
                    <p style={{
                      fontSize: '0.9rem',
                      color: '#15803d',
                      margin: '0 0 1.25rem 0',
                      lineHeight: '1.6'
                    }}>
                      To receive the Cash App $Cashtag for your payment, please contact our support team. We will provide you with the specific payment details for your transaction.
                    </p>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      alignItems: 'center'
                    }}>
                      <a href={`mailto:${bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}`} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        ✉️ {bankDetails?.email_support || bankDetails?.email_contact || 'contact-us@theoaklinebank.com'}
                      </a>
                      {bankDetails?.phone && (
                        <a href={`tel:${bankDetails.phone}`} style={{
                          color: '#15803d',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          textDecoration: 'none'
                        }}>
                          📱 {bankDetails.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 0.25rem 0', fontWeight: '500' }}>Your Reference Number</p>
                    <p style={{ fontSize: '1rem', color: '#1e293b', margin: 0, fontWeight: '700' }}>{user?.id?.slice(0, 8).toUpperCase() || 'N/A'}</p>
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
