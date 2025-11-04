
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state_code, country_code } = req.query;

    if (!state_code || !country_code) {
      return res.status(400).json({ error: 'State code and country code are required' });
    }

    const { data: country, error: countryError } = await supabaseAdmin
      .from('countries')
      .select('id')
      .eq('code', country_code)
      .single();

    if (countryError || !country) {
      return res.status(404).json({ error: 'Country not found' });
    }

    const { data: state, error: stateError } = await supabaseAdmin
      .from('states')
      .select('id')
      .eq('code', state_code)
      .eq('country_id', country.id)
      .single();

    if (stateError || !state) {
      return res.status(404).json({ error: 'State not found' });
    }

    const { data: cities, error } = await supabaseAdmin
      .from('cities')
      .select('id, name')
      .eq('state_id', state.id)
      .order('name');

    if (error) {
      console.error('Error fetching cities:', error);
      return res.status(500).json({ error: 'Failed to fetch cities' });
    }

    return res.status(200).json({ cities });
  } catch (error) {
    console.error('Error in cities API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
