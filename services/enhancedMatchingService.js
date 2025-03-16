const User = require('./server/models/User');

/**
 * Enhanced matching service that pairs users based on complementary language skills,
 * interests, and availability.
 */
class EnhancedMatchingService {
  constructor() {
    // Users waiting to be matched
    this.waitingUsers = new Map();
    // Active matches
    this.activeMatches = new Map();
  }

  /**
   * Add a user to the waiting pool
   * @param {string} userId - The user's ID
   * @returns {Promise<{success: boolean, message: string}>} - Result of the operation
   */
  async addToWaitingPool(userId) {
    try {
      // Check if user is already in waiting pool
      if (this.waitingUsers.has(userId)) {
        return { success: false, message: 'User already in waiting pool' };
      }

      // Check if user is already in an active match
      if (this.activeMatches.has(userId)) {
        return { success: false, message: 'User already in an active match' };
      }

      // Get user from database
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Add user to waiting pool with timestamp
      this.waitingUsers.set(userId, {
        user,
        joinedAt: Date.now()
      });

      return { success: true, message: 'Added to waiting pool' };
    } catch (error) {
      console.error('Error adding user to waiting pool:', error);
      return { success: false, message: 'Server error' };
    }
  }

  /**
   * Remove a user from the waiting pool
   * @param {string} userId - The user's ID
   * @returns {boolean} - Whether the user was removed
   */
  removeFromWaitingPool(userId) {
    return this.waitingUsers.delete(userId);
  }

  /**
   * Calculate match score between two users
   * @param {Object} user1 - First user
   * @param {Object} user2 - Second user
   * @returns {number} - Match score (higher is better)
   */
  calculateMatchScore(user1, user2) {
    let score = 0;
    
    // Language complementarity (highest priority)
    // Check if user1's preferred language is in user2's learning languages
    if (user2.learningLanguages.includes(user1.preferredLanguage)) {
      score += 50;
    }
    
    // Check if user2's preferred language is in user1's learning languages
    if (user1.learningLanguages.includes(user2.preferredLanguage)) {
      score += 50;
    }
    
    // If no language match, return 0 (incompatible)
    if (score === 0) return 0;
    
    // Shared interests (medium priority)
    const sharedInterests = user1.interests.filter(interest => 
      user2.interests.includes(interest)
    );
    score += sharedInterests.length * 5; // 5 points per shared interest
    
    // Proficiency level (lower priority)
    // Prefer matching beginners with intermediate/advanced speakers
    const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Fluent'];
    const user1Level = proficiencyLevels.indexOf(user1.proficiencyLevel);
    const user2Level = proficiencyLevels.indexOf(user2.proficiencyLevel);
    
    // Give higher score if proficiency levels are complementary
    // (e.g., beginner matched with advanced)
    const levelDifference = Math.abs(user1Level - user2Level);
    score += levelDifference * 3;
    
    return score;
  }

  /**
   * Find the best match for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<{success: boolean, match?: string, message: string}>} - Match result
   */
  async findMatch(userId) {
    try {
      // Check if user is in waiting pool
      if (!this.waitingUsers.has(userId)) {
        return { success: false, message: 'User not in waiting pool' };
      }

      const userEntry = this.waitingUsers.get(userId);
      const user = userEntry.user;
      
      let bestMatch = null;
      let bestScore = 0;
      
      // Find best match from waiting pool
      for (const [potentialMatchId, potentialMatchEntry] of this.waitingUsers.entries()) {
        // Skip self
        if (potentialMatchId === userId) continue;
        
        const potentialMatch = potentialMatchEntry.user;
        const score = this.calculateMatchScore(user, potentialMatch);
        
        // Update best match if score is higher
        if (score > bestScore) {
          bestScore = score;
          bestMatch = potentialMatchId;
        }
      }
      
      // If no suitable match found
      if (!bestMatch) {
        return { success: false, message: 'No suitable match found' };
      }
      
      // Create match
      const matchId = `${userId}-${bestMatch}`;
      
      // Remove both users from waiting pool
      this.removeFromWaitingPool(userId);
      this.removeFromWaitingPool(bestMatch);
      
      // Add to active matches
      this.activeMatches.set(userId, { matchId, partnerId: bestMatch });
      this.activeMatches.set(bestMatch, { matchId, partnerId: userId });
      
      return { 
        success: true, 
        match: bestMatch,
        matchId,
        message: 'Match found' 
      };
    } catch (error) {
      console.error('Error finding match:', error);
      return { success: false, message: 'Server error' };
    }
  }

  /**
   * End a match between users
   * @param {string} userId - The user's ID
   * @returns {Promise<{success: boolean, message: string}>} - Result of the operation
   */
  async endMatch(userId) {
    try {
      // Check if user is in an active match
      if (!this.activeMatches.has(userId)) {
        return { success: false, message: 'User not in an active match' };
      }

      const match = this.activeMatches.get(userId);
      const partnerId = match.partnerId;
      
      // Remove both users from active matches
      this.activeMatches.delete(userId);
      this.activeMatches.delete(partnerId);
      
      return { success: true, message: 'Match ended' };
    } catch (error) {
      console.error('Error ending match:', error);
      return { success: false, message: 'Server error' };
    }
  }

  /**
   * Get all users in the waiting pool
   * @returns {Array} - Array of users in waiting pool
   */
  getWaitingUsers() {
    return Array.from(this.waitingUsers.entries()).map(([id, entry]) => ({
      userId: id,
      name: entry.user.name,
      waitingSince: entry.joinedAt
    }));
  }

  /**
   * Get all active matches
   * @returns {Array} - Array of active matches
   */
  getActiveMatches() {
    const uniqueMatches = new Set();
    const matches = [];
    
    for (const [userId, match] of this.activeMatches.entries()) {
      if (!uniqueMatches.has(match.matchId)) {
        uniqueMatches.add(match.matchId);
        matches.push({
          matchId: match.matchId,
          users: [userId, match.partnerId]
        });
      }
    }
    
    return matches;
  }
}

module.exports = new EnhancedMatchingService();