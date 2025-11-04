
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: countries, error } = await supabaseAdmin
      .from('countries')
      .select('id, code, name')
      .order('name');

    if (error) {
      console.error('Error fetching countries:', error);
      return res.status(500).json({ error: 'Failed to fetch countries' });
    }

    return res.status(200).json({ countries });
  } catch (error) {
    console.error('Error in countries API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
