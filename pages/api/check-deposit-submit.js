import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

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
      .select()
      .single();

    if (depositError) {
      console.error('Error creating check deposit:', depositError);
      return res.status(500).json({ error: 'Failed to submit deposit' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const customerName = profile ? `${profile.first_name} ${profile.last_name}` : 'Customer';
    const customerEmail = profile?.email || user.email;

    await supabaseAdmin.from('notifications').insert([{
      user_id: user.id,
      type: 'check_deposit',
      title: 'Check Deposit Received',
      message: `Your check deposit of $${depositAmount.toFixed(2)} is being processed. Ref: ${referenceNumber}`
    }]);

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: user.id,
      action: 'check_deposit_submit',
      table_name: 'check_deposits',
      old_data: {
        deposit_count: deposits?.length || 0,
        account_balance: parseFloat(account.balance)
      },
      new_data: {
        amount: depositAmount,
        reference: referenceNumber,
        account_id,
        check_number,
        status: 'pending'
      }
    }]);

    await supabaseAdmin.from('system_logs').insert([{
      level: 'info',
      type: 'transaction',
      message: `Check deposit submitted: ${referenceNumber}`,
      details: {
        user_id: user.id,
        amount: depositAmount,
        reference: referenceNumber
      },
      user_id: user.id
    }]);

    try {
      await sendEmail({
        to: customerEmail,
        subject: '✓ Check Deposit Received - Oakline Bank',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0;">📸 Check Deposit Received</h1>
                <p style="color: #ffffff; opacity: 0.9; font-size: 16px; margin: 8px 0 0 0;">Oakline Bank</p>
              </div>
              
              <div style="padding: 40px 32px;">
                <h2 style="color: #1e40af; font-size: 24px; font-weight: 700; margin: 0 0 16px 0;">
                  Hello ${customerName},
                </h2>
                
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                  We have received your check deposit and it is being processed.
                </p>
                
                <div style="background-color: #f0f9ff; border-left: 4px solid #1e40af; padding: 20px; margin: 24px 0;">
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #1e40af;">Amount:</strong>
                    <span style="color: #1e293b; font-size: 18px; font-weight: 700; margin-left: 8px;">$${depositAmount.toFixed(2)}</span>
                  </div>
                  <div style="margin-bottom: 12px;">
                    <strong style="color: #1e40af;">Reference Number:</strong>
                    <span style="color: #1e293b; margin-left: 8px; font-family: monospace;">${referenceNumber}</span>
                  </div>
                  <div>
                    <strong style="color: #1e40af;">Status:</strong>
                    <span style="color: #f59e0b; margin-left: 8px;">Pending Review</span>
                  </div>
                </div>
                
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                  <p style="color: #92400e; font-size: 14px; font-weight: 500; margin: 0;">
                    ⏱️ Funds typically available within 1-2 business days after approval
                  </p>
                </div>
                
                <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0;">
                  You'll receive another email once your deposit has been reviewed and approved.
                </p>
              </div>
              
              <div style="background-color: #f7fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #718096; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br/>
                  Member FDIC | Equal Housing Lender | Routing: 075915826
                </p>
              </div>
            </div>
          </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Check deposit submitted successfully',
      reference_number: referenceNumber,
      deposit_id: deposit.id
    });

  } catch (error) {
    console.error('Check deposit error:', error);
    return res.status(500).json({
      error: 'Deposit submission failed',
      message: error.message
    });
  }
}
