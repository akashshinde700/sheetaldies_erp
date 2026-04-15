/**
 * Authorization Middleware for Role-Based Access Control
 * Provides role validation and resource ownership verification
 */

// Role hierarchy: ADMIN > MANAGER > OPERATOR > VIEWER
const ROLE_LEVELS = {
  ADMIN: 4,
  MANAGER: 3,
  OPERATOR: 2,
  VIEWER: 1,
};

/**
 * Check if user has minimum required role
 * @param {string} userRole - User's current role
 * @param {string} requiredRole - Minimum role needed
 * @returns {boolean}
 */
const hasRole = (userRole, requiredRole) => {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Middleware: Require specific role or higher
 * @param {string|string[]} roles - Required role(s)
 * @returns {Function}
 */
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    
    const hasRequiredRole = roleArray.some(role => hasRole(req.user.role, role));
    if (!hasRequiredRole) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role(s): ${roleArray.join(', ')}.` 
      });
    }
    
    next();
  };
};

/**
 * Middleware: Require ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  
  if (!hasRole(req.user.role, 'ADMIN')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin role required.' 
    });
  }
  
  next();
};

/**
 * Middleware: Require MANAGER or ADMIN role
 */
const requireManager = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  
  if (!hasRole(req.user.role, 'MANAGER')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Manager role or higher required.' 
    });
  }
  
  next();
};

/**
 * Check if user can access/modify inspection
 * Owner can modify own inspection, MANAGER/ADMIN can modify any
 * @param {Object} user - Authenticated user object
 * @param {Object} inspection - Inspection object with inspectedBy or createdById
 * @returns {boolean}
 */
const canEditInspection = (user, inspection) => {
  // ADMIN and MANAGER can edit any inspection
  if (hasRole(user.role, 'MANAGER')) {
    return true;
  }
  
  // OPERATOR/VIEWER can only edit their own inspection
  const inspectionOwnerId = inspection.inspectedBy || inspection.createdById;
  return user.id === inspectionOwnerId;
};

/**
 * Check if user can access inspection (view)
 * Same as canEditInspection for now
 * @param {Object} user - Authenticated user object
 * @param {Object} inspection - Inspection object
 * @returns {boolean}
 */
const canViewInspection = canEditInspection;

/**
 * Check if user can perform workflow state transition
 * MANAGER/ADMIN can transition, OPERATOR has limited transitions
 * @param {Object} user - Authenticated user
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @returns {boolean}
 */
const canTransitionWorkflow = (user, fromStatus, toStatus) => {
  // ADMIN can always transition
  if (hasRole(user.role, 'ADMIN')) {
    return true;
  }
  
  // MANAGER can transition most statuses
  if (hasRole(user.role, 'MANAGER')) {
    // Cannot skip back to DRAFT
    if (toStatus === 'DRAFT' && fromStatus !== 'DRAFT') {
      return false;
    }
    return true;
  }
  
  // OPERATOR can only move forward in workflow
  if (user.role === 'OPERATOR') {
    // Define allowed transitions for OPERATOR
    const allowedTransitions = {
      DRAFT: ['PENDING'],
      PENDING: ['IN_PROGRESS'],
      IN_PROGRESS: ['COMPLETED', 'ON_HOLD'],
      ON_HOLD: ['IN_PROGRESS'],
    };
    
    const allowed = allowedTransitions[fromStatus] || [];
    return allowed.includes(toStatus);
  }
  
  // VIEWER cannot transition
  return false;
};

/**
 * Middleware: Verify user owns or can modify resource
 * @param {Function} getOwnerIdFn - Function that takes (req) and returns owner ID promise
 * @returns {Function} Middleware
 */
const verifySelfOrAdmin = (getOwnerIdFn) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }
      
      // Admins can do anything
      if (hasRole(req.user.role, 'ADMIN')) {
        return next();
      }
      
      // Others must own the resource
      const ownerId = await getOwnerIdFn(req);
      if (req.user.id !== ownerId) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You can only modify your own records.' 
        });
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ success: false, message: 'Server error.' });
    }
  };
};

module.exports = {
  hasRole,
  requireRole,
  requireAdmin,
  requireManager,
  canEditInspection,
  canViewInspection,
  canTransitionWorkflow,
  verifySelfOrAdmin,
  ROLE_LEVELS,
};
