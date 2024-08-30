const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Admin Login POST handler with JWT token
router.post('/admin-login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(400).json({ message: info.message });

    // Ensure the user has the 'admin' role
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Respond with the token and user information
    return res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  })(req, res, next);
});

// Admin Dashboard (protected route)
router.get('/dashboard', ensureAuthenticated, ensureRole('admin'), (req, res) => {
  res.json({ message: 'Welcome to the admin dashboard', user: req.user });
});

// Sellers section route
router.get('/sellers', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('username email createdAt');
    res.json({ sellers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rides section route
router.get('/rides', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('username email status');
    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Requested Trips
router.get('/trips', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'requested' })
      .populate('rider', 'username email')
      .populate('driver', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Details route
router.get('/rides/:driverId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.driverId).populate('rideHistory');
    const trips = await Trip.find({ driver: driver._id }).populate('rider');
    res.json({ driver, trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Freeze a Trip
router.post('/freeze/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    trip.status = 'frozen';
    await trip.save();
    res.json({ message: 'Trip frozen', trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unfreeze a Trip
router.post('/unfreeze/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    trip.status = 'requested';
    await trip.save();
    res.json({ message: 'Trip unfrozen', trip });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a Trip
router.post('/approve/:tripId', ensureAuthenticated, ensureRole(['admin', 'driver']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'accepted';
    trip.approved = true;
    await trip.save();

    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripApproved', trip);

    res.status(200).json({ message: 'Trip approved', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a Trip
router.post('/reject/:tripId', ensureAuthenticated, ensureRole(['admin', 'driver']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'cancelled';
    trip.approved = false;
    await trip.save();

    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripRejected', trip);

    res.status(200).json({ message: 'Trip rejected', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User Route
router.delete('/delete/:id', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  if (req.isAuthenticated()) {
    req.logout(err => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  } else {
    res.status(400).json({ message: 'No user is logged in' });
  }
});

module.exports = router;
