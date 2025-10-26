import { supabaseAdmin } from './supabaseAdmin';

/**
 * Check if a user has admin privileges
 * @param {string} userId - The user's ID from auth.users
 * @returns {Promise<{isAdmin: boolean, role: string|null, error: any}>}
 */
export async function checkAdminRole(userId) {
  try {
    if (!userId) {
      return { isAdmin: false, role: null, error: 'No user ID provided' };
    }

    const { data, error } = await supabaseAdmin
      .from('admin_profiles')
      .select('role, email')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { isAdmin: false, role: null, error: 'User is not an admin' };
      }
      console.error('Error checking admin role:', error);
      return { isAdmin: false, role: null, error: error.message };
    }

    const validRoles = ['admin', 'super_admin', 'manager'];
    const isAdmin = data && validRoles.includes(data.role);

    return { isAdmin, role: data?.role || null, error: null };
  } catch (error) {
    console.error('Exception in checkAdminRole:', error);
    return { isAdmin: false, role: null, error: error.message };
  }
}

/**
 * Check if a user has a specific admin role or higher
 * @param {string} userId - The user's ID
 * @param {string} requiredRole - Required role ('admin', 'super_admin', 'manager')
 * @returns {Promise<{hasAccess: boolean, currentRole: string|null, error: any}>}
 */
export async function checkAdminRoleLevel(userId, requiredRole = 'admin') {
  try {
    const { isAdmin, role, error } = await checkAdminRole(userId);

    if (!isAdmin) {
      return { hasAccess: false, currentRole: null, error };
    }

    const roleHierarchy = {
      'manager': 1,
      'admin': 2,
      'super_admin': 3
    };

    const userLevel = roleHierarchy[role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    const hasAccess = userLevel >= requiredLevel;

    return { hasAccess, currentRole: role, error: null };
  } catch (error) {
    console.error('Exception in checkAdminRoleLevel:', error);
    return { hasAccess: false, currentRole: null, error: error.message };
  }
}

/**
 * Verify admin access from request (for API routes)
 * @param {object} req - Next.js API request object
 * @returns {Promise<{isAdmin: boolean, role: string|null, userId: string|null, error: any}>}
 */
export async function verifyAdminAccess(req) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAdmin: false, role: null, userId: null, error: 'Missing authorization header' };
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return { isAdmin: false, role: null, userId: null, error: 'Invalid token' };
    }

    const { isAdmin, role, error } = await checkAdminRole(user.id);

    return { isAdmin, role, userId: user.id, error };
  } catch (error) {
    console.error('Exception in verifyAdminAccess:', error);
    return { isAdmin: false, role: null, userId: null, error: error.message };
  }
}