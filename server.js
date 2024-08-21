require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const flash = require('connect-flash');
const http = require('http');
const { Server } = require('socket.io');
const Pusher = require('pusher');
const methodOverride = require('method-override'); // Add method-override

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Set Socket.IO instance to be accessible throughout the app
app.set('socketio', io);

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5000',
  credentials: true
}));

// MongoDB connection
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.DB_URL, collectionName: 'sessions' }),
  cookie: { secure: false }
}));

// Passport.js setup
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport')(passport);

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/seller', require('./routes/seller'));
app.use('/customer', require('./routes/customer'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/foodFolder', require('./routes/foodFolder'));
app.use('/api/rider', require('./routes/rider'));
app.use('/api/trip', require('./routes/trip'));
app.use('/socket', require('./routes/location'));
app.use('/driver', require('./routes/driver'));
app.use('/api/chat', require('./routes/chat'));
app.use('/products', require('./routes/productRoutes')); // Existing routes for product management
app.use('/api/products', require('./routes/apiProductRoutes')); // API routes for products
app.use('/api/orders', require('./routes/orderRoutes')); // Adding the order routes

// Static Pages
app.get('/', (req, res) => res.render('landing', { isLoggedIn: req.isAuthenticated(), user: req.user }));
app.get('/register', (req, res) => res.render('register'));
app.get('/request-reset', (req, res) => res.render('request-reset'));
app.get('/reset/:token', (req, res) => res.render('reset-password', { token: req.params.token }));

// Logout
app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// Socket.IO connections
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('joinRoom', ({ userId, tripId }) => {
    socket.join(tripId);
    console.log(`User ${userId} joined room ${tripId}`);
  });

  socket.on('chatMessage', (message) => {
    console.log(`Message to ${message.tripId}: ${message.message}`);

    io.to(message.tripId).emit('chatMessage', message);

    pusher.trigger('my-channel', 'my-event', {
      message: message.message,
      tripId: message.tripId,
      userId: message.userId,
    });
  });

  socket.on('driverLocationUpdate', ({ tripId, location }) => {
    console.log(`Driver for trip ${tripId} is at location:`, location);
    io.to(tripId).emit('driverLocationUpdate', { tripId, location });
  });

  socket.on('disconnect', () => console.log('user disconnected'));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
