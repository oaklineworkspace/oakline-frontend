// pages/withdrawal.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Withdrawal() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('internal_transfer');
  const [withdrawalDetails, setWithdrawalDetails] = useState({
    recipient_account_number: '',
    recipient_name: '',
    routing_number: '',
    bank_name: '',
    recipient_address: '',
    swift_code: '',
    iban: '',
    international_bank: '',
    international_address: '',
    purpose: '',
    atm_pin: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
      if (data?.length > 0) setSelectedAccount(data[0].id);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setMessage('Unable to load accounts. Please try again.');
    }
  };

  const handleWithdrawalDetailsChange = (field, value) => {
    setWithdrawalDetails(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
    const withdrawAmount = parseFloat(amount);

    if (!selectedAccount || !amount || withdrawAmount <= 0) {
      setMessage('Please select an account and enter a valid amount.');
      return false;
    }

    if (withdrawAmount > parseFloat(selectedAccountData.balance)) {
      setMessage('Insufficient funds. Your current balance is $' + parseFloat(selectedAccountData.balance).toFixed(2));
      return false;
    }

    if (withdrawAmount > 10000) {
      setMessage('Withdrawals over $10,000 require additional verification. Please contact support.');
      return false;
    }

    // Validate withdrawal method specific fields
    switch (withdrawalMethod) {
      case 'external_ach':
        if (!withdrawalDetails.recipient_account_number || !withdrawalDetails.routing_number || 
            !withdrawalDetails.recipient_name || !withdrawalDetails.bank_name) {
          setMessage('Please fill in all ACH transfer details.');
          return false;
        }
        break;
      case 'wire_domestic':
        if (!withdrawalDetails.recipient_account_number || !withdrawalDetails.routing_number || 
            !withdrawalDetails.recipient_name || !withdrawalDetails.bank_name || !withdrawalDetails.recipient_address) {
          setMessage('Please fill in all domestic wire transfer details.');
          return false;
        }
        break;
      case 'wire_international':
        if (!withdrawalDetails.iban || !withdrawalDetails.swift_code || !withdrawalDetails.recipient_name || 
            !withdrawalDetails.international_bank || !withdrawalDetails.international_address) {
          setMessage('Please fill in all international wire transfer details.');
          return false;
        }
        break;
      case 'internal_transfer':
        if (!withdrawalDetails.recipient_account_number) {
          setMessage('Please provide the recipient account number.');
          return false;
        }
        break;
    }
    return true;
  };

  const calculateFee = () => {
    const withdrawAmount = parseFloat(amount) || 0;
    switch (withdrawalMethod) {
      case 'internal_transfer': return 0;
      case 'external_ach': return 3.00;
      case 'wire_domestic': return 25.00;
      case 'wire_international': return 45.00;
      case 'atm_withdrawal': return withdrawAmount > 500 ? 2.50 : 0;
      default: return 0;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setMessage('');

    try {
      const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
      const withdrawAmount = parseFloat(amount);
      const fee = calculateFee();
      const totalDeduction = withdrawAmount + fee;

      if (totalDeduction > parseFloat(selectedAccountData.balance)) {
        setMessage(`Insufficient funds including fees. Total needed: $${totalDeduction.toFixed(2)}`);
        setLoading(false);
        return;
      }

      // Create withdrawal transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          account_id: selectedAccount,
          type: 'withdrawal',
          amount: -withdrawAmount, // Negative for withdrawal
          status: withdrawalMethod === 'internal_transfer' ? 'completed' : 'pending',
          reference: `${withdrawalMethod.toUpperCase()} withdrawal - ${withdrawalDetails.recipient_name || 'ATM'} - ${new Date().toISOString()}`
        }]);

      if (transactionError) throw transactionError;

      // Create fee transaction if applicable
      if (fee > 0) {
        await supabase.from('transactions').insert([{
          account_id: selectedAccount,
          type: 'fee',
          amount: -fee,
          status: 'completed',
          reference: `${withdrawalMethod.toUpperCase()} withdrawal fee`
        }]);
      }

      // Update account balance
      const newBalance = parseFloat(selectedAccountData.balance) - totalDeduction;
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', selectedAccount);

      if (updateError) throw updateError;

      // Create notification
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('notifications').insert([{
        user_id: user.id,
        type: 'withdrawal',
        title: 'Withdrawal Processed',
        message: `$${withdrawAmount.toFixed(2)} withdrawal from account ${selectedAccountData.account_number} via ${withdrawalMethod.replace('_', ' ')}${fee > 0 ? ` (Fee: $${fee.toFixed(2)})` : ''}`
      }]);

      setMessage(`✅ Withdrawal of $${withdrawAmount.toFixed(2)} has been processed successfully!${fee > 0 ? ` Fee: $${fee.toFixed(2)}` : ''}`);
      setAmount('');
      setWithdrawalDetails({
        recipient_account_number: '', recipient_name: '', routing_number: '', bank_name: '',
        recipient_address: '', swift_code: '', iban: '', international_bank: '',
        international_address: '', purpose: '', atm_pin: ''
      });
      
      // Refresh accounts to show updated balance
      fetchAccounts();

    } catch (error) {
      console.error('Withdrawal error:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '15px',
    boxSizing: 'border-box'
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: 'white'
  };

  const buttonStyle = {
    width: '100%',
    padding: '15px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1
  };

  const renderWithdrawalMethodFields = () => {
    switch (withdrawalMethod) {
      case 'internal_transfer':
        return (
          <>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Account Number:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_account_number}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_account_number', e.target.value)}
              placeholder="Account number within Oakline Bank"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Name (Optional):
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_name}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_name', e.target.value)}
              placeholder="Name for reference"
            />
          </>
        );

      case 'external_ach':
        return (
          <>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_name}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_name', e.target.value)}
              placeholder="Full name on account"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bank Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.bank_name}
              onChange={(e) => handleWithdrawalDetailsChange('bank_name', e.target.value)}
              placeholder="Recipient's bank name"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Routing Number:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.routing_number}
              onChange={(e) => handleWithdrawalDetailsChange('routing_number', e.target.value)}
              placeholder="123456789"
              maxLength="9"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Account Number:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_account_number}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_account_number', e.target.value)}
              placeholder="Recipient's account number"
              required
            />
          </>
        );

      case 'wire_domestic':
        return (
          <>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_name}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_name', e.target.value)}
              placeholder="Full name on account"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bank Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.bank_name}
              onChange={(e) => handleWithdrawalDetailsChange('bank_name', e.target.value)}
              placeholder="Recipient's bank name"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Routing Number:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.routing_number}
              onChange={(e) => handleWithdrawalDetailsChange('routing_number', e.target.value)}
              placeholder="123456789"
              maxLength="9"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Account Number:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_account_number}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_account_number', e.target.value)}
              placeholder="Recipient's account number"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Address:
            </label>
            <textarea
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
              value={withdrawalDetails.recipient_address}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_address', e.target.value)}
              placeholder="Complete address of recipient"
              required
            />
          </>
        );

      case 'wire_international':
        return (
          <>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Recipient Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.recipient_name}
              onChange={(e) => handleWithdrawalDetailsChange('recipient_name', e.target.value)}
              placeholder="Full name on account"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bank Name:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.international_bank}
              onChange={(e) => handleWithdrawalDetailsChange('international_bank', e.target.value)}
              placeholder="International bank name"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              SWIFT Code:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.swift_code}
              onChange={(e) => handleWithdrawalDetailsChange('swift_code', e.target.value)}
              placeholder="ABCDUS33XXX"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              IBAN:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.iban}
              onChange={(e) => handleWithdrawalDetailsChange('iban', e.target.value)}
              placeholder="International Bank Account Number"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Bank Address:
            </label>
            <textarea
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
              value={withdrawalDetails.international_address}
              onChange={(e) => handleWithdrawalDetailsChange('international_address', e.target.value)}
              placeholder="Complete address of recipient bank"
              required
            />
            
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Purpose of Transfer:
            </label>
            <input
              type="text"
              style={inputStyle}
              value={withdrawalDetails.purpose}
              onChange={(e) => handleWithdrawalDetailsChange('purpose', e.target.value)}
              placeholder="e.g., Personal transfer, Investment, etc."
              required
            />
          </>
        );

      default:
        return null;
    }
  };

  if (accounts.length === 0) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '40px auto',
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px'
      }}>
        <h1 style={{ color: '#dc3545' }}>No Accounts Found</h1>
        <p>You need to have at least one account to make withdrawals. Please contact support or apply for an account first.</p>
      </div>
    );
  }

  const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
  const fee = calculateFee();
  const totalAmount = (parseFloat(amount) || 0) + fee;

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '40px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#dc3545', textAlign: 'center', marginBottom: '30px' }}>
        💸 Withdrawal
      </h1>

      {message && (
        <div style={{
          padding: '15px',
          marginBottom: '20px',
          borderRadius: '8px',
          backgroundColor: message.includes('✅') ? '#e8f5e8' : '#ffebee',
          border: `1px solid ${message.includes('✅') ? '#4caf50' : '#f44336'}`,
          color: message.includes('✅') ? '#2e7d32' : '#c62828'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Withdraw From Account:
        </label>
        <select
          style={selectStyle}
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          required
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.account_number} ({account.account_type}) - ${parseFloat(account.balance).toFixed(2)}
            </option>
          ))}
        </select>

        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Withdrawal Amount ($):
        </label>
        <input
          type="number"
          style={inputStyle}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          step="0.01"
          min="0.01"
          max={selectedAccountData ? parseFloat(selectedAccountData.balance) : 10000}
          required
        />

        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          Withdrawal Method:
        </label>
        <select
          style={selectStyle}
          value={withdrawalMethod}
          onChange={(e) => setWithdrawalMethod(e.target.value)}
          required
        >
          <option value="internal_transfer">🏦 Internal Transfer (Free)</option>
          <option value="external_ach">🔄 External ACH ($3.00 fee)</option>
          <option value="wire_domestic">📡 Domestic Wire ($25.00 fee)</option>
          <option value="wire_international">🌍 International Wire ($45.00 fee)</option>
          <option value="atm_withdrawal">🏧 ATM Withdrawal (Authorized)</option>
        </select>

        {withdrawalMethod !== 'atm_withdrawal' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #e1e5e9' 
          }}>
            <h3 style={{ color: '#dc3545', marginBottom: '15px' }}>
              Withdrawal Details
            </h3>
            {renderWithdrawalMethodFields()}
          </div>
        )}

        {fee > 0 && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px'
          }}>
            <strong>Fee Notice:</strong> This withdrawal method incurs a ${fee.toFixed(2)} fee.<br/>
            <strong>Total Deduction:</strong> ${totalAmount.toFixed(2)}
          </div>
        )}

        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Processing Withdrawal...' : `Withdraw $${(parseFloat(amount) || 0).toFixed(2)}${fee > 0 ? ` (+$${fee.toFixed(2)} fee)` : ''}`}
        </button>
      </form>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #e1e5e9',
        fontSize: '12px',
        color: '#666'
      }}>
        <strong>Important Notes:</strong>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li>ACH transfers take 1-3 business days to process</li>
          <li>Wire transfers are typically processed same day</li>
          <li>International wires may take 3-5 business days</li>
          <li>Maximum single withdrawal: $10,000 (contact support for higher amounts)</li>
          <li>All withdrawals are subject to available account balance</li>
          <li>Fees are deducted from your account balance</li>
        </ul>
      </div>
    </div>
  );
}