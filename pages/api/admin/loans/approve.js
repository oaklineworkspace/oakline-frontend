import { verifyAdminAccess } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';
import { sendEmail } from '../../../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isAdmin, error: authError } = await verifyAdminAccess(req);

    if (!isAdmin) {
      return res.status(403).json({ error: authError || 'Unauthorized - Admin access required' });
    }

    const { loan_id } = req.body;

    if (!loan_id) {
      return res.status(400).json({ error: 'Missing loan_id' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending loans can be approved' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', loan.account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Associated account not found' });
    }

    const newBalance = parseFloat(account.balance) + parseFloat(loan.principal);
    const { error: updateAccountError } = await supabaseAdmin
      .from('accounts')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateAccountError) {
      console.error('Error updating account balance:', updateAccountError);
      return res.status(500).json({ error: 'Failed to disburse loan' });
    }

    const monthlyRate = loan.interest_rate / 100 / 12;
    const numPayments = loan.term_months;
    let totalDue;

    if (monthlyRate === 0) {
      totalDue = loan.principal;
    } else {
      const monthlyPayment = loan.principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                            (Math.pow(1 + monthlyRate, numPayments) - 1);
      totalDue = monthlyPayment * numPayments;
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        status: 'active',
        remaining_balance: totalDue,
        start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', loan_id);

    if (updateLoanError) {
      console.error('Error updating loan status:', updateLoanError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: account.balance })
        .eq('id', account.id);
      return res.status(500).json({ error: 'Failed to approve loan' });
    }

    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        account_id: account.id,
        user_id: loan.user_id,
        type: 'LOAN_DISBURSEMENT',
        amount: loan.principal,
        balance_after: newBalance,
        description: `Loan disbursement - ${loan.loan_type} loan`,
        status: 'completed',
        created_at: new Date().toISOString()
      }]);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    await supabaseAdmin
      .from('system_logs')
      .insert([{
        user_id: loan.user_id,
        type: 'loan',
        action: 'loan_approved',
        details: {
          loan_id: loan.id,
          loan_type: loan.loan_type,
          principal: loan.principal,
          account_id: account.id
        },
        created_at: new Date().toISOString()
      }]);

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: loan.user_id,
        type: 'loan',
        title: 'Loan Approved!',
        message: `Your ${loan.loan_type} loan application for $${loan.principal.toLocaleString()} has been approved. The funds have been credited to your account.`,
        read: false
      }]);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', loan.user_id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
    const userEmail = profile?.email;

    if (userEmail) {
      try {
        await sendEmail({
          to: userEmail,
          subject: 'Loan Approved - Oakline Bank',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Congratulations! Your Loan Has Been Approved</h2>
              <p>Dear ${userName},</p>
              <p>We are pleased to inform you that your loan application has been approved!</p>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">Loan Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Loan Type:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${loan.loan_type.replace('_', ' ').toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Loan Amount:</td>
                    <td style="padding: 8px 0; font-weight: bold;">$${loan.principal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Term:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${loan.term_months} months</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Interest Rate:</td>
                    <td style="padding: 8px 0; font-weight: bold;">${loan.interest_rate}% APR</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Total Amount Due:</td>
                    <td style="padding: 8px 0; font-weight: bold;">$${totalDue.toFixed(2)}</td>
                  </tr>
                </table>
              </div>

              <p><strong>The loan amount has been credited to your account ending in ${account.account_number.slice(-4)}.</strong></p>
              
              <p>You can now make payments through your Loan Dashboard. Thank you for choosing Oakline Bank!</p>
              
              <p style="margin-top: 30px;">Best regards,<br>
              <strong>Oakline Bank Loan Department</strong></p>
            </div>
          `,
          from: process.env.SMTP_FROM_NOTIFY
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Loan approved and funds disbursed successfully'
    });

  } catch (error) {
    console.error('Error approving loan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
