import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { admin_user_id, deposit_id, action, review_notes, rejection_reason } = req.body;

    if (!admin_user_id || !deposit_id || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    const { data: deposit } = await supabaseAdmin
      .from('mobile_deposits')
      .select('*')
      .eq('id', deposit_id)
      .single();

    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }

    if (deposit.status !== 'pending' && deposit.status !== 'under_review') {
      return res.status(400).json({ error: 'Deposit has already been reviewed' });
    }

    if (action === 'approve') {
      const { data: account } = await supabaseAdmin
        .from('accounts')
        .select('balance')
        .eq('id', deposit.account_id)
        .single();

      const newBalance = parseFloat(account.balance) + parseFloat(deposit.amount);

      const { error: creditError } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', deposit.account_id);

      if (creditError) {
        return res.status(500).json({ error: 'Failed to credit account' });
      }

      await supabaseAdmin
        .from('mobile_deposits')
        .update({
          status: 'approved',
          reviewed_by: admin_user_id,
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
          deposited_at: new Date().toISOString()
        })
        .eq('id', deposit_id);

      await supabaseAdmin.from('transactions').insert([{
        user_id: deposit.user_id,
        account_id: deposit.account_id,
        type: 'credit',
        category: 'mobile_deposit',
        amount: deposit.amount,
        description: 'Mobile Check Deposit',
        status: 'completed'
      }]);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', deposit.user_id)
        .single();

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: 'Oakline Bank - Mobile Deposit Approved',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9fc;">
              <div style="background-color: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #10b981;">✅ Mobile Deposit Approved</h2>
                <p>Great news! Your mobile check deposit has been approved and the funds have been added to your account.</p>
                <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #065f46; font-size: 14px; margin: 0;">
                    <strong>Reference:</strong> ${deposit.reference_number}<br/>
                    <strong>Amount:</strong> $${parseFloat(deposit.amount).toFixed(2)}<br/>
                    <strong>New Balance:</strong> $${newBalance.toFixed(2)}
                  </p>
                </div>
                <p>The funds are now available in your account.</p>
              </div>
            </div>
          `
        });
      }

      await supabaseAdmin.from('notifications').insert([{
        user_id: deposit.user_id,
        type: 'mobile_deposit',
        title: 'Mobile Deposit Approved',
        message: `Your deposit of $${deposit.amount} has been approved`,
        priority: 'high'
      }]);

      return res.status(200).json({
        success: true,
        message: 'Deposit approved and funds credited'
      });

    } else if (action === 'reject') {
      await supabaseAdmin
        .from('mobile_deposits')
        .update({
          status: 'rejected',
          reviewed_by: admin_user_id,
          reviewed_at: new Date().toISOString(),
          review_notes: review_notes || null,
          rejection_reason: rejection_reason || 'No reason provided'
        })
        .eq('id', deposit_id);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', deposit.user_id)
        .single();

      if (profile?.email) {
        await sendEmail({
          to: profile.email,
          subject: 'Oakline Bank - Mobile Deposit Update',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9fc;">
              <div style="background-color: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #ef4444;">Mobile Deposit Unable to Process</h2>
                <p>We're unable to process your mobile check deposit at this time.</p>
                <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991b1b; font-size: 14px; margin: 0;">
                    <strong>Reference:</strong> ${deposit.reference_number}<br/>
                    <strong>Amount:</strong> $${parseFloat(deposit.amount).toFixed(2)}<br/>
                    <strong>Reason:</strong> ${rejection_reason || 'Please contact support for details'}
                  </p>
                </div>
                <p>If you have questions, please contact us at support@theoaklinebank.com or call (555) 123-4567.</p>
              </div>
            </div>
          `
        });
      }

      await supabaseAdmin.from('notifications').insert([{
        user_id: deposit.user_id,
        type: 'mobile_deposit',
        title: 'Mobile Deposit Update Required',
        message: `Your deposit of $${deposit.amount} needs attention`,
        priority: 'high'
      }]);

      return res.status(200).json({
        success: true,
        message: 'Deposit rejected'
      });
    }

  } catch (error) {
    console.error('Mobile deposit review error:', error);
    return res.status(500).json({
      error: 'Failed to review deposit',
      message: error.message
    });
  }
}
