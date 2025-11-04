import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
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

    const loan_id = req.method === 'GET' ? req.query.loan_id : req.body.loan_id;
    const execute_payoff = req.method === 'POST' ? req.body.execute : false;

    if (!loan_id) {
      return res.status(400).json({ error: 'Missing loan_id' });
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
      return res.status(400).json({ error: 'Only active loans can be paid off early' });
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('principal_amount, interest_amount, late_fee')
      .eq('loan_id', loan_id)
      .eq('status', 'completed');

    const totalPrincipalPaid = payments && payments.length > 0
      ? payments.reduce((sum, p) => sum + parseFloat(p.principal_amount || 0), 0)
      : 0;

    const totalInterestPaid = payments && payments.length > 0
      ? payments.reduce((sum, p) => sum + parseFloat(p.interest_amount || 0), 0)
      : 0;

    const totalLateFeesPaid = payments && payments.length > 0
      ? payments.reduce((sum, p) => sum + parseFloat(p.late_fee || 0), 0)
      : 0;

    const outstandingPrincipal = parseFloat(loan.principal) - totalPrincipalPaid;
    const currentRemainingBalance = parseFloat(loan.remaining_balance || outstandingPrincipal);
    const assessedFeesAndInterest = currentRemainingBalance - outstandingPrincipal;

    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const termMonths = parseInt(loan.term_months);
    const paymentsMade = parseInt(loan.payments_made || 0);
    const remainingTerm = termMonths - paymentsMade;

    let remainingScheduledPayments = 0;
    if (monthlyRate === 0) {
      remainingScheduledPayments = outstandingPrincipal;
    } else {
      const monthlyPayment = parseFloat(loan.principal) * 
        (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
        (Math.pow(1 + monthlyRate, termMonths) - 1);
      remainingScheduledPayments = monthlyPayment * remainingTerm;
    }

    const totalInterestRemaining = remainingScheduledPayments - outstandingPrincipal;

    const earlyPayoffDiscount = outstandingPrincipal * 0.02;
    const earlyPayoffAmount = (outstandingPrincipal - earlyPayoffDiscount) + assessedFeesAndInterest;
    
    const interestSaved = totalInterestRemaining + earlyPayoffDiscount;

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        loan_details: {
          loan_id: loan.id,
          loan_type: loan.loan_type,
          principal: parseFloat(loan.principal),
          interest_rate: loan.interest_rate,
          outstanding_principal: parseFloat(outstandingPrincipal.toFixed(2)),
          remaining_scheduled_balance: parseFloat(currentRemainingBalance.toFixed(2)),
          assessed_fees_and_interest: parseFloat(assessedFeesAndInterest.toFixed(2)),
          status: loan.status
        },
        early_payoff: {
          outstanding_principal: parseFloat(outstandingPrincipal.toFixed(2)),
          assessed_charges: parseFloat(assessedFeesAndInterest.toFixed(2)),
          discount_on_principal: parseFloat(earlyPayoffDiscount.toFixed(2)),
          early_payoff_amount: parseFloat(earlyPayoffAmount.toFixed(2)),
          interest_waived: parseFloat(totalInterestRemaining.toFixed(2)),
          total_savings: parseFloat(interestSaved.toFixed(2)),
          savings_percentage: '2%'
        }
      });
    }

    if (execute_payoff) {
      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', loan.account_id)
        .eq('user_id', user.id)
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const accountBalance = parseFloat(account.balance);

      if (accountBalance < earlyPayoffAmount) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          required: parseFloat(earlyPayoffAmount.toFixed(2)),
          available: parseFloat(accountBalance.toFixed(2)),
          shortage: parseFloat((earlyPayoffAmount - accountBalance).toFixed(2))
        });
      }

      const newAccountBalance = accountBalance - earlyPayoffAmount;

      const { error: updateAccountError } = await supabaseAdmin
        .from('accounts')
        .update({ 
          balance: newAccountBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account.id);

      if (updateAccountError) {
        console.error('Error updating account balance:', updateAccountError);
        return res.status(500).json({ error: 'Failed to process early payoff' });
      }

      const { error: paymentError } = await supabaseAdmin
        .from('loan_payments')
        .insert([{
          loan_id: loan_id,
          amount: earlyPayoffAmount,
          payment_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          payment_type: 'early_payoff',
          principal_amount: outstandingPrincipal - earlyPayoffDiscount,
          interest_amount: 0,
          late_fee: assessedFeesAndInterest,
          balance_after: 0,
          notes: `Early payoff settlement: Outstanding principal $${outstandingPrincipal.toFixed(2)} with 2% discount ($${earlyPayoffDiscount.toFixed(2)}) = $${(outstandingPrincipal - earlyPayoffDiscount).toFixed(2)}. Assessed fees/charges: $${assessedFeesAndInterest.toFixed(2)}. Total paid: $${earlyPayoffAmount.toFixed(2)}. Interest waived: $${totalInterestRemaining.toFixed(2)}. Total savings: $${interestSaved.toFixed(2)}.`
        }]);

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
      }

      const { error: updateLoanError } = await supabaseAdmin
        .from('loans')
        .update({ 
          status: 'completed',
          remaining_balance: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateLoanError) {
        console.error('Error updating loan status:', updateLoanError);
        return res.status(500).json({ error: 'Failed to close loan' });
      }

      await supabaseAdmin
        .from('transactions')
        .insert([{
          user_id: user.id,
          account_id: account.id,
          type: 'loan_payoff',
          amount: earlyPayoffAmount,
          description: `Early payoff of ${loan.loan_type} loan with 2% discount`,
          status: 'completed',
          balance_before: accountBalance,
          balance_after: newAccountBalance
        }]);

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Loan Paid Off Early',
          message: `Congratulations! You've successfully paid off your ${loan.loan_type} loan early and saved $${earlyPayoffDiscount.toFixed(2)} in interest.`,
          read: false
        }]);

      return res.status(200).json({
        success: true,
        message: 'Loan paid off successfully',
        payoff_details: {
          amount_paid: parseFloat(earlyPayoffAmount.toFixed(2)),
          discount_received: parseFloat(earlyPayoffDiscount.toFixed(2)),
          new_account_balance: parseFloat(newAccountBalance.toFixed(2))
        }
      });
    }

  } catch (error) {
    console.error('Error processing early payoff:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
