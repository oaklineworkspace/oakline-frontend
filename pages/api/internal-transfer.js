
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

    const {
      from_account_id,
      to_account_number,
      amount,
      memo
    } = req.body;

    if (!from_account_id || !to_account_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0 || isNaN(transferAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: fromAccount, error: fromAccountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', from_account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (fromAccountError || !fromAccount) {
      return res.status(404).json({ error: 'Source account not found or inactive' });
    }

    if (parseFloat(fromAccount.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Try to find the recipient account (exact match after trimming)
    const { data: toAccount, error: toAccountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('account_number', to_account_number.trim())
      .eq('status', 'active')
      .single();

    if (toAccountError || !toAccount) {
      console.error('Recipient account lookup error:', toAccountError);
      return res.status(404).json({ 
        error: 'Recipient account not found or inactive. Please verify the account number.',
        details: toAccountError?.message 
      });
    }

    if (from_account_id === toAccount.id) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    const transferGroupId = crypto.randomUUID();
    const referenceNumber = `INT-${transferGroupId.substring(0, 8).toUpperCase()}`;
    const debitReference = `${referenceNumber}-DR`;
    const creditReference = `${referenceNumber}-CR`;
    const newFromBalance = parseFloat(fromAccount.balance) - transferAmount;
    const newToBalance = parseFloat(toAccount.balance) + transferAmount;

    const { error: debitError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newFromBalance, updated_at: new Date().toISOString() })
      .eq('id', from_account_id);

    if (debitError) {
      console.error('Error debiting account:', debitError);
      return res.status(500).json({ error: 'Failed to debit sender account' });
    }

    const { error: creditError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newToBalance, updated_at: new Date().toISOString() })
      .eq('id', toAccount.id);

    if (creditError) {
      console.error('Error crediting account:', creditError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: parseFloat(fromAccount.balance) })
        .eq('id', from_account_id);
      return res.status(500).json({ error: 'Failed to credit recipient account' });
    }

    // Get recipient profile info - try profiles table first
    let recipientName = 'Oakline User';
    
    if (toAccount.user_id) {
      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', toAccount.user_id)
        .single();

      if (recipientProfile && recipientProfile.first_name && recipientProfile.last_name) {
        recipientName = `${recipientProfile.first_name} ${recipientProfile.last_name}`.trim();
      }
    }
    
    // If no profile found, try applications table
    if (recipientName === 'Oakline User' && toAccount.application_id) {
      const { data: application } = await supabaseAdmin
        .from('applications')
        .select('first_name, last_name')
        .eq('id', toAccount.application_id)
        .single();

      if (application && application.first_name && application.last_name) {
        recipientName = `${application.first_name} ${application.last_name}`.trim();
      }
    }

    // Get sender profile info
    const { data: senderProfile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const senderName = senderProfile 
      ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim()
      : 'Oakline User';

    const { error: transactionError } = await supabaseAdmin.from('transactions').insert([
      {
        user_id: user.id,
        account_id: from_account_id,
        type: 'debit',
        amount: transferAmount,
        description: `Internal transfer to ${recipientName} (${toAccount.account_number})`,
        status: 'completed',
        reference: debitReference,
        balance_before: parseFloat(fromAccount.balance),
        balance_after: newFromBalance
      },
      {
        user_id: toAccount.user_id,
        account_id: toAccount.id,
        type: 'credit',
        amount: transferAmount,
        description: `Internal transfer from ${senderName} (${fromAccount.account_number})`,
        status: 'completed',
        reference: creditReference,
        balance_before: parseFloat(toAccount.balance),
        balance_after: newToBalance
      }
    ]);

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: parseFloat(fromAccount.balance) })
        .eq('id', from_account_id);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: parseFloat(toAccount.balance) })
        .eq('id', toAccount.id);
      return res.status(500).json({ error: 'Failed to create transaction records' });
    }

    const { error: notificationError } = await supabaseAdmin.from('notifications').insert([
      {
        user_id: user.id,
        type: 'transfer',
        title: 'Transfer Sent',
        message: `You transferred $${transferAmount.toFixed(2)} to ${recipientName}`
      },
      {
        user_id: toAccount.user_id,
        type: 'transfer',
        title: 'Transfer Received',
        message: `You received $${transferAmount.toFixed(2)} from ${senderName}`
      }
    ]);

    if (notificationError) {
      console.error('Notification error:', notificationError);
    }

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert([
      {
        user_id: user.id,
        action: 'internal_transfer',
        table_name: 'accounts',
        old_data: {
          from_balance: parseFloat(fromAccount.balance),
          to_balance: parseFloat(toAccount.balance)
        },
        new_data: {
          from_balance: newFromBalance,
          to_balance: newToBalance,
          amount: transferAmount,
          reference: referenceNumber,
          transfer_group_id: transferGroupId
        }
      }
    ]);

    if (auditError) {
      console.error('Audit log error:', auditError);
    }

    const { error: systemLogError } = await supabaseAdmin.from('system_logs').insert([{
      level: 'info',
      type: 'transaction',
      message: `Internal transfer completed: ${referenceNumber}`,
      details: {
        from_account: fromAccount.account_number,
        to_account: to_account_number,
        amount: transferAmount,
        reference: referenceNumber,
        transfer_group_id: transferGroupId
      },
      user_id: user.id
    }]);

    if (systemLogError) {
      console.error('System log error:', systemLogError);
    }

    return res.status(200).json({
      success: true,
      message: 'Your transfer has been completed successfully and funds are now available to the recipient.',
      reference_number: referenceNumber,
      transfer_group_id: transferGroupId,
      new_balance: newFromBalance
    });

  } catch (error) {
    console.error('Internal transfer error:', error);
    return res.status(500).json({ error: error.message || 'Transfer failed' });
  }
}
