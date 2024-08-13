const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Admin Login (public route)
router.get('/admin-login', (req, res) => {
  res.render('admin-login', { message: req.flash('error') });
});

// Admin Login POST handler
router.post('/admin-login', passport.authenticate('local', {
  successRedirect: '/admin/dashboard',
  failureRedirect: '/admin/admin-login',
  failureFlash: true
}));

// Admin Dashboard (protected route)
router.get('/dashboard', ensureAuthenticated, ensureRole('admin'), (req, res) => {
  res.render('dashboard', { isLoggedIn: req.isAuthenticated(), user: req.user });
});

// Sellers section route
router.get('/sellers', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const sellers = await User.find({ role: 'seller' }).select('username email createdAt');
    res.render('sellers', { sellers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rides section route
router.get('/rides', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('username email status');
    res.render('rides', { drivers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Details route
router.get('/rides/:driverId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const driver = await User.findById(req.params.driverId).populate('rideHistory');
    const trips = await Trip.find({ driver: driver._id }).populate('rider');
    res.render('driverDetails', { driver, trips });
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
    res.redirect(`/admin/rides/${trip.driver}`);
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
    res.redirect(`/admin/rides/${trip.driver}`);
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
      res.redirect('/admin/admin-login');
    });
  } else {
    res.status(400).json({ message: 'No user is logged in' });
  }
});

module.exports = router;
