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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const {
      account_id,
      amount,
      check_number,
      check_front_image,
      check_back_image
    } = req.body;

    if (!account_id || !amount || !check_front_image || !check_back_image) {
      return res.status(400).json({ error: 'Missing required fields. Both check images are required.' });
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0 || isNaN(depositAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (depositAmount > 5000) {
      return res.status(400).json({ error: 'Check deposits over $5,000 require manual review. Please visit a branch or contact support.' });
    }

    const referenceNumber = generateReferenceNumber();

    // Insert the check deposit record
    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('check_deposits')
      .insert([{
        user_id: user.id,
        account_id,
        amount: depositAmount,
        check_number: check_number || null,
        check_front_image,
        check_back_image,
        status: 'pending',
        metadata: { reference_number: referenceNumber }
      }])
      .select();

    if (depositError) {
      console.error('Error creating check deposit:', depositError);
      return res.status(500).json({ error: `Failed to submit deposit: ${depositError.message}` });
    }

    // Return success with reference number
    return res.status(200).json({
      success: true,
      reference_number: referenceNumber,
      message: `Check deposit submitted successfully for review. Reference: ${referenceNumber}`
    });
  } catch (error) {
    console.error('Unexpected error in check deposit:', error);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
