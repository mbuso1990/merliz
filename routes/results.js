const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// Endpoint to handle POST request for submitting results
router.post('/results', async (req, res) => {
  const { score, wrongAnswers, tries, skips } = req.body;

  const result = new Result({
    score,
    wrongAnswers,
    tries,
    skips,
  });

  try {
    const newResult = await result.save();
    res.status(201).json(newResult);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
