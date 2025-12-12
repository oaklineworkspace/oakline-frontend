
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's email
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    // Find all pending payments for this email
    const { data: pendingPayments, error: pendingError } = await supabaseAdmin
      .from('oakline_pay_pending_claims')
      .select('*')
      .eq('recipient_email', profile.email)
      .eq('status', 'pending')
      .lt('expires_at', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString());

    if (pendingError) {
      console.error('Error fetching pending payments:', pendingError);
      return res.status(500).json({ error: 'Failed to fetch pending payments' });
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No pending payments to claim',
        claimed_count: 0 
      });
    }

    // Get user's default active account
    const { data: recipientAccount } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!recipientAccount) {
      return res.status(400).json({ error: 'No active account found to receive payments' });
    }

    let totalClaimed = 0;
    let claimedCount = 0;
    const claimedPayments = [];

    // Process each pending payment
    for (const payment of pendingPayments) {
      try {
        const amount = parseFloat(payment.amount);
        const newBalance = parseFloat(recipientAccount.balance) + amount;

        // Update recipient's account balance
        await supabaseAdmin
          .from('accounts')
          .update({ 
            balance: newBalance, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', recipientAccount.id);

        // Create credit transaction for recipient
        await supabaseAdmin
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: recipientAccount.id,
            type: 'oakline_pay_receive',
            amount: amount,
            description: `Oakline Pay from pending payment${payment.memo ? ` - ${payment.memo}` : ''}`,
            reference: payment.reference_number,
            status: 'completed',
            balance_before: parseFloat(recipientAccount.balance),
            balance_after: newBalance
          });

        // Mark pending payment as completed
        await supabaseAdmin
          .from('oakline_pay_pending_claims')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            claimed_by: user.id
          })
          .eq('id', payment.id);

        // Create completed transaction record
        await supabaseAdmin
          .from('oakline_pay_transactions')
          .insert({
            sender_id: payment.sender_id,
            sender_account_id: payment.sender_account_id,
            recipient_id: user.id,
            recipient_account_id: recipientAccount.id,
            recipient_contact: payment.recipient_email,
            recipient_type: 'email',
            amount: amount,
            memo: payment.memo,
            status: 'completed',
            reference_number: payment.reference_number,
            is_verified: true,
            recipient_balance_before: parseFloat(recipientAccount.balance),
            recipient_balance_after: newBalance,
            processed_at: new Date().toISOString()
          });

        totalClaimed += amount;
        claimedCount++;
        claimedPayments.push(payment);

        // Update recipient account balance for next iteration
        recipientAccount.balance = newBalance;

        // Notify sender
        const { data: senderProfile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name, first_name, last_name')
          .eq('id', payment.sender_id)
          .single();

        if (senderProfile) {
          try {
            await sendEmail({
              to: senderProfile.email,
              subject: 'Your Oakline Pay payment was claimed!',
              emailType: 'notify',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">✓ Payment Claimed</h1>
                  </div>
                  <div style="padding: 30px; background-color: #f8f9fa;">
                    <h2 style="color: #1A3E6F;">Good News!</h2>
                    <p><strong>${profile.full_name || profile.first_name || payment.recipient_email}</strong> just claimed your Oakline Pay payment of <strong>$${amount.toFixed(2)}</strong></p>
                    ${payment.memo ? `<p>Memo: ${payment.memo}</p>` : ''}
                    <p style="color: #666; font-size: 14px;">Reference: ${payment.reference_number}</p>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error('Error sending sender notification:', emailError);
          }
        }

      } catch (error) {
        console.error(`Error claiming payment ${payment.id}:`, error);
      }
    }

    // Notify recipient
    if (claimedCount > 0) {
      try {
        await sendEmail({
          to: profile.email,
          subject: `You claimed $${totalClaimed.toFixed(2)} in Oakline Pay payments!`,
          emailType: 'notify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1A3E6F 0%, #2C5F8D 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">💰 Payments Claimed!</h1>
              </div>
              <div style="padding: 30px; background-color: #f8f9fa;">
                <h2 style="color: #1A3E6F;">Welcome to Oakline Pay!</h2>
                <p>You've successfully claimed <strong>${claimedCount}</strong> pending payment${claimedCount > 1 ? 's' : ''} totaling <strong>$${totalClaimed.toFixed(2)}</strong></p>
                <p>The money has been added to your account.</p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://theoaklinebank.com'}/dashboard"
                     style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #2c5aa0 100%);
                            color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none;
                            font-weight: 600; font-size: 16px;">
                    View Dashboard
                  </a>
                </div>
              </div>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Error sending recipient notification:', emailError);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully claimed ${claimedCount} payment${claimedCount > 1 ? 's' : ''}`,
      claimed_count: claimedCount,
      total_amount: totalClaimed,
      payments: claimedPayments
    });

  } catch (error) {
    console.error('Claim pending payments error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
