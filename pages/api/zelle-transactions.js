
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sender_id,
      sender_account_id,
      recipient_contact,
      amount,
      memo,
      transaction_type
    } = req.body;

    // Validate inputs
    if (!sender_id || !sender_account_id || !recipient_contact || !amount || !transaction_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get sender's Zelle settings and check limits
    const { data: zelleSettings } = await supabase
      .from('zelle_settings')
      .select('*')
      .eq('user_id', sender_id)
      .single();

    const dailyLimit = zelleSettings?.daily_limit || 2500;
    if (transferAmount > dailyLimit) {
      return res.status(400).json({ error: `Amount exceeds daily limit of $${dailyLimit}` });
    }

    // Get sender's account
    const { data: senderAccount, error: senderAccountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', sender_account_id)
      .eq('status', 'active')
      .single();

    if (senderAccountError || !senderAccount) {
      return res.status(404).json({ error: 'Sender account not found or inactive' });
    }

    // Check balance
    if (parseFloat(senderAccount.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Find recipient by email or phone
    let recipientUserId = null;
    let recipientAccountId = null;

    // Check if recipient exists in auth.users
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(recipient_contact);

    if (isEmail) {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipient_contact)
        .single();

      recipientUserId = recipientProfile?.id;
    } else {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', recipient_contact)
        .single();

      recipientUserId = recipientProfile?.id;
    }

    // If recipient exists, get their account
    if (recipientUserId) {
      const { data: recipientAccount } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', recipientUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      recipientAccountId = recipientAccount?.id;
    }

    // Generate reference number
    const referenceNumber = `ZELLE${Date.now()}${Math.floor(Math.random() * 10000)}`;

    // Create Zelle transaction
    const { data: zelleTransaction, error: zelleError } = await supabase
      .from('zelle_transactions')
      .insert([{
        sender_id,
        sender_account_id,
        recipient_contact,
        recipient_user_id: recipientUserId,
        amount: transferAmount,
        memo: memo || 'Zelle Transfer',
        transaction_type,
        status: recipientUserId ? 'completed' : 'pending',
        reference_number: referenceNumber,
        processed_at: recipientUserId ? new Date().toISOString() : null
      }])
      .select()
      .single();

    if (zelleError) throw zelleError;

    // If recipient exists, process the transfer using the database function
    if (recipientUserId && recipientAccountId) {
      // Call the process_zelle_transfer function
      const { error: processError } = await supabase.rpc('process_zelle_transfer', {
        p_zelle_id: zelleTransaction.id
      });

      if (processError) {
        console.error('Error processing Zelle transfer:', processError);
        
        // Update Zelle transaction to failed
        await supabase
          .from('zelle_transactions')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', zelleTransaction.id);
        
        throw new Error('Failed to process Zelle transfer');
      }

      // Create notifications
      await supabase.from('notifications').insert([
        {
          user_id: sender_id,
          type: 'zelle',
          title: 'Zelle Payment Sent',
          message: `You sent $${transferAmount.toFixed(2)} to ${recipient_contact} via Zelle`
        },
        {
          user_id: recipientUserId,
          type: 'zelle',
          title: 'Zelle Payment Received',
          message: `You received $${transferAmount.toFixed(2)} via Zelle - ${memo || 'Transfer'}`
        }
      ]);

      // Log transaction
      await supabase.from('system_logs').insert([{
        level: 'info',
        type: 'transaction',
        message: 'Zelle transfer completed',
        details: {
          sender_id,
          recipient_user_id: recipientUserId,
          amount: transferAmount,
          reference: referenceNumber
        },
        user_id: sender_id
      }]);
    } else {
      // Recipient not found - still deduct from sender for pending transfer
      const newSenderBalance = parseFloat(senderAccount.balance) - transferAmount;
      await supabase
        .from('accounts')
        .update({ balance: newSenderBalance, updated_at: new Date().toISOString() })
        .eq('id', sender_account_id);

      // Create sender transaction record
      await supabase.from('transactions').insert([{
        user_id: sender_id,
        account_id: sender_account_id,
        type: 'zelle_send',
        amount: transferAmount,
        description: `Zelle payment to ${recipient_contact} (pending) - ${memo || 'Transfer'}`,
        status: 'pending',
        reference: referenceNumber
      }]);

      // Create notification
      await supabase.from('notifications').insert([{
        user_id: sender_id,
        type: 'zelle',
        title: 'Zelle Payment Pending',
        message: `Your Zelle payment of $${transferAmount.toFixed(2)} to ${recipient_contact} is pending`
      }]);
    }

    return res.status(200).json({
      success: true,
      message: recipientUserId ? 'Zelle payment sent successfully' : 'Zelle payment pending - recipient will receive when they enroll',
      reference_number: referenceNumber,
      transaction: zelleTransaction
    });

  } catch (error) {
    console.error('Zelle transaction error:', error);
    return res.status(500).json({ error: error.message || 'Transaction failed' });
  }
}
