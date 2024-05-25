require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const questionsRouter = require('./routes/questions');
const resultsRouter = require('./routes/results');

const app = express();
const port = process.env.PORT || 5000;

const dbUrl = process.env.DB_URL;

// Define CORS options
const corsOptions = {
  origin: '*', // You can specify specific URLs for better security
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
};

// Use CORS with the specified options
app.use(cors(corsOptions));
app.use(express.json());

mongoose.connect(dbUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

app.use('/api', questionsRouter);
app.use('/api', resultsRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
