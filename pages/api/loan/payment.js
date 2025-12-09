import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail, EMAIL_TYPES } from '../../../lib/email';

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

    const { loan_id, amount, payment_method, crypto_data } = req.body;

    if (!loan_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Validate payment method
    if (!payment_method || !['balance', 'crypto'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Validate crypto data if crypto payment
    if (payment_method === 'crypto') {
      if (!crypto_data || !crypto_data.crypto_type || !crypto_data.network_type) {
        return res.status(400).json({ error: 'Missing crypto payment details' });
      }
      // Transaction hash and proof are optional - user can provide one, both, or neither
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Can only make payments on active loans' });
    }

    if (amount > loan.remaining_balance) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }

    // Handle crypto payments differently
    if (payment_method === 'crypto') {
      // Get crypto asset
      const { data: cryptoAsset } = await supabaseAdmin
        .from('crypto_assets')
        .select('id')
        .eq('crypto_type', crypto_data.crypto_type)
        .eq('network_type', crypto_data.network_type)
        .eq('status', 'active')
        .single();

      if (!cryptoAsset) {
        return res.status(400).json({ error: 'Invalid crypto asset configuration' });
      }

      // Calculate principal and interest breakdown
      const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
      const interestAmount = parseFloat(loan.remaining_balance) * monthlyRate;
      const principalAmount = amount - interestAmount;

      // Create payment record with pending status for admin verification
      const { data: paymentRecord, error: paymentError } = await supabaseAdmin
        .from('loan_payments')
        .insert([{
          loan_id: loan.id,
          amount,
          principal_amount: principalAmount > 0 ? principalAmount : amount,
          interest_amount: interestAmount > 0 ? interestAmount : 0,
          late_fee: 0,
          balance_after: loan.remaining_balance - amount,
          payment_date: new Date().toISOString(),
          payment_type: 'manual',
          status: 'pending',
          deposit_method: 'crypto',
          tx_hash: crypto_data.tx_hash || null,
          fee: crypto_data.fee || 0,
          gross_amount: amount,
          proof_path: crypto_data.proof_path || null,
          metadata: {
            crypto_type: crypto_data.crypto_type,
            network_type: crypto_data.network_type,
            loan_wallet_address: crypto_data.wallet_address,
            wallet_id: crypto_data.wallet_id
          },
          confirmations: 0,
          required_confirmations: 3,
          notes: `Loan payment via ${crypto_data.crypto_type} (${crypto_data.network_type})`
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating crypto payment:', paymentError);
        return res.status(500).json({ error: 'Failed to create payment record' });
      }

      // Notify user via notification
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: user.id,
          type: 'loan',
          title: 'Crypto Loan Payment Submitted',
          message: `Your crypto payment of $${amount.toLocaleString()} has been submitted and is pending verification. You will be notified once it's confirmed.`,
          read: false
        }]);

      // Generate reference number
      const referenceNumber = `LPC-${Date.now().toString(36).toUpperCase()}-${paymentRecord.id.slice(0, 8).toUpperCase()}`;

      // Update payment with reference number
      await supabaseAdmin
        .from('loan_payments')
        .update({ reference_number: referenceNumber })
        .eq('id', paymentRecord.id);

      // Send email notification to user
      try {
        const { data: userProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('first_name, last_name, email')
          .eq('user_id', user.id)
          .single();

        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('bank_name')
          .limit(1)
          .single();

        const bankName = bankDetails?.bank_name || 'Oakline Bank';
        const userName = userProfile?.first_name || 'Valued Customer';
        const userEmail = userProfile?.email || user.email;

        if (userEmail) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">${bankName}</h1>
              </div>
              <div style="padding: 30px; background: #ffffff;">
                <h2 style="color: #1e3a8a; margin-bottom: 20px;">Crypto Loan Payment Submitted</h2>
                <p style="color: #333; line-height: 1.6;">Dear ${userName},</p>
                <p style="color: #333; line-height: 1.6;">Your crypto loan payment has been successfully submitted and is pending verification.</p>
                
                <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
                  <h3 style="color: #1e3a8a; margin: 0 0 15px 0;">Payment Details</h3>
                  <p style="margin: 8px 0;"><strong>Reference:</strong> ${referenceNumber}</p>
                  <p style="margin: 8px 0;"><strong>Amount:</strong> $${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  <p style="margin: 8px 0;"><strong>Cryptocurrency:</strong> ${crypto_data.crypto_type}</p>
                  <p style="margin: 8px 0;"><strong>Network:</strong> ${crypto_data.network_type}</p>
                  <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">Pending Verification</span></p>
                  <p style="margin: 8px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <p style="color: #333; line-height: 1.6;">Our team will verify your payment within 24-48 hours. You will receive an email confirmation once your payment has been verified and applied to your loan.</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">If you have any questions, please contact our support team.</p>
                
                <p style="color: #333; line-height: 1.6;">Thank you for choosing ${bankName}.</p>
              </div>
              <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">This is an automated message from ${bankName}.</p>
              </div>
            </div>
          `;

          await sendEmail({
            to: userEmail,
            subject: `Crypto Loan Payment Submitted - ${referenceNumber}`,
            html: emailHtml,
            text: `Dear ${userName}, Your crypto loan payment of $${amount} has been submitted and is pending verification. Reference: ${referenceNumber}. You will be notified once verified.`,
            emailType: EMAIL_TYPES.LOAN
          });
        }
      } catch (emailError) {
        console.error('Error sending crypto payment email:', emailError);
        // Don't fail the request if email fails
      }

      return res.status(200).json({
        success: true,
        message: 'Crypto payment submitted successfully. Pending verification.',
        payment_status: 'pending',
        payment_id: paymentRecord.id,
        reference_number: referenceNumber,
        amount: amount,
        crypto_type: crypto_data.crypto_type,
        network_type: crypto_data.network_type
      });
    }

    // Handle balance payments (existing logic)
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', loan.account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (parseFloat(account.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient funds in account' });
    }

    const originalAccountBalance = parseFloat(account.balance);
    const newBalance = originalAccountBalance - amount;
    const newRemainingBalance = loan.remaining_balance - amount;
    const loanStatus = newRemainingBalance <= 0.01 ? 'completed' : 'active';

    const { error: updateAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', account.id);

    if (updateAccountError) {
      console.error('Error updating account balance:', updateAccountError);
      return res.status(500).json({ error: 'Failed to deduct payment from account' });
    }

    // Calculate principal and interest breakdown
    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const interestAmount = parseFloat(loan.remaining_balance) * monthlyRate;
    const principalAmount = amount - interestAmount;

    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert([{
        loan_id: loan.id,
        amount,
        principal_amount: principalAmount > 0 ? principalAmount : amount,
        interest_amount: interestAmount > 0 ? interestAmount : 0,
        late_fee: 0,
        balance_after: newRemainingBalance,
        payment_date: new Date().toISOString(),
        payment_type: 'manual',
        status: 'completed',
        processed_by: user.id,
        deposit_method: 'balance'
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: originalAccountBalance })
        .eq('id', account.id);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    // Calculate how many payments were made with this payment
    const monthlyPayment = parseFloat(loan.monthly_payment_amount);
    const paymentsMadeCount = monthlyPayment > 0 ? Math.floor(amount / monthlyPayment) : 1;
    const totalPaymentsMade = (loan.payments_made || 0) + paymentsMadeCount;

    // Calculate next payment date based on remaining balance
    let nextPaymentDate = null;
    if (loanStatus === 'active' && newRemainingBalance > 0.01) {
      // Only set next payment date if there's still balance remaining
      const startDate = new Date(loan.start_date || loan.created_at);
      const monthsToAdd = totalPaymentsMade;
      nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + monthsToAdd + 1);
      nextPaymentDate = nextPaymentDate.toISOString().split('T')[0];
    } else if (newRemainingBalance <= 0.01) {
      // Loan is fully paid, no next payment needed
      nextPaymentDate = null;
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        remaining_balance: newRemainingBalance,
        status: loanStatus,
        payments_made: totalPaymentsMade,
        last_payment_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.id);

    if (updateLoanError) {
      console.error('Error updating loan balance:', updateLoanError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: originalAccountBalance })
        .eq('id', account.id);
      await supabaseAdmin
        .from('loan_payments')
        .delete()
        .eq('id', paymentRecord.id);
      return res.status(500).json({ error: 'Failed to update loan balance' });
    }

    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        account_id: account.id,
        user_id: user.id,
        type: 'debit',
        amount: -amount,
        balance_before: originalAccountBalance,
        balance_after: newBalance,
        description: `Loan Payment - ${loan.loan_type?.replace(/_/g, ' ').toUpperCase()}`,
        status: 'completed',
        reference: `LOAN-PAY-${loan.id.substring(0, 8)}`,
        created_at: new Date().toISOString()
      }]);

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: 'Loan Payment Processed',
        message: `Your loan payment of $${amount.toLocaleString()} has been processed successfully. ${loanStatus === 'closed' ? 'Your loan has been fully paid off!' : `Remaining balance: $${newRemainingBalance.toFixed(2)}`}`,
        read: false
      }]);

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      loan_status: loanStatus,
      remaining_balance: newRemainingBalance,
      new_account_balance: newBalance
    });

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}