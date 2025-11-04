
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { country_code } = req.query;

    if (!country_code) {
      return res.status(400).json({ error: 'Country code is required' });
    }

    const { data: country, error: countryError } = await supabaseAdmin
      .from('countries')
      .select('id')
      .eq('code', country_code)
      .single();

    if (countryError || !country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const { data: states, error } = await supabaseAdmin
      .from('states')
      .select('id, code, name')
      .eq('country_id', country.id)
      .order('name');

    if (error) {
      console.error('Error fetching states:', error);
      return res.status(500).json({ error: 'Failed to fetch states' });
    }

    return res.status(200).json({ states });
  } catch (error) {
    console.error('Error in states API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
