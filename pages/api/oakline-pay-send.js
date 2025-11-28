
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
      return res.status(401).json({ error: 'Unauthorized - Missing authentication token' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid authentication' });
    }

    const { sender_account_id, recipient_contact, recipient_type, amount, memo, step, verification_code } = req.body;

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

      // Update pending payment status
      await supabaseAdmin
        .from('oakline_pay_pending_claims')
        .update({ status: 'sent' })
        .eq('id', payment_id);

      // Send email to recipient with two claim options
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoaklinebank.com';
      const createAccountUrl = `${siteUrl}/apply?token=${pendingPayment.claim_token}`;
      const debitCardUrl = `${siteUrl}/claim-debit-card?token=${pendingPayment.claim_token}`;
      const expiryDate = new Date(pendingPayment.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
      try {
        const { data: senderProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single();

        // Send email to RECIPIENT
        try {
          console.log('📧 Sending recipient email to:', pendingPayment.recipient_email);
          await sendEmail({
            to: pendingPayment.recipient_email,
            subject: `You've received $${transferAmount.toFixed(2)} from Oakline Bank!`,
            emailType: 'oakline_pay',
            text: `You've received $${transferAmount.toFixed(2)} from ${senderProfile?.full_name || 'Someone'}. You have 14 days to claim this payment.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">💰 Money Received!</h1>
                </div>
                <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 8px 8px;">
                  <p style="color: #333; font-size: 16px;">
                    <strong>${senderProfile?.full_name || 'Someone'}</strong> has sent you <strong style="color: #16a34a; font-size: 20px;">$${transferAmount.toFixed(2)}</strong>
                  </p>
                  
                  <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0; color: #666; font-size: 14px; margin-bottom: 1rem;">You have <strong>14 days</strong> to claim this payment. Choose how you'd like to receive it:</p>
                  </div>

                  <div style="display: flex; gap: 1rem; margin: 2rem 0; justify-content: center; flex-wrap: wrap;">
                    <a href="${createAccountUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; text-align: center; min-width: 150px;">
                      📱 Create Account
                    </a>
                    <a href="${debitCardUrl}" style="background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; text-align: center; min-width: 150px;">
                      💳 Use Debit Card
                    </a>
                  </div>

                  <div style="background: #f0f4ff; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
                    <p style="color: #333; font-size: 13px; margin: 0;">
                      <strong>📱 Create Account:</strong> Get instant credit to your Oakline Bank account
                    </p>
                    <p style="color: #333; font-size: 13px; margin: 0.5rem 0 0 0;">
                      <strong>💳 Debit Card:</strong> Deposit to any debit card (takes 1-2 business days)
                    </p>
                  </div>

                  <p style="color: #999; font-size: 12px; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
                    This payment link expires in 14 days. After that, the money will be returned to the sender.
                  </p>

                  ${pendingPayment.memo ? `<p style="color: #666; font-size: 14px; margin-top: 1rem;"><strong>Note from sender:</strong> "${pendingPayment.memo}"</p>` : ''}
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
            subject: `Payment Sent: $${transferAmount.toFixed(2)} is waiting to be claimed`,
            emailType: 'oakline_pay',
            text: `Your payment of $${transferAmount.toFixed(2)} has been sent to ${pendingPayment.recipient_email}. The recipient has 14 days to claim it.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">✅ Payment Sent!</h1>
                </div>
                <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 8px 8px;">
                  <p style="color: #333; font-size: 16px;">
                    Your Oakline Pay transfer of <strong style="color: #16a34a; font-size: 20px;">$${transferAmount.toFixed(2)}</strong> has been sent to <strong>${pendingPayment.recipient_email}</strong>
                  </p>
                  
                  <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0; color: #666; font-size: 14px; margin-bottom: 1rem;"><strong>Status: ⏳ Waiting for Recipient to Claim</strong></p>
                    <p style="color: #666; font-size: 13px; margin: 0.5rem 0 0 0;">
                      The recipient has 14 days to claim this payment via their Oakline Bank account or debit card.
                    </p>
                  </div>

                  <div style="background: #eff6ff; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
                    <p style="color: #333; font-size: 13px; margin: 0;"><strong>Payment Details:</strong></p>
                    <p style="color: #666; font-size: 12px; margin: 0.5rem 0 0 0;">
                      Amount: $${transferAmount.toFixed(2)}<br/>
                      Recipient: ${pendingPayment.recipient_email}<br/>
                      Expires: ${expiryDate}
                    </p>
                  </div>

                  <p style="color: #999; font-size: 12px; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
                    You'll receive another notification once the recipient claims their payment.
                  </p>
                </div>
              </div>
            `
          });
          console.log('✅ Sender notification email sent to:', senderProfile?.email || user.email);
        } catch (senderEmailError) {
          console.error('Error sending sender notification email:', senderEmailError);
        }
      } catch (emailError) {
        console.error('Error in email notification process:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: '✅ Payment sent!',
        payment_id: payment_id,
        recipient_email: pendingPayment.recipient_email,
        amount: transferAmount,
        reference_number: generateReference(),
        expires_at: pendingPayment.expires_at
      });

    } else {
      return res.status(400).json({ error: 'Invalid request step' });
    }

  } catch (error) {
    console.error('Error in oakline-pay-send:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
