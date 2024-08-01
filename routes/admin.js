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
    const trips = await Trip.find().populate('rider driver');
    res.render('rides', { trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve a Trip
router.post('/approve/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      console.log('Trip not found');
      return res.status(404).json({ message: 'Trip not found' });
    }

    console.log('Trip found:', trip);

    trip.status = 'accepted';
    trip.approved = true;
    await trip.save();

    console.log('Trip approved:', trip);

    // Notify the rider about the approval
    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripApproved', trip);

    console.log('Event emitted to rider:', trip.rider._id.toString());

    res.status(200).json({ message: 'Trip approved', trip });
  } catch (error) {
    console.error('Error approving trip:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject a Trip
router.post('/reject/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      console.log('Trip not found');
      return res.status(404).json({ message: 'Trip not found' });
    }

    console.log('Trip found:', trip);

    trip.status = 'cancelled';
    trip.approved = false;
    await trip.save();

    console.log('Trip rejected:', trip);

    // Notify the rider about the rejection
    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripRejected', trip);

    console.log('Event emitted to rider:', trip.rider._id.toString());

    res.status(200).json({ message: 'Trip rejected', trip });
  } catch (error) {
    console.error('Error rejecting trip:', error);
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
