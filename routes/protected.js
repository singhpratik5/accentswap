const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET api/protected
// @desc    Test route
// @access  Private
router.get('/', auth, (req, res) => {
  res.json({ msg: 'Welcome to the protected route!' });
});

module.exports = router;