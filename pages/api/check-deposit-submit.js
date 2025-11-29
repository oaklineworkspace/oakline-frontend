import { supabaseAdmin } from '../../lib/supabaseAdmin';

function generateReferenceNumber() {
  return `CHK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid auth' });
    }

    const { account_id, amount, check_front_image, check_back_image } = req.body;

    if (!account_id || !amount || !check_front_image || !check_back_image) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0 || depositAmount > 5000) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const referenceNumber = generateReferenceNumber();

    // Insert check deposit - RLS is disabled on this table
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('check_deposits')
      .insert([{
        user_id: user.id,
        account_id,
        amount: depositAmount,
        check_front_image,
        check_back_image,
        status: 'pending',
        metadata: { reference_number: referenceNumber }
      }])
      .select()
      .single();

    if (depositError) {
      console.error('Check deposit error:', depositError);
      return res.status(500).json({ error: depositError.message });
    }

    return res.status(200).json({
      success: true,
      reference_number: referenceNumber,
      deposit_id: deposit.id
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
