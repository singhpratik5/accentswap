const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');

// Get active sessions
router.get('/sessions', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ sessionToken: { $ne: null } }, 'email sessionToken sessionExpiry');
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// Get login logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, 'email emailAttempts');
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

// End session
router.delete('/sessions/:id', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { sessionToken: null, sessionExpiry: null });
    res.json({ msg: 'Session ended' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
});

module.exports = router;
