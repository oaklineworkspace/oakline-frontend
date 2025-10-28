import { verifyAdminAccess } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isAdmin, error: authError } = await verifyAdminAccess(req);

    if (!isAdmin) {
      return res.status(403).json({ error: authError || 'Unauthorized - Admin access required' });
    }

    const { loan_id } = req.body;

    if (!loan_id) {
      return res.status(400).json({ error: 'Missing loan_id' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Only active loans can be closed' });
    }

    if (loan.remaining_balance > 0.01) {
      return res.status(400).json({ error: 'Loan cannot be closed until fully repaid' });
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .eq('id', loan_id);

    if (updateLoanError) {
      console.error('Error updating loan status:', updateLoanError);
      return res.status(500).json({ error: 'Failed to close loan' });
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: loan.user_id,
        type: 'loan',
        title: 'Loan Closed',
        message: `Congratulations! Your ${loan.loan_type} loan has been fully repaid and closed.`,
        read: false
      }]);

    return res.status(200).json({
      success: true,
      message: 'Loan closed successfully'
    });

  } catch (error) {
    console.error('Error closing loan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
