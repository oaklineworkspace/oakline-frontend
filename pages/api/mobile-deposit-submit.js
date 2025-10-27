import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

function generateReferenceNumber() {
  return 'MD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
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
      check_front_image,
      check_back_image,
      memo
    } = req.body;

    if (!account_id || !amount || !check_front_image || !check_back_image) {
      return res.status(400).json({ error: 'Missing required fields. Both check images are required.' });
    }

    const depositAmount = parseFloat(amount);
    if (depositAmount <= 0 || isNaN(depositAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    const referenceNumber = generateReferenceNumber();

    const { data: deposit, error: depositError } = await supabaseAdmin
      .from('mobile_deposits')
      .insert([{
        user_id: user.id,
        account_id,
        amount: depositAmount,
        check_front_image,
        check_back_image,
        memo: memo || null,
        status: 'pending',
        reference_number: referenceNumber
      }])
      .select()
      .single();

    if (depositError) {
      console.error('Error creating mobile deposit:', depositError);
      return res.status(500).json({ error: 'Failed to submit deposit' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: 'Oakline Bank - Mobile Deposit Submitted',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9fc;">
            <div style="background-color: white; padding: 30px; border-radius: 10px;">
              <h2 style="color: #1A3E6F;">Mobile Deposit Submitted</h2>
              <p>Your mobile check deposit has been successfully submitted and is now under review.</p>
              <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #1e40af; font-size: 14px; margin: 0;">
                  <strong>Reference Number:</strong> ${referenceNumber}<br/>
                  <strong>Amount:</strong> $${depositAmount.toFixed(2)}<br/>
                  <strong>Account:</strong> ${account.account_number}<br/>
                  <strong>Status:</strong> Under Review<br/>
                  <strong>Processing Time:</strong> 1-2 business days
                </p>
              </div>
              <p>We'll notify you once your deposit has been reviewed and approved. Funds typically become available within 1-2 business days after approval.</p>
              <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact us at support@theoaklinebank.com</p>
            </div>
          </div>
        `
      });
    }

    await supabaseAdmin.from('notifications').insert([{
      user_id: user.id,
      type: 'mobile_deposit',
      title: 'Mobile Deposit Submitted',
      message: `Your check deposit of $${depositAmount} is under review`,
      priority: 'normal'
    }]);

    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: 'mobile_deposit_submitted',
      message: 'Mobile deposit submitted',
      details: { reference_number: referenceNumber, amount: depositAmount }
    }]);

    return res.status(200).json({
      success: true,
      deposit_id: deposit.id,
      reference_number: referenceNumber,
      message: 'Deposit submitted successfully and is under review'
    });

  } catch (error) {
    console.error('Mobile deposit submission error:', error);
    return res.status(500).json({
      error: 'Failed to submit deposit',
      message: error.message
    });
  }
}
