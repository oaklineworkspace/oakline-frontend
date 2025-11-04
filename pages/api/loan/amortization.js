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

    const principal = parseFloat(loan.principal);
    const annualRate = parseFloat(loan.interest_rate) / 100;
    const monthlyRate = annualRate / 12;
    const termMonths = parseInt(loan.term_months);
    
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / termMonths;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                      (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loan_id)
      .eq('status', 'completed')
      .order('payment_date', { ascending: true });

    const paymentsMade = payments ? payments.length : 0;
    const totalPaid = payments ? payments.reduce((sum, p) => sum + parseFloat(p.amount), 0) : 0;

    const schedule = [];
    let balance = principal;
    const startDate = new Date(loan.start_date || loan.created_at);

    for (let month = 1; month <= termMonths; month++) {
      const interestPayment = balance * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      balance = Math.max(0, balance - principalPayment);

      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + month);

      const isPaid = month <= paymentsMade;
      const actualPayment = isPaid && payments[month - 1] ? parseFloat(payments[month - 1].amount) : null;

      schedule.push({
        payment_number: month,
        payment_date: paymentDate.toISOString().split('T')[0],
        payment_amount: parseFloat(monthlyPayment.toFixed(2)),
        scheduled_payment: parseFloat(monthlyPayment.toFixed(2)),
        principal_amount: parseFloat(principalPayment.toFixed(2)),
        principal: parseFloat(principalPayment.toFixed(2)),
        interest_amount: parseFloat(interestPayment.toFixed(2)),
        interest: parseFloat(interestPayment.toFixed(2)),
        remaining_balance: parseFloat(balance.toFixed(2)),
        is_paid: isPaid,
        actual_payment: actualPayment,
        status: isPaid ? 'paid' : (new Date(paymentDate) < new Date() ? 'overdue' : 'upcoming')
      });
    }

    const totalInterest = schedule.reduce((sum, p) => sum + p.interest, 0);
    const totalAmount = principal + totalInterest;

    return res.status(200).json({
      success: true,
      loan_details: {
        loan_id: loan.id,
        loan_type: loan.loan_type,
        principal: principal,
        interest_rate: loan.interest_rate,
        term_months: termMonths,
        monthly_payment: parseFloat(monthlyPayment.toFixed(2)),
        total_interest: parseFloat(totalInterest.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
        payments_made: paymentsMade,
        total_paid: parseFloat(totalPaid.toFixed(2)),
        remaining_balance: parseFloat(loan.remaining_balance || balance),
        status: loan.status
      },
      schedule: schedule,
      summary: {
        total_interest: parseFloat(totalInterest.toFixed(2)),
        total_payments: parseFloat(totalAmount.toFixed(2)),
        payments_remaining: termMonths - paymentsMade
      },
      amortization_schedule: schedule
    });

  } catch (error) {
    console.error('Error generating amortization schedule:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
