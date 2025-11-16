import { supabaseAdmin } from '../../lib/supabaseAdmin';

function validateRoutingNumber(routing) {
  if (!routing || routing.length !== 9) return false;
  if (!/^\d{9}$/.test(routing)) return false;
  
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(routing[i]) * weights[i];
  }
  return sum % 10 === 0;
}

function validateAccountNumber(account) {
  if (!account || account.length < 4 || account.length > 17) return false;
  return /^\d+$/.test(account);
}

function generateReferenceNumber() {
  return `EXT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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
      from_account_id,
      beneficiary_name,
      beneficiary_bank,
      account_number,
      routing_number,
      amount,
      description
    } = req.body;

    if (!from_account_id || !beneficiary_name || !beneficiary_bank || 
        !account_number || !routing_number || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!validateRoutingNumber(routing_number)) {
      return res.status(400).json({ error: 'Invalid routing number' });
    }

    if (!validateAccountNumber(account_number)) {
      return res.status(400).json({ error: 'Invalid account number (must be 4-17 digits)' });
    }

    const transferAmount = parseFloat(amount);
    if (transferAmount <= 0 || isNaN(transferAmount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (transferAmount > 10000) {
      return res.status(400).json({ error: 'Transfers over $10,000 require additional verification. Please contact support.' });
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', from_account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found or inactive' });
    }

    if (parseFloat(account.balance) < transferAmount) {
      await supabaseAdmin.from('system_logs').insert([{
        user_id: user.id,
        type: 'transaction',
        action: 'external_transfer_failed',
        category: 'transaction',
        message: `External transfer failed: Insufficient funds`,
        details: {
          amount: transferAmount,
          current_balance: parseFloat(account.balance),
          reason: 'insufficient_funds'
        }
      }]);
      return res.status(400).json({ error: 'Insufficient funds' });
    }

    const referenceNumber = generateReferenceNumber();
    const newBalance = parseFloat(account.balance) - transferAmount;

    const { error: debitError } = await supabaseAdmin
      .from('accounts')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', from_account_id);

    if (debitError) {
      console.error('Error debiting account:', debitError);
      return res.status(500).json({ error: 'Failed to process transfer' });
    }

    const transferGroupId = crypto.randomUUID();
    
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert([{
        user_id: user.id,
        account_id: from_account_id,
        type: 'external_transfer',
        amount: transferAmount,
        description: `External transfer to ${beneficiary_name} at ${beneficiary_bank} - ${description || 'ACH Transfer'}`,
        status: 'completed',
        reference: referenceNumber,
        transfer_group_id: transferGroupId,
        transfer_type: 'external'
      }]);

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
      await supabaseAdmin
        .from('accounts')
        .update({ balance: parseFloat(account.balance) })
        .eq('id', from_account_id);
      return res.status(500).json({ error: 'Failed to record transaction' });
    }

    await supabaseAdmin.from('notifications').insert([{
      user_id: user.id,
      type: 'external_transfer',
      title: 'External Transfer Initiated',
      message: `Transfer of $${transferAmount.toFixed(2)} to ${beneficiary_name} has been initiated`
    }]);

    await supabaseAdmin.from('audit_logs').insert([{
      user_id: user.id,
      action: 'external_transfer',
      table_name: 'accounts',
      old_data: { balance: parseFloat(account.balance) },
      new_data: {
        balance: newBalance,
        transfer_details: {
          beneficiary: beneficiary_name,
          bank: beneficiary_bank,
          amount: transferAmount,
          reference: referenceNumber
        }
      }
    }]);

    const maskAccountNumber = (accountNumber) => {
      if (!accountNumber || accountNumber.length < 4) return '****';
      return `****${accountNumber.slice(-4)}`;
    };

    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      type: 'transaction',
      action: 'external_transfer_completed',
      category: 'transaction',
      message: `External transfer of $${transferAmount.toFixed(2)} to ${beneficiary_name} at ${beneficiary_bank}`,
      details: {
        amount: transferAmount,
        beneficiary_name,
        beneficiary_bank,
        beneficiary_account: maskAccountNumber(account_number),
        routing_number: maskAccountNumber(routing_number),
        reference: referenceNumber,
        transfer_type: 'ACH',
        description: description || 'External transfer',
        status: 'completed'
      }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Transfer initiated successfully',
      reference_number: referenceNumber,
      new_balance: newBalance
    });

  } catch (error) {
    console.error('External transfer error:', error);
    return res.status(500).json({
      error: 'Transfer failed',
      message: error.message
    });
  }
}
