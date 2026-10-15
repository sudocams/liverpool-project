import mongoose from 'mongoose';

const topicScoreSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  correct: { type: Number, required: true, min: 0, max: 3 },
  total: { type: Number, required: true, min: 3, max: 3 },
}, { _id: false });

const comparisonPhaseSchema = new mongoose.Schema({
  phase: { type: String, enum: ['pre', 'post', 'retention', 'transfer'], required: true },
  scores: { type: [topicScoreSchema], required: true },
  completedAt: { type: Date, required: true },
}, { _id: false });

const classroomComparisonSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 30 },
  phases: { type: [comparisonPhaseSchema], default: [] },
}, { timestamps: true });

export const ClassroomComparison = mongoose.model('ClassroomComparison', classroomComparisonSchema);
