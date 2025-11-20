
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

    // Handle country names as well as codes
    const { data: country, error: countryError } = await supabaseAdmin
      .from('countries')
      .select('id')
      .or(`code.eq.${country_code},name.eq.${country_code}`)
      .single();

    if (countryError || !country) {
      // If country not found in database, return empty array (not an error for UI)
      return res.status(200).json({ states: [] });
    }

    const { data: states, error } = await supabaseAdmin
      .from('states')
      .select('id, code, name')
      .eq('country_id', country.id)
      .order('name');

    if (error) {
      console.error('Error fetching states:', error);
      return res.status(200).json({ states: [] });
    }

    return res.status(200).json({ states: states || [] });
  } catch (error) {
    console.error('Error in states API:', error);
    return res.status(200).json({ states: [] });
  }
}
