
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sender_id,
      from_account_id,
      to_account_number,
      amount,
      memo
    } = req.body;

    // Validate inputs
    if (!sender_id || !from_account_id || !to_account_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get sender's account
    const { data: fromAccount, error: fromAccountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', from_account_id)
      .eq('user_id', sender_id)
      .eq('status', 'active')
      .single();

    if (fromAccountError || !fromAccount) {
      return res.status(404).json({ error: 'Source account not found or inactive' });
    }

    // Check balance
    if (parseFloat(fromAccount.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Find recipient account
    const { data: toAccount, error: toAccountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_number', to_account_number)
      .eq('status', 'active')
      .single();

    if (toAccountError || !toAccount) {
      return res.status(404).json({ error: 'Recipient account not found or inactive' });
    }

    // Check if transferring to same account
    if (from_account_id === toAccount.id) {
      return res.status(400).json({ error: 'Cannot transfer to the same account' });
    }

    // Generate reference number
    const referenceNumber = `INT${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // Deduct from sender
    const newFromBalance = parseFloat(fromAccount.balance) - transferAmount;
    await supabase
      .from('accounts')
      .update({ balance: newFromBalance, updated_at: new Date().toISOString() })
      .eq('id', from_account_id);

    // Add to recipient
    const newToBalance = parseFloat(toAccount.balance) + transferAmount;
    await supabase
      .from('accounts')
      .update({ balance: newToBalance, updated_at: new Date().toISOString() })
      .eq('id', toAccount.id);

    // Create sender transaction record (debit)
    await supabase.from('transactions').insert([{
      user_id: sender_id,
      account_id: from_account_id,
      type: 'transfer_out',
      amount: transferAmount,
      description: `Transfer to account ${to_account_number} - ${memo || 'Internal Transfer'}`,
      status: 'completed',
      reference: referenceNumber
    }]);

    // Create recipient transaction record (credit)
    await supabase.from('transactions').insert([{
      user_id: toAccount.user_id,
      account_id: toAccount.id,
      type: 'transfer_in',
      amount: transferAmount,
      description: `Transfer from account ${fromAccount.account_number} - ${memo || 'Internal Transfer'}`,
      status: 'completed',
      reference: referenceNumber
    }]);

    // Create notifications
    await supabase.from('notifications').insert([
      {
        user_id: sender_id,
        type: 'transfer',
        title: 'Transfer Sent',
        message: `You transferred $${transferAmount.toFixed(2)} to account ${to_account_number}`
      },
      {
        user_id: toAccount.user_id,
        type: 'transfer',
        title: 'Transfer Received',
        message: `You received $${transferAmount.toFixed(2)} from account ${fromAccount.account_number}`
      }
    ]);

    // Log transaction
    await supabase.from('system_logs').insert([{
      level: 'info',
      type: 'transaction',
      message: 'Internal transfer completed',
      details: {
        from_account: fromAccount.account_number,
        to_account: to_account_number,
        amount: transferAmount,
        reference: referenceNumber
      },
      user_id: sender_id
    }]);

    return res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      reference_number: referenceNumber,
      new_balance: newFromBalance
    });

  } catch (error) {
    console.error('Internal transfer error:', error);
    return res.status(500).json({ error: error.message || 'Transfer failed' });
  }
}
