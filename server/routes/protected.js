const express = require('express');
const protectRoute = require('../middleware/authMiddleware');

const router = express.Router();

// Protected route example
router.get('/', protectRoute, (req, res) => {
  res.json({ message: 'You have accessed a protected route!' });
});

module.exports = router; // ✅ Fix: Changed from `export default router`
