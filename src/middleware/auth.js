'use strict';

const jwt = require('jsonwebtoken');

function createAuthMiddleware(jwtSecret) {
  function authenticate(req, res, next) {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
      req.user = { id: Number.parseInt(payload.sub, 10), role: payload.role };
      return next();
    } catch (_error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return next();
    };
  }

  return { authenticate, requireRole };
}

module.exports = { createAuthMiddleware };
