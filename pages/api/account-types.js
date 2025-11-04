
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('account_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching account types:', error);
      return res.status(500).json({ error: 'Failed to fetch account types' });
    }

    return res.status(200).json({ accountTypes: data });
  } catch (error) {
    console.error('Error in account-types API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
