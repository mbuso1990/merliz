const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Get all questions
router.get('/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    console.log('Fetched questions:', questions); // For debugging
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new question (Optional: For testing data insertion)
router.post('/questions', async (req, res) => {
  const question = new Question({
    question: req.body.question,
    answers: req.body.answers,
    correctAnswer: req.body.correctAnswer,
  });
  try {
    const newQuestion = await question.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
