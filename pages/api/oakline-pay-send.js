
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

      // Prevent self-transfer
      if (recipientProfile && recipientProfile.id === user.id) {
        return res.status(400).json({ error: 'You cannot send money to yourself' });
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
        full_name: senderProfile?.full_name || 'Oakline User'
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
        // NON-OAKLINE USER - Pending Payment Flow
        const claimToken = generateClaimToken();
        const claimExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

        // Create pending payment record
        const { data: pendingPayment, error: pendingError } = await supabaseAdmin
          .from('pending_payments')
          .insert({
            sender_id: user.id,
            sender_name: senderData.full_name,
            sender_contact: senderOaklineProfile?.oakline_tag || senderProfile?.email,
            recipient_email: recipient_contact,
            recipient_name: null, // Will be filled when they claim
            amount: transferAmount,
            memo: memo || null,
            claim_token: claimToken,
            status: 'pending',
            expires_at: claimExpiresAt
          })
          .select()
          .single();

        if (pendingError) {
          console.error('Pending payment creation error:', pendingError);
          return res.status(500).json({ error: 'Failed to create pending payment' });
        }

        // Deduct amount immediately from sender's account
        const senderNewBalance = parseFloat(senderAccount.balance) - transferAmount;
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
            description: `Oakline Pay sent to ${recipient_contact}`,
            status: 'completed',
            balance_before: parseFloat(senderAccount.balance),
            balance_after: senderNewBalance,
            reference: referenceNumber,
            created_at: new Date().toISOString()
          });

        // Send email to recipient with claim link
        const claimUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://theoaklinebank.com'}/claim-payment?token=${claimToken}`;
        
        try {
          await sendEmail({
            to: recipient_contact,
            subject: `You've received $${transferAmount.toFixed(2)} from Oakline Bank!`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 8px 8px 0 0; text-align: center;">
                  <h1 style="margin: 0; font-size: 28px;">💰 Money Received!</h1>
                </div>
                <div style="background: #f8f9fa; padding: 2rem; border-radius: 0 0 8px 8px;">
                  <p style="color: #333; font-size: 16px;">
                    <strong>${senderData.full_name}</strong> has sent you <strong style="color: #16a34a; font-size: 20px;">$${transferAmount.toFixed(2)}</strong>
                  </p>
                  
                  <div style="background: white; padding: 1.5rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #667eea;">
                    <p style="margin: 0; color: #666; font-size: 14px;">You have <strong>14 days</strong> to claim this payment by either:</p>
                    <ul style="color: #333; margin: 1rem 0; padding-left: 1.5rem;">
                      <li>Creating an Oakline Bank account (instant credit)</li>
                      <li>Entering your debit card details (deposit to your card)</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 2rem 0;">
                    <a href="${claimUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                      Claim Your Money
                    </a>
                  </div>

                  <p style="color: #999; font-size: 12px; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd;">
                    This link expires in 14 days. After that, the money will be returned to the sender.
                  </p>

                  ${memo ? `<p style="color: #666; font-size: 14px; margin-top: 1rem;"><strong>Note:</strong> "${memo}"</p>` : ''}
                </div>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          // Don't fail the transaction if email fails
        }

        return res.status(200).json({
          success: true,
          message: `Payment pending. ${recipient_contact} will be notified to claim their money.`,
          payment_id: pendingPayment.id,
          claim_token: claimToken,
          recipient_contact: recipient_contact,
          amount: transferAmount,
          is_oakline_user: false,
          expires_at: claimExpiresAt
        });
      }

    } else {
      return res.status(400).json({ error: 'Invalid request step' });
    }

  } catch (error) {
    console.error('Error in oakline-pay-send:', error);
    return res.status(500).json({ error: 'An error occurred. Please try again.' });
  }
}
