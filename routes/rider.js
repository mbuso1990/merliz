const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const streamifier = require('streamifier');
const Rider = require('../models/Rider');
const User = require('../models/User');
const Trip = require('../models/Trip');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const cloudinary = require('../cloudinaryConfig'); // Import Cloudinary config

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Profile Picture Upload Route
router.post('/upload-profile-picture', ensureAuthenticated, ensureRole('rider'), upload.single('profilePicture'), (req, res) => {
  const file = req.file;
  if (!file) {
    console.error('No file uploaded');
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const uploadStream = cloudinary.uploader.upload_stream(
    { resource_type: 'image' },
    async (error, result) => {
      if (error) {
        console.error('Error uploading to Cloudinary:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
      }

      const imageUrl = result.secure_url;

      try {
        const rider = await Rider.findOne({ userId: req.user._id });

        if (!rider) {
          console.error('Rider not found');
          return res.status(404).json({ message: 'Rider not found' });
        }

        rider.profilePicture = imageUrl;
        await rider.save();

        res.status(200).json({ profilePicture: imageUrl });
      } catch (err) {
        console.error('Error saving profile picture:', err);
        res.status(500).json({ error: 'Failed to save profile picture' });
      }
    }
  );

  streamifier.createReadStream(file.buffer).pipe(uploadStream);
});

// Rider Dashboard (protected route)
router.get('/dashboard', ensureAuthenticated, ensureRole('rider'), async (req, res) => {
  try {
    const trips = await Trip.find({ rider: req.user._id }).populate('driver');
    res.render('rider-dashboard', { user: req.user, trips });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
 
// Register Rider
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, phone } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
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

    res.status(201).json({ message: 'Rider registered successfully', rider: { userId: newUser, phone: newRider.phone } });
  } catch (error) {
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

// Logout Route for Rider
router.post('/logout', ensureAuthenticated, ensureRole('rider'), (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
