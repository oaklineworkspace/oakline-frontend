import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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

      // Get sender's Oakline Pay settings
      const { data: settings } = await supabaseAdmin
        .from('oakline_pay_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const perTransactionLimit = settings?.per_transaction_limit || 2500;
      const dailyLimit = settings?.daily_limit || 5000;
      const monthlyLimit = settings?.monthly_limit || 25000;

      // Check per-transaction limit
      if (transferAmount > perTransactionLimit) {
        return res.status(400).json({ error: `Amount exceeds per-transaction limit of $${perTransactionLimit}` });
      }

      // Calculate total spent today (start of day to now)
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

      // Check daily limit
      if (totalSpentToday + transferAmount > dailyLimit) {
        return res.status(400).json({ 
          error: `Transaction would exceed daily limit of $${dailyLimit}. You've already sent $${totalSpentToday.toFixed(2)} today.` 
        });
      }

      // Calculate total spent this month (start of month to now)
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

      // Check monthly limit
      if (totalSpentThisMonth + transferAmount > monthlyLimit) {
        return res.status(400).json({ 
          error: `Transaction would exceed monthly limit of $${monthlyLimit}. You've already sent $${totalSpentThisMonth.toFixed(2)} this month.` 
        });
      }

      // Find recipient based on type
      let recipientProfile = null;
      let recipientUser = null;

      if (recipient_type === 'oakline_tag') {
        // Search by Oakline tag
        const { data: oaklineProfile } = await supabaseAdmin
          .from('oakline_pay_profiles')
          .select('user_id, display_name, oakline_tag, is_active')
          .eq('oakline_tag', recipient_contact.startsWith('@') ? recipient_contact : `@${recipient_contact}`)
          .eq('is_active', true)
          .single();

        if (oaklineProfile) {
          const { data: user_data } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', oaklineProfile.user_id)
            .single();
          
          recipientProfile = user_data;
          recipientProfile.oakline_tag = oaklineProfile.oakline_tag;
        }
      } else if (recipient_type === 'email') {
        // Search by email
        const { data: user_data } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .eq('email', recipient_contact)
          .single();
        
        recipientProfile = user_data;
      } else if (recipient_type === 'phone') {
        // Search by phone
        const { data: user_data } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, phone')
          .eq('phone', recipient_contact)
          .single();
        
        recipientProfile = user_data;
      }

      if (!recipientProfile) {
        return res.status(404).json({ 
          error: 'Recipient not found in Oakline Bank. Please verify the information and try again.',
          suggestion: recipient_type === 'oakline_tag' 
            ? 'Make sure the Oakline tag starts with @ and is spelled correctly'
            : 'Make sure the email or phone number is correct'
        });
      }

      // Prevent self-transfer
      if (recipientProfile.id === user.id) {
        return res.status(400).json({ error: 'You cannot send money to yourself' });
      }

      // Get recipient's active account
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

      // Generate verification code
      const code = generateVerificationCode();
      const referenceNumber = generateReference();

      // Create pending transaction
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
          verification_code: code,
          verification_expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          sender_balance_before: parseFloat(senderAccount.balance)
        })
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        return res.status(500).json({ error: 'Failed to create transaction' });
      }

      // Get sender's profile for email
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Send verification email
      try {
        await sendEmail({
          to: senderProfile.email,
          subject: 'Oakline Pay Verification Code',
          emailType: 'verify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">Oakline Pay</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <h2 style="color: #1A3E6F;">Verification Code</h2>
                <p>You are sending <strong>$${transferAmount.toFixed(2)}</strong> to:</p>
                <p><strong>${recipientProfile.full_name || 'Recipient'}</strong></p>
                ${recipientProfile.oakline_tag ? `<p>Oakline Tag: <strong>${recipientProfile.oakline_tag}</strong></p>` : ''}
                ${memo ? `<p>Memo: ${memo}</p>` : ''}
                <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
                  <h1 style="color: #1A3E6F; font-size: 48px; margin: 10px 0; letter-spacing: 8px;">${code}</h1>
                  <p style="margin: 0; font-size: 14px; color: #666;">This code expires in 10 minutes</p>
                </div>
                <p style="color: #666; font-size: 14px;">Reference: ${referenceNumber}</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                  If you did not initiate this transfer, please contact us immediately at support@theoaklinebank.com
                </p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Continue even if email fails
      }

      return res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        transaction_id: transaction.id,
        recipient_name: recipientProfile.full_name,
        recipient_tag: recipientProfile.oakline_tag || null,
        reference_number: referenceNumber
      });
    }

    // STEP 2: VERIFY AND COMPLETE TRANSFER
    if (step === 'verify') {
      if (!verification_code) {
        return res.status(400).json({ error: 'Verification code required' });
      }

      const { transaction_id } = req.body;

      // Get the transaction
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

      // Check if code expired
      if (new Date() > new Date(transaction.verification_expires_at)) {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .update({ status: 'expired' })
          .eq('id', transaction_id);
        
        return res.status(400).json({ error: 'Verification code expired. Please start a new transfer.' });
      }

      // Verify code
      if (transaction.verification_code !== verification_code) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      // Re-check sender balance (in case it changed)
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

      // Re-check limits at verification time (critical security check)
      // Get sender's current settings
      const { data: settings } = await supabaseAdmin
        .from('oakline_pay_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const dailyLimit = settings?.daily_limit || 5000;
      const monthlyLimit = settings?.monthly_limit || 25000;
      const transferAmount = parseFloat(transaction.amount);

      // Calculate total spent today (exclude this pending transaction)
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

      // Check if completing this transaction would exceed daily limit
      if (totalSpentToday + transferAmount > dailyLimit) {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .update({ status: 'failed', failure_reason: 'Daily limit exceeded' })
          .eq('id', transaction_id);
        
        return res.status(400).json({ 
          error: `Transaction would exceed daily limit of $${dailyLimit}. You've already sent $${totalSpentToday.toFixed(2)} today.` 
        });
      }

      // Calculate total spent this month (exclude this pending transaction)
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

      // Check if completing this transaction would exceed monthly limit
      if (totalSpentThisMonth + transferAmount > monthlyLimit) {
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .update({ status: 'failed', failure_reason: 'Monthly limit exceeded' })
          .eq('id', transaction_id);
        
        return res.status(400).json({ 
          error: `Transaction would exceed monthly limit of $${monthlyLimit}. You've already sent $${totalSpentThisMonth.toFixed(2)} this month.` 
        });
      }

      // Get recipient account
      const { data: recipientAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', transaction.recipient_account_id)
        .single();

      const amount = parseFloat(transaction.amount);
      const senderNewBalance = parseFloat(senderAccount.balance) - amount;
      const recipientNewBalance = parseFloat(recipientAccount.balance) + amount;

      // Update sender's account (debit)
      await supabaseAdmin
        .from('accounts')
        .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.sender_account_id);

      // Update recipient's account (credit)
      await supabaseAdmin
        .from('accounts')
        .update({ balance: recipientNewBalance, updated_at: new Date().toISOString() })
        .eq('id', transaction.recipient_account_id);

      // Create transaction records in main transactions table
      const transactionRef = transaction.reference_number;

      // Sender's debit transaction
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

      // Recipient's credit transaction
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

      // Update Oakline Pay transaction status
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

      // Get profiles for notification emails
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', transaction.sender_id)
        .single();

      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', transaction.recipient_id)
        .single();

      // Send confirmation emails
      try {
        // Email to sender
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
                <p>You sent <strong>$${amount.toFixed(2)}</strong> to <strong>${recipientProfile.full_name}</strong></p>
                ${transaction.memo ? `<p>Memo: ${transaction.memo}</p>` : ''}
                <p>New balance: <strong>$${senderNewBalance.toFixed(2)}</strong></p>
                <p style="color: #666; font-size: 14px;">Reference: ${transactionRef}</p>
              </div>
            </div>
          `
        });

        // Email to recipient
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
                <p>You received <strong>$${amount.toFixed(2)}</strong> from <strong>${senderProfile.full_name}</strong></p>
                ${transaction.memo ? `<p>Memo: ${transaction.memo}</p>` : ''}
                <p>New balance: <strong>$${recipientNewBalance.toFixed(2)}</strong></p>
                <p style="color: #666; font-size: 14px;">Reference: ${transactionRef}</p>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Notification email error:', emailError);
        // Continue even if emails fail
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
