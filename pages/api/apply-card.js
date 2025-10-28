
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required' });
    }

    // Verify the account belongs to the user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return res.status(400).json({ error: 'Invalid or inactive account' });
    }

    // Check if user already has a pending or approved application for this account
    const { data: existingApp } = await supabaseAdmin
      .from('card_applications')
      .select('*')
      .eq('user_id', user.id)
      .eq('account_id', accountId)
      .in('application_status', ['pending', 'approved'])
      .maybeSingle();

    if (existingApp) {
      return res.status(400).json({ 
        error: 'You already have a pending or approved card application for this account' 
      });
    }

    // Create card application
    const { data: cardApplication, error: appError } = await supabaseAdmin
      .from('card_applications')
      .insert({
        user_id: user.id,
        account_id: accountId,
        card_type: 'debit',
        application_status: 'pending'
      })
      .select()
      .single();

    if (appError) {
      console.error('Error creating card application:', appError);
      return res.status(500).json({ error: 'Failed to create card application' });
    }

    return res.status(200).json({
      success: true,
      message: 'Card application submitted successfully! Your application is pending review.',
      application: cardApplication
    });

  } catch (error) {
    console.error('Card application error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
