const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TripSchema = new Schema({
  rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  origin: { type: String, required: true }, // Changed to String
  destination: { type: String, required: true }, // Changed to String
  status: {
    type: String,
    enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  fare: { type: Number },
  distance: { type: Number }, // Distance in meters
  duration: { type: Number }, // Duration in seconds
  approved: { type: Boolean, default: false } // New field to track approval status
}, { timestamps: true });

const Trip = mongoose.model('Trip', TripSchema);
module.exports = Trip;
