import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized - Please sign in to view bank details',
        authenticated: false 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Invalid authentication',
        authenticated: false 
      });
    }

    const { data: bankDetails, error: bankError } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (bankError) {
      console.error('Error fetching bank details:', bankError);
      return res.status(500).json({ 
        error: 'Failed to fetch bank details',
        authenticated: true 
      });
    }

    return res.status(200).json({ 
      bankDetails,
      authenticated: true 
    });
  } catch (error) {
    console.error('Exception in bank-details API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      authenticated: false 
    });
  }
}
