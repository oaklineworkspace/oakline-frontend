import { supabaseAdmin } from '../../lib/supabaseAdmin';

function generateReference() {
  return `OKR${Date.now()}${Math.floor(Math.random() * 1000)}`;
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

    const { requester_account_id, recipient_contact, recipient_type, amount, memo } = req.body;

    if (!requester_account_id || !recipient_contact || !amount || !recipient_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const requestAmount = parseFloat(amount);
    if (requestAmount <= 0 || isNaN(requestAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get requester's account
    const { data: requesterAccount, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', requester_account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !requesterAccount) {
      return res.status(404).json({ error: 'Requester account not found' });
    }

    // Get requester's profile for name
    const { data: requesterProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, first_name, email')
      .eq('id', user.id)
      .single();

    const referenceNumber = generateReference();

    // Create payment request - only include fields that exist in the table
    const { data: paymentRequest, error: requestError } = await supabaseAdmin
      .from('oakline_pay_requests')
      .insert({
        requester_id: user.id,
        requester_account_id: requester_account_id,
        recipient_contact: recipient_contact,
        amount: requestAmount,
        memo: memo || null,
        status: 'pending',
        reference_number: referenceNumber
      })
      .select()
      .single();

    if (requestError) {
      console.error('Payment request creation error:', requestError);
      return res.status(500).json({ error: 'Failed to create payment request' });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment request sent successfully',
      request_id: paymentRequest.id,
      reference_number: referenceNumber,
      recipient_contact: recipient_contact,
      amount: requestAmount
    });

  } catch (error) {
    console.error('Error in payment request handler:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
