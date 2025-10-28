import { verifyAdminAccess } from '../../../../lib/adminAuth';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isAdmin, error: authError } = await verifyAdminAccess(req);

    if (!isAdmin) {
      return res.status(403).json({ error: authError || 'Unauthorized - Admin access required' });
    }

    const { data: loans, error: loansError } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        profiles!loans_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    const enrichedLoans = loans.map(loan => ({
      ...loan,
      user_name: loan.profiles ? `${loan.profiles.first_name} ${loan.profiles.last_name}` : 'N/A',
      user_email: loan.profiles?.email || 'N/A'
    }));

    return res.status(200).json({
      success: true,
      loans: enrichedLoans || []
    });

  } catch (error) {
    console.error('Error in get-all loans:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
