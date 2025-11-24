import { supabaseAdmin } from '../../lib/supabaseAdmin';
import crypto from 'crypto';

function generateDeviceFingerprint(deviceInfo) {
  const data = JSON.stringify({
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    deviceType: deviceInfo.deviceType
  });
  return crypto.createHash('sha256').update(data).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { verificationCode, deviceInfo, rememberDevice } = req.body;

    if (!verificationCode || !deviceInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fingerprint = generateDeviceFingerprint(deviceInfo);

    // Find and verify the code
    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('device_verification_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_fingerprint', fingerprint)
      .eq('verification_code', verificationCode)
      .single();

    if (codeError || !codeRecord) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code has expired
    if (new Date() > new Date(codeRecord.expires_at)) {
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    // Delete the used code
    await supabaseAdmin
      .from('device_verification_codes')
      .delete()
      .eq('id', codeRecord.id);

    // If remember device is checked, add to trusted devices
    if (rememberDevice) {
      await supabaseAdmin
        .from('trusted_devices')
        .insert({
          user_id: user.id,
          device_fingerprint: fingerprint,
          device_info: JSON.stringify(deviceInfo),
          device_name: `${deviceInfo.os} - ${deviceInfo.browser}`,
          last_used_at: new Date().toISOString()
        });
    }

    return res.status(200).json({
      success: true,
      message: 'Device verified successfully'
    });
  } catch (error) {
    console.error('Verify device error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
