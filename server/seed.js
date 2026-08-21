require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Statement = require('./models/Statement');
const Vote = require('./models/Vote');

const users = [
  // Judges
  { userID: 'J001', username: 'judge1', password: 'Judge1@BB#2026', role: 'judge', token: 'judge_token_01' },
  { userID: 'J002', username: 'judge2', password: 'Judge2@BB#2026', role: 'judge', token: 'judge_token_02' },

  // External Teams
  { userID: 'EXT01', username: 'robbery_united', password: 'Robbery#9661', role: 'participant', token: 'token_ext_01' },
  { userID: 'EXT02', username: 'alpha_nmit', password: 'Alpha#8147', role: 'participant', token: 'token_ext_02' },
  { userID: 'EXT03', username: 'innovate', password: 'Inno#8816', role: 'participant', token: 'token_ext_03' },
  { userID: 'EXT04', username: 'stratagem', password: 'Strat#8796', role: 'participant', token: 'token_ext_04' },
  { userID: 'EXT05', username: 'quite_catalyst', password: 'Quite#9178', role: 'participant', token: 'token_ext_05' },
  { userID: 'EXT06', username: 'team_alpha', password: 'Alpha#9137', role: 'participant', token: 'token_ext_06' },
  { userID: 'EXT07', username: 'weconsult', password: 'WeCon#7875', role: 'participant', token: 'token_ext_07' },
  { userID: 'EXT08', username: 'case_champions', password: 'Champ#9820', role: 'participant', token: 'token_ext_08' },

  // Internal Teams
  { userID: 'INT01', username: 'the_strategists', password: 'Strat#9163', role: 'participant', token: 'token_int_01' },
  { userID: 'INT02', username: 'iit_4', password: 'IIT4#9181', role: 'participant', token: 'token_int_02' },
  { userID: 'INT03', username: 'ch26bt018', password: 'Vedant#9198', role: 'participant', token: 'token_int_03' },
  { userID: 'INT04', username: 'aaradhy_rai', password: 'Aaradhy#9244', role: 'participant', token: 'token_int_04' }
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
