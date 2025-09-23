import { // pages/account/[id].js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AccountDetails() {
  const router = useRouter();
  const { id } = router.query;

  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const BACKEND_URL = 'https://your-backend.onrender.com'; // Replace with your Render backend URL

  useEffect(() => {
    if (!id) return;
    fetchAccount();
  }, [id]);

  const fetchAccount = async () => {
    setLoading(true);
    setError('');

    try {
      // Get Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        router.push('/sign-in');
        return;
      }

      // Fetch account details + transactions from backend
      const res = await fetch(`${BACKEND_URL}/api/users/${id}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to fetch account details');
      }

      const data = await res.json();
      setAccount(data.account);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Error fetching account:', err);
      setError('Could not load account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const getTransactionIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return '📥';
      case 'withdrawal': return '📤';
      case 'transfer_in': return '💸';
      case 'transfer_out': return '💰';
      case 'bill_payment': return '🧾';
      case 'fee': return '💳';
      default: return '💼';
    }
  };

  if (loading) {
    return <p>Loading account details...</p>;
  }

  if (error) {
    return (
      <div>
        <h2 style={{ color: 'red' }}>⚠️ {error}</h2>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  if (!account) {
    return (
      <div>
        <h2>Account Not Found</h2>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>{account.account_name || 'Account Details'}</h1>
      <p>Account Number: ****{account.account_number?.slice(-4)}</p>
      <p>Full Account Number: {account.account_number}</p>
      <p>Account Type: {account.account_type}</p>
      <p>Balance: {formatCurrency(account.balance)}</p>
      <p>Status: {account.status || 'Active'}</p>
      <p>Opened: {account.created_at ? formatDate(account.created_at) : 'N/A'}</p>

      <h2>Recent Transactions</h2>
      {transactions.length ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {transactions.map((tx) => (
            <li
              key={tx.id}
              style={{
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ marginRight: '0.5rem' }}>{getTransactionIcon(tx.transaction_type)}</span>
                <strong>{tx.transaction_type || 'Transaction'}</strong> - {tx.description || ''}
                <div style={{ fontSize: '0.85rem', color: '#555' }}>{formatDate(tx.created_at)}</div>
                <div style={{ fontSize: '0.8rem', color: '#777' }}>Status: {tx.status}</div>
              </div>
              <div style={{ fontWeight: 'bold', color: tx.amount >= 0 ? '#10b981' : '#ef4444' }}>
                {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No transactions found.</p>
      )}

      <Link href="/dashboard">← Back to Dashboard</Link>
    </div>
  );
}
