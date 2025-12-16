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

    // Fetch loans
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    // For each loan, fetch related deposit payments
    const loansWithDeposits = await Promise.all(
      (loans || []).map(async (loan) => {
        // Fetch deposit payments for this loan
        const { data: deposits, error: depositsError } = await supabaseAdmin
          .from('loan_payments')
          .select('*')
          .eq('loan_id', loan.id)
          .eq('is_deposit', true)
          .order('created_at', { ascending: false });

        const depositTransactions = depositsError ? [] : (deposits || []);
        
        // Calculate total deposits paid (completed deposits only)
        const totalDepositsPaid = depositTransactions
          .filter(d => d.status === 'completed')
          .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        
        // Calculate pending deposits (submitted but not yet confirmed)
        const totalDepositsPending = depositTransactions
          .filter(d => d.status === 'pending' || d.status === 'processing')
          .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        
        const depositRequired = parseFloat(loan.deposit_required || 0);
        const depositRemaining = Math.max(0, depositRequired - totalDepositsPaid);
        
        // Deposit is fully paid if total completed deposits >= required
        const isDepositFullyPaid = totalDepositsPaid >= depositRequired && depositRequired > 0;
        
        // Determine deposit status based on payments
        let effectiveDepositStatus = loan.deposit_status;
        let effectiveDepositPaid = loan.deposit_paid;
        
        if (isDepositFullyPaid) {
          effectiveDepositStatus = 'completed';
          effectiveDepositPaid = true;
        } else if (totalDepositsPending > 0) {
          effectiveDepositStatus = 'pending';
        } else if (totalDepositsPaid > 0 && totalDepositsPaid < depositRequired) {
          effectiveDepositStatus = 'partial';
        }
        
        return {
          ...loan,
          deposit_transactions: depositTransactions,
          // Calculated deposit progress fields
          total_deposits_paid: totalDepositsPaid,
          total_deposits_pending: totalDepositsPending,
          deposit_remaining: depositRemaining,
          deposit_progress_percent: depositRequired > 0 ? Math.min(100, (totalDepositsPaid / depositRequired) * 100) : 0,
          // Override deposit_paid and deposit_status based on actual payments
          deposit_paid: effectiveDepositPaid,
          deposit_status: effectiveDepositStatus
        };
      })
    );

    return res.status(200).json({
      success: true,
      loans: loansWithDeposits || []
    });

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
