import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true, index: true },
  username: { type: String, unique: true, sparse: true, index: true, lowercase: true, trim: true, default: undefined },
  passwordSalt: { type: String, required: true },
  passwordHash: { type: String, required: true },
  credentialsConfigured: { type: Boolean, default: false },
  mustChangePassword: { type: Boolean, default: false },
  passwordResetRequestedAt: { type: Date, default: null },
  loginEvents: { type: [Date], default: [] },
  role: { type: String, enum: ['learner', 'admin'], default: 'learner', required: true },
  researchConsent: {
    version: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
  },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
