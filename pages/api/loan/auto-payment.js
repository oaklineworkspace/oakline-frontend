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

    const { loan_id, enabled, account_id, payment_day } = req.body;

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
      return res.status(400).json({ error: 'Auto-payment can only be set up for active loans' });
    }

    if (enabled) {
      if (!account_id) {
        return res.status(400).json({ error: 'Account ID is required to enable auto-payment' });
      }

      const { data: account, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', account_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (accountError || !account) {
        return res.status(404).json({ error: 'Valid active account not found' });
      }

      const dayOfMonth = payment_day || 1;
      if (dayOfMonth < 1 || dayOfMonth > 28) {
        return res.status(400).json({ error: 'Payment day must be between 1 and 28' });
      }

      const { error: updateError } = await supabaseAdmin
        .from('loans')
        .update({
          auto_payment_enabled: true,
          auto_payment_account_id: account_id,
          auto_payment_day: dayOfMonth,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateError) {
        console.error('Error enabling auto-payment:', updateError);
        return res.status(500).json({ error: 'Failed to enable auto-payment' });
      }

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Auto-Payment Activated',
          message: `Auto-payment has been enabled for your ${loan.loan_type} loan. Payments will be processed on day ${dayOfMonth} of each month.`,
          read: false
        }]);

      return res.status(200).json({
        success: true,
        message: 'Auto-payment enabled successfully',
        auto_payment: {
          enabled: true,
          account_id: account_id,
          payment_day: dayOfMonth
        }
      });

    } else {
      const { error: updateError } = await supabaseAdmin
        .from('loans')
        .update({
          auto_payment_enabled: false,
          auto_payment_account_id: null,
          auto_payment_day: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', loan_id);

      if (updateError) {
        console.error('Error disabling auto-payment:', updateError);
        return res.status(500).json({ error: 'Failed to disable auto-payment' });
      }

      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Auto-Payment Deactivated',
          message: `Auto-payment has been disabled for your ${loan.loan_type} loan. You will need to make manual payments.`,
          read: false
        }]);

      return res.status(200).json({
        success: true,
        message: 'Auto-payment disabled successfully',
        auto_payment: {
          enabled: false
        }
      });
    }

  } catch (error) {
    console.error('Error managing auto-payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
