import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const { loan_id, account_id, amount, payment_type = 'manual' } = req.body;

    if (!loan_id || !account_id) {
      return res.status(400).json({ error: 'Missing required fields: loan_id and account_id' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Can only make payments on active loans' });
    }

    const remainingBalance = parseFloat(loan.remaining_balance || loan.principal);

    if (amount > remainingBalance) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    const accountBalance = parseFloat(account.balance);

    if (accountBalance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient funds in account',
        available: accountBalance,
        required: amount
      });
    }

    const newAccountBalance = accountBalance - amount;
    const newLoanBalance = remainingBalance - amount;
    const loanStatus = newLoanBalance <= 0.01 ? 'closed' : 'active';

    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const interestAmount = remainingBalance * monthlyRate;
    const principalAmount = amount - interestAmount;

    const { error: updateAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newAccountBalance, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', account_id)
      .eq('user_id', user.id);

    if (updateAccountError) {
      console.error('Error updating account balance:', updateAccountError);
      return res.status(500).json({ error: 'Failed to deduct payment from account' });
    }

    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert([{
        loan_id: loan.id,
        amount: amount,
        principal_amount: principalAmount > 0 ? principalAmount : amount,
        interest_amount: interestAmount > 0 ? interestAmount : 0,
        late_fee: 0,
        balance_after: newLoanBalance,
        payment_date: new Date().toISOString(),
        payment_type: payment_type,
        status: 'completed',
        processed_by: user.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: accountBalance })
        .eq('id', account_id)
        .eq('user_id', user.id);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        remaining_balance: newLoanBalance,
        status: loanStatus,
        payments_made: (loan.payments_made || 0) + 1,
        last_payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.id)
      .eq('user_id', user.id);

    if (updateLoanError) {
      console.error('Error updating loan balance:', updateLoanError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: accountBalance })
        .eq('id', account_id)
        .eq('user_id', user.id);
      await supabaseAdmin
        .from('loan_payments')
        .delete()
        .eq('id', paymentRecord.id);
      return res.status(500).json({ error: 'Failed to update loan balance' });
    }

    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        account_id: account_id,
        user_id: user.id,
        type: 'debit',
        amount: -amount,
        balance_before: accountBalance,
        balance_after: newAccountBalance,
        description: `Loan payment for ${loan.loan_type?.replace(/_/g, ' ')} - Ref: ${loan.loan_reference || loan.id.slice(0, 8)}`,
        status: 'completed',
        reference: `LOAN-PAY-${paymentRecord.id.substring(0, 12)}`,
        created_at: new Date().toISOString()
      }]);

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: loanStatus === 'closed' ? 'Loan Paid Off!' : 'Loan Payment Processed',
        message: loanStatus === 'closed' 
          ? `Congratulations! Your ${loan.loan_type?.replace(/_/g, ' ')} loan has been fully paid off. Final payment: $${amount.toLocaleString()}`
          : `Your loan payment of $${amount.toLocaleString()} has been processed successfully. Remaining balance: $${newLoanBalance.toFixed(2)}`,
        read: false,
        created_at: new Date().toISOString()
      }]);

    return res.status(200).json({
      success: true,
      message: loanStatus === 'closed' ? 'Loan fully paid off!' : 'Payment processed successfully',
      payment: {
        id: paymentRecord.id,
        amount: amount,
        principal_amount: principalAmount > 0 ? principalAmount : amount,
        interest_amount: interestAmount > 0 ? interestAmount : 0,
        payment_date: paymentRecord.payment_date
      },
      loan: {
        status: loanStatus,
        remaining_balance: newLoanBalance,
        is_paid_off: loanStatus === 'closed'
      },
      account: {
        new_balance: newAccountBalance
      }
    });

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
