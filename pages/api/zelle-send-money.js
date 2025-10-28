import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    const { sender_account_id, recipient_contact, amount, memo, step } = req.body;

    if (step === 'initiate') {
      if (!sender_account_id || !recipient_contact || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const transferAmount = parseFloat(amount);
      if (transferAmount <= 0 || isNaN(transferAmount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const { data: senderAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', sender_account_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (accountError || !senderAccount) {
        return res.status(404).json({ error: 'Account not found or inactive' });
      }

      if (parseFloat(senderAccount.balance) < transferAmount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const { data: zelleSettings } = await supabaseAdmin
        .from('zelle_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const dailyLimit = zelleSettings?.daily_limit || 2500;
      if (transferAmount > dailyLimit) {
        return res.status(400).json({ error: `Amount exceeds daily limit of $${dailyLimit}` });
      }

      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .or(`email.eq.${recipient_contact},phone.eq.${recipient_contact}`)
        .single();

      const { data: transaction, error: transactionError } = await supabaseAdmin
        .from('zelle_transactions')
        .insert([{
          sender_id: user.id,
          sender_account_id,
          recipient_contact,
          recipient_user_id: recipientProfile?.id || null,
          recipient_name: recipientProfile?.full_name || 'Unknown',
          amount: transferAmount,
          memo: memo || null,
          status: 'pending',
          transaction_type: 'send'
        }])
        .select()
        .single();

      if (transactionError) {
        console.error('Error creating transaction:', transactionError);
        return res.status(500).json({ error: 'Failed to initiate transaction' });
      }

      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const { error: codeError } = await supabaseAdmin
        .from('verification_codes')
        .insert([{
          user_id: user.id,
          code: verificationCode,
          type: 'zelle',
          reference_id: transaction.id,
          expires_at: expiresAt.toISOString()
        }]);

      if (codeError) {
        console.error('Error creating verification code:', codeError);
      }

      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (senderProfile?.email) {
        await sendEmail({
          to: senderProfile.email,
          subject: 'Oakline Bank - Zelle® Transaction Verification',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9fc;">
              <div style="background-color: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #1A3E6F;">Zelle® Transaction Verification</h2>
                <p>Your verification code is:</p>
                <div style="background: linear-gradient(135deg, #6B21A8 0%, #9333EA 100%); color: white; text-align: center; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                  ${verificationCode}
                </div>
                <p style="color: #ef4444; margin-top: 20px;">⚠️ This code expires in 10 minutes.</p>
                <p style="color: #6b7280;">Amount: $${transferAmount.toFixed(2)}<br/>
                Recipient: ${recipientProfile?.full_name || recipient_contact}</p>
              </div>
            </div>
          `
        });
      }

      return res.status(200).json({
        success: true,
        transaction_id: transaction.id,
        recipient_name: recipientProfile?.full_name || recipient_contact,
        recipient_email: recipientProfile?.email || recipient_contact,
        requires_verification: true
      });

    } else if (step === 'complete') {
      const { transaction_id, verification_code } = req.body;

      if (!transaction_id || !verification_code) {
        return res.status(400).json({ error: 'Missing transaction ID or verification code' });
      }

      const { data: verificationRecord } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('code', verification_code)
        .eq('type', 'zelle')
        .eq('reference_id', transaction_id)
        .eq('is_used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!verificationRecord) {
        return res.status(400).json({ error: 'Invalid or expired verification code' });
      }

      const { data: transaction } = await supabaseAdmin
        .from('zelle_transactions')
        .select('*')
        .eq('id', transaction_id)
        .single();

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Check if recipient exists for processing
      const hasRecipient = transaction.recipient_user_id !== null;

      if (hasRecipient) {
        // Use the database function to process the transfer
        const { error: processError } = await supabaseAdmin.rpc('process_zelle_transfer', {
          p_zelle_id: transaction_id
        });

        if (processError) {
          console.error('Error processing Zelle transfer:', processError);
          
          // Update transaction to failed
          await supabaseAdmin
            .from('zelle_transactions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', transaction_id);
          
          return res.status(500).json({ error: 'Failed to process Zelle transfer' });
        }
      } else {
        // Recipient doesn't exist - manual balance deduction for pending transfer
        const { data: senderAccount } = await supabaseAdmin
          .from('accounts')
          .select('balance')
          .eq('id', transaction.sender_account_id)
          .single();

        const newSenderBalance = parseFloat(senderAccount.balance) - parseFloat(transaction.amount);

        await supabaseAdmin
          .from('accounts')
          .update({ balance: newSenderBalance })
          .eq('id', transaction.sender_account_id);

        await supabaseAdmin
          .from('zelle_transactions')
          .update({
            status: 'pending',
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction_id);

        await supabaseAdmin.from('transactions').insert([{
          user_id: user.id,
          account_id: transaction.sender_account_id,
          type: 'ZELLE_TRANSFER_SENT',
          amount: transaction.amount,
          description: `Zelle® transfer to ${transaction.recipient_name} (pending)`,
          status: 'pending'
        }]);
      }

      // Mark verification code as used
      await supabaseAdmin
        .from('verification_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', verificationRecord.id);

      if (transaction.recipient_user_id) {
        await supabaseAdmin.from('notifications').insert([{
          user_id: transaction.recipient_user_id,
          type: 'zelle',
          title: 'Money Received via Zelle®',
          message: `You received $${transaction.amount} from Zelle®`,
          priority: 'high'
        }]);
      }

      await supabaseAdmin.from('notifications').insert([{
        user_id: user.id,
        type: 'zelle',
        title: 'Zelle® Transfer Complete',
        message: `Successfully sent $${transaction.amount} to ${transaction.recipient_name}`,
        priority: 'normal'
      }]);

      return res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        transaction_id: transaction.id
      });
    }

    return res.status(400).json({ error: 'Invalid step parameter' });

  } catch (error) {
    console.error('Zelle send money error:', error);
    return res.status(500).json({
      error: 'Transaction failed',
      message: error.message
    });
  }
}
