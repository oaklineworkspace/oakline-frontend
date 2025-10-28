
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { cardId, action } = req.body;

    if (!cardId || !action) {
      return res.status(400).json({ error: 'Card ID and action are required' });
    }

    const { data: card, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    let updateData = {};
    let successMessage = '';

    switch (action) {
      case 'lock':
        updateData = { is_locked: true };
        successMessage = 'Card locked successfully';
        break;
      case 'unlock':
        updateData = { is_locked: false };
        successMessage = 'Card unlocked successfully';
        break;
      case 'activate':
        updateData = { status: 'active', activated_at: new Date().toISOString() };
        successMessage = 'Card activated successfully';
        break;
      case 'deactivate':
        updateData = { status: 'deactivated' };
        successMessage = 'Card deactivated successfully';
        break;
      case 'block':
        updateData = { status: 'blocked', is_locked: true };
        successMessage = 'Card blocked successfully';
        break;
      case 'replace':
        updateData = { status: 'replaced' };
        successMessage = 'Card marked for replacement';
        break;
      case 'set_pin':
        const { pin } = req.body;
        if (!pin || !/^\d{4}$/.test(pin)) {
          return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
        }
        // In a real application, you would hash the PIN before storing
        // For now, we'll store it as-is (you should implement hashing)
        updateData = { pin: pin };
        successMessage = 'PIN set successfully';
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    const { error: updateError } = await supabase
      .from('cards')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating card:', updateError);
      return res.status(500).json({ error: 'Failed to update card' });
    }

    return res.status(200).json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    console.error('Card update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
