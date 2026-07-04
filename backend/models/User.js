const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  // Current, correct field used by routes/auth.js
  passwordHash: { type: String },
  // Legacy field kept ONLY so old/plaintext records (if any) still work;
  // auth.js auto-upgrades these to passwordHash on next successful login.
  password: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Password-reset support
  resetTokenHash: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);

