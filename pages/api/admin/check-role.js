import { verifyAdminAccess } from '../../../lib/adminAuth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { isAdmin, role, userId, error } = await verifyAdminAccess(req);

    if (error) {
      return res.status(401).json({ 
        isAdmin: false, 
        role: null, 
        error: error 
      });
    }

    if (!isAdmin) {
      return res.status(403).json({ 
        isAdmin: false, 
        role: null, 
        error: 'User does not have admin privileges' 
      });
    }

    return res.status(200).json({ 
      isAdmin: true, 
      role, 
      userId 
    });
  } catch (error) {
    console.error('Error in check-role API:', error);
    return res.status(500).json({ 
      isAdmin: false, 
      role: null, 
      error: 'Internal server error' 
    });
  }
}
