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

    const { loan_id, amount, payment_method, crypto_data } = req.body;

    if (!loan_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Validate payment method
    if (!payment_method || !['balance', 'crypto'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Validate crypto data if crypto payment
    if (payment_method === 'crypto') {
      if (!crypto_data || !crypto_data.crypto_type || !crypto_data.network_type) {
        return res.status(400).json({ error: 'Missing crypto payment details' });
      }
      if (!crypto_data.tx_hash && !crypto_data.proof_file) {
        return res.status(400).json({ error: 'Transaction hash or proof file required for crypto payments' });
      }
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

    // Handle crypto payments differently
    if (payment_method === 'crypto') {
      // Get crypto asset
      const { data: cryptoAsset } = await supabaseAdmin
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', crypto_data.crypto_type)
        .eq('network_type', crypto_data.network_type)
        .eq('status', 'active')
        .single();

      if (!cryptoAsset) {
        return res.status(400).json({ error: 'Invalid crypto asset configuration' });
      }

      // Calculate principal and interest breakdown
      const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
      const interestAmount = parseFloat(loan.remaining_balance) * monthlyRate;
      const principalAmount = amount - interestAmount;

      // Create payment record with pending status for admin verification
      const { data: paymentRecord, error: paymentError } = await supabaseAdmin
        .from('loan_payments')
        .insert([{
          loan_id: loan.id,
          amount,
          principal_amount: principalAmount > 0 ? principalAmount : amount,
          interest_amount: interestAmount > 0 ? interestAmount : 0,
          late_fee: 0,
          balance_after: loan.remaining_balance - amount,
          payment_date: new Date().toISOString(),
          payment_type: 'manual',
          status: 'pending',
          deposit_method: 'crypto',
          tx_hash: crypto_data.tx_hash || null,
          fee: crypto_data.fee || 0,
          gross_amount: amount,
          proof_path: crypto_data.proof_path || null,
          metadata: {
            crypto_type: crypto_data.crypto_type,
            network_type: crypto_data.network_type,
            loan_wallet_address: crypto_data.wallet_address,
            wallet_id: crypto_data.wallet_id
          },
          confirmations: 0,
          required_confirmations: 3,
          notes: `Loan payment via ${crypto_data.crypto_type} (${crypto_data.network_type})`
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating crypto payment:', paymentError);
        return res.status(500).json({ error: 'Failed to create payment record' });
      }

      // Notify user
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Crypto Loan Payment Submitted',
          message: `Your crypto payment of $${amount.toLocaleString()} has been submitted and is pending verification. You will be notified once it's confirmed.`,
          read: false
        }]);

      return res.status(200).json({
        success: true,
        message: 'Crypto payment submitted successfully. Pending verification.',
        payment_status: 'pending',
        payment_id: paymentRecord.id
      });
    }

    // Handle balance payments (existing logic)
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
        processed_by: user.id,
        deposit_method: 'balance'
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
        description: `Loan Payment - ${loan.loan_type?.replace(/_/g, ' ').toUpperCase()}`,
        status: 'completed',
        reference: `LOAN-PAY-${loan.id.substring(0, 8)}`,
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