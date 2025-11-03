import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { sendEmail } from '../../../lib/email';

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

    const { loan_type, principal, term_months, purpose, interest_rate, collateral_description, deposit_required, deposit_method } = req.body;

    if (!loan_type || !principal || !term_months || !purpose || !interest_rate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (principal <= 0 || term_months <= 0 || interest_rate < 0) {
      return res.status(400).json({ error: 'Invalid loan parameters' });
    }

    // Check for existing active or pending loans
    const { data: existingLoans, error: existingLoansError } = await supabaseAdmin
      .from('loans')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending', 'active', 'approved']);

    if (!existingLoansError && existingLoans && existingLoans.length > 0) {
      return res.status(400).json({ error: 'You already have an active or pending loan. Please complete your existing loan before applying for a new one.' });
    }

    const { data: activeAccounts, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1);

    if (accountError || !activeAccounts || activeAccounts.length === 0) {
      return res.status(400).json({ error: 'You must have an active account to apply for a loan' });
    }

    const defaultAccount = activeAccounts[0];

    const monthlyRate = interest_rate / 100 / 12;
    const numPayments = term_months;
    let totalDue;
    let monthlyPayment;

    if (monthlyRate === 0) {
      totalDue = principal;
      monthlyPayment = principal / numPayments;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                            (Math.pow(1 + monthlyRate, numPayments) - 1);
      totalDue = monthlyPayment * numPayments;
    }

    const firstPaymentDate = new Date();
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1);
    firstPaymentDate.setDate(1);

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .insert([{
        user_id: user.id,
        account_id: defaultAccount.id,
        loan_type,
        principal,
        interest_rate,
        term_months,
        purpose,
        collateral_description: collateral_description || null,
        remaining_balance: totalDue,
        monthly_payment_amount: monthlyPayment,
        total_amount: totalDue,
        next_payment_date: firstPaymentDate.toISOString().split('T')[0],
        payments_made: 0,
        status: 'pending',
        deposit_required: deposit_required || 0,
        deposit_paid: false,
        deposit_method: deposit_method || 'balance'
      }])
      .select()
      .single();

    if (loanError) {
      console.error('Error creating loan:', loanError);
      return res.status(500).json({ error: 'Failed to create loan application' });
    }

    await supabaseAdmin
      .from('notifications')
      .insert([{
        user_id: user.id,
        type: 'loan',
        title: 'Loan Application Received',
        message: `Your ${loan_type} loan application for $${principal.toLocaleString()} has been received and is pending review.`,
        read: false
      }]);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'Valued Customer';
    const userEmail = profile?.email || user.email;

    try {
      await sendEmail({
        to: userEmail,
        subject: 'Loan Application Received - Oakline Bank',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Loan Application Received - Deposit Required</h2>
            <p>Dear ${userName},</p>
            <p>Thank you for applying for a loan with Oakline Bank. We have received your application.</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1f2937;">Application Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Loan Type:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${loan_type.replace('_', ' ').toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Loan Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold;">$${principal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Term:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${term_months} months</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Interest Rate:</td>
                  <td style="padding: 8px 0; font-weight: bold;">${interest_rate}% APR</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Required Deposit:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #10b981;">$${deposit_required.toLocaleString()} (10%)</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">Awaiting Deposit</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0;">
              <p style="color: #1e40af; font-weight: 600; margin: 0 0 8px 0;">📌 Next Steps:</p>
              <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>Complete your 10% deposit ($${deposit_required.toLocaleString()})</li>
                <li>Our team will verify your deposit on the blockchain (1-3 business days)</li>
                <li>Once verified, your loan application will be reviewed</li>
                <li>Upon approval, funds will be disbursed to your account</li>
              </ol>
            </div>

            <p><strong>Important:</strong> Your deposit is held securely in our treasury and will be applied to your loan balance upon approval. If your loan is not approved, your deposit will be refunded to your account.</p>

            <p>You can track your deposit verification and application status in your Loan Dashboard.</p>

            <p>If you have any questions, please contact our customer support team.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>Oakline Bank Loan Department</strong></p>
          </div>
        `,
        from: process.env.SMTP_FROM_NOTIFY
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Loan application submitted successfully',
      loan: {
        id: loan.id,
        loan_type: loan.loan_type,
        principal: loan.principal,
        status: loan.status
      }
    });

  } catch (error) {
    console.error('Error in loan application:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
