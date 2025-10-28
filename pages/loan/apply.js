import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

function LoanApplicationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formData, setFormData] = useState({
    loan_type: '',
    principal: '',
    term_months: '',
    purpose: '',
    interest_rate: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      fetchUserAccounts();
    }
  }, [user]);

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!error && data) {
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const loanTypes = [
    { value: 'personal', label: 'Personal Loan', rate: 6.99 },
    { value: 'home_mortgage', label: 'Home Mortgage', rate: 7.25 },
    { value: 'auto_loan', label: 'Auto Loan', rate: 5.99 },
    { value: 'business', label: 'Business Loan', rate: 8.50 },
    { value: 'student', label: 'Student Loan', rate: 4.99 },
    { value: 'home_equity', label: 'Home Equity Loan', rate: 7.50 }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'loan_type') {
      const selectedLoan = loanTypes.find(lt => lt.value === value);
      if (selectedLoan) {
        setFormData(prev => ({ ...prev, interest_rate: selectedLoan.rate.toString() }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!user) {
        setError('You must be logged in to apply for a loan');
        setLoading(false);
        return;
      }

      if (accounts.length === 0) {
        setError('You must have an active account to apply for a loan');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/loan/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          loan_type: formData.loan_type,
          principal: parseFloat(formData.principal),
          term_months: parseInt(formData.term_months),
          purpose: formData.purpose,
          interest_rate: parseFloat(formData.interest_rate)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit loan application');
      }

      setSuccess('Loan application submitted successfully! You will receive an email confirmation shortly.');
      setFormData({
        loan_type: '',
        principal: '',
        term_months: '',
        purpose: '',
        interest_rate: ''
      });

      setTimeout(() => {
        router.push('/loan/dashboard');
      }, 2000);

    } catch (err) {
      setError(err.message || 'An error occurred while submitting your application');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyPayment = () => {
    if (!formData.principal || !formData.interest_rate || !formData.term_months) {
      return 0;
    }

    const principal = parseFloat(formData.principal);
    const monthlyRate = parseFloat(formData.interest_rate) / 100 / 12;
    const numPayments = parseInt(formData.term_months);

    if (monthlyRate === 0) {
      return (principal / numPayments).toFixed(2);
    }

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);

    return monthlyPayment.toFixed(2);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Apply for a Loan</h1>
        <p style={styles.subtitle}>Complete the form below to submit your loan application</p>
      </div>

      {error && (
        <div style={styles.errorAlert}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div style={styles.successAlert}>
          <strong>Success!</strong> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Loan Type *</label>
            <select
              name="loan_type"
              value={formData.loan_type}
              onChange={handleInputChange}
              required
              style={styles.select}
            >
              <option value="">Select Loan Type</option>
              {loanTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.rate}% APR)
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Loan Amount *</label>
            <input
              type="number"
              name="principal"
              value={formData.principal}
              onChange={handleInputChange}
              placeholder="Enter amount"
              min="1000"
              max="5000000"
              step="100"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Loan Term (Months) *</label>
            <input
              type="number"
              name="term_months"
              value={formData.term_months}
              onChange={handleInputChange}
              placeholder="e.g., 12, 24, 36, 60"
              min="1"
              max="360"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Interest Rate (%) *</label>
            <input
              type="number"
              name="interest_rate"
              value={formData.interest_rate}
              onChange={handleInputChange}
              placeholder="Interest rate"
              min="0"
              max="30"
              step="0.01"
              required
              style={styles.input}
              readOnly
            />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Purpose / Description *</label>
          <textarea
            name="purpose"
            value={formData.purpose}
            onChange={handleInputChange}
            placeholder="Please describe the purpose of this loan (e.g., home purchase, debt consolidation, business expansion)"
            required
            rows="4"
            style={styles.textarea}
          />
        </div>

        {formData.principal && formData.interest_rate && formData.term_months && (
          <div style={styles.estimateBox}>
            <h3 style={styles.estimateTitle}>Estimated Monthly Payment</h3>
            <p style={styles.estimateAmount}>${calculateMonthlyPayment()}</p>
            <p style={styles.estimateNote}>
              Total to repay: ${(calculateMonthlyPayment() * formData.term_months).toFixed(2)}
            </p>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={() => router.push('/loan/dashboard')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonDisabled : {})
            }}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>What happens next?</h3>
        <ul style={styles.infoList}>
          <li>Your application will be reviewed by our loan department</li>
          <li>You will receive an email confirmation of your application</li>
          <li>An in-app notification will be sent once your application is reviewed</li>
          <li>If approved, the loan amount will be credited to your active account</li>
          <li>You can track your loan status in the Loan Dashboard</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '10px'
  },
  form: {
    backgroundColor: '#fff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s',
    outline: 'none'
  },
  select: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    cursor: 'pointer'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  estimateBox: {
    backgroundColor: '#f0f9ff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
    textAlign: 'center'
  },
  estimateTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '10px'
  },
  estimateAmount: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1e40af',
    margin: '10px 0'
  },
  estimateNote: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '5px'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '30px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#666',
    backgroundColor: '#fff',
    border: '2px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  submitButton: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  errorAlert: {
    backgroundColor: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#dc2626'
  },
  successAlert: {
    backgroundColor: '#d1fae5',
    border: '1px solid #10b981',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#059669'
  },
  infoBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '25px'
  },
  infoTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '15px'
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  }
};

styles.infoList = {
  ...styles.infoList,
  '> li': {
    padding: '8px 0',
    paddingLeft: '25px',
    position: 'relative',
    color: '#4b5563'
  }
};

export default function LoanApplication() {
  return (
    <ProtectedRoute>
      <LoanApplicationContent />
    </ProtectedRoute>
  );
}
