
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';
import bcrypt from 'bcryptjs';

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

    const { pin, type } = req.body;

    if (!pin || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch user's PIN from profiles table
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('transaction_pin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(400).json({ error: 'User profile not found' });
    }

    if (!profile.transaction_pin) {
      return res.status(400).json({ 
        error: 'Transaction PIN not set. Please set up your PIN in Security settings.' 
      });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, profile.transaction_pin);

    if (!isPinValid) {
      // Log failed attempt
      await supabaseAdmin.from('system_logs').insert([{
        user_id: user.id,
        level: 'warning',
        type: 'transaction_pin_failed',
        message: `Failed transaction PIN verification for ${type}`,
        details: { type, timestamp: new Date().toISOString() }
      }]);

      return res.status(400).json({
        error: 'Invalid PIN. Please try again.'
      });
    }

    // Log successful verification
    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: 'transaction_pin_success',
      message: `Successful transaction PIN verification for ${type}`,
      details: { type, timestamp: new Date().toISOString() }
    }]);

    // If type is oakline_pay, we need to process the actual transfer
    if (type === 'oakline_pay') {
      const { transaction_id } = req.body;

      if (!transaction_id) {
        return res.status(400).json({ error: 'Transaction ID required for oakline_pay' });
      }

      // Fetch pending transaction
      const { data: transaction, error: txError } = await supabaseAdmin
        .from('oakline_pay_transactions')
        .select('*')
        .eq('id', transaction_id)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .single();

      if (txError || !transaction) {
        return res.status(404).json({ error: 'Transaction not found or already processed' });
      }

      // Get sender account
      const { data: senderAccount, error: senderError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', transaction.sender_account_id)
        .single();

      if (senderError || !senderAccount) {
        return res.status(400).json({ error: 'Sender account not found' });
      }

      const transferAmount = parseFloat(transaction.amount);

      // Re-check sender balance
      if (parseFloat(senderAccount.balance) < transferAmount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      // Deduct from sender
      const senderNewBalance = parseFloat(senderAccount.balance) - transferAmount;
      await supabaseAdmin
        .from('accounts')
        .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.sender_account_id);

      // Create debit transaction for sender
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.sender_id,
          account_id: transaction.sender_account_id,
          type: 'oakline_pay_send',
          amount: -transferAmount,
          description: `Oakline Pay to ${transaction.recipient_contact}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transaction.reference_number,
          status: 'completed',
          balance_before: parseFloat(senderAccount.balance),
          balance_after: senderNewBalance
        });

      // Add to receiver
      const { data: receiverAccount, error: receiverError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', transaction.recipient_account_id)
        .single();

      if (receiverError || !receiverAccount) {
        return res.status(400).json({ error: 'Recipient account not found' });
      }

      const receiverNewBalance = parseFloat(receiverAccount.balance) + transferAmount;
      await supabaseAdmin
        .from('accounts')
        .update({ balance: receiverNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.recipient_account_id);

      // Create credit transaction for receiver
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.recipient_id,
          account_id: transaction.recipient_account_id,
          type: 'oakline_pay_receive',
          amount: transferAmount,
          description: `Oakline Pay from ${transaction.sender_contact || 'Oakline User'}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transaction.reference_number,
          status: 'completed',
          balance_before: parseFloat(receiverAccount.balance),
          balance_after: receiverNewBalance
        });

      // Update transaction status
      await supabaseAdmin
        .from('oakline_pay_transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', transaction_id);

      // Get sender and receiver profiles for email
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name')
        .eq('id', transaction.sender_id)
        .single();

      const { data: receiverProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name')
        .eq('id', transaction.recipient_id)
        .single();

      // Send notification emails
      try {
        // Send debit notification to sender
        await sendEmail({
          to: senderProfile?.email,
          subject: `💸 Oakline Pay Sent - $${transferAmount.toFixed(2)} | Oakline Bank`,
          emailType: 'notify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💸 Transfer Sent</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <p>Your Oakline Pay transfer has been completed instantly.</p>
                <div style="background-color: #fff5e6; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> $${transferAmount.toFixed(2)}</p>
                  <p style="margin: 0 0 10px 0;"><strong>To:</strong> ${receiverProfile?.full_name || 'Oakline User'}</p>
                  <p style="margin: 0;"><strong>Reference:</strong> ${transaction.reference_number}</p>
                </div>
                <p style="color: #666; font-size: 14px;">The recipient has received the funds instantly in their account.</p>
              </div>
            </div>
          `
        });

        // Send credit notification to receiver
        await sendEmail({
          to: receiverProfile?.email,
          subject: `💰 Money Received - $${transferAmount.toFixed(2)} | Oakline Bank`,
          emailType: 'notify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Money Received!</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <p><strong>${senderProfile?.first_name || 'Someone'}</strong> sent you money via Oakline Pay.</p>
                <div style="background-color: #e6f7f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> $${transferAmount.toFixed(2)}</p>
                  <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${senderProfile?.full_name || 'Oakline User'}</p>
                  <p style="margin: 0;"><strong>Reference:</strong> ${transaction.reference_number}</p>
                </div>
                <p style="color: #059669; font-size: 14px; font-weight: 600;">✓ Funds are now available in your account.</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
        // Don't fail the transaction if email fails
      }

      return res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        reference_number: transaction.reference_number,
        transaction_id: transaction.id
      });
    }

    return res.status(200).json({
      success: true,
      message: 'PIN verified successfully'
    });

  } catch (error) {
    console.error('Error verifying transaction PIN:', error);
    return res.status(500).json({
      error: 'Failed to verify PIN',
      message: error.message
    });
  }
}
