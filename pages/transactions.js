// pages/transactions.js
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function TransactionsHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userInfo } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!userInfo) return;

      const { data: txs } = await supabase
        .from('transactions')
        .select('*, account_id(*, account_number, account_type)')
        .eq('account_id.user_id', userInfo.id)
        .order('created_at', { ascending: false });

      setTransactions(txs || []);
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  if (loading) return <p>Loading transactions...</p>;

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <h1>Your Transaction History</h1>
      {transactions.length === 0 ? (
        <p>No transactions found.</p>
      ) : (
        <table border="1" cellPadding="10" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>{new Date(tx.created_at).toLocaleString()}</td>
                <td>{tx.account_id.account_number} ({tx.account_id.account_type})</td>
                <td>{tx.type}</td>
                <td>${parseFloat(tx.amount).toFixed(2)}</td>
                <td>{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
