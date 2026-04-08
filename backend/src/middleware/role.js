// Role hierarchy: ADMIN > MANAGER > OPERATOR > VIEWER
const ROLE_WEIGHTS = { ADMIN: 4, MANAGER: 3, OPERATOR: 2, VIEWER: 1 };

/**
 * requireRole('MANAGER') → user must be MANAGER or higher
 * requireRole('ADMIN')   → only ADMIN allowed
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const userWeight = ROLE_WEIGHTS[req.user.role] || 0;
    const hasAccess  = roles.some(r => userWeight >= ROLE_WEIGHTS[r]);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

/**
 * Exact role match (not hierarchical)
 */
const requireExactRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
  };
};

module.exports = { requireRole, requireExactRole };
