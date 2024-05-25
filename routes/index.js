const express = require('express');
const questionsRouter = require('./questions');
const resultsRouter = require('./results'); // Assuming you have a results router

const router = express.Router();

router.use('/questions', questionsRouter);
router.use('/results', resultsRouter);

module.exports = router;
