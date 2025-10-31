import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const isSystemCall = req.headers['x-system-token'] === process.env.SYSTEM_PROCESSING_TOKEN;

    if (!isSystemCall) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data: adminProfile } = await supabaseAdmin
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!adminProfile) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: activeLoans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('status', 'active')
      .not('next_payment_date', 'is', null)
      .lt('next_payment_date', today.toISOString().split('T')[0]);

    if (loansError) {
      console.error('Error fetching active loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    const processedLoans = [];
    const lateFeePercentage = 0.05;

    for (const loan of activeLoans || []) {
      const nextPaymentDate = new Date(loan.next_payment_date);
      const daysLate = Math.floor((today - nextPaymentDate) / (1000 * 60 * 60 * 24));

      if (daysLate > 0 && !loan.is_late) {
        let monthlyPayment = parseFloat(loan.monthly_payment_amount || 0);
        
        if (!monthlyPayment || monthlyPayment === 0) {
          const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
          const termMonths = parseInt(loan.term_months);
          const principal = parseFloat(loan.principal);
          
          if (monthlyRate === 0) {
            monthlyPayment = principal / termMonths;
          } else {
            monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                           (Math.pow(1 + monthlyRate, termMonths) - 1);
          }
        }
        
        const lateFee = monthlyPayment * lateFeePercentage;
        const currentBalance = parseFloat(loan.remaining_balance || 0);

        const { error: updateError } = await supabaseAdmin
          .from('loans')
          .update({
            is_late: true,
            late_fee_amount: lateFee,
            remaining_balance: currentBalance + lateFee,
            updated_at: new Date().toISOString()
          })
          .eq('id', loan.id);

        if (!updateError) {
          await supabaseAdmin
            .from('loan_payments')
            .insert([{
              loan_id: loan.id,
              amount: lateFee,
              payment_date: new Date().toISOString().split('T')[0],
              status: 'pending',
              payment_type: 'late_fee',
              principal_amount: 0,
              interest_amount: 0,
              late_fee: lateFee,
              balance_after: currentBalance + lateFee,
              notes: `Late fee assessed: Payment ${daysLate} days overdue. ${lateFeePercentage * 100}% of monthly payment ($${monthlyPayment.toFixed(2)}). Fee added to balance.`
            }]);

          await supabaseAdmin
            .from('notifications')
            .insert([{
              user_id: loan.user_id,
              type: 'loan',
              title: 'Late Payment Notice',
              message: `Your ${loan.loan_type} loan payment is ${daysLate} days late. A late fee of $${lateFee.toFixed(2)} has been applied.`,
              read: false
            }]);

          processedLoans.push({
            loan_id: loan.id,
            loan_type: loan.loan_type,
            days_late: daysLate,
            late_fee: parseFloat(lateFee.toFixed(2))
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${processedLoans.length} late loans`,
      processed_loans: processedLoans
    });

  } catch (error) {
    console.error('Error processing late payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
