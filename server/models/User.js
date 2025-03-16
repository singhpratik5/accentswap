const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  sessionToken: { type: String, default: null },
  sessionExpiry: { type: Date, default: null },
  emailAttempts: [
    {
      timestamp: { type: Date, default: Date.now },
      ip: { type: String, required: true }, // Store IP address
    }
  ],
  // Profile fields
  preferredLanguage: { type: String, default: 'English' },
  learningLanguages: [{ type: String }],
  proficiencyLevel: { 
    type: String, 
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Fluent'], 
    default: 'Beginner' 
  },
  interests: [{ type: String }],
  ageRange: { type: String, default: '18-25' },
  isOnline: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
}); 

module.exports = mongoose.model('User', UserSchema);
