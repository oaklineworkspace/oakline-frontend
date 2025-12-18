
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { sendEmail } from '../../lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function generateTransactionPIN() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateReference() {
  return `OKP${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function generateClaimToken() {
  return crypto.randomBytes(32).toString('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing auth header');
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Verifying token for oakline-pay-send...');
    
    let user = null;
    let authError = null;
    
    try {
      const response = await supabaseAdmin.auth.getUser(token);
      user = response.data?.user;
      authError = response.error;
      
      if (authError) {
        console.error('Supabase getUser error:', authError.message);
      }
      if (!user) {
        console.error('No user returned from getUser');
      }
    } catch (err) {
      console.error('Token verification exception:', err.message);
      authError = err;
    }

    if (authError || !user) {
      console.error('Auth failed - returning 401');
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }
    
    console.log('✅ Auth successful for user:', user.id);

    const { sender_account_id, recipient_contact, recipient_type, recipient_name, amount, memo, step, verification_code } = req.body;

    // STEP 1: INITIATE TRANSFER
    if (step === 'initiate') {
      if (!sender_account_id || !recipient_contact || !amount || !recipient_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const transferAmount = parseFloat(amount);
      if (transferAmount <= 0 || isNaN(transferAmount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      // Get sender's account
      const { data: senderAccount, error: accountError } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', sender_account_id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (accountError || !senderAccount) {
        return res.status(404).json({ error: 'Account not found' });
      }

      if (parseFloat(senderAccount.balance) < transferAmount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      let recipientProfile = null;
      let isOaklineUser = false;

      // Check if recipient is an Oakline user
      if (recipient_type === 'oakline_tag') {
        const normalizedTag = recipient_contact.startsWith('@') ? recipient_contact.slice(1) : recipient_contact;
        console.log('🔍 Looking for Oakline tag:', normalizedTag);
        
        try {
          // Query with exact match (case-sensitive first)
          let { data: oaklinePay, error: exactError } = await supabaseAdmin
            .from('oakline_pay_profiles')
            .select('user_id, oakline_tag, display_name')
            .eq('oakline_tag', normalizedTag);

          console.log('Query result:', { oaklinePay, exactError });

          // If no exact match, try case-insensitive
          if (!oaklinePay || oaklinePay.length === 0) {
            console.log('🔄 Exact match failed, trying case-insensitive for tag:', normalizedTag);
            const { data: caseInsensitive, error: caseError } = await supabaseAdmin
              .from('oakline_pay_profiles')
              .select('user_id, oakline_tag, display_name')
              .filter('oakline_tag', 'ilike', normalizedTag);

            console.log('Case-insensitive result:', { caseInsensitive, caseError });
            if (caseInsensitive && caseInsensitive.length > 0) {
              oaklinePay = caseInsensitive;
            }
          }

          if (oaklinePay && oaklinePay.length > 0) {
            const profile = oaklinePay[0];
            console.log('✅ Found Oakline tag profile:', profile.oakline_tag, '- Display Name:', profile.display_name);
            
            // Mark as Oakline user - tag exists in oakline_pay_profiles
            recipientProfile = {
              id: profile.user_id,
              full_name: profile.display_name
            };
            isOaklineUser = true;
          } else {
            console.warn('⚠️ No Oakline profile found for tag:', normalizedTag);
          }
        } catch (tagError) {
          console.error('❌ Error querying Oakline tag:', tagError);
        }
      } else if (recipient_type === 'email') {
        const emailLower = recipient_contact.toLowerCase();
        console.log('🔍 Looking for email user:', emailLower);
        
        try {
          // Step 1: Find the user in applications table by email
          const { data: appData, error: appError } = await supabaseAdmin
            .from('applications')
            .select('user_id, email, first_name, last_name')
            .ilike('email', emailLower)
            .limit(1);
          
          if (appError) {
            console.warn('⚠️ Application query error:', emailLower, 'Error:', appError.message);
          }

          if (appData && appData.length > 0) {
            const userIdFromApp = appData[0].user_id;
            console.log('✅ Found email in applications table. User ID:', userIdFromApp);

            // Step 2: Check if this user_id exists in oakline_pay_profiles
            const { data: oaklineData, error: oaklineError } = await supabaseAdmin
              .from('oakline_pay_profiles')
              .select('user_id, oakline_tag, display_name')
              .eq('user_id', userIdFromApp)
              .limit(1);

            if (oaklineError) {
              console.warn('⚠️ Oakline profile check error for user:', userIdFromApp, 'Error:', oaklineError.message);
            }

            // Step 3: Determine if Oakline user
            if (oaklineData && oaklineData.length > 0) {
              // User exists in oakline_pay_profiles = Oakline user
              recipientProfile = {
                id: userIdFromApp,
                full_name: oaklineData[0].display_name || appData[0].first_name || appData[0].email
              };
              isOaklineUser = true;
              console.log('✅ Oakline user found via email:', recipientProfile.full_name);
            } else {
              // User exists in applications but NOT in oakline_pay_profiles = Not yet a member
              recipientProfile = {
                id: userIdFromApp,
                full_name: appData[0].first_name || appData[0].email
              };
              isOaklineUser = false;
              console.log('ℹ️ User exists but NOT an Oakline member yet:', recipientProfile.full_name);
            }
          } else {
            console.warn('⚠️ No user found with email:', emailLower);
          }
        } catch (emailQueryError) {
          console.error('❌ Error querying email:', emailQueryError);
        }
      }

      // Handle tag not found case
      if (recipient_type === 'oakline_tag' && !recipientProfile) {
        console.log('❌ Tag not found, returning not found response');
        return res.status(200).json({
          success: true,
          is_oakline_user: false,
          tag_not_found: true,
          message: 'Tag not found',
          recipient_contact: recipient_contact
        });
      }

      // Prevent self-transfer
      if (recipientProfile && recipientProfile.id === user.id) {
        return res.status(400).json({ error: 'You cannot send money to yourself' });
      }

      // For email recipients who don't exist in the system
      if (recipient_type === 'email' && !recipientProfile) {
        console.log('⚠️ Email not found in system, creating pending payment for new recipient');
        // Will create pending payment below
      }

      const referenceNumber = generateReference();

      // Get sender's profile and Oakline Pay profile
      const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, first_name, last_name')
        .eq('id', user.id)
        .single();

      const { data: senderOaklineProfile } = await supabaseAdmin
        .from('oakline_pay_profiles')
        .select('oakline_tag, display_name')
        .eq('user_id', user.id)
        .single();

      // Create sender profile object with fallbacks
      const senderData = {
        email: senderProfile?.email || user.email,
        first_name: senderProfile?.first_name || user.email?.split('@')[0] || 'User',
        full_name: senderProfile?.full_name || senderProfile?.first_name || user.email?.split('@')[0] || 'User'
      };

      if (isOaklineUser) {
        // OAKLINE USER - Instant Transfer Flow
        const { data: recipientAccount } = await supabaseAdmin
          .from('accounts')
          .select('*')
          .eq('user_id', recipientProfile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!recipientAccount) {
          return res.status(404).json({ error: 'Recipient does not have an active account' });
        }

        // Create pending transaction (no verification code needed - user will enter their PIN)
        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from('oakline_pay_transactions')
          .insert({
            sender_id: user.id,
            sender_account_id: sender_account_id,
            sender_contact: senderOaklineProfile?.oakline_tag || senderProfile?.email,
            sender_name: senderOaklineProfile?.display_name || senderProfile?.full_name || senderData.first_name,
            recipient_id: recipientProfile.id,
            recipient_account_id: recipientAccount.id,
            recipient_contact: recipient_contact,
            recipient_type: recipient_type,
            recipient_name: recipientProfile?.full_name || recipientProfile?.first_name || 'User',
            amount: transferAmount,
            memo: memo || null,
            status: 'pending',
            reference_number: referenceNumber,
            verification_code: null,
            verification_expires_at: new Date(Date.now() + 15 * 60 * 1000)
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Transaction creation error:', transactionError);
          return res.status(500).json({ error: 'Failed to create transaction' });
        }

        return res.status(200).json({
          success: true,
          message: 'Transaction PIN created. Enter your PIN to confirm.',
          transaction_id: transaction.id,
          recipient_name: recipientProfile.full_name || recipientProfile.first_name,
          recipient_tag: recipientProfile.oakline_tag || null,
          reference_number: referenceNumber,
          is_oakline_user: true,
          amount: transferAmount
        });

      } else {
        // NON-OAKLINE USER - Pending Payment Flow (requires PIN verification)
        // Don't create pending payment yet - wait for PIN verification in confirm step
        
        return res.status(200).json({
          success: true,
          message: 'Verify with PIN to send this payment',
          sender_account_id: sender_account_id,
          recipient_contact: recipient_contact,
          recipient_type: recipient_type,
          amount: transferAmount,
          memo: memo || null,
          is_oakline_user: false,
          requires_pin: true,
          reference_number: referenceNumber
        });
      }

    } else if (step === 'confirm') {
      // STEP 2: CONFIRM & DEDUCT FOR NON-OAKLINE USERS (after PIN verification)
      const { payment_id, sender_account_id: confirmSenderAccountId, pin, recipient_contact, recipient_type, amount: confirmAmount, memo } = req.body;

      if (!confirmSenderAccountId) {
        return res.status(400).json({ error: 'Account ID required' });
      }

      if (!pin) {
        return res.status(400).json({ error: 'PIN required for payment confirmation' });
      }

      // Verify PIN before processing
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('transaction_pin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.transaction_pin) {
        return res.status(400).json({ error: 'Unable to verify PIN' });
      }

      const isPinValid = await bcrypt.compare(pin, profile.transaction_pin);
      if (!isPinValid) {
        return res.status(400).json({ error: 'Invalid PIN. Payment not sent.' });
      }

      const sender_account_id = confirmSenderAccountId;

      // Get or create pending payment for non-Oakline users
      let pendingPayment = null;
      
      if (payment_id) {
        // Existing flow - payment_id provided
        const { data: existingPayment, error: paymentError } = await supabaseAdmin
          .from('oakline_pay_pending_claims')
          .select('*')
          .eq('id', payment_id)
          .eq('sender_id', user.id)
          .single();

        if (paymentError || !existingPayment) {
          return res.status(404).json({ error: 'Payment not found' });
        }

        if (existingPayment.status !== 'pending') {
          return res.status(400).json({ error: 'Payment already processed' });
        }

        pendingPayment = existingPayment;
      } else {
        // New flow - create pending payment after PIN verification
        if (!recipient_contact || !confirmAmount) {
          return res.status(400).json({ error: 'Recipient and amount required' });
        }

        const transferAmount = parseFloat(confirmAmount);
        const claimToken = generateClaimToken();
        const claimExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

        const { data: senderProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email, first_name')
          .eq('id', user.id)
          .single();

        const { data: senderOaklineProfile } = await supabaseAdmin
          .from('oakline_pay_profiles')
          .select('oakline_tag, display_name')
          .eq('user_id', user.id)
          .single();

        const { data: newPendingPayment, error: pendingError } = await supabaseAdmin
          .from('oakline_pay_pending_claims')
          .insert({
            sender_id: user.id,
            sender_name: senderOaklineProfile?.display_name || senderProfile?.full_name || senderProfile?.first_name || 'User',
            sender_contact: senderOaklineProfile?.oakline_tag || senderProfile?.email,
            recipient_email: recipient_contact,
            recipient_name: null,
            amount: transferAmount,
            memo: memo || null,
            claim_token: claimToken,
            status: 'pending',
            expires_at: claimExpiresAt
          })
          .select()
          .single();

        if (pendingError || !newPendingPayment) {
          console.error('Failed to create pending payment:', pendingError);
          return res.status(500).json({ error: 'Failed to create payment' });
        }

        pendingPayment = newPendingPayment;
      }

      // Get sender's current account
      const { data: currentAccount } = await supabaseAdmin
        .from('accounts')
        .select('*')
        .eq('id', sender_account_id)
        .eq('user_id', user.id)
        .single();

      if (!currentAccount) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const transferAmount = parseFloat(pendingPayment.amount);
      if (parseFloat(currentAccount.balance) < transferAmount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      // NOW deduct the amount
      const senderNewBalance = parseFloat(currentAccount.balance) - transferAmount;
      await supabaseAdmin
        .from('accounts')
        .update({ balance: senderNewBalance, updated_at: new Date().toISOString() })
        .eq('id', sender_account_id);

      // Create debit transaction for sender
      await supabaseAdmin
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: sender_account_id,
          type: 'oakline_pay_send',
          amount: transferAmount,
          description: `Oakline Pay sent to ${pendingPayment.recipient_email}`,
          status: 'completed',
          balance_before: parseFloat(currentAccount.balance),
          balance_after: senderNewBalance,
          reference: generateReference(),
          created_at: new Date().toISOString()
        });

      // Update pending payment status to 'sent'
      await supabaseAdmin
        .from('oakline_pay_pending_claims')
        .update({ status: 'sent' })
        .eq('id', pendingPayment.id);

      // Send email to recipient with single claim link
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
      const claimUrl = `${siteUrl}/claim-debit-card?token=${pendingPayment.claim_token}`;
      const expiryDate = new Date(pendingPayment.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      try {
        const { data: senderProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        // Get sender's Oakline Pay profile for tag/display name
        const { data: senderOaklineProfile } = await supabaseAdmin
          .from('oakline_pay_profiles')
          .select('oakline_tag, display_name')
          .eq('user_id', user.id)
          .single();

        // Get bank support email from bank_details table
        const { data: bankDetails } = await supabaseAdmin
          .from('bank_details')
          .select('email_support, email_info')
          .limit(1)
          .single();

        const supportEmail = bankDetails?.email_support || bankDetails?.email_info || 'support@theoaklinebank.com';
        const senderDisplayName = senderOaklineProfile?.display_name || senderOaklineProfile?.oakline_tag || senderProfile?.full_name || 'User';

        // Send email to RECIPIENT
        try {
          console.log('📧 Sending recipient email to:', pendingPayment.recipient_email);
          await sendEmail({
            to: pendingPayment.recipient_email,
            subject: `You've received $${transferAmount.toFixed(2)} from ${senderDisplayName}!`,
            emailType: 'oakline_pay',
            text: `You've received $${transferAmount.toFixed(2)} from ${senderDisplayName}. You have 14 days to claim this payment.`,
            html: `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); color: white; padding: 2.5rem; text-align: center;">
                  <h1 style="margin: 0; font-size: 32px; font-weight: 700;">💰 Payment Received</h1>
                  <p style="margin: 0.5rem 0 0 0; font-size: 16px; opacity: 0.95;">You have funds waiting to be claimed</p>
                </div>

                <!-- Main Content -->
                <div style="padding: 2.5rem; background-color: #ffffff;">
                  <!-- Amount Section -->
                  <div style="background-color: #f0f7ff; border-left: 5px solid #0066cc; padding: 1.5rem; border-radius: 6px; margin-bottom: 2rem;">
                    <p style="margin: 0; color: #333; font-size: 14px;">Payment from</p>
                    <p style="margin: 0.5rem 0 0 0; color: #0066cc; font-size: 20px; font-weight: 700;">${senderDisplayName}</p>
                    <p style="margin: 1rem 0 0 0; color: #16a34a; font-size: 36px; font-weight: 700;">$${transferAmount.toFixed(2)}</p>
                  </div>

                  <!-- Instructions -->
                  <div style="background-color: #fafafa; padding: 1.5rem; border-radius: 6px; margin-bottom: 2rem;">
                    <p style="margin: 0 0 1rem 0; color: #333; font-size: 15px; line-height: 1.6;">
                      You have <strong style="color: #0066cc;">14 days</strong> to claim this payment. Choose one of the options below to receive your funds:
                    </p>
                  </div>

                  <!-- Action Button -->
                  <div style="margin: 2rem 0;">
                    <table style="width: 100%;">
                      <tr>
                        <td>
                          <a href="${claimUrl}" style="display: block; background-color: #0066cc; color: white; padding: 16px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; text-align: center; transition: background-color 0.2s;">🎉 Claim Your Payment</a>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- How to Claim -->
                  <div style="background-color: #f9f9f9; border: 1px solid #e0e0e0; padding: 1.5rem; border-radius: 6px; margin: 2rem 0;">
                    <p style="margin: 0 0 1rem 0; color: #333; font-size: 14px; font-weight: 700;">Ways to Receive Your Payment:</p>
                    <div style="margin-bottom: 1rem;">
                      <p style="margin: 0 0 0.25rem 0; color: #333; font-size: 13px; font-weight: 600;">💳 Instant Debit Card Deposit</p>
                      <p style="margin: 0; color: #666; font-size: 12px;">Visa/Mastercard instant transfer</p>
                    </div>
                    <div style="margin-bottom: 1rem;">
                      <p style="margin: 0 0 0.25rem 0; color: #333; font-size: 13px; font-weight: 600;">🏦 ACH Bank Account Transfer</p>
                      <p style="margin: 0; color: #666; font-size: 12px;">Direct deposit to any US bank account</p>
                    </div>
                    <div>
                      <p style="margin: 0 0 0.25rem 0; color: #333; font-size: 13px; font-weight: 600;">📱 Create Oakline Account</p>
                      <p style="margin: 0; color: #666; font-size: 12px;">Open a bank account and receive instantly</p>
                    </div>
                  </div>

                  <!-- Expiration Notice -->
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 1rem; border-radius: 4px; margin: 2rem 0;">
                    <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.5;">
                      ⏰ <strong>Important:</strong> This payment link expires on <strong>${expiryDate}</strong>. If not claimed by then, the funds will be returned to the sender.
                    </p>
                  </div>

                  ${pendingPayment.memo ? `
                  <!-- Note from Sender -->
                  <div style="background-color: #f5f5f5; padding: 1rem; border-radius: 6px; border-left: 4px solid #9333ea; margin: 1.5rem 0;">
                    <p style="margin: 0 0 0.5rem 0; color: #666; font-size: 12px; font-weight: 700; text-transform: uppercase;">Message from sender</p>
                    <p style="margin: 0; color: #333; font-size: 14px; font-style: italic;">"${pendingPayment.memo}"</p>
                  </div>
                  ` : ''}

                  <!-- Footer -->
                  <div style="border-top: 1px solid #e0e0e0; margin-top: 2rem; padding-top: 1.5rem; text-align: center;">
                    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.6;">
                      Oakline Bank • Secure Payment System<br/>
                      Questions? Contact our support team at <a href="mailto:${supportEmail}" style="color: #0066cc; text-decoration: none;">${supportEmail}</a>
                    </p>
                  </div>
                </div>
              </div>
            `
          });
          console.log('✅ Recipient email sent to:', pendingPayment.recipient_email);
        } catch (recipientEmailError) {
          console.error('Error sending recipient email:', recipientEmailError);
        }

        // Send email to SENDER notification
        try {
          console.log('📧 Sending sender email to:', senderProfile?.email || user.email);
          await sendEmail({
            to: senderProfile?.email || user.email,
            subject: `💸 Oakline Pay Sent - $${transferAmount.toFixed(2)} | Oakline Bank`,
            emailType: 'oakline_pay',
            text: `Your payment of $${transferAmount.toFixed(2)} has been sent to ${pendingPayment.recipient_email}. The recipient has 14 days to claim it.`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                  <!-- Header with Logo -->
                  <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5aa0 100%); padding: 40px 32px; text-align: center;">
                    <div style="color: #ffffff; font-size: 48px; margin-bottom: 16px;">💸</div>
                    <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 8px;">Oakline Bank</div>
                    <div style="color: #ffffff; opacity: 0.95; font-size: 18px; font-weight: 500;">Oakline Pay</div>
                  </div>

                  <!-- Main Content -->
                  <div style="padding: 40px 32px;">
                    <h1 style="color: #059669; font-size: 28px; font-weight: 700; margin: 0 0 24px 0; text-align: center;">
                      ✓ Transfer Sent Successfully
                    </h1>

                    <!-- Amount Card -->
                    <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border: 2px solid #059669; border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.15);">
                      <div style="color: #047857; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">Amount Sent</div>
                      <div style="color: #047857; font-size: 48px; font-weight: 800; margin: 0;">$${transferAmount.toFixed(2)}</div>
                    </div>

                    <!-- Transfer Details -->
                    <div style="background-color: #f7fafc; border-radius: 12px; padding: 24px; margin: 24px 0;">
                      <h3 style="color: #1a365d; font-size: 18px; font-weight: 600; margin: 0 0 20px 0;">
                        📋 Transfer Details
                      </h3>
                      
                      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                        <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">To</div>
                        <div style="color: #1a365d; font-size: 16px; font-weight: 700;">${pendingPayment.recipient_email}</div>
                      </div>

                      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                        <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Reference Number</div>
                        <div style="color: #1a365d; font-size: 16px; font-weight: 700; font-family: monospace;">${paymentReference}</div>
                      </div>

                      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0;">
                        <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Date & Time</div>
                        <div style="color: #1a365d; font-size: 14px; font-weight: 600;">${new Date().toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</div>
                      </div>

                      <div>
                        <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Expires</div>
                        <div style="color: #dc2626; font-size: 14px; font-weight: 600;">${expiryDate}</div>
                      </div>
                    </div>

                    <!-- Status Notice -->
                    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 24px 0;">
                      <div style="color: #92400e; font-size: 14px; line-height: 1.6;">
                        <strong style="font-size: 15px;">⏳ Waiting for Recipient to Claim</strong><br/>
                        <span style="color: #78350f;">The recipient has 14 days to claim this payment. You'll receive a confirmation email once they accept the transfer.</span>
                      </div>
                    </div>

                    <!-- What Happens Next -->
                    <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin: 24px 0;">
                      <h3 style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                        💡 What Happens Next
                      </h3>
                      <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">The recipient can claim funds via debit card or bank account</li>
                        <li style="margin-bottom: 8px;">If unclaimed after 14 days, funds will be returned to your account</li>
                        <li>You'll be notified immediately when the payment is claimed</li>
                      </ul>
                    </div>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f7fafc; padding: 32px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #718096; font-size: 14px; margin: 0 0 16px 0;">
                      Need help? Contact our support team 24/7:
                    </p>
                    <p style="color: #4a5568; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">
                      📧 <a href="mailto:${supportEmail}" style="color: #0066cc; text-decoration: none;">${supportEmail}</a>
                    </p>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                      <p style="color: #718096; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Oakline Bank. All rights reserved.<br>
                        Member FDIC | Secure Payment System
                      </p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `
          });
          console.log('✅ Sender notification email sent to:', senderProfile?.email || user.email);
        } catch (senderEmailError) {
          console.error('Error sending sender notification email:', senderEmailError);
        }
      } catch (emailError) {
        console.error('Error in email notification process:', emailError);
      }

      // Generate a unique reference for this payment
      const paymentReference = `OPAY-${pendingPayment.id.substring(0, 8).toUpperCase()}`;
      
      return res.status(200).json({
        success: true,
        message: '✅ Payment sent!',
        payment_id: pendingPayment.id,
        recipient_email: pendingPayment.recipient_email,
        recipient_name: pendingPayment.recipient_email,
        amount: transferAmount,
        reference_number: paymentReference,
        expires_at: pendingPayment.expires_at,
        completed_at: new Date().toISOString(),
        status: 'waiting'
      });

    } else {
      return res.status(400).json({ error: 'Invalid request step' });
    }

  } catch (error) {
    console.error('Error in oakline-pay-send:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
