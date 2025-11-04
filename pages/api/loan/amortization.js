
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

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / termMonths;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    // Generate amortization schedule
    const schedule = [];
    let remainingBalance = principal;

    for (let i = 1; i <= termMonths; i++) {
      const interestPayment = remainingBalance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      remainingBalance = Math.max(0, remainingBalance - principalPayment);

      const paymentDate = new Date(loan.start_date || loan.created_at);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      schedule.push({
        payment_number: i,
        payment_date: paymentDate.toISOString().split('T')[0],
        payment_amount: parseFloat(monthlyPayment.toFixed(2)),
        principal_amount: parseFloat(principalPayment.toFixed(2)),
        interest_amount: parseFloat(interestPayment.toFixed(2)),
        remaining_balance: parseFloat(remainingBalance.toFixed(2)),
        is_paid: i <= paymentsMade
      });
    }

    const totalInterest = (monthlyPayment * termMonths) - principal;
    const totalPayments = monthlyPayment * termMonths;

    return res.status(200).json({
      success: true,
      loan_details: {
        loan_id: loan.id,
        loan_type: loan.loan_type,
        principal: parseFloat(loan.principal),
        interest_rate: parseFloat(loan.interest_rate),
        term_months: termMonths,
        payments_made: paymentsMade,
        status: loan.status
      },
      schedule,
      summary: {
        total_interest: parseFloat(totalInterest.toFixed(2)),
        total_payments: parseFloat(totalPayments.toFixed(2)),
        monthly_payment: parseFloat(monthlyPayment.toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error generating amortization schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
