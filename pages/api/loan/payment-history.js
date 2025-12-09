import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    const { loanId, loan_id } = req.query;
    const actualLoanId = loanId || loan_id;

    if (!actualLoanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('id', actualLoanId)
      .eq('user_id', user.id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Fetch all loan payments including deposits - get both crypto and balance payments
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from('loan_payments')
      .select('*')
      .eq('loan_id', actualLoanId)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payment history:', paymentsError);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    console.log(`Found ${payments?.length || 0} total payments for loan ${actualLoanId}`);
    
    // Log payment methods to debug
    if (payments && payments.length > 0) {
      payments.forEach(p => {
        console.log(`Payment ${p.id}: payment_method=${p.payment_method}, deposit_method=${p.deposit_method}, is_deposit=${p.is_deposit}, status=${p.status}, amount=${p.amount}`);
      });
    }

    let totalPaid = 0;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalLateFees = 0;

    const enrichedPayments = (payments || []).map(payment => {
        const principalAmount = parseFloat(payment.principal_amount || 0);
        const interestAmount = parseFloat(payment.interest_amount || 0);
        const lateFee = parseFloat(payment.late_fee || 0);
        const amount = parseFloat(payment.amount || 0);

        // Only count completed/approved payments in totals
        if (payment.status === 'completed' || payment.status === 'approved') {
          totalPaid += amount;
          totalPrincipalPaid += principalAmount;
          totalInterestPaid += interestAmount;
          totalLateFees += lateFee;
        }

        // Determine display payment type - check both payment_method and deposit_method
        let displayPaymentType = payment.payment_type || 'manual';
        const paymentMethod = payment.payment_method || payment.deposit_method;
        
        if (payment.is_deposit) {
          displayPaymentType = 'deposit';
        } else if (paymentMethod === 'crypto') {
          displayPaymentType = 'crypto_payment';
        } else if (paymentMethod === 'account_balance' || paymentMethod === 'balance') {
          displayPaymentType = 'account_balance';
        }

        // Extract crypto info from metadata if available
        const cryptoType = payment.metadata?.crypto_type || null;
        const networkType = payment.metadata?.network_type || null;
        const walletAddress = payment.metadata?.loan_wallet_address || payment.metadata?.wallet_address || null;

        return {
          ...payment,
          principal_amount: principalAmount,
          interest_amount: interestAmount,
          late_fee: lateFee,
          payment_type: displayPaymentType,
          payment_method: paymentMethod,
          // Keep both timestamps for accurate display
          payment_date: payment.payment_date || payment.created_at,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          completed_at: payment.completed_at,
          // Include crypto/payment method info
          crypto_type: cryptoType,
          network_type: networkType,
          tx_hash: payment.tx_hash || null,
          wallet_address: walletAddress,
          proof_path: payment.proof_path || null
        };
      });

    const summary = {
      total_payments: enrichedPayments.length,
      completed_payments: enrichedPayments.filter(p => p.status === 'completed' || p.status === 'approved').length,
      pending_payments: enrichedPayments.filter(p => p.status === 'pending').length,
      failed_payments: enrichedPayments.filter(p => p.status === 'failed' || p.status === 'rejected').length,
      total_paid: parseFloat(totalPaid.toFixed(2)),
      total_principal_paid: parseFloat(totalPrincipalPaid.toFixed(2)),
      total_interest_paid: parseFloat(totalInterestPaid.toFixed(2)),
      total_late_fees: parseFloat(totalLateFees.toFixed(2))
    };

    return res.status(200).json({
      success: true,
      loan_info: {
        loan_id: loan.id,
        loan_type: loan.loan_type,
        principal: parseFloat(loan.principal),
        remaining_balance: parseFloat(loan.remaining_balance || 0),
        status: loan.status
      },
      payment_summary: summary,
      payments: enrichedPayments
    });

  } catch (error) {
    console.error('Error fetching payment history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}