const mongoose = require('mongoose');

const statementSchema = new mongoose.Schema({
  statementID: {
    type: String,
    required: true,
    unique: true
  },
  text: {
    type: String,
    required: true
  },
  judgeVote: {
    type: String,
    enum: ['agree', 'disagree'],
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Statement', statementSchema);
