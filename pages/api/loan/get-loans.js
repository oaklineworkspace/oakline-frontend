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

    // Fetch loans
    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    // For each loan, fetch related crypto deposits
    const loansWithDeposits = await Promise.all(
      (loans || []).map(async (loan) => {
        const { data: deposits, error: depositsError } = await supabaseAdmin
          .from('crypto_deposits')
          .select('*')
          .eq('user_id', user.id)
          .eq('purpose', 'loan_requirement')
          .order('created_at', { ascending: false });

        return {
          ...loan,
          deposit_transactions: depositsError ? [] : (deposits || [])
        };
      })
    );

    return res.status(200).json({
      success: true,
      loans: loansWithDeposits || []
    });

  } catch (error) {
    console.error('Error in get-loans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
