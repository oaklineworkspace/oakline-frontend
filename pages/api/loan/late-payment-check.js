
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// This should be called by a cron job daily
// Set up a cron job in your environment to call this endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify this is a cron job using CRON_SECRET from Replit Secrets
  const cronSecret = req.headers['x-cron-secret'];
  
  if (!cronSecret) {
    return res.status(401).json({ error: 'Unauthorized - Missing cron secret header' });
  }
  
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized - Invalid cron secret' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find all active loans with overdue payments
    const { data: overdueLoans, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('status', 'active')
      .lt('next_payment_date', today)
      .eq('is_late', false);

    if (loanError) throw loanError;

    const updates = [];
    for (const loan of overdueLoans || []) {
      // Calculate late fee (e.g., 5% of monthly payment or $25, whichever is greater)
      const lateFee = Math.max(
        parseFloat(loan.monthly_payment_amount) * 0.05,
        25
      );

      // Update loan as late and add late fee
      const { error: updateError } = await supabaseAdmin
        .from('loans')
        .update({
          is_late: true,
          late_fee_amount: (parseFloat(loan.late_fee_amount) || 0) + lateFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan.id);

      if (!updateError) {
        updates.push({
          loan_id: loan.id,
          late_fee: lateFee
        });

        // TODO: Send notification to user about late payment
        // TODO: Log the late payment event
      }
    }

    return res.status(200).json({
      success: true,
      processed: updates.length,
      updates
    });

  } catch (error) {
    console.error('Error processing late payments:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
