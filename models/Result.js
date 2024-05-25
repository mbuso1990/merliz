const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  wrongAnswers: { type: Number, required: true },
  tries: { type: Number, required: true },
  skips: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Result', ResultSchema);
