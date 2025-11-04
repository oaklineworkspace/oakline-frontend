import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { loan_id, account_id, amount, payment_type } = req.body;

    if (!loan_id || !account_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment details' });
    }

    // Get loan details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'active' && loan.status !== 'approved') {
      return res.status(400).json({ error: 'Can only make payments on active or approved loans' });
    }

    const paymentAmount = parseFloat(amount);
    const remainingBalance = parseFloat(loan.remaining_balance || loan.principal);

    if (paymentAmount > remainingBalance) {
      return res.status(400).json({ error: 'Payment amount exceeds remaining balance' });
    }

    // Get account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (parseFloat(account.balance) < paymentAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    // Reserve funds from user's account (optimistic deduction, pending admin approval)
    const newAccountBalance = parseFloat(account.balance) - paymentAmount;
    const { error: updateAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newAccountBalance,
        updated_at: new Date().toISOString() 
      })
      .eq('id', account_id);

    if (updateAccountError) {
      console.error('Error updating account:', updateAccountError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    // Calculate payment breakdown
    const monthlyRate = parseFloat(loan.interest_rate) / 100 / 12;
    const interestAmount = remainingBalance * monthlyRate;
    const principalAmount = paymentAmount - interestAmount;
    const newRemainingBalance = remainingBalance - paymentAmount;

    // Create payment with pending status - admin must approve
    const referenceNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .insert([{
        loan_id: loan_id,
        amount: parseFloat(amount),
        principal_amount: principalAmount > 0 ? principalAmount : parseFloat(amount),
        interest_amount: interestAmount > 0 ? interestAmount : 0,
        late_fee: 0,
        balance_after: newRemainingBalance,
        payment_date: new Date().toISOString(),
        payment_type: payment_type || 'manual',
        status: 'pending',
        processed_by: user.id,
        reference_number: referenceNumber,
        notes: `Payment submitted by user. Awaiting admin confirmation.`
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      // Rollback account balance
      await supabaseAdmin
        .from('accounts')
        .update({ balance: account.balance })
        .eq('id', account_id);
      return res.status(500).json({ error: 'Failed to record payment' });
    }

    // Create transaction record with pending status
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        user_id: user.id,
        account_id: account_id,
        type: 'debit',
        amount: -parseFloat(amount),
        balance_before: parseFloat(account.balance),
        balance_after: newAccountBalance,
        description: `Loan Payment - Pending Admin Approval`,
        status: 'hold',
        reference: referenceNumber,
        created_at: new Date().toISOString()
      }]);

    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
    }

    // Send notification to user
    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: 'Loan Payment Submitted',
        message: `Your loan payment of $${parseFloat(amount).toLocaleString()} has been submitted and is pending admin approval. Reference: ${referenceNumber}`,
        read: false
      }]);

    // Get user profile for email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
    const userEmail = profile?.email || user.email;

    // Send confirmation email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 32px 24px; text-align: center;">
            <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">🏦</div>
            <div style="color: #ffffff; font-size: 28px; font-weight: 700;">Oakline Bank</div>
          </div>

          <div style="padding: 40px 32px;">
            <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
              ✅ Payment Submitted Successfully
            </h1>

            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Dear ${userName}, your loan payment has been submitted and is pending admin approval.
            </p>

            <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Payment Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Reference Number:</td>
                  <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right; font-family: monospace;">${referenceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
                  <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right;">$${paymentAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Payment Date:</td>
                  <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right;">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Status:</td>
                  <td style="padding: 8px 0; color: #f59e0b; font-weight: 600; text-align: right;">Pending Approval</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Loan Type:</td>
                  <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right;">${loan.loan_type?.replace(/_/g, ' ').toUpperCase()}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⏳ Your payment is currently being reviewed by our team. You will receive a confirmation email once it's approved. This typically takes 1-2 business days.
              </p>
            </div>
          </div>

          <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
              Questions? Contact our support team 24/7:
            </p>
            <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
              📧 contact-us@theoaklinebank.com | 📞 (636) 635-6122
            </p>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
              <p style="color: #718096; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Oakline Bank. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: userEmail,
        subject: '✅ Loan Payment Submitted - Pending Approval',
        html: emailHtml
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the payment if email fails
    }

    // Determine the loan status based on remaining balance and term
    let loanStatus = loan.status;
    if (newRemainingBalance <= 0) {
      loanStatus = 'paid';
    } else if (newRemainingBalance < parseFloat(loan.principal) && loan.status === 'approved') {
      loanStatus = 'active';
    }

    // Update loan details including next_payment_date
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
      console.error('Error updating loan:', updateLoanError);
      // Consider rolling back account and payment if loan update fails critically
      return res.status(500).json({ error: 'Failed to update loan status' });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment submitted successfully. Awaiting admin approval.',
      payment: {
        id: paymentRecord.id,
        reference_number: paymentRecord.reference_number,
        amount: paymentRecord.amount,
        status: paymentRecord.status,
        created_at: paymentRecord.payment_date,
        balance_after: paymentRecord.balance_after,
        principal_amount: paymentRecord.principal_amount,
        interest_amount: paymentRecord.interest_amount
      }
    });

  } catch (error) {
    console.error('Error processing payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}