const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TripSchema = new Schema({
  rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User' }, // Driver is now optional
  origin: { type: String, required: true }, // Store as a string address
  destination: { type: String, required: true }, // Store as a string address
  status: {
    type: String,
    enum: ['requested', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'frozen', 'approved'],
    default: 'requested'
  },
  fare: { type: Number },
  distance: { type: Number },
  duration: { type: Number },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

const Trip = mongoose.model('Trip', TripSchema);
module.exports = Trip;
