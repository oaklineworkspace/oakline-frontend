import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: bankDetails, error } = await supabaseAdmin
      .from('bank_details')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching bank details:', error);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }

    return res.status(200).json({ bankDetails });
  } catch (error) {
    console.error('Bank details API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}