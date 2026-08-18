require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Statement = require('./models/Statement');
const Vote = require('./models/Vote');

const users = [
  { userID: 'J001', username: 'judge1', password: 'password', role: 'judge', token: 'judge_token_123' },
  { userID: 'U001', username: 'Lataksh', password: 'password', role: 'participant', token: 'part_token_1' },
  { userID: 'U002', username: 'Awaas', password: 'password', role: 'participant', token: 'part_token_2' },
  { userID: 'U003', username: 'Atithya', password: 'password', role: 'participant', token: 'part_token_3' },
  { userID: 'U004', username: 'Rakshak', password: 'password', role: 'participant', token: 'part_token_4' },
  { userID: 'U005', username: 'Hajra', password: 'password', role: 'participant', token: 'part_token_5' }
];

const seedDB = async () => {
  try {
    await connectDB();
    console.log('Clearing database...');
    await User.deleteMany();
    await Statement.deleteMany();
    await Vote.deleteMany();

    console.log('Inserting users...');
    await User.insertMany(users);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDB();
