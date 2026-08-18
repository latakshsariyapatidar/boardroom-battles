const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['judge', 'participant'],
    default: 'participant'
  },
  token: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
