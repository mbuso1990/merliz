const express = require('express');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const router = express.Router();

// Get all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find().populate('rider driver');
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a Trip (Book a ride)
router.post('/book', ensureAuthenticated, ensureRole('rider'), async (req, res) => {
  try {
    const { rider, driver, origin, destination, fare, distance, duration } = req.body;

    // Ensure the driver and rider exist
    const foundDriver = await User.findById(driver);
    const foundRider = await User.findById(rider);

    if (!foundDriver || !foundRider) {
      return res.status(404).json({ message: 'Driver or Rider not found' });
    }

    // Create a new trip
    const newTrip = new Trip({ rider, driver, origin, destination, fare, distance, duration, status: 'requested' });
    await newTrip.save();

    // Update driver and rider with the new trip
    foundDriver.rideHistory.push(newTrip._id);
    await foundDriver.save();

    foundRider.rideHistory.push(newTrip._id);
    await foundRider.save();

    // Populate rider and driver details
    const populatedTrip = await Trip.findById(newTrip._id).populate('rider', 'username').populate('driver', 'username');

    // Emit new trip request to connected clients
    const io = req.app.get('socketio');
    io.emit('newTrip', populatedTrip);

    res.status(201).json(populatedTrip);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve a Trip
router.post('/approve/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'accepted';
    trip.approved = true;
    await trip.save();

    // Notify the rider about the approval
    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripApproved', trip);

    res.status(200).json({ message: 'Trip approved', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject a Trip
router.post('/reject/:tripId', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'cancelled';
    trip.approved = false;
    await trip.save();

    // Notify the rider about the rejection
    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripRejected', trip);

    res.status(200).json({ message: 'Trip rejected', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
