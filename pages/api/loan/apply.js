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
    const { data: existingLoans, error: existingLoansError} = await supabaseAdmin
      .from('loans')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['pending_deposit', 'under_review', 'active', 'approved']);

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
        status: 'pending_deposit',
        deposit_required: deposit_required || 0,
        deposit_paid: false,
        deposit_status: 'pending',
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

    // Fetch bank details for loan email
    const { data: bankDetails } = await supabaseAdmin
      .from('bank_details')
      .select('loan_email, contact_email')
      .limit(1)
      .single();

    const loanEmail = bankDetails?.loan_email || bankDetails?.contact_email || 'loans@theoaklinebank.com';

    // Send loan submission email
    try {
      const { sendLoanSubmittedEmail } = require('../../../lib/email');
      
      await sendLoanSubmittedEmail({
        to: userEmail,
        userName,
        loanAmount: principal,
        loanType: loan_type.replace(/_/g, ' ').toUpperCase(),
        depositRequired: deposit_required || 0
      });
    } catch (emailError) {
      console.error('Error sending loan submission email:', emailError);
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
/* OLD EMAIL CODE REMOVED
    try {
      const emailHtml = `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Loan Application Received</title>
            <style>
              body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 680px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
              .header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e2e8f0; }
              .header h1 { color: #10b981; font-size: 28px; font-weight: 700; margin: 0; }
              .content { margin-bottom: 32px; }
              .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .details-table td { padding: 12px 0; font-size: 14px; }
              .details-table td:first-child { color: #64748b; font-weight: 500; width: 50%; }
              .details-table td:last-child { font-weight: 700; font-size: 15px; color: #1e293b; text-align: right; }
              .deposit-notice { background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0; }
              .deposit-notice h3 { color: #92400e; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px; }
              .deposit-notice p { color: #92400e; font-size: 14px; margin: 0 0 12px 0; line-height: 1.6; }
              .deposit-amount { background-color: #fff; padding: 16px; border-radius: 8px; margin-top: 12px; }
              .deposit-amount span:first-child { color: #64748b; font-size: 14px; font-weight: 500; }
              .deposit-amount span:last-child { color: #059669; font-size: 20px; font-weight: 700; }
              .next-steps { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin: 24px 0; }
              .next-steps h3 { color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; }
              .next-steps ol { color: #1e40af; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px; }
              .cta-button { text-align: center; margin: 32px 0; }
              .cta-button a { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
              .footer { background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0; }
              .footer p { color: #718096; font-size: 14px; margin: 0 0 16px 0; }
              .footer p:last-child { font-weight: 600; margin-bottom: 8px; }
              .footer-bottom p { color: #718096; font-size: 12px; margin: 0; }
              strong { color: #1e293b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Oakline Bank</h1>
                <p style="color: #64748b; font-size: 16px; margin-top: 8px;">Loan Application Confirmation</p>
              </div>

              <div class="content">
                <p style="color: #4a5568; font-size: 15px; line-height: 1.7;">Dear ${userName},</p>
                <p style="color: #4a5568; font-size: 15px; line-height: 1.7;">
                  Thank you for choosing Oakline Bank for your financial needs. We're pleased to confirm that your loan application has been successfully received and is now under initial review.
                </p>

                <!-- Application Details -->
                <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px; margin-top: 24px;">
                  <h3 style="color: #1e293b; font-size: 17px; font-weight: 700; margin: 0 0 16px 0;">Your Application Details</h3>
                  <table class="details-table">
                    <tr>
                      <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500;">Loan Type:</td>
                      <td style="padding: 12px 0; font-weight: 700; font-size: 15px; color: #10b981; text-align: right;">${loan_type.replace('_', ' ').toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500;">Requested Loan Amount:</td>
                      <td style="padding: 12px 0; font-weight: 700; font-size: 15px; color: #1e293b; text-align: right;">$${principal.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500;">Loan Term:</td>
                      <td style="padding: 12px 0; font-weight: 700; font-size: 15px; color: #1e293b; text-align: right;">${term_months} months</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500;">Interest Rate (APR):</td>
                      <td style="padding: 12px 0; font-weight: 700; font-size: 15px; color: #10b981; text-align: right;">${interest_rate}%</td>
                    </tr>
                    <tr style="border-top: 1px solid #e5e7eb;">
                      <td style="padding: 12px 0; color: #64748b; font-size: 14px; font-weight: 500;">Estimated Monthly Payment:</td>
                      <td style="padding: 12px 0; font-weight: 700; font-size: 15px; color: #1e293b; text-align: right;">$${monthlyPayment.toFixed(2)}</td>
                    </tr>
                  </table>
                </div>

                <!-- Required Deposit Notice -->
                <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 24px 0;">
                  <h3 style="color: #92400e; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 20px;">💰</span>
                    Required Security Deposit
                  </h3>
                  <p style="color: #92400e; font-size: 14px; margin: 0 0 12px 0; line-height: 1.6;">
                    To proceed with your loan application, a security deposit of <strong>10%</strong> of the requested loan amount is required. This deposit will be reviewed by our Loan Department and demonstrates your commitment to the application process.
                  </p>
                  <div style="background-color: #fff; padding: 16px; border-radius: 8px; margin-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #64748b; font-size: 14px; font-weight: 500;">Required Deposit Amount:</span>
                      <span style="color: #059669; font-size: 20px; font-weight: 700;">$${deposit_required.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <!-- Next Steps -->
                <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin: 24px 0;">
                  <h3 style="color: #1e40af; font-size: 16px; font-weight: 700; margin: 0 0 16px 0;">
                    📋 Next Steps to Complete Your Application
                  </h3>
                  <ol style="color: #1e40af; font-size: 14px; line-height: 2; margin: 0; padding-left: 20px;">
                    <li>Log in to your Oakline Bank account</li>
                    <li>Navigate to the Loan Dashboard</li>
                    <li>Complete the required 10% security deposit</li>
                    <li>Your deposit will be verified by our Loan Department</li>
                    <li>Await review and approval from our Loan Department (24-48 hours)</li>
                  </ol>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/loan/dashboard" 
                     style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
                            color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; 
                            font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                    Complete Your Deposit
                  </a>
                </div>

                <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                  If you have any questions or need assistance, our dedicated loan specialists are here to help you every step of the way.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
                  Need assistance? Contact our loan specialists 24/7:
                </p>
                <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                  📧 ${loanEmail} | 📞 (636) 635-6122
                </p>

                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                  <p style="color: #718096; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                    Member FDIC | Equal Housing Lender | Routing: 075915826<br>
                    12201 N May Avenue, Oklahoma City, OK 73120
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

      await sendEmail({
        to: userEmail,
        subject: '✅ Loan Application Received - Oakline Bank',
        html: emailHtml,
        from: loanEmail
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