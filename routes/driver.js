const express = require('express');
const bcrypt = require('bcryptjs');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const router = express.Router();

// Register Driver
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone, vehicle } = req.body;

    // Check if all required fields are provided
    if (!username || !email || !password || !phone || !vehicle) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'driver'
    });
    await newUser.save();

    const newDriver = new Driver({
      userId: newUser._id,
      name: username,
      email,
      phone,
      vehicle,
      availability: true,
      status: 'offline',
      currentLocation: {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates, update as necessary
      }
    });
    await newDriver.save();

    res.status(201).json({ message: 'Driver registered successfully', driver: newDriver });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find().populate('userId', 'username email');
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update driver location
router.put('/location/:id', async (req, res) => {
  try {
    const { coordinates } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, {
      currentLocation: { type: 'Point', coordinates }
    }, { new: true });
    res.status(200).json(driver);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Driver Status
router.get('/status/:driverId', async (req, res) => {
  try {
    const driverId = req.params.driverId;
    const driver = await Driver.findById(driverId, 'status');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({ status: driver.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Driver Status
router.put('/status/:driverId', async (req, res) => {
  try {
    const driverId = req.params.driverId;
    const { status } = req.body;

    const driver = await Driver.findByIdAndUpdate(driverId, { status }, { new: true });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({ message: 'Driver status updated', status: driver.status });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all drivers
router.delete('/drivers', ensureAuthenticated, ensureRole('admin'), async (req, res) => {
  try {
    await Driver.deleteMany({});
    res.status(200).json({ message: 'All drivers deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Driver Dashboard
router.get('/dashboard', ensureAuthenticated, ensureRole('driver'), async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user._id }).populate('userId', 'username email');
    const trips = await Trip.find({ driver: driver._id }).populate('rider', 'name email').populate('driver', 'name email');
    res.render('driverDashboard', { driver, trips });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
