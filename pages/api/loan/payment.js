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

    const { loan_id, amount } = req.body;

    if (!loan_id || !amount || amount <= 0) {
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

    if (amount > loan.remaining_balance) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', loan.account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (parseFloat(account.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient funds in account' });
    }

    const originalAccountBalance = parseFloat(account.balance);
    const newBalance = originalAccountBalance - amount;
    const newRemainingBalance = loan.remaining_balance - amount;
    const loanStatus = newRemainingBalance <= 0.01 ? 'completed' : 'active';

    const { error: updateAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', account.id);

    if (updateAccountError) {
      console.error('Error updating account balance:', updateAccountError);
      return res.status(500).json({ error: 'Failed to deduct payment from account' });
    }

    // Calculate principal and interest breakdown
    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const interestAmount = parseFloat(loan.remaining_balance) * monthlyRate;
    const principalAmount = amount - interestAmount;

    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert([{
        loan_id: loan.id,
        amount,
        principal_amount: principalAmount > 0 ? principalAmount : amount,
        interest_amount: interestAmount > 0 ? interestAmount : 0,
        late_fee: 0,
        balance_after: newRemainingBalance,
        payment_date: new Date().toISOString(),
        payment_type: 'manual',
        status: 'completed',
        processed_by: user.id
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: originalAccountBalance })
        .eq('id', account.id);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    // Calculate how many payments were made with this payment
    const monthlyPayment = parseFloat(loan.monthly_payment_amount);
    const paymentsMadeCount = monthlyPayment > 0 ? Math.floor(amount / monthlyPayment) : 1;
    const totalPaymentsMade = (loan.payments_made || 0) + paymentsMadeCount;

    // Calculate next payment date based on remaining balance
    let nextPaymentDate = null;
    if (loanStatus === 'active' && newRemainingBalance > 0.01) {
      // Only set next payment date if there's still balance remaining
      const startDate = new Date(loan.start_date || loan.created_at);
      const monthsToAdd = totalPaymentsMade;
      nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + monthsToAdd + 1);
      nextPaymentDate = nextPaymentDate.toISOString().split('T')[0];
    } else if (newRemainingBalance <= 0.01) {
      // Loan is fully paid, no next payment needed
      nextPaymentDate = null;
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        remaining_balance: newRemainingBalance,
        status: loanStatus,
        payments_made: totalPaymentsMade,
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.id);

    if (updateLoanError) {
      console.error('Error updating loan balance:', updateLoanError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: originalAccountBalance })
        .eq('id', account.id);
      await supabaseAdmin
        .from('loan_payments')
        .delete()
        .eq('id', paymentRecord.id);
      return res.status(500).json({ error: 'Failed to update loan balance' });
    }

    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        account_id: account.id,
        user_id: user.id,
        type: 'debit',
        amount: -amount,
        balance_before: originalAccountBalance,
        balance_after: newBalance,
        description: `Loan payment for ${loan.loan_type?.replace(/_/g, ' ')} loan`,
        status: 'completed',
        reference: `LOAN-PAY-${loan.id.substring(0, 8)}`,
        created_at: new Date().toISOString()
      }]);

      if (transactionError) {
        console.error('Error creating loan payment transaction:', transactionError);
      }

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: 'Loan Payment Processed',
        message: `Your loan payment of $${amount.toLocaleString()} has been processed successfully. ${loanStatus === 'closed' ? 'Your loan has been fully paid off!' : `Remaining balance: $${newRemainingBalance.toFixed(2)}`}`,
        read: false
      }]);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      loan_status: loanStatus,
      remaining_balance: newRemainingBalance,
      new_account_balance: newBalance
    });

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
