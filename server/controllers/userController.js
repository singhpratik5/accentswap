const User = require('../models/User');

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const {
            name,
            preferredLanguage,
            learningLanguages,
            proficiencyLevel,
            interests,
            ageRange
        } = req.body;

        // Find user by id (from auth middleware)
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update fields
        if (name) user.name = name;
        if (preferredLanguage) user.preferredLanguage = preferredLanguage;
        if (learningLanguages) user.learningLanguages = learningLanguages;
        if (proficiencyLevel) user.proficiencyLevel = proficiencyLevel;
        if (interests) user.interests = interests;
        if (ageRange) user.ageRange = ageRange;

        // Save updated user
        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(req.user.id).select('-password');
        res.json(updatedUser);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Get all users for matching (filtered by criteria)
const getMatchingUsers = async (req, res) => {
    try {
        // Get current user
        const currentUser = await User.findById(req.user.id);
        
        if (!currentUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Find users who:
        // 1. Are not the current user
        // 2. Speak one of the languages the current user is learning
        // 3. Are learning the language the current user speaks
        // 4. Are online (optional)
        // 5. Share similar interests (optional)

        const matchingUsers = await User.find({
            _id: { $ne: req.user.id },
            preferredLanguage: { $in: currentUser.learningLanguages },
            learningLanguages: { $in: [currentUser.preferredLanguage] },
            isOnline: true
        }).select('-password');

        res.json(matchingUsers);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

// Update user online status
const updateOnlineStatus = async (req, res) => {
    try {
        const { isOnline } = req.body;

        // Find user by id
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Update online status and last active time
        user.isOnline = isOnline;
        user.lastActive = Date.now();

        await user.save();

        res.json({ msg: 'Status updated successfully' });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ msg: 'Server Error' });
    }
};

module.exports = { updateProfile, getMatchingUsers, updateOnlineStatus };