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
      return res.status(400).json({ error: 'Only pending loans can be rejected' });
    }

    const { error: updateLoanError } = await supabaseAdmin
      .from('loans')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', loan_id);

    if (updateLoanError) {
      console.error('Error updating loan status:', updateLoanError);
      return res.status(500).json({ error: 'Failed to reject loan' });
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: loan.user_id,
        type: 'loan',
        title: 'Loan Application Update',
        message: `Your ${loan.loan_type} loan application has been reviewed. Please contact our loan department for more information.`,
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
          subject: 'Loan Application Update - Oakline Bank',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Loan Application Update</h2>
              <p>Dear ${userName},</p>
              <p>Thank you for your interest in obtaining a loan with Oakline Bank.</p>
              <p>After careful review of your application, we regret to inform you that we are unable to approve your ${loan.loan_type.replace('_', ' ')} loan application at this time.</p>
              
              <p>This decision may be based on various factors including:</p>
              <ul style="color: #4b5563;">
                <li>Credit history</li>
                <li>Debt-to-income ratio</li>
                <li>Current financial obligations</li>
                <li>Employment verification</li>
              </ul>

              <p>If you would like to discuss this decision or explore alternative options, please contact our loan department at your convenience.</p>
              
              <p>We value your relationship with Oakline Bank and look forward to serving your financial needs in the future.</p>
              
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
      message: 'Loan rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting loan:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
