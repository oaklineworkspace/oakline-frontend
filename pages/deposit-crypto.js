import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';
import QRCode from 'react-qr-code';

export default function CryptoDeposit() {
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loadingWallet, setLoadingWallet] = useState(false);
  const router = useRouter();

  const [depositForm, setDepositForm] = useState({
    account_number: '',
    crypto_type: 'BTC',
    amount: ''
  });

  const cryptoTypes = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'USDT', label: 'Tether (USDT)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'BNB', label: 'Binance Coin (BNB)' }
  ];

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    if (user && depositForm.crypto_type) {
      fetchWalletAddress();
    }
  }, [depositForm.crypto_type, user]);

  const checkUserAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/sign-in');
        return;
      }
      setUser(session.user);

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at');
      setAccounts(userAccounts || []);
      if (userAccounts?.length > 0) {
        setDepositForm(prev => ({ ...prev, account_number: userAccounts[0].account_number }));
      }

      const { data: userDeposits } = await supabase
        .from('crypto_deposits')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setDeposits(userDeposits || []);

    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletAddress = async () => {
    setLoadingWallet(true);
    setWalletAddress('');
    try {
      const { data, error } = await supabase
        .from('user_crypto_wallets')
        .select('wallet_address')
        .eq('user_id', user.id)
        .eq('crypto_type', depositForm.crypto_type)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setWalletAddress('');
        } else {
          console.error('Error fetching wallet:', error);
        }
      } else if (data) {
        setWalletAddress(data.wallet_address);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }

    if (!walletAddress) {
      setMessage('Cannot submit deposit without an assigned wallet address');
      setMessageType('error');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from('crypto_deposits')
        .insert([{
          user_id: user.id,
          account_number: depositForm.account_number,
          crypto_type: depositForm.crypto_type,
          wallet_address: walletAddress,
          amount: parseFloat(depositForm.amount),
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Deposit submission failed');
      }

      setMessage('✅ Deposit submitted successfully and is pending admin confirmation.');
      setMessageType('success');
      
      setDepositForm({
        account_number: depositForm.account_number,
        crypto_type: depositForm.crypto_type,
        amount: ''
      });

      await checkUserAndLoadData();

    } catch (error) {
      console.error('Deposit error:', error);
      setMessage(error.message || 'Deposit submission failed. Please try again.');
      setMessageType('error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Wallet address copied to clipboard!');
    setMessageType('success');
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Crypto Deposit - Oakline Bank</title>
      </Head>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <Link href="/dashboard" style={{ color: '#0066cc', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Dashboard
          </Link>
        </div>

        <h1 style={{ fontSize: '28px', marginBottom: '10px', color: '#1a1a1a' }}>
          Crypto Deposit
        </h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Deposit cryptocurrency to your account
        </p>

        {message && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            backgroundColor: messageType === 'error' ? '#fee' : '#efe',
            border: `1px solid ${messageType === 'error' ? '#fcc' : '#cfc'}`,
            color: messageType === 'error' ? '#c00' : '#060'
          }}>
            {message}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#1a1a1a' }}>
              New Deposit
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                  Select Account
                </label>
                <select
                  value={depositForm.account_number}
                  onChange={(e) => setDepositForm({ ...depositForm, account_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                  required
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.account_number}>
                      {account.account_type.toUpperCase()} - {account.account_number} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                  Crypto Type
                </label>
                <select
                  value={depositForm.crypto_type}
                  onChange={(e) => setDepositForm({ ...depositForm, crypto_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                  required
                >
                  {cryptoTypes.map(crypto => (
                    <option key={crypto.value} value={crypto.value}>
                      {crypto.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                  Amount (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !walletAddress}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: (!walletAddress || submitting) ? '#ccc' : '#0066cc',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: (!walletAddress || submitting) ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Deposit'}
              </button>
            </form>
          </div>

          <div style={{
            backgroundColor: '#fff',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#1a1a1a' }}>
              Wallet Address
            </h2>

            {loadingWallet ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                Loading wallet address...
              </div>
            ) : walletAddress ? (
              <div>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  fontSize: '13px'
                }}>
                  {walletAddress}
                </div>

                <button
                  onClick={() => copyToClipboard(walletAddress)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    color: '#333',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                >
                  📋 Copy Address
                </button>

                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '20px',
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0'
                }}>
                  <QRCode value={walletAddress} size={200} />
                </div>

                <p style={{
                  marginTop: '15px',
                  fontSize: '13px',
                  color: '#666',
                  textAlign: 'center'
                }}>
                  Scan this QR code to deposit {depositForm.crypto_type}
                </p>
              </div>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#fff9e6',
                borderRadius: '8px',
                border: '1px solid #ffe066'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>⚠️</div>
                <p style={{ color: '#856404', fontWeight: '500', marginBottom: '10px' }}>
                  No wallet assigned yet
                </p>
                <p style={{ color: '#856404', fontSize: '14px' }}>
                  Please contact support to get a {depositForm.crypto_type} wallet assigned to your account.
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#1a1a1a' }}>
            Recent Deposits
          </h2>

          {deposits.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              No deposits yet
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Crypto</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#666', fontWeight: '600' }}>Account</th>
                    <th style={{ padding: '12px', textAlign: 'right', color: '#666', fontWeight: '600' }}>Amount</th>
                    <th style={{ padding: '12px', textAlign: 'center', color: '#666', fontWeight: '600' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {formatDate(deposit.created_at)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                        {deposit.crypto_type}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', fontFamily: 'monospace' }}>
                        {deposit.account_number}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', textAlign: 'right', fontWeight: '500' }}>
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: 
                            deposit.status === 'pending' ? '#fff3cd' :
                            deposit.status === 'approved' ? '#d4edda' :
                            '#f8d7da',
                          color:
                            deposit.status === 'pending' ? '#856404' :
                            deposit.status === 'approved' ? '#155724' :
                            '#721c24'
                        }}>
                          {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
