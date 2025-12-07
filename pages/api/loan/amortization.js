
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { loan_id } = req.query;

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

    // Fetch completed payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loan_id)
      .eq('status', 'completed')
      .order('payment_date', { ascending: true });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    const principal = parseFloat(loan.principal);
    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const termMonths = parseInt(loan.term_months);
    const paymentsMade = parseInt(loan.payments_made || 0);
    const currentRemainingBalance = parseFloat(loan.remaining_balance || 0);

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / termMonths;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    // Calculate total amount paid so far
    const totalPaid = payments && payments.length > 0
      ? payments.reduce((sum, p) => sum + parseFloat(p.principal_amount || 0), 0)
      : 0;

    // Generate amortization schedule with actual payment tracking
    const schedule = [];
    let simulatedBalance = principal;
    let actualPaymentIndex = 0;

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = simulatedBalance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, simulatedBalance);
      simulatedBalance = Math.max(0, simulatedBalance - principalPayment);

      const paymentDate = new Date(loan.start_date || loan.created_at);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      // Determine if this payment has been made based on actual payments and remaining balance
      // If the user has paid more than expected, mark additional payments as paid
      const principalPaidSoFar = principal - currentRemainingBalance;
      const expectedPrincipalForPayment = principal - simulatedBalance;
      const isPaid = expectedPrincipalForPayment <= principalPaidSoFar;

      schedule.push({
        payment_number: i,
        payment_date: paymentDate.toISOString().split('T')[0],
        payment_amount: parseFloat(monthlyPayment.toFixed(2)),
        principal_amount: parseFloat(principalPayment.toFixed(2)),
        interest_amount: parseFloat(interestPayment.toFixed(2)),
        remaining_balance: parseFloat(simulatedBalance.toFixed(2)),
        is_paid: isPaid
      });

      // Stop generating future payments if balance is paid off
      if (currentRemainingBalance <= 0.01 && isPaid) {
        break;
      }
    }

    // Calculate actual remaining payments
    const remainingPayments = schedule.filter(s => !s.is_paid);
    const paidPayments = schedule.filter(s => s.is_paid);
    
    const totalInterestPaid = paidPayments.reduce((sum, s) => sum + s.interest_amount, 0);
    const totalInterestRemaining = remainingPayments.reduce((sum, s) => sum + s.interest_amount, 0);
    const totalInterest = totalInterestPaid + totalInterestRemaining;
    
    const totalAmountPaid = principal - currentRemainingBalance + totalInterestPaid;
    const totalAmountRemaining = currentRemainingBalance + totalInterestRemaining;

    return res.status(200).json({
      success: true,
      loan_details: {
        loan_id: loan.id,
        loan_type: loan.loan_type,
        principal: parseFloat(loan.principal),
        interest_rate: parseFloat(loan.interest_rate),
        term_months: termMonths,
        payments_made: paymentsMade,
        remaining_payments: remainingPayments.length,
        status: loan.status,
        current_balance: parseFloat(currentRemainingBalance.toFixed(2))
      },
      schedule,
      summary: {
        total_interest: parseFloat(totalInterest.toFixed(2)),
        total_interest_paid: parseFloat(totalInterestPaid.toFixed(2)),
        total_interest_remaining: parseFloat(totalInterestRemaining.toFixed(2)),
        total_amount_paid: parseFloat(totalAmountPaid.toFixed(2)),
        total_amount_remaining: parseFloat(totalAmountRemaining.toFixed(2)),
        monthly_payment: parseFloat(monthlyPayment.toFixed(2)),
        payments_completed: paidPayments.length,
        payments_remaining: remainingPayments.length
      }
    });

  } catch (error) {
    console.error('Error generating amortization schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
