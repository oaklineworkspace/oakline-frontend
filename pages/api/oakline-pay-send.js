
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';
import bcrypt from 'bcryptjs';

function generateTransactionPIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateReference() {
  return `OKP${Date.now()}${Math.floor(Math.random() * 1000)}`;
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

    const { sender_account_id, recipient_contact, recipient_type, amount, memo, step, verification_code } = req.body;

    // STEP 1: INITIATE TRANSFER
    if (step === 'initiate') {
      if (!sender_account_id || !recipient_contact || !amount || !recipient_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const transferAmount = parseFloat(amount);
      if (transferAmount <= 0 || isNaN(transferAmount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Get sender's account
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

      // Get sender's Oakline Pay settings and check limits
      const { data: settings } = await supabaseAdmin
        .from('oakline_pay_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const perTransactionLimit = settings?.per_transaction_limit || 2500;
      const dailyLimit = settings?.daily_limit || 5000;
      const monthlyLimit = settings?.monthly_limit || 25000;

      if (transferAmount > perTransactionLimit) {
        return res.status(400).json({ error: `Amount exceeds per-transaction limit of $${perTransactionLimit}` });
      }

      // Check daily limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: todaysTransactions } = await supabaseAdmin
        .from('oakline_pay_transactions')
        .select('amount')
        .eq('sender_id', user.id)
        .in('status', ['completed', 'processing'])
        .gte('created_at', todayStart.toISOString());

      const totalSpentToday = (todaysTransactions || []).reduce(
        (sum, tx) => sum + parseFloat(tx.amount || 0), 
        0
      );

      if (totalSpentToday + transferAmount > dailyLimit) {
        return res.status(400).json({ 
          error: `Transaction would exceed daily limit of $${dailyLimit}. You've already sent $${totalSpentToday.toFixed(2)} today.` 
        });
      }

      // Check monthly limit
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const { data: monthTransactions } = await supabaseAdmin
        .from('oakline_pay_transactions')
        .select('amount')
        .eq('sender_id', user.id)
        .in('status', ['completed', 'processing'])
        .gte('created_at', monthStart.toISOString());

      const totalSpentThisMonth = (monthTransactions || []).reduce(
        (sum, tx) => sum + parseFloat(tx.amount || 0), 
        0
      );

      if (totalSpentThisMonth + transferAmount > monthlyLimit) {
        return res.status(400).json({ 
          error: `Transaction would exceed monthly limit of $${monthlyLimit}. You've already sent $${totalSpentThisMonth.toFixed(2)} this month.` 
        });
      }

      // Find recipient based on type
      let recipientProfile = null;
      let isOaklineUser = false;

      if (recipient_type === 'oakline_tag') {
        // Normalize tag: remove @ if present, convert to lowercase
        const normalizedTag = recipient_contact.toLowerCase().replace(/^@/, '');
        const tagWithAt = `@${normalizedTag}`;
        
        // Try both formats for backwards compatibility (some may be stored with @, some without)
        let { data: oaklineProfile } = await supabaseAdmin
          .from('oakline_pay_profiles')
          .select('user_id, display_name, oakline_tag, is_active')
          .eq('is_active', true)
          .in('oakline_tag', [normalizedTag, tagWithAt]);

        // Use the first match found
        if (oaklineProfile && oaklineProfile.length > 0) {
          // Use oakline_pay_profiles data directly as the recipient profile
          recipientProfile = {
            id: oaklineProfile[0].user_id,
            full_name: oaklineProfile[0].display_name || 'Oakline User',
            first_name: oaklineProfile[0].display_name?.split(' ')[0] || 'Oakline User',
            oakline_tag: oaklineProfile[0].oakline_tag
          };
          isOaklineUser = true;
        }
      } else if (recipient_type === 'email') {
        const { data: user_data } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, first_name, last_name')
          .eq('email', recipient_contact)
          .single();
        
        if (user_data) {
          recipientProfile = user_data;
          isOaklineUser = true;
        }
      }

      // Prevent self-transfer
      if (recipientProfile && recipientProfile.id === user.id) {
        return res.status(400).json({ error: 'You cannot send money to yourself' });
      }

      const referenceNumber = generateReference();

      // Get sender's profile and check for transaction PIN
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name, last_name, transaction_pin')
        .eq('id', user.id)
        .single();

      // Check if user has set up their transaction PIN
      if (!senderProfile?.transaction_pin) {
        return res.status(400).json({ 
          error: 'Please set up your transaction PIN in Security Settings before using Oakline Pay' 
        });
      }

      // Create sender profile object with fallbacks
      const senderData = {
        email: senderProfile?.email || user.email,
        first_name: senderProfile?.first_name || user.email?.split('@')[0] || 'User',
        full_name: senderProfile?.full_name || 'Oakline User'
      };

      if (isOaklineUser) {
        // OAKLINE USER - Instant Transfer Flow
        const { data: recipientAccount } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('user_id', recipientProfile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!recipientAccount) {
          return res.status(404).json({ error: 'Recipient does not have an active account' });
        }

        // Create pending transaction (no verification code needed - user will enter their PIN)
        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from('oakline_pay_transactions')
          .insert({
            sender_id: user.id,
            sender_account_id: sender_account_id,
            recipient_id: recipientProfile.id,
            recipient_account_id: recipientAccount.id,
            recipient_contact: recipient_contact,
            recipient_type: recipient_type,
            amount: transferAmount,
            memo: memo || null,
            status: 'pending',
            reference_number: referenceNumber,
            verification_code: null,
            verification_expires_at: new Date(Date.now() + 15 * 60 * 1000),
            sender_balance_before: parseFloat(senderAccount.balance)
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Transaction creation error:', transactionError);
          return res.status(500).json({ error: 'Failed to create transaction' });
        }

        return res.status(200).json({
          success: true,
          message: 'Transaction PIN created. Enter your PIN to confirm.',
          transaction_id: transaction.id,
          recipient_name: recipientProfile.full_name || recipientProfile.first_name,
          recipient_tag: recipientProfile.oakline_tag || null,
          reference_number: referenceNumber,
          is_oakline_user: true,
          amount: transferAmount
        });

      } else {
        // NON-OAKLINE USER - Pending Payment Flow
        // Deduct amount immediately and create pending payment
        const senderNewBalance = parseFloat(senderAccount.balance) - transferAmount;

        // Update sender's account
        await supabaseAdmin
          .from('accounts')
          .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
          .eq('id', sender_account_id);

        // Create debit transaction for sender
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: sender_account_id,
            type: 'oakline_pay_send',
            amount: -transferAmount,
            description: `Oakline Pay to ${recipient_contact}${memo ? ` - ${memo}` : ''} (Pending)`,
            reference: referenceNumber,
            status: 'completed',
            balance_before: parseFloat(senderAccount.balance),
            balance_after: senderNewBalance
          });

        // Create pending payment record
        const { data: pendingPayment, error: pendingError } = await supabaseAdmin
          .from('oakline_pay_pending_payments')
          .insert({
            sender_id: user.id,
            sender_account_id: sender_account_id,
            recipient_email: recipient_contact,
            amount: transferAmount,
            memo: memo || null,
            reference_number: referenceNumber,
            status: 'pending',
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          })
          .select()
          .single();

        if (pendingError) {
          console.error('Pending payment creation error:', pendingError);
          return res.status(500).json({ error: 'Failed to create pending payment' });
        }

        // Send invitation email to non-Oakline recipient
        try {
          await sendEmail({
            to: recipient_contact,
            subject: `${senderData.first_name} sent you $${transferAmount.toFixed(2)} via Oakline Pay`,
            emailType: 'notify',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">💰 You've Got Money!</h1>
                </div>
                <div style="padding: 30px; background-color: #f8f9fa;">
                  <h2 style="color: #1A3E6F;">Oakline Pay Transfer</h2>
                  <p><strong>${senderData.first_name}</strong> sent you <strong>$${transferAmount.toFixed(2)}</strong></p>
                  ${memo ? `<p style="font-style: italic; color: #666;">Message: "${memo}"</p>` : ''}
                  
                  <div style="background-color: #d1fae5; border-radius: 12px; padding: 20px; margin: 24px 0;">
                    <h3 style="color: #065f46; margin: 0 0 12px 0;">🎉 Claim Your Money</h3>
                    <p style="color: #047857; margin: 0;">Create an Oakline Bank account within <strong>14 days</strong> to claim this payment.</p>
                  </div>

                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/apply"
                       style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                              color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                              font-weight: 600; font-size: 16px;">
                      Create Oakline Account
                    </a>
                  </div>

                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                    <p style="color: #92400e; font-size: 14px; margin: 0;">
                      ⏳ <strong>Important:</strong> This payment expires in 14 days. Sign up with this email address (${recipient_contact}) to automatically claim your money.
                    </p>
                  </div>

                  <p style="color: #666; font-size: 14px;">Reference: ${referenceNumber}</p>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Invitation email error:', emailError);
        }

        return res.status(200).json({
          success: true,
          message: `Payment sent! Recipient will be notified to create an Oakline account to claim $${transferAmount.toFixed(2)}`,
          reference_number: referenceNumber,
          is_oakline_user: false,
          pending_payment_id: pendingPayment.id,
          expires_at: pendingPayment.expires_at
        });
      }
    }

    // STEP 2: VERIFY AND COMPLETE TRANSFER (Only for Oakline users)
    if (step === 'verify') {
      if (!verification_code) {
        return res.status(400).json({ error: 'Verification code required' });
      }

      const { transaction_id } = req.body;

      if (!transaction_id) {
        return res.status(400).json({ error: 'Transaction ID is required' });
      }

      const { data: transaction, error: txError } = await supabaseAdmin
        .from('oakline_pay_transactions')
        .select('*')
        .eq('id', transaction_id)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .single();

      if (txError || !transaction) {
        console.error('Transaction lookup error:', txError);
        return res.status(404).json({ error: 'Transaction not found or already processed' });
      }

      if (new Date() > new Date(transaction.verification_expires_at)) {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .update({ status: 'expired' })
          .eq('id', transaction_id);
        
        return res.status(400).json({ error: 'Verification code expired. Please start a new transfer.' });
      }

      // Verify PIN against user's stored transaction PIN (not the transaction code)
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (!senderProfile?.transaction_pin) {
        return res.status(400).json({ error: 'Transaction PIN not configured. Please set one in Security Settings.' });
      }

      const isPinValid = await bcrypt.compare(verification_code, senderProfile.transaction_pin);
      
      if (!isPinValid) {
        return res.status(400).json({ error: 'Invalid PIN. Please try again.' });
      }

      // Re-check sender balance
      const { data: senderAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', transaction.sender_account_id)
        .single();

      if (parseFloat(senderAccount.balance) < parseFloat(transaction.amount)) {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .update({ status: 'failed', failure_reason: 'Insufficient funds' })
          .eq('id', transaction_id);
        
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      const { data: recipientAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', transaction.recipient_account_id)
        .single();

      const amount = parseFloat(transaction.amount);
      const senderNewBalance = parseFloat(senderAccount.balance) - amount;
      const recipientNewBalance = parseFloat(recipientAccount.balance) + amount;

      // Update balances
      await supabaseAdmin
        .from('accounts')
        .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.sender_account_id);

      await supabaseAdmin
        .from('accounts')
        .update({ balance: recipientNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.recipient_account_id);

      const transactionRef = transaction.reference_number;

      // Create transaction records
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.sender_id,
          account_id: transaction.sender_account_id,
          type: 'oakline_pay_send',
          amount: -amount,
          description: `Oakline Pay to ${transaction.recipient_contact}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transactionRef,
          status: 'completed',
          balance_before: parseFloat(senderAccount.balance),
          balance_after: senderNewBalance
        });

      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: transaction.recipient_id,
          account_id: transaction.recipient_account_id,
          type: 'oakline_pay_receive',
          amount: amount,
          description: `Oakline Pay from ${user.email}${transaction.memo ? ` - ${transaction.memo}` : ''}`,
          reference: transactionRef,
          status: 'completed',
          balance_before: parseFloat(recipientAccount.balance),
          balance_after: recipientNewBalance
        });

      // Update transaction status
      await supabaseAdmin
        .from('oakline_pay_transactions')
        .update({
          status: 'completed',
          is_verified: true,
          sender_balance_after: senderNewBalance,
          recipient_balance_before: parseFloat(recipientAccount.balance),
          recipient_balance_after: recipientNewBalance,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction_id);

      // Send confirmation emails
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name, last_name')
        .eq('id', transaction.sender_id)
        .single();

      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name, last_name')
        .eq('id', transaction.recipient_id)
        .single();

      try {
        await sendEmail({
          to: senderProfile.email,
          subject: 'Oakline Pay Transfer Completed',
          emailType: 'notify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">✓ Transfer Completed</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <h2 style="color: #1A3E6F;">Money Sent Successfully</h2>
                <p>You sent <strong>$${amount.toFixed(2)}</strong> to <strong>${recipientProfile.full_name || recipientProfile.first_name}</strong></p>
                ${transaction.memo ? `<p>Memo: ${transaction.memo}</p>` : ''}
                <p>New balance: <strong>$${senderNewBalance.toFixed(2)}</strong></p>
                <p style="color: #666; font-size: 14px;">Reference: ${transactionRef}</p>
              </div>
            </div>
          `
        });

        await sendEmail({
          to: recipientProfile.email,
          subject: 'You Received Money via Oakline Pay',
          emailType: 'notify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Money Received</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <h2 style="color: #1A3E6F;">Oakline Pay Transfer</h2>
                <p>You received <strong>$${amount.toFixed(2)}</strong> from <strong>${senderProfile.full_name || senderProfile.first_name}</strong></p>
                ${transaction.memo ? `<p>Memo: ${transaction.memo}</p>` : ''}
                <p>New balance: <strong>$${recipientNewBalance.toFixed(2)}</strong></p>
                <p style="color: #666; font-size: 14px;">Reference: ${transactionRef}</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Notification email error:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        transaction_id: transaction.id,
        reference_number: transactionRef,
        amount: amount,
        new_balance: senderNewBalance
      });
    }

    return res.status(400).json({ error: 'Invalid step parameter' });

  } catch (error) {
    console.error('Oakline Pay API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
