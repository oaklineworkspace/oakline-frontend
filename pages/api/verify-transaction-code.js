import { supabaseAdmin } from '../../lib/supabaseAdmin';

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

    const { code, type, reference_id } = req.body;

    if (!code || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: verificationRecord, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('code', code)
      .eq('type', type)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationRecord) {
      const { data: existingCode } = await supabaseAdmin
        .from('verification_codes')
        .select('id, attempts')
        .eq('user_id', user.id)
        .eq('code', code)
        .eq('type', type)
        .single();

      if (existingCode) {
        await supabaseAdmin
          .from('verification_codes')
          .update({ attempts: existingCode.attempts + 1 })
          .eq('id', existingCode.id);
      }

      return res.status(400).json({
        error: 'Invalid or expired verification code'
      });
    }

    if (verificationRecord.attempts >= verificationRecord.max_attempts) {
      return res.status(400).json({
        error: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from('verification_codes')
      .update({
        is_used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', verificationRecord.id);

    if (updateError) {
      console.error('Error marking code as used:', updateError);
      return res.status(500).json({ error: 'Failed to verify code' });
    }

    await supabaseAdmin.from('system_logs').insert([{
      user_id: user.id,
      level: 'info',
      type: `verification_success_${type}`,
      message: `Verification code successfully validated for ${type}`,
      details: { type, reference_id, verification_id: verificationRecord.id }
    }]);

    return res.status(200).json({
      success: true,
      message: 'Code verified successfully',
      verification_id: verificationRecord.id
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({
      error: 'Failed to verify code',
      message: error.message
    });
  }
}
