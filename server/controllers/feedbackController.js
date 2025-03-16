const Feedback = require('../models/Feedback');
const User = require('../models/User');

/**
 * Controller for handling feedback operations
 */

// Submit feedback for a conversation
const submitFeedback = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const {
      matchId,
      partnerId,
      overallRating,
      helpfulnessRating,
      connectionQuality,
      tags,
      comments
    } = req.body;

    // Validate required fields
    if (!matchId || !partnerId || !overallRating) {
      return res.status(400).json({ msg: 'Missing required feedback information' });
    }

    // Check if feedback already exists for this match and user
    const existingFeedback = await Feedback.findOne({ userId, matchId });
    if (existingFeedback) {
      return res.status(400).json({ msg: 'Feedback already submitted for this conversation' });
    }

    // Create new feedback
    const feedback = new Feedback({
      userId,
      partnerId,
      matchId,
      overallRating,
      helpfulnessRating: helpfulnessRating || 0,
      connectionQuality: connectionQuality || 'good',
      tags: tags || [],
      comments: comments || ''
    });

    await feedback.save();

    res.json({ success: true, msg: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get feedback received by the current user
const getUserFeedback = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    // Find feedback where this user was the partner
    const feedback = await Feedback.find({ partnerId: userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name');

    res.json(feedback);
  } catch (error) {
    console.error('Error getting user feedback:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get feedback statistics for the current user
const getFeedbackStats = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware

    // Find all feedback where this user was the partner
    const feedback = await Feedback.find({ partnerId: userId });

    if (feedback.length === 0) {
      return res.json({
        totalFeedback: 0,
        averageRating: 0,
        topTags: [],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    // Calculate average rating
    const totalRating = feedback.reduce((sum, item) => sum + item.overallRating, 0);
    const averageRating = totalRating / feedback.length;

    // Count tag occurrences
    const tagCounts = {};
    feedback.forEach(item => {
      item.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Get top 5 tags
    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedback.forEach(item => {
      ratingDistribution[item.overallRating] += 1;
    });

    res.json({
      totalFeedback: feedback.length,
      averageRating: averageRating.toFixed(1),
      topTags,
      ratingDistribution
    });
  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { submitFeedback, getUserFeedback, getFeedbackStats };