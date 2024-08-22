const express = require('express');
const axios = require('axios');
const Trip = require('../models/Trip');
const User = require('../models/User');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const router = express.Router();

const GOOGLE_MAPS_API_KEY = 'AIzaSyAG8YFYpxHJSBvM7bnoWl2tNxDF05Usfow';


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
router.post('/book', async (req, res) => {
  console.log('Received trip booking request:', req.body);
  
  try {
    const { rider, driver, origin, destination, fare } = req.body;

    // Find driver and rider in the database
    const foundDriver = await User.findById(driver);
    const foundRider = await User.findById(rider);

    // Log the driver and rider details
    console.log('Found Driver:', foundDriver);
    console.log('Found Rider:', foundRider);

    if (!foundDriver || !foundRider) {
      console.error('Driver or Rider not found:', { driver, rider });
      return res.status(404).json({ message: 'Driver or Rider not found' });
    }

    // Calculate distance and duration using Google Maps Distance Matrix API
    const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
    const distanceMatrixResponse = await axios.get(distanceMatrixUrl);

    // Log the response from the Distance Matrix API
    console.log('Distance Matrix Response:', distanceMatrixResponse.data);

    if (distanceMatrixResponse.data.status !== 'OK') {
      console.error('Failed to calculate distance and duration:', distanceMatrixResponse.data);
      return res.status(500).json({ error: 'Failed to calculate distance and duration' });
    }

    const element = distanceMatrixResponse.data.rows[0].elements[0];
    const distance = element.distance.value; // in meters
    const duration = element.duration.value; // in seconds

    // Create and save the new trip
    const newTrip = new Trip({
      rider,
      driver,
      origin,
      destination,
      fare,
      distance,
      duration,
      status: 'requested'
    });

    await newTrip.save();
    console.log('New trip saved successfully:', newTrip);

    // Update the ride history for both the driver and the rider
    await User.findByIdAndUpdate(driver, { $push: { rideHistory: newTrip._id } });
    await User.findByIdAndUpdate(rider, { $push: { rideHistory: newTrip._id } });
    console.log('Ride history updated for driver and rider');

    // Populate the trip details with rider and driver information
    const populatedTrip = await Trip.findById(newTrip._id).populate('rider', 'username').populate('driver', 'username');
    console.log('Populated trip details:', populatedTrip);

    // Emit the new trip event to the client via socket.io
    const io = req.app.get('socketio');
    io.emit('newTrip', populatedTrip);

    // Send the trip details back to the client
    res.status(201).json(populatedTrip);
  } catch (error) {
    console.error('Error during trip booking:', error.message);
    res.status(500).json({ error: error.message });
  }
});



// Approve a Trip
// routes/trip.js

router.post('/approve/:tripId', ensureAuthenticated, ensureRole(['driver', 'admin']), async (req, res) => {
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
// Reject a Trip
router.post('/reject/:tripId', ensureAuthenticated, ensureRole(['driver', 'admin']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'cancelled';
    trip.approved = false;
    await trip.save();

    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripRejected', {
      trip,
      message: 'Please try again, drivers are not available at the moment.'
    });

    res.status(200).json({ message: 'Trip rejected', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get Trip Status by ID
router.get('/status/:tripId', ensureAuthenticated, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('rider driver');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.status(200).json({ trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel a Trip
router.post('/cancel/:tripId', ensureAuthenticated, ensureRole(['rider', 'driver', 'admin']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    trip.status = 'cancelled';
    await trip.save();

    const io = req.app.get('socketio');
    io.to(trip.rider._id.toString()).emit('tripCancelled', trip);
    io.to(trip.driver._id.toString()).emit('tripCancelled', trip);

    res.status(200).json({ message: 'Trip cancelled successfully', trip });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get trip history for a user
router.get('/history/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate({
      path: 'rideHistory',
      populate: { path: 'rider driver', select: 'username' }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user.rideHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;