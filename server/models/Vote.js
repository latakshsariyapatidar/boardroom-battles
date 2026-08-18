const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  voteID: {
    type: String,
    required: true,
    unique: true
  },
  userID: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  statementID: {
    type: String,
    required: true
  },
  vote: {
    type: String,
    enum: ['agree', 'for', 'disagree', 'against', 'neutral', 'no_vote'],
    required: true
  },
  marks: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// For querying a user's votes on a statement
voteSchema.index({ userID: 1, statementID: 1 });

module.exports = mongoose.model('Vote', voteSchema);
