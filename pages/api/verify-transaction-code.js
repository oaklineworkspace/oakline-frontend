import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, code, type, reference_id } = req.body;

    if (!user_id || !code || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: verificationRecord, error: fetchError } = await supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', user_id)
      .eq('code', code)
      .eq('type', type)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !verificationRecord) {
      const { error: attemptError } = await supabaseAdmin
        .from('verification_codes')
        .update({
          attempts: supabaseAdmin.raw('attempts + 1')
        })
        .eq('user_id', user_id)
        .eq('code', code)
        .eq('type', type);

      if (attemptError) {
        console.error('Error updating attempts:', attemptError);
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
      user_id,
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
