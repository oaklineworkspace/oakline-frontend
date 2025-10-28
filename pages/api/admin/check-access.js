import { verifyAdminAccess } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isAdmin, role, userId, error } = await verifyAdminAccess(req);

    if (!isAdmin) {
      return res.status(403).json({ 
        isAdmin: false,
        error: error || 'Unauthorized - Admin access required' 
      });
    }

    return res.status(200).json({
      isAdmin: true,
      role,
      userId
    });

  } catch (err) {
    console.error('Error in check-access:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
