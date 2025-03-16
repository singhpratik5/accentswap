const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');
const {
  addToWaitingPool,
  findMatch,
  endMatch,
  getWaitingUsers,
  getActiveMatches
} = require('../controllers/matchingController');

// Add user to waiting pool (protected route)
router.post('/waiting-pool', auth, addToWaitingPool);

// Find a match for user (protected route)
router.get('/find-match', auth, findMatch);

// End a match (protected route)
router.post('/end-match', auth, endMatch);

// Admin routes
// Get all waiting users (admin only)
router.get('/waiting-users', adminAuth, getWaitingUsers);

// Get all active matches (admin only)
router.get('/active-matches', adminAuth, getActiveMatches);

module.exports = router;