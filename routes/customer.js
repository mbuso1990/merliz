const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Customer Login (public route)
router.get('/customer-login', (req, res) => {
  res.render('customer-login', { message: req.flash('error') });
});

// Customer Login POST handler
router.post('/customer-login', passport.authenticate('local', {
  successRedirect: '/customer/dashboard',
  failureRedirect: '/customer/customer-login',
  failureFlash: true
}));

// Customer Dashboard (protected route)
router.get('/dashboard', ensureAuthenticated, ensureRole('customer'), async (req, res) => {
  try {
    const user = req.user; // Get the authenticated user from the request
    res.render('customer-dashboard', { user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.redirect('/customer/customer-login');
  });
});

module.exports = router;
