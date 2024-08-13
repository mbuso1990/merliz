const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Rider = require('../models/Rider');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Login route using username
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username, role: 'rider' });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    // Fetch the Rider details to include in the response
    const rider = await Rider.findOne({ userId: user._id });

    res.status(200).json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profilePicture: user.profilePicture,
        availability: user.availability,
        status: user.status,
        rideHistory: user.rideHistory,
        _id: user._id,
        paymentMethods: user.paymentMethods,
        createdAt: user.createdAt,
        riderId: rider ? rider._id : null, // Include Rider ID if available
        riderProfilePicture: rider ? rider.profilePicture : null, // Include Rider's profile picture if available
      },
      token,
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register rider
router.post('/register', async (req, res) => {
  const { username, password, email, role, phone, profilePicture } = req.body;

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role: role || 'customer', // Default to customer if no role is provided
      phone,
      profilePicture,
    });
    await newUser.save();

    // If the role is 'rider', create a Rider document
    if (role === 'rider') {
      const newRider = new Rider({
        userId: newUser._id,
        username,
        phone,
        profilePicture,
        paymentMethods: [],
        rideHistory: [],
      });
      await newRider.save();
    }

    const token = generateToken(newUser);

    // Return the user details along with the token
    return res.json({
      message: 'User registered successfully',
      token,
      user: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        profilePicture: newUser.profilePicture,
        availability: newUser.availability,
        status: newUser.status,
        rideHistory: newUser.rideHistory,
        _id: newUser._id,
        paymentMethods: newUser.paymentMethods,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get rider by Rider's _id
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const rider = await Rider.findById(req.params.id); // Using Rider's _id directly
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }

    console.log('Rider ID:', rider._id); // Logging the Rider's ID to the console

    res.status(200).json(rider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.put('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const { username, email, phone, profilePicture } = req.body;

    console.log('Updating user with ID:', req.params.id);

    // Update User document
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, phone, profilePicture },
      { new: true }
    );

    if (!updatedUser) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Updated User:', updatedUser);

    // Update Rider document
    const updatedRider = await Rider.findOneAndUpdate(
      { userId: req.params.id },
      { username, phone, profilePicture },
      { new: true }
    );

    if (!updatedRider) {
      console.log('Rider not found');
      return res.status(404).json({ message: 'Rider not found' });
    }

    console.log('Updated Rider:', updatedRider);

    res.status(200).json({ 
      message: 'Profile updated successfully', 
      user: {
        ...updatedUser.toObject(),
        riderId: updatedRider._id,
      },
    });
  } catch (error) {
    console.error('Failed to update profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


// Logout route for rider
router.post('/logout', ensureAuthenticated, (req, res) => {
  req.user = null; // Invalidate the user session (JWT token)
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
