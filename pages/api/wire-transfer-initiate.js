import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

function generateReferenceNumber() {
  return 'WIR-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      from_account,
      beneficiary_name,
      beneficiary_bank,
      routing_number,
      account_number,
      swift_code,
      amount,
      memo
    } = req.body;

    if (!from_account || !beneficiary_name || !beneficiary_bank || 
        !routing_number || !account_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0 || isNaN(transferAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', from_account)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    if (parseFloat(account.balance) < transferAmount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const referenceNumber = generateReferenceNumber();

    const { data: transfer, error: transferError } = await supabaseAdmin
      .from('wire_transfers')
      .insert([{
        user_id: user.id,
        from_account_id: from_account,
        beneficiary_name,
        beneficiary_bank,
        routing_number,
        account_number,
        swift_code: swift_code || null,
        amount: transferAmount,
        memo: memo || null,
        status: 'pending',
        reference_number: referenceNumber
      }])
      .select()
      .single();

    if (transferError) {
      console.error('Error creating wire transfer:', transferError);
      return res.status(500).json({ error: 'Failed to create wire transfer' });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const { error: codeError } = await supabaseAdmin
      .from('verification_codes')
      .insert([{
        user_id: user.id,
        code: verificationCode,
        type: 'wire',
        reference_id: transfer.id,
        expires_at: expiresAt.toISOString()
      }]);

    if (codeError) {
      console.error('Error creating verification code:', codeError);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: 'Oakline Bank - Wire Transfer Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7f9fc;">
            <div style="background-color: white; padding: 30px; border-radius: 10px;">
              <h2 style="color: #1A3E6F;">Wire Transfer Verification</h2>
              <p>Your verification code for wire transfer is:</p>
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2563eb 100%); color: white; text-align: center; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                ${verificationCode}
              </div>
              <p style="color: #ef4444; margin-top: 20px;">⚠️ This code expires in 10 minutes.</p>
              <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #7f1d1d; font-size: 14px; margin: 0;">
                  <strong>Important:</strong> Wire transfers are typically irreversible. Verify all details before proceeding.
                </p>
              </div>
              <p><strong>Beneficiary:</strong> ${beneficiary_name}</p>
              <p><strong>Bank:</strong> ${beneficiary_bank}</p>
              <p><strong>Amount:</strong> $${transferAmount.toFixed(2)}</p>
              <p><strong>Reference:</strong> ${referenceNumber}</p>
            </div>
          </div>
        `
      });
    }

    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: 'wire_transfer_initiated',
      message: 'Wire transfer initiated',
      details: { reference_number: referenceNumber, amount: transferAmount, beneficiary: beneficiary_name }
    }]);

    return res.status(200).json({
      success: true,
      transfer_id: transfer.id,
      reference_number: referenceNumber,
      message: 'Wire transfer initiated. Check your email for verification code.'
    });

  } catch (error) {
    console.error('Wire transfer initiation error:', error);
    return res.status(500).json({
      error: 'Failed to initiate wire transfer',
      message: error.message
    });
  }
}
