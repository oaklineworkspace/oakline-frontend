import { supabase } from '../../lib/supabaseClient';

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    // Fetch crypto deposits for the logged-in user
    let query = supabase
      .from('crypto_deposits')
      .select('*')
      .eq('user_id', user.id);

    // Apply filters if provided
    const { crypto_type, status, date_from, date_to, sort_by, sort_order } = req.query;

    if (crypto_type) {
      query = query.eq('crypto_type', crypto_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    // Apply sorting
    const sortField = sort_by || 'created_at';
    const sortDirection = sort_order === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortDirection });

    const { data: deposits, error } = await query;

    if (error) {
      console.error('Error fetching crypto deposits:', error);
      return res.status(500).json({ error: 'Failed to fetch deposits' });
    }

    return res.status(200).json({
      success: true,
      deposits: deposits || [],
      count: deposits?.length || 0
    });

  } catch (error) {
    console.error('Crypto deposits API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
