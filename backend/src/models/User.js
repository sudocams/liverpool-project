import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, index: true },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['learner', 'admin'], default: 'learner', required: true },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
