require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();

// Connect to MongoDB
connectDB().then(async () => {
  const User = require('./models/User');
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('Database is empty, auto-seeding users...');
    const users = [
      { userID: 'J001', username: 'judge1', password: 'password', role: 'judge', token: 'judge_token_123' },
      { userID: 'U001', username: 'Lataksh', password: 'password', role: 'participant', token: 'part_token_1' },
      { userID: 'U002', username: 'Awaas', password: 'password', role: 'participant', token: 'part_token_2' },
      { userID: 'U003', username: 'Atithya', password: 'password', role: 'participant', token: 'part_token_3' },
      { userID: 'U004', username: 'Rakshak', password: 'password', role: 'participant', token: 'part_token_4' },
      { userID: 'U005', username: 'Hajra', password: 'password', role: 'participant', token: 'part_token_5' }
    ];
    await User.insertMany(users);
    console.log('Users seeded successfully.');
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
// Mount at both root and /api to handle reverse proxy variations
app.use('/', apiRoutes);
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
