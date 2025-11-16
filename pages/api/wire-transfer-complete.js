import { supabaseAdmin } from '../../lib/supabaseAdmin';

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

    const { transfer_id, verification_code } = req.body;

    if (!transfer_id || !verification_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: verificationRecord } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', verification_code)
      .eq('type', 'wire')
      .eq('reference_id', transfer_id)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (!verificationRecord) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const { data: transfer, error: transferFetchError } = await supabaseAdmin
      .from('wire_transfers')
      .select('*')
      .eq('id', transfer_id)
      .eq('user_id', user.id)
      .single();

    if (transferFetchError || !transfer) {
      return res.status(404).json({ error: 'Wire transfer not found' });
    }

    const { data: account, error: accountFetchError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', transfer.from_account_id)
      .single();

    if (accountFetchError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const currentBalance = parseFloat(account.balance);
    const transferAmount = parseFloat(transfer.amount);

    if (currentBalance < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const newBalance = currentBalance - transferAmount;

    const { error: debitError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', transfer.from_account_id);

    if (debitError) {
      console.error('Debit error:', debitError);
      return res.status(500).json({ error: 'Failed to debit account' });
    }

    const { error: transferUpdateError } = await supabaseAdmin
      .from('wire_transfers')
      .update({
        status: 'processing',
        verified_at: new Date().toISOString()
      })
      .eq('id', transfer_id);

    if (transferUpdateError) {
      console.error('Transfer update error:', transferUpdateError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: currentBalance })
        .eq('id', transfer.from_account_id);
      return res.status(500).json({ error: 'Failed to update transfer status' });
    }

    const { error: codeUpdateError } = await supabaseAdmin
      .from('verification_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', verificationRecord.id);

    if (codeUpdateError) {
      console.error('Code update error:', codeUpdateError);
    }

    const transferGroupId = crypto.randomUUID();
    
    const { error: transactionError } = await supabaseAdmin.from('transactions').insert([{
      user_id: user.id,
      account_id: transfer.from_account_id,
      type: 'wire_transfer',
      amount: transfer.amount,
      description: `Wire transfer to ${transfer.beneficiary_name} - ${transfer.beneficiary_bank}`,
      status: 'completed',
      reference: transfer.reference_number,
      transfer_group_id: transferGroupId,
      transfer_type: 'wire'
    }]);

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: currentBalance })
        .eq('id', transfer.from_account_id);
      await supabaseAdmin
        .from('wire_transfers')
        .update({ status: 'pending' })
        .eq('id', transfer_id);
      return res.status(500).json({ error: 'Failed to create transaction record' });
    }

    const { error: notificationError } = await supabaseAdmin.from('notifications').insert([{
      user_id: user.id,
      type: 'wire_transfer',
      title: 'Wire Transfer Processing',
      message: `Your wire transfer of $${transfer.amount} to ${transfer.beneficiary_name} is now processing`
    }]);

    if (notificationError) {
      console.error('Notification error:', notificationError);
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert([{
      user_id: user.id,
      action: 'wire_transfer_complete',
      table_name: 'wire_transfers',
      old_data: {
        status: 'pending',
        balance: currentBalance
      },
      new_data: {
        status: 'processing',
        balance: newBalance,
        amount: transfer.amount,
        reference: transfer.reference_number
      }
    }]);

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    const maskAccountNumber = (accountNumber) => {
      if (!accountNumber || accountNumber.length < 4) return '****';
      return `****${accountNumber.slice(-4)}`;
    };

    const { error: systemLogError } = await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      type: 'transaction',
      action: 'wire_transfer_completed',
      category: 'transaction',
      message: `Wire transfer of $${transfer.amount} to ${transfer.beneficiary_name} completed`,
      details: {
        amount: transfer.amount,
        beneficiary_name: transfer.beneficiary_name,
        beneficiary_bank: transfer.beneficiary_bank,
        beneficiary_account: maskAccountNumber(transfer.account_number),
        swift_code: transfer.swift_code || null,
        reference: transfer.reference_number,
        status: 'processing',
        transfer_type: 'wire'
      }
    }]);

    if (systemLogError) {
      console.error('System log error:', systemLogError);
    }

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
