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
const chatRoutes = require('./routes/chat');

const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});




const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('socketio', io);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors({
  origin: 'http://localhost:5000',
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

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DB_URL,
    collectionName: 'sessions'
  }),
  cookie: { secure: false }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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
app.use('/driver', driverRoutes);
app.use('/api/chat', chatRoutes);
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


app.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('joinRoom', ({ userId, tripId }) => {
    socket.join(tripId);
    console.log(`User ${userId} joined room ${tripId}`);
  });

  socket.on('chatMessage', (message) => {
    console.log(`Message to ${message.tripId}: ${message.message}`);
    
    // Emit the message using Socket.IO
    io.to(message.tripId).emit('chatMessage', message);

    // Also trigger a Pusher event to broadcast the message
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

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
