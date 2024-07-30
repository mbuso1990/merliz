require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const Trip = require('./models/Trip'); // Ensure Trip model is imported
const User = require('./models/User'); // Ensure User model is imported

// Import routes
const passwordResetRoutes = require('./routes/passwordReset');
const adminRoutes = require('./routes/admin');
const sellerRoutes = require('./routes/seller');
const customerRoutes = require('./routes/customer');
const authRoutes = require('./routes/auth');
const foodFolderRoutes = require('./routes/foodFolder');
const riderRoutes = require('./routes/rider');
const tripRoutes = require('./routes/trip');
const locationRoutes = require('./routes/location');
const driverRoutes = require('./routes/driver');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('socketio', io);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://192.168.43.59:5000', // Your frontend URL
  credentials: true
}));

mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL,
    collectionName: 'sessions'
  }),
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('landing', { isLoggedIn: req.isAuthenticated(), user: req.user });
});

app.use('/api/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/seller', sellerRoutes);
app.use('/customer', customerRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/foodFolder', foodFolderRoutes);
app.use('/api/rider', riderRoutes);
app.use('/api/trip', tripRoutes);
app.use('/socket', locationRoutes);
app.use('/api/driver', driverRoutes);

app.get('/register', (req, res) => {
  res.render('register');
});

app.get('/request-reset', (req, res) => {
  res.render('request-reset');
});

app.get('/reset/:token', (req, res) => {
  res.render('reset-password', { token: req.params.token });
});

app.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// Socket.io setup
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('driverLocationUpdate', (data) => {
    io.emit('driverLocationUpdate', data);
  });

  socket.on('riderLocationUpdate', (data) => {
    io.emit('riderLocationUpdate', data);
  });

  socket.on('driverStatusUpdate', (data) => {
    io.emit('driverStatusUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// Emit new trip request to connected clients
app.post('/api/trip/book', async (req, res) => {
  try {
    const newTrip = new Trip(req.body);
    await newTrip.save();
    io.emit('newTrip', newTrip);
    res.status(201).send(newTrip);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

