const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

const ensureRole = (role) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === role || req.user.role === 'admin')) {
      return next();
    }
    res.status(403).json({ message: `Access denied. ${role.charAt(0).toUpperCase() + role.slice(1)}s only.` });
  };
};

module.exports = { ensureAuthenticated, ensureRole };
