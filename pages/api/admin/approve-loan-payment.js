
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

    // Check if user is admin
    const { data: adminProfile } = await supabaseAdmin
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { payment_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID is required' });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment already processed' });
    }

    // Get loan details
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', payment.loan_id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const paymentAmount = parseFloat(payment.amount);
    const currentBalance = parseFloat(loan.remaining_balance || loan.principal);
    const newBalance = currentBalance - paymentAmount;
    const monthlyPayment = parseFloat(loan.monthly_payment_amount);

    // Update payment status to completed
    const { error: updatePaymentError } = await supabaseAdmin
      .from('loan_payments')
      .update({
        status: 'completed',
        balance_after: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_id);

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError);
      return res.status(500).json({ error: 'Failed to approve payment' });
    }

    // Calculate next payment due and adjust for partial payments
    let nextPaymentDate = loan.next_payment_date ? new Date(loan.next_payment_date) : new Date();
    let nextPaymentAmount = monthlyPayment;

    // If payment was made before due date, reduce the next payment amount
    const today = new Date();
    const dueDate = new Date(nextPaymentDate);
    
    if (today < dueDate) {
      // Payment made early - reduce next payment
      nextPaymentAmount = Math.max(0, monthlyPayment - paymentAmount);
      
      // If partial payment covers full monthly payment or more, advance to next month
      if (paymentAmount >= monthlyPayment) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + Math.floor(paymentAmount / monthlyPayment));
        nextPaymentAmount = monthlyPayment - (paymentAmount % monthlyPayment);
      }
    } else {
      // Payment made on or after due date - set next month
      nextPaymentDate = new Date();
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Update loan
    const loanStatus = newBalance <= 0.01 ? 'closed' : 'active';
    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({
        remaining_balance: newBalance,
        status: loanStatus,
        payments_made: (loan.payments_made || 0) + 1,
        last_payment_date: new Date().toISOString(),
        next_payment_date: loanStatus === 'closed' ? null : nextPaymentDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.id);

    if (updateLoanError) {
      console.error('Error updating loan:', updateLoanError);
      return res.status(500).json({ error: 'Failed to update loan' });
    }

    // Get user details for notification
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', loan.user_id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
    const userEmail = profile?.email;

    // Send approval email
    if (userEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
              <div style="color: #ffffff; font-size: 32px; margin-bottom: 8px;">✓</div>
              <div style="color: #ffffff; font-size: 28px; font-weight: 700;">Payment Approved!</div>
            </div>
            
            <div style="padding: 40px 32px;">
              <h1 style="color: #1a365d; font-size: 28px; font-weight: 700; margin: 0 0 16px 0;">
                Your Loan Payment Has Been Approved
              </h1>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Dear ${userName}, your loan payment has been reviewed and approved.
              </p>

              <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Reference Number:</td>
                    <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right; font-family: monospace;">${payment.reference_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
                    <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right;">$${paymentAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">New Balance:</td>
                    <td style="padding: 8px 0; color: #10b981; font-weight: 700; text-align: right;">$${newBalance.toFixed(2)}</td>
                  </tr>
                  ${loanStatus !== 'closed' ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Next Payment Due:</td>
                    <td style="padding: 8px 0; color: #1a365d; font-weight: 600; text-align: right;">${nextPaymentDate.toLocaleDateString('en-US', { dateStyle: 'medium' })}</td>
                  </tr>
                  ${nextPaymentAmount < monthlyPayment ? `
                  <tr>
                    <td style="padding: 8px 0; color: #64748b;">Next Payment Amount:</td>
                    <td style="padding: 8px 0; color: #10b981; font-weight: 700; text-align: right;">$${nextPaymentAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding: 8px 0;">
                      <div style="background-color: #d1fae5; border-radius: 6px; padding: 8px; margin-top: 8px;">
                        <p style="color: #059669; font-size: 13px; margin: 0;">
                          ✓ Your early payment has reduced your next payment amount by $${(monthlyPayment - nextPaymentAmount).toFixed(2)}!
                        </p>
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                  ` : `
                  <tr>
                    <td colspan="2" style="padding: 8px 0;">
                      <div style="background-color: #d1fae5; border-radius: 6px; padding: 12px; margin-top: 8px;">
                        <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 0;">
                          🎉 Congratulations! Your loan has been fully paid off!
                        </p>
                      </div>
                    </td>
                  </tr>
                  `}
                </table>
              </div>
            </div>

            <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
                Questions? Contact our support team 24/7:
              </p>
              <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0;">
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
          subject: '✅ Loan Payment Approved - Oakline Bank',
          html: emailHtml
        });
      } catch (emailError) {
        console.error('Error sending approval email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment approved successfully',
      loan_status: loanStatus,
      new_balance: newBalance,
      next_payment_date: loanStatus === 'closed' ? null : nextPaymentDate,
      next_payment_amount: loanStatus === 'closed' ? 0 : nextPaymentAmount
    });

  } catch (error) {
    console.error('Error approving payment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
