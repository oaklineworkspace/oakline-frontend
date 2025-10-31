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

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loan_id)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payment history:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    const enrichedPayments = (payments || []).map(payment => ({
      id: payment.id,
      amount: parseFloat(payment.amount),
      principal_amount: parseFloat(payment.principal_amount || 0),
      interest_amount: parseFloat(payment.interest_amount || 0),
      late_fee: parseFloat(payment.late_fee || 0),
      balance_after: parseFloat(payment.balance_after || 0),
      payment_date: payment.payment_date,
      status: payment.status,
      payment_type: payment.payment_type || 'manual',
      reference_number: payment.reference_number,
      notes: payment.notes,
      created_at: payment.created_at
    }));

    const totalPaid = enrichedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPrincipalPaid = enrichedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.principal_amount, 0);

    const totalInterestPaid = enrichedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.interest_amount, 0);

    const totalLateFees = enrichedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.late_fee, 0);

    return res.status(200).json({
      success: true,
      loan_info: {
        loan_id: loan.id,
        loan_type: loan.loan_type,
        principal: parseFloat(loan.principal),
        remaining_balance: parseFloat(loan.remaining_balance || 0),
        status: loan.status
      },
      payment_summary: {
        total_payments: enrichedPayments.length,
        completed_payments: enrichedPayments.filter(p => p.status === 'completed').length,
        pending_payments: enrichedPayments.filter(p => p.status === 'pending').length,
        failed_payments: enrichedPayments.filter(p => p.status === 'failed').length,
        total_paid: parseFloat(totalPaid.toFixed(2)),
        total_principal_paid: parseFloat(totalPrincipalPaid.toFixed(2)),
        total_interest_paid: parseFloat(totalInterestPaid.toFixed(2)),
        total_late_fees: parseFloat(totalLateFees.toFixed(2))
      },
      payments: enrichedPayments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
