const express = require('express');
const bcrypt = require('bcryptjs');
const Rider = require('../models/Rider');
const User = require('../models/User');
const router = express.Router();

// Register Rider
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;
    console.log('Received registration data:', { username, email, password, phone });

    if (!username || !email || !password || !phone) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('Email already exists');
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: 'rider'
    });
    await newUser.save();

    const newRider = new Rider({
      userId: newUser._id,
      phone,
      paymentMethods: [{ type: 'cash', details: {} }],
      rideHistory: []
    });
    await newRider.save();

    console.log('Rider registered successfully:', newRider);
    res.status(201).json({ message: 'Rider registered successfully', rider: newRider });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all riders
router.get('/', async (req, res) => {
  try {
    const riders = await Rider.find().populate('userId', 'username email');
    res.status(200).json(riders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single rider by ID
router.get('/:id', async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id).populate('userId', 'username email');
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.status(200).json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update rider information
router.put('/:id', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const rider = await Rider.findByIdAndUpdate(
      req.params.id,
      { name, phone },
      { new: true }
    );
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    res.status(200).json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a rider
router.delete('/:id', async (req, res) => {
  try {
    const rider = await Rider.findByIdAndDelete(req.params.id);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    await User.findByIdAndDelete(rider.userId);
    res.status(200).json({ message: 'Rider deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
