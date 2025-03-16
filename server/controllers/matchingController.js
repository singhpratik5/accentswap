const enhancedMatchingService = require('../../services/enhancedMatchingService');

/**
 * Controller for handling user matching operations
 */

// Add user to waiting pool
const addToWaitingPool = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const result = await enhancedMatchingService.addToWaitingPool(userId);
    
    if (!result.success) {
      return res.status(400).json({ msg: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error adding to waiting pool:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Find a match for user
const findMatch = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const result = await enhancedMatchingService.findMatch(userId);
    
    if (!result.success) {
      return res.status(404).json({ msg: result.message });
    }
    
    res.json({
      success: true,
      matchId: result.matchId,
      partnerId: result.match,
      message: result.message
    });
  } catch (error) {
    console.error('Error finding match:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// End a match
const endMatch = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    
    const result = await enhancedMatchingService.endMatch(userId);
    
    if (!result.success) {
      return res.status(400).json({ msg: result.message });
    }
    
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error ending match:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get waiting users (admin only)
const getWaitingUsers = (req, res) => {
  try {
    const waitingUsers = enhancedMatchingService.getWaitingUsers();
    res.json(waitingUsers);
  } catch (error) {
    console.error('Error getting waiting users:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get active matches (admin only)
const getActiveMatches = (req, res) => {
  try {
    const activeMatches = enhancedMatchingService.getActiveMatches();
    res.json(activeMatches);
  } catch (error) {
    console.error('Error getting active matches:', error);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  addToWaitingPool,
  findMatch,
  endMatch,
  getWaitingUsers,
  getActiveMatches
};