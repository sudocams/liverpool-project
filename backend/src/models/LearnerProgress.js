import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  challengeId: { type: String, required: true },
  topic: { type: String, required: true },
  correct: { type: Boolean, required: true },
  points: { type: Number, required: true },
  hintsUsed: { type: Number, default: 0, min: 0 },
  durationSeconds: { type: Number, default: null, min: 0 },
  feedbackSource: { type: String, enum: ['ai', 'guided', 'unknown'], default: 'unknown' },
  at: { type: Date, required: true },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  phase: { type: String, enum: ['pre', 'post'], required: true },
  score: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 1 },
  durationSeconds: { type: Number, default: null, min: 0 },
  answers: [{ questionId: String, topic: String, correct: Boolean }],
  at: { type: Date, required: true },
}, { _id: false });

const progressionSchema = new mongoose.Schema({
  rule: { type: String, required: true },
  reason: { type: String, required: true },
  recommendedChallengeId: { type: String, default: null },
  at: { type: Date, required: true },
}, { _id: false });

const activitySessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  startedAt: { type: Date, required: true },
  lastHeartbeatAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  activeSeconds: { type: Number, default: 0, min: 0 },
}, { _id: false });

const achievementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  earnedAt: { type: Date, required: true },
}, { _id: false });

const rankHistorySchema = new mongoose.Schema({
  rank: { type: String, required: true },
  reachedAt: { type: Date, required: true },
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
  progression: { type: [progressionSchema], default: [] },
  activitySessions: { type: [activitySessionSchema], default: [] },
  completedPaths: { type: [String], default: [] },
  achievements: { type: [achievementSchema], default: [] },
  gamificationInitialized: { type: Boolean, default: false },
  rankHistory: { type: [rankHistorySchema], default: [] },
  currentRank: { type: String, default: 'Rookie' },
  researchFeedback: { type: researchFeedbackSchema, default: null },
}, { timestamps: true });

export const LearnerProgress = mongoose.model('LearnerProgress', learnerProgressSchema);
