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

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select(`
        id,
        user_id,
        account_id,
        loan_type,
        principal,
        interest_rate,
        term_months,
        start_date,
        status,
        created_at,
        updated_at,
        purpose,
        remaining_balance,
        monthly_payment_amount,
        total_amount,
        next_payment_date,
        last_payment_date,
        auto_payment_enabled,
        auto_payment_account_id,
        auto_payment_day,
        late_fee_amount,
        payments_made,
        is_late,
        disbursed_at,
        credit_score,
        collateral_description,
        approval_notes,
        rejection_reason,
        deposit_required,
        deposit_paid,
        deposit_method,
        deposit_amount,
        deposit_date,
        deposit_status,
        approved_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    return res.status(200).json({
      success: true,
      loans: loans || []
    });

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
