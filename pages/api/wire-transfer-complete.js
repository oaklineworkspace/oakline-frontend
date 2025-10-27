import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, transfer_id, verification_code } = req.body;

    if (!user_id || !transfer_id || !verification_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: verificationRecord } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('code', verification_code)
      .eq('type', 'wire')
      .eq('reference_id', transfer_id)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const { data: transfer } = await supabaseAdmin
      .from('wire_transfers')
      .select('*')
      .eq('id', transfer_id)
      .eq('user_id', user_id)
      .single();

    if (!transfer) {
      return res.status(404).json({ error: 'Wire transfer not found' });
    }

    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', transfer.from_account_id)
      .single();

    const newBalance = parseFloat(account.balance) - parseFloat(transfer.amount);

    const { error: debitError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', transfer.from_account_id);

    if (debitError) {
      return res.status(500).json({ error: 'Failed to debit account' });
    }

    await supabaseAdmin
      .from('wire_transfers')
      .update({
        status: 'processing',
        verified_at: new Date().toISOString()
      })
      .eq('id', transfer_id);

    await supabaseAdmin
      .from('verification_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', verificationRecord.id);

    await supabaseAdmin.from('transactions').insert([{
      user_id,
      account_id: transfer.from_account_id,
      type: 'debit',
      category: 'wire_transfer',
      amount: transfer.amount,
      description: `Wire transfer to ${transfer.beneficiary_name}`,
      status: 'completed'
    }]);

    await supabaseAdmin.from('notifications').insert([{
      user_id,
      type: 'wire',
      title: 'Wire Transfer Processing',
      message: `Your wire transfer of $${transfer.amount} to ${transfer.beneficiary_name} is now processing`,
      priority: 'high'
    }]);

    await supabaseAdmin.from('system_logs').insert([{
      user_id,
      level: 'info',
      type: 'wire_transfer_completed',
      message: 'Wire transfer completed',
      details: { reference_number: transfer.reference_number, amount: transfer.amount }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Wire transfer processing',
      reference_number: transfer.reference_number
    });

  } catch (error) {
    console.error('Wire transfer completion error:', error);
    return res.status(500).json({
      error: 'Failed to complete wire transfer',
      message: error.message
    });
  }
}
