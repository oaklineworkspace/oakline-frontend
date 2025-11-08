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

    const { loan_type, principal, term_months, purpose, interest_rate, deposit_required, deposit_method, id_documents, collaterals } = req.body;

    if (!loan_type || !principal || !term_months || !purpose || !interest_rate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!id_documents || !id_documents.front || !id_documents.back) {
      return res.status(400).json({ error: 'ID documents are required' });
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
        collateral_description: collaterals && collaterals.length > 0 ? collaterals.map(c => c.description).join('; ') : null,
        remaining_balance: totalDue,
        monthly_payment_amount: monthlyPayment,
        total_amount: totalDue,
        next_payment_date: firstPaymentDate.toISOString().split('T')[0],
        payments_made: 0,
        status: 'pending_deposit',
        deposit_required: deposit_required || 0,
        deposit_paid: false,
        deposit_status: 'pending',
        deposit_method: deposit_method || 'balance',
        id_front_path: id_documents?.front || null,
        id_back_path: id_documents?.back || null
      }])
      .select()
      .single();

    if (loanError) {
      console.error('Error creating loan:', loanError);
      return res.status(500).json({ error: 'Failed to create loan application' });
    }

    // Store ID documents
    await supabaseAdmin
      .from('user_id_documents')
      .insert([
        {
          user_id: user.id,
          document_type: 'id_front',
          file_path: id_documents.front,
          verified: false
        },
        {
          user_id: user.id,
          document_type: 'id_back',
          file_path: id_documents.back,
          verified: false
        }
      ]);

    // Store collaterals if provided
    if (collaterals && collaterals.length > 0) {
      const collateralInserts = collaterals.map(col => ({
        loan_id: loan.id,
        collateral_type: col.collateral_type,
        ownership_type: col.ownership_type,
        estimated_value: parseFloat(col.estimated_value),
        description: col.description,
        photo_urls: col.photos
      }));

      await supabaseAdmin
        .from('loan_collaterals')
        .insert(collateralInserts);
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