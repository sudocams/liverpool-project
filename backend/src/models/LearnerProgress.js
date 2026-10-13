import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  challengeId: { type: String, required: true },
  topic: { type: String, required: true },
  correct: { type: Boolean, required: true },
  points: { type: Number, required: true },
  hintsUsed: { type: Number, default: 0, min: 0 },
  at: { type: Date, required: true },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  phase: { type: String, enum: ['pre', 'post'], required: true },
  score: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 1 },
  answers: [{ questionId: String, topic: String, correct: Boolean }],
  at: { type: Date, required: true },
}, { _id: false });

const researchFeedbackSchema = new mongoose.Schema({
  usability: { type: Number, min: 1, max: 5, required: true },
  engagement: { type: Number, min: 1, max: 5, required: true },
  learningValue: { type: Number, min: 1, max: 5, required: true },
  adaptationRelevance: { type: Number, min: 1, max: 5, required: true },
  feedbackClarity: { type: Number, min: 1, max: 5, required: true },
  at: { type: Date, required: true },
}, { _id: false });

const learnerProgressSchema = new mongoose.Schema({
  learnerId: { type: String, required: true, unique: true, index: true },
  attempts: { type: [attemptSchema], default: [] },
  completed: { type: [String], default: [] },
  assessments: { type: [assessmentSchema], default: [] },
  researchFeedback: { type: researchFeedbackSchema, default: null },
}, { timestamps: true });

export const LearnerProgress = mongoose.model('LearnerProgress', learnerProgressSchema);
