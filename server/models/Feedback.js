const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  matchId: {
    type: String,
    required: true
  },
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  helpfulnessRating: {
    type: Number,
    min: 0,
    max: 5
  },
  connectionQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  tags: [{
    type: String
  }],
  comments: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index to ensure a user can only submit one feedback per match
FeedbackSchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', FeedbackSchema);