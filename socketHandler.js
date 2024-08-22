// socketHandler.js
const pusher = require('pusher');

const pusherInstance = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('joinRoom', ({ userId, tripId }) => {
      socket.join(tripId);
      console.log(`User ${userId} joined room ${tripId}`);
    });

    socket.on('chatMessage', (message) => {
      console.log(`Message to ${message.tripId}: ${message.message}`);

      io.to(message.tripId).emit('chatMessage', message);

      pusherInstance.trigger('my-channel', 'my-event', {
        message: message.message,
        tripId: message.tripId,
        userId: message.userId,
      });
    });

    socket.on('driverLocationUpdate', ({ tripId, location }) => {
      console.log(`Driver for trip ${tripId} is at location:`, location);
      io.to(tripId).emit('driverLocationUpdate', { tripId, location });
    });

    socket.on('disconnect', () => console.log('User disconnected'));
  });
};
