const prisma = require('../utils/prisma');

// Role hierarchy: ADMIN > MANAGER > OPERATOR > VIEWER
const ROLE_WEIGHTS = { ADMIN: 4, MANAGER: 3, OPERATOR: 2, VIEWER: 1 };
const ROLE_LEVELS  = ROLE_WEIGHTS; // alias used by some controllers

const hasRole = (userRole, requiredRole) =>
  (ROLE_WEIGHTS[userRole] || 0) >= (ROLE_WEIGHTS[requiredRole] || 0);

/**
 * requireRole('MANAGER') → user must be MANAGER or higher
 * Accepts one or more role strings (any match is sufficient).
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  const userWeight = ROLE_WEIGHTS[req.user.role] || 0;
  if (!roles.some(r => userWeight >= (ROLE_WEIGHTS[r] || 0))) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }
  next();
};

/** Exact role match — not hierarchical */
const requireExactRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};

// Convenience shorthands
const requireAdmin    = requireRole('ADMIN');
const requireManager  = requireRole('MANAGER');
const requireOperator = requireRole('OPERATOR');

/** Returns true if user has OPERATOR or higher — used by quality controller */
const canEditInspection = (user) => hasRole(user.role, 'OPERATOR');
const canViewInspection = canEditInspection;

const canTransitionWorkflow = (user, fromStatus, toStatus) => {
  if (hasRole(user.role, 'ADMIN')) return true;
  if (hasRole(user.role, 'MANAGER')) {
    return !(toStatus === 'DRAFT' && fromStatus !== 'DRAFT');
  }
  if (user.role === 'OPERATOR') {
    const allowed = { DRAFT: ['PENDING'], PENDING: ['IN_PROGRESS'], IN_PROGRESS: ['COMPLETED', 'ON_HOLD'], ON_HOLD: ['IN_PROGRESS'] };
    return (allowed[fromStatus] || []).includes(toStatus);
  }
  return false;
};

/**
 * Verify the authenticated user owns a resource, or is ADMIN/MANAGER.
 * @param {string} resourceIdParam - req.params key for the resource id
 * @param {string} resourceModel   - Prisma model name (camelCase)
 * @param {string} ownerField      - Model field that holds the owner user id
 */
const requireOwnership = (resourceIdParam = 'id', resourceModel = 'party', ownerField = 'createdById') =>
  async (req, res, next) => {
    try {
      const id = parseInt(req.params[resourceIdParam]);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid resource ID.' });
      }
      if (hasRole(req.user.role, 'MANAGER')) return next();

      const resource = await prisma[resourceModel].findUnique({
        where: { id },
        select: { [ownerField]: true },
      });
      if (!resource) {
        return res.status(404).json({ success: false, message: `${resourceModel} not found.` });
      }
      if (resource[ownerField] !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only modify your own records.' });
      }
      next();
    } catch (err) {
      res.status(500).json({ success: false, message: 'Authorization check failed.' });
    }
  };

module.exports = {
  ROLE_WEIGHTS,
  ROLE_LEVELS,
  hasRole,
  requireRole,
  requireExactRole,
  requireAdmin,
  requireManager,
  requireOperator,
  canEditInspection,
  canViewInspection,
  canTransitionWorkflow,
  requireOwnership,
};
