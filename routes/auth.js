const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  logger: true,
  debug: true,
});

router.post('/register', async (req, res) => {
  const { username, password, email, role, adminCode } = req.body;

  try {
    if (role === 'admin' && adminCode !== process.env.SECRET_ADMIN_CODE) {
      return res.status(400).json({ message: 'Invalid admin code' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role: role || 'customer' // Default to customer if no role is provided
    });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    req.login(newUser, async (err) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log('Registered and logged in new user:', newUser);
      return res.json({ message: 'User registered successfully', token });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login route

// Login route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return next(err);
    }
    if (!user) {
      console.error('User not found or incorrect password:', info.message);
      return res.status(400).json({ message: info.message });
    }

    req.login(user, { session: false }, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      return res.json({ token, user });
    });
  })(req, res, next);
});


// Google OAuth routes
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to the appropriate dashboard
    console.log('Google authenticated user:', req.user);
    const userRole = req.user.role || 'customer';
    let redirectUrl = '/';
    if (userRole === 'admin') {
      redirectUrl = '/admin/dashboard';
    } else if (userRole === 'seller') {
      redirectUrl = '/seller/dashboard';
    } else if (userRole === 'customer') {
      redirectUrl = '/customer/dashboard';
    }
    res.redirect(redirectUrl);
  }
);

// Forgot password route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(20).toString('hex');
    const resetToken = new PasswordResetToken({
      userId: user._id,
      token,
    });

    await resetToken.save();

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
             Please click on the following link, or paste this into your browser to complete the process:\n\n
             http://${req.headers.host}/reset-password/${token}\n\n
             If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOptions);
    res.render('request-reset', { message: 'Password reset link sent to your email', messageType: 'success' });
  } catch (err) {
    res.status(500).render('request-reset', { message: 'Internal server error', messageType: 'error' });
  }
});

// Reset password route
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken || resetToken.createdAt < new Date(new Date() - 3600 * 1000)) {
      return res.status(400).render('reset-password', { message: 'Invalid or expired token', messageType: 'error' });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).render('reset-password', { message: 'User not found', messageType: 'error' });
    }

    res.render('reset-password', { token });
  } catch (err) {
    res.status(500).render('reset-password', { message: 'Internal server error', messageType: 'error' });
  }
});

// Handle the reset password form submission
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken || resetToken.createdAt < new Date(new Date() - 3600 * 1000)) {
      return res.status(400).render('reset-password', { message: 'Invalid or expired token', messageType: 'error' });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).render('reset-password', { message: 'User not found', messageType: 'error' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    await PasswordResetToken.deleteOne({ token });

    res.render('reset-password', { message: 'Password has been reset successfully', messageType: 'success', redirectUrl: `/${user.role}/login` });
  } catch (err) {
    res.status(500).render('reset-password', { message: 'Internal server error', messageType: 'error' });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    const role = req.user.role;
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      let redirectUrl = '/';
      if (role === 'admin') {
        redirectUrl = '/admin/admin-login';
      } else if (role === 'seller') {
        redirectUrl = '/seller/seller-login';
      } else if (role === 'customer') {
        redirectUrl = '/customer/customer-login';
      }
      res.redirect(redirectUrl);
    });
  } else {
    res.redirect('/');
  }
});

module.exports = router;