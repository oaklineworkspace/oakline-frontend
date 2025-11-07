
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

    // Check if deposit already paid
    if (loan.deposit_paid) {
      return res.status(400).json({ error: 'Loan deposit has already been submitted for this loan. Your application is under review by the Loan Department.' });
    }

    if (loan.status !== 'pending_deposit' && loan.status !== 'pending') {
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

      // Deduct deposit from account
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

      // Create transaction record
      const loanTypeName = loan.loan_type ? loan.loan_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Loan';
      const { error: transactionError } = await supabaseAdmin
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: account_id,
          type: 'debit',
          amount: amount,
          balance_before: accountBalance,
          balance_after: newBalance,
          description: `Loan Deposit - ${loanTypeName} Application (10% Collateral)`,
          status: 'completed',
          reference: `LOAN-DEP-${loan_id.substring(0, 8).toUpperCase()}`,
          created_at: new Date().toISOString()
        }]);

      if (transactionError) {
        console.error('Error creating transaction record:', transactionError);
      }

      // Update loan with deposit information and change status to under_review
      const { error: updateLoanError } = await supabaseAdmin
        .from('loans')
        .update({
          deposit_paid: true,
          deposit_amount: amount,
          deposit_date: new Date().toISOString(),
          deposit_method: 'balance',
          deposit_status: 'completed',
          status: 'under_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateLoanError) {
        console.error('Error updating loan:', updateLoanError);
        // Rollback account balance
        await supabaseAdmin
          .from('accounts')
          .update({ balance: accountBalance })
          .eq('id', account_id);
        return res.status(500).json({ error: 'Failed to update loan status' });
      }

      // Send notification
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Loan Deposit Received',
          message: `Your deposit of $${amount.toLocaleString()} has been received. Your loan application is now under review by our Loan Department.`,
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
        const { sendDepositConfirmedEmail } = require('../../../lib/email');
        
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
        message: 'Deposit processed successfully',
        new_balance: newBalance
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
