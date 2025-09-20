
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function BillPay() {
  const [user, setUser] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      await fetchBills();
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/login');
    }
  };

  const fetchBills = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/get-user-bills', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();

      if (data.success) {
        setBills(data.bills || []);
      } else {
        setError('Failed to fetch bills: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Error loading bills: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const payBill = async (billId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/pay-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ billId })
      });

      const data = await res.json();
      if (data.success) {
        await fetchBills();
        setError('');
      } else {
        setError(data.error || 'Failed to pay bill');
      }
    } catch (err) {
      console.error('Error paying bill:', err);
      setError('Error paying bill');
    }
  };

  if (loading) return <div style={styles.container}><div style={styles.loading}>Loading bills...</div></div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>💵 Bill Payments</h1>

      {error && <div style={styles.error}>{error}</div>}

      {bills.length === 0 ? (
        <div style={styles.noBills}>
          <h3>No bills found</h3>
          <p>Add a bill to start making payments.</p>
          <button onClick={() => router.push('/add-bill')} style={styles.primaryButton}>Add Bill</button>
        </div>
      ) : (
        <div style={styles.billsGrid}>
          {bills.map(bill => (
            <div key={bill.id} style={styles.billCard}>
              <div style={styles.billInfo}>
                <p><strong>Payee:</strong> {bill.payee || 'Unknown'}</p>
                <p><strong>Amount:</strong> ${bill.amount ? parseFloat(bill.amount).toFixed(2) : '0.00'}</p>
                <p><strong>Due:</strong> {bill.due_date ? new Date(bill.due_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              <button onClick={() => payBill(bill.id)} style={styles.payButton}>💸 Pay Now</button>
            </div>
          ))}
        </div>
      )}

      <div style={styles.navigation}>
        <button onClick={() => router.push('/dashboard')} style={styles.navButton}>← Back to Dashboard</button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', padding: '20px', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
  title: { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: '#1e3c72' },
  loading: { textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' },
  error: { color: '#dc3545', background: '#f8d7da', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' },
  noBills: { background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  primaryButton: { background: '#007bff', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '500', marginTop: '15px' },
  billsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  billCard: { background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  billInfo: { fontSize: '14px', color: '#333' },
  payButton: { background: '#28a745', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  navigation: { marginTop: '30px', textAlign: 'center' },
  navButton: { background: '#6c757d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }
};
