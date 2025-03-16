const express = require('express');
const { registerUser, loginUser, getCurrentUser } = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// Register a new user
router.post('/register', registerUser);

// Login user
router.post('/login', loginUser);

// Get current user profile (protected route)
router.get('/me', auth, getCurrentUser);

module.exports = router;
