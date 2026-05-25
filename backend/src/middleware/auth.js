const jwt = require('jsonwebtoken');
const { parseCookies } = require('../utils/cookies');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const bearerToken = authHeader && authHeader.split(' ')[1];
  const cookies = parseCookies(req.headers.cookie);
  
  // ✅ FIXED: Prefer bearer token from Authorization header
  // Cookie-based auth requires CSRF validation (done in origin check)
  const token = bearerToken || cookies.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, name }
    
    // CSRF protection for cookie-based auth on state-changing operations
    if (!bearerToken && cookies.accessToken) {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const origin = req.headers.origin || req.headers.referer;
        // X-Request-ID is a custom header set by our frontend on every request.
        // Custom headers require CORS preflight for cross-origin JS, so their
        // presence proves this is a same-origin (or CORS-allowed) request — not a CSRF form post.
        const hasCustomHeader = req.headers['x-request-id'];

        const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
        if (!hasCustomHeader) {
          if (!origin) {
            return res.status(403).json({
              success: false,
              message: 'CSRF validation failed: Origin header required for state-changing requests.'
            });
          }
          if (!allowedOrigins.some(ao => origin.includes(ao))) {
            return res.status(403).json({
              success: false,
              message: 'CSRF validation failed: Request origin not allowed.'
            });
          }
        } else if (origin && !allowedOrigins.some(ao => origin.includes(ao))) {
          // Defense-in-depth: reject mismatched origin even when X-Request-ID is present
          return res.status(403).json({
            success: false,
            message: 'CSRF validation failed: Request origin not allowed.'
          });
        }
      }
    }
    
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
