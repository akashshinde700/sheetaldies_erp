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
    
    // ✅ FIXED: Enforce CSRF protection for state-changing operations
    // If token came from cookie, verify origin matches allowed domains
    if (!bearerToken && cookies.accessToken) {
      const origin = req.headers.origin || req.headers.referer;
      const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
      
      // For state-changing operations, REQUIRE origin header
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (!origin) {
          return res.status(403).json({ 
            success: false, 
            message: 'CSRF validation failed: Origin header required for state-changing requests.' 
          });
        }
        
        if (!allowedOrigins.some(ao => origin.includes(ao.trim()))) {
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
