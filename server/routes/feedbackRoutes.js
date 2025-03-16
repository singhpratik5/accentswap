const express = require('express');
const router = express.Router();
const { submitFeedback, getUserFeedback, getFeedbackStats } = require('../controllers/feedbackController');
const auth = require('../middleware/authMiddleware');

// @route   POST /api/feedback/submit
// @desc    Submit feedback for a conversation
// @access  Private
router.post('/submit', auth, submitFeedback);

// @route   GET /api/feedback/user
// @desc    Get feedback received by the current user
// @access  Private
router.get('/user', auth, getUserFeedback);

// @route   GET /api/feedback/stats
// @desc    Get feedback statistics for the current user
// @access  Private
router.get('/stats', auth, getFeedbackStats);

module.exports = router;