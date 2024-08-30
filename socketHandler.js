const Pusher = require('pusher');  // Ensure Pusher is correctly required

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
      if (tripId) {
        socket.join(tripId);
        console.log(`User ${userId} joined room ${tripId}`);
      } else {
        console.log('No tripId provided to join room');
      }
    });

    socket.on('chatMessage', (message) => {
      if (message.tripId) {
        io.to(message.tripId).emit('chatMessage', message);

        pusherInstance.trigger('my-channel', 'my-event', {
          message: message.message,
          tripId: message.tripId,
          userId: message.userId,
        });
      } else {
        console.error('No tripId provided for chatMessage');
      }
    });

    socket.on('driverLocationUpdate', ({ tripId, location }) => {
      if (tripId) {
        console.log(`Driver for trip ${tripId} is at location:`, location);
        io.to(tripId).emit('driverLocationUpdate', { tripId, location });
      } else {
        console.error('No tripId provided for driverLocationUpdate');
      }
    });

    socket.on('disconnect', () => console.log('User disconnected'));
  });
};
