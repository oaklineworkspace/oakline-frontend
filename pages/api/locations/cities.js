
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

    // Handle country names as well as codes
    const { data: country, error: countryError } = await supabaseAdmin
      .from('countries')
      .select('id')
      .or(`code.eq.${country_code},name.eq.${country_code}`)
      .single();

    if (countryError || !country) {
      return res.status(200).json({ cities: [] });
    }

    const { data: state, error: stateError } = await supabaseAdmin
      .from('states')
      .select('id')
      .eq('code', state_code)
      .eq('country_id', country.id)
      .single();

    if (stateError || !state) {
      return res.status(200).json({ cities: [] });
    }

    const { data: cities, error } = await supabaseAdmin
      .from('cities')
      .select('id, name')
      .eq('state_id', state.id)
      .order('name');

    if (error) {
      console.error('Error fetching cities:', error);
      return res.status(200).json({ cities: [] });
    }

    return res.status(200).json({ cities: cities || [] });
  } catch (error) {
    console.error('Error in cities API:', error);
    return res.status(200).json({ cities: [] });
  }
}
