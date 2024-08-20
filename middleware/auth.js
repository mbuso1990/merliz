const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const ensureAuthenticated = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.isAuthenticated = true; // Set isAuthenticated to true
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const ensureRole = (roles) => {
  return (req, res, next) => {
    // Ensure roles is always an array
    if (!Array.isArray(roles)) {
      roles = [roles];
    }
    
    if (req.isAuthenticated && roles.includes(req.user.role)) {
      return next();
    }
    res.status(403).json({ message: `Access denied. ${roles.join(', ')} only.` });
  };
};

module.exports = { ensureAuthenticated, ensureRole };
