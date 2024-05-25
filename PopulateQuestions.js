const mongoose = require('mongoose');
const Question = require('./models/Question'); // Ensure this path is correct

const mongoURI = 'mongodb+srv://mbuso:h96nCqPNyqWJI1y0@cluster0.zjn404d.mongodb.net/quizdb'; // Ensure this is correctly formatted

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  populateQuestions();
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

const questions = [
  { question: 'What is 2 + 2?', correctAnswer: '4', answers: ['2', '3', '4', '5'] },
  { question: 'What is 3 + 5?', correctAnswer: '8', answers: ['6', '7', '8', '9'] },
  { question: 'What is the capital of France?', correctAnswer: 'Paris', answers: ['Paris', 'London', 'Berlin', 'Rome'] },
  { question: 'What is the largest planet in our solar system?', correctAnswer: 'Jupiter', answers: ['Earth', 'Mars', 'Jupiter', 'Saturn'] },
  { question: 'What is the chemical symbol for water?', correctAnswer: 'H2O', answers: ['H2O', 'O2', 'CO2', 'HO'] },
  { question: 'Who wrote "Hamlet"?', correctAnswer: 'Shakespeare', answers: ['Shakespeare', 'Dickens', 'Austen', 'Hemingway'] },
  { question: 'What is the square root of 64?', correctAnswer: '8', answers: ['6', '7', '8', '9'] },
  { question: 'Which element has the atomic number 1?', correctAnswer: 'Hydrogen', answers: ['Helium', 'Oxygen', 'Hydrogen', 'Carbon'] },
  { question: 'What is the speed of light?', correctAnswer: '299,792 km/s', answers: ['150,000 km/s', '299,792 km/s', '500,000 km/s', '1,000,000 km/s'] },
  { question: 'What is the largest ocean on Earth?', correctAnswer: 'Pacific', answers: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
];

async function populateQuestions() {
  try {
    await Question.insertMany(questions);
    console.log('Questions added successfully');
  } catch (err) {
    console.error('Error adding questions:', err);
  } finally {
    mongoose.connection.close();
  }
}

async function retrieveQuestions() {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    const questions = await Question.find();
    console.log('Retrieved questions:', questions);
  } catch (err) {
    console.error('Error retrieving questions:', err);
  } finally {
    mongoose.connection.close();
  }
}

populateQuestions();
