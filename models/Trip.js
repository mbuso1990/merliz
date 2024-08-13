const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TripSchema = new Schema({
  rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'frozen', 'approved'], // Add 'approved' here
    default: 'requested'
  },
  fare: { type: Number },
  distance: { type: Number },
  duration: { type: Number },
  approved: { type: Boolean, default: false }
}, { timestamps: true });

const Trip = mongoose.model('Trip', TripSchema);
module.exports = Trip;
