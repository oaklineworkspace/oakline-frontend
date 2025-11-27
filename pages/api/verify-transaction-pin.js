
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

      // Get sender and receiver from auth users and profiles
      const { data: senderAuthData } = await supabaseAdmin.auth.admin.getUserById(transaction.sender_id);
      const { data: receiverAuthData } = await supabaseAdmin.auth.admin.getUserById(transaction.recipient_id);

      const senderEmail = senderAuthData?.user?.email;
      const receiverEmail = receiverAuthData?.user?.email;

      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', transaction.sender_id)
        .single();

      const { data: receiverProfile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', transaction.recipient_id)
        .single();

      const senderName = senderProfile ? `${senderProfile.first_name || ''} ${senderProfile.last_name || ''}`.trim() : 'Sender';
      const receiverName = receiverProfile ? `${receiverProfile.first_name || ''} ${receiverProfile.last_name || ''}`.trim() : 'Recipient';

      // Create debit transaction for sender
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.sender_id,
          account_id: transaction.sender_account_id,
          type: 'oakline_pay_send',
          amount: -transferAmount,
          description: `Oakline Pay to ${receiverName}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transaction.reference_number,
          status: 'completed',
          balance_before: senderAccount.balance,
          balance_after: senderNewBalance
        });

      // Create credit transaction for receiver
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.recipient_id,
          account_id: transaction.recipient_account_id,
          type: 'oakline_pay_receive',
          amount: transferAmount,
          description: `Oakline Pay from ${senderName}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transaction.reference_number,
          status: 'completed',
          balance_before: parseFloat(receiverAccount.balance),
          balance_after: receiverNewBalance
        });

      // Update transaction status - CRITICAL: Must complete before returning
      const { error: statusError } = await supabaseAdmin
        .from('oakline_pay_transactions')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', transaction_id);

      if (statusError) {
        console.error('❌ CRITICAL: Failed to update transaction status to completed:', statusError);
      } else {
        console.log('✅ Transaction status updated to COMPLETED for transaction:', transaction_id);
      }

      console.log('📧 Sender email:', senderEmail, 'Receiver email:', receiverEmail);

      // Get bank details for email from addresses
      const { data: bankDetails } = await supabaseAdmin
        .from('bank_details')
        .select('email_transfers, email_alerts')
        .limit(1)
        .single();

      const fromEmail = bankDetails?.email_transfers || 'transfers@theoaklinebank.com';

      // Send debit alert to sender
      if (senderEmail) {
        try {
          console.log('📧 Sending sender debit alert to:', senderEmail);
          await sendEmail({
            to: senderEmail,
            subject: `💸 Oakline Pay Sent - $${transferAmount.toFixed(2)} | Oakline Bank`,
            emailType: 'transfers',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">💸 Transfer Sent</h1>
                </div>
                <div style="padding: 30px; background-color: #f8f9fa;">
                  <p>Your Oakline Pay transfer has been completed instantly.</p>
                  <div style="background-color: #fff5e6; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> -$${transferAmount.toFixed(2)}</p>
                    <p style="margin: 0 0 10px 0;"><strong>To:</strong> ${receiverName}</p>
                    <p style="margin: 0;"><strong>Reference:</strong> ${transaction.reference_number}</p>
                  </div>
                  <p style="color: #666; font-size: 14px;">The recipient has received the funds instantly in their account.</p>
                </div>
              </div>
            `
          });
          console.log('✅ Sender debit alert sent successfully');
        } catch (emailError) {
          console.error('❌ Failed to send sender debit alert:', emailError.message);
        }
      } else {
        console.warn('⚠️ Sender email not available');
      }

      // Send credit alert to receiver
      if (receiverEmail) {
        try {
          console.log('📧 Sending receiver credit alert to:', receiverEmail);
          await sendEmail({
            to: receiverEmail,
            subject: `💰 Money Received - $${transferAmount.toFixed(2)} | Oakline Bank`,
            emailType: 'transfers',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">💰 Money Received!</h1>
                </div>
                <div style="padding: 30px; background-color: #f8f9fa;">
                  <p><strong>${senderName}</strong> sent you money via Oakline Pay.</p>
                  <div style="background-color: #e6f7f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> +$${transferAmount.toFixed(2)}</p>
                    <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${senderName}</p>
                    <p style="margin: 0;"><strong>Reference:</strong> ${transaction.reference_number}</p>
                  </div>
                  <p style="color: #059669; font-size: 14px; font-weight: 600;">✓ Funds are now available in your account.</p>
                </div>
              </div>
            `
          });
          console.log('✅ Receiver credit alert sent successfully');
        } catch (emailError) {
          console.error('❌ Failed to send receiver credit alert:', emailError.message);
        }
      } else {
        console.warn('⚠️ Receiver email not available');
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
