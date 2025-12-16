import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendDepositConfirmedEmail } from '../../../lib/email';

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

    const { loan_id, account_id, amount, deposit_method } = req.body;

    if (!loan_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid deposit information' });
    }

    // Verify loan belongs to user
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check existing deposits to calculate total paid and pending
    const { data: existingDeposits } = await supabaseAdmin
      .from('loan_payments')
      .select('amount, status')
      .eq('loan_id', loan_id)
      .eq('is_deposit', true);
    
    const totalPaid = (existingDeposits || [])
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    const totalPending = (existingDeposits || [])
      .filter(d => d.status === 'pending' || d.status === 'processing')
      .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    const totalContributed = totalPaid + totalPending;
    const depositRequired = parseFloat(loan.deposit_required || loan.principal * 0.1);
    
    // Only block if total contributions already cover the required amount
    if (totalContributed >= depositRequired) {
      return res.status(400).json({ 
        error: `Your deposit of $${depositRequired.toLocaleString()} is already covered ($${totalPaid.toLocaleString()} confirmed + $${totalPending.toLocaleString()} pending). Please wait for blockchain confirmation.` 
      });
    }

    // Allow deposits for pending loans
    if (loan.status !== 'pending_deposit' && loan.status !== 'pending' && loan.status !== 'approved') {
      return res.status(400).json({ error: 'Loan deposit cannot be processed at this time. Current status: ' + loan.status });
    }

    if (deposit_method === 'balance') {
      // Process deposit from account balance
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const accountBalance = parseFloat(account.balance);
      if (accountBalance < amount) {
        return res.status(400).json({ error: 'Insufficient funds in account' });
      }

      // Deduct deposit from account (pending, can be reversed if rejected)
      const newBalance = accountBalance - amount;
      const { error: updateAccountError } = await supabaseAdmin
        .from('accounts')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account_id);

      if (updateAccountError) {
        console.error('Error updating account:', updateAccountError);
        return res.status(500).json({ error: 'Failed to process deposit' });
      }

      // Create transaction record with HOLD status (can be reversed)
      const loanTypeName = loan.loan_type ? loan.loan_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Loan';
      const uniqueTimestamp = Date.now().toString(36);
      const referenceNumber = `LOAN-DEP-${loan_id.substring(0, 8).toUpperCase()}-${uniqueTimestamp}`;
      const depositDescription = `Loan 10% Collateral Deposit via Account Balance - ${loanTypeName}`;

      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: account_id,
          type: 'debit',
          amount: parseFloat(amount), // Amount must be positive, type indicates debit/credit
          balance_before: parseFloat(account.balance),
          balance_after: newBalance,
          description: depositDescription,
          status: 'hold',
          reference: referenceNumber
        }]);

      if (transactionError) {
        console.error('Error creating transaction record:', JSON.stringify(transactionError, null, 2));
        // Rollback account balance
        await supabaseAdmin
          .from('accounts')
          .update({ balance: accountBalance })
          .eq('id', account_id);
        return res.status(500).json({ error: 'Failed to create transaction record: ' + (transactionError.message || transactionError.details || 'Unknown error') });
      }

      // Insert into loan_payments for tracking - status is pending for admin review
      const { error: loanPaymentError } = await supabaseAdmin
        .from('loan_payments')
        .insert([{
          loan_id: loan_id,
          amount: parseFloat(amount),
          payment_type: 'deposit',
          status: 'pending', // Pending admin review
          is_deposit: true,
          deposit_method: 'account_balance',
          account_id: account_id,
          metadata: {
            account_number: account.account_number,
            reference: referenceNumber
          },
          notes: depositDescription
        }]);

      if (loanPaymentError) {
        console.error('Error creating loan payment record:', loanPaymentError);
        // Rollback account balance
        await supabaseAdmin
          .from('accounts')
          .update({ balance: accountBalance })
          .eq('id', account_id);
        return res.status(500).json({ error: 'Failed to create deposit record' });
      }

      // Calculate new totals after this deposit
      const newTotalPaid = totalPaid + parseFloat(amount);
      const isDepositComplete = newTotalPaid >= depositRequired;

      // Update loan with deposit information - status is PENDING for admin review
      // Note: deposit_status only allows 'pending', 'completed', 'not_required'
      const { error: updateLoanError } = await supabaseAdmin
        .from('loans')
        .update({
          deposit_paid: isDepositComplete,
          deposit_amount: newTotalPaid,
          deposit_date: new Date().toISOString(),
          deposit_method: 'balance',
          deposit_status: isDepositComplete ? 'completed' : 'pending',
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateLoanError) {
        console.error('Error updating loan:', updateLoanError);
        // Rollback account balance and transaction
        await supabaseAdmin
          .from('accounts')
          .update({ balance: accountBalance })
          .eq('id', account_id);
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('reference', referenceNumber);
        return res.status(500).json({ error: 'Failed to update loan status' });
      }

      // Calculate remaining balance for notification
      const remainingAfterThis = Math.max(0, depositRequired - newTotalPaid);
      
      // Send notification to user
      const notificationMessage = isDepositComplete
        ? `Your deposit of $${parseFloat(amount).toLocaleString()} has been submitted. Total paid: $${newTotalPaid.toLocaleString()}. Your deposit is now complete and your loan is under review.`
        : `Your partial deposit of $${parseFloat(amount).toLocaleString()} has been submitted. Total paid: $${newTotalPaid.toLocaleString()} of $${depositRequired.toLocaleString()} required. Remaining: $${remainingAfterThis.toLocaleString()}.`;
      
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: isDepositComplete ? 'Loan Deposit Complete' : 'Partial Loan Deposit Received',
          message: notificationMessage,
          read: false
        }]);

      // Get user profile for email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
      const userEmail = profile?.email || user.email;

      // Send deposit confirmed email
      try {
        await sendDepositConfirmedEmail({
          to: userEmail,
          userName,
          depositAmount: amount,
          loanType: loan.loan_type.replace(/_/g, ' ').toUpperCase()
        });
      } catch (emailError) {
        console.error('Error sending deposit confirmation email:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: isDepositComplete 
          ? 'Deposit complete! Your loan is now under review.'
          : `Partial deposit submitted. $${remainingAfterThis.toLocaleString()} remaining to complete your deposit.`,
        new_balance: newBalance,
        total_paid: newTotalPaid,
        deposit_required: depositRequired,
        remaining: remainingAfterThis,
        is_complete: isDepositComplete
      });
    } else if (deposit_method === 'crypto') {
      // For crypto deposits, keep status as pending_deposit until crypto is confirmed
      // The crypto deposit will be verified through the crypto_deposits table
      const { error: updateLoanError } = await supabaseAdmin
        .from('loans')
        .update({
          deposit_method: 'crypto',
          status: 'pending_deposit',
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateLoanError) {
        console.error('Error updating loan for crypto deposit:', updateLoanError);
        return res.status(500).json({ error: 'Failed to update loan status' });
      }

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Crypto Deposit Pending',
          message: `Please complete your crypto deposit of $${amount.toLocaleString()} for your loan application. Your loan will be reviewed after the deposit is confirmed.`,
          read: false
        }]);

      return res.status(200).json({
        success: true,
        message: 'Crypto deposit initiated. Please complete the deposit.',
        redirect: `/deposit-crypto?loan_id=${loan_id}&amount=${amount}&redirect=loan_deposit`
      });
    }

    return res.status(400).json({ error: 'Invalid deposit method. Supported methods: balance, crypto' });

  } catch (error) {
    console.error('Error processing loan deposit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}