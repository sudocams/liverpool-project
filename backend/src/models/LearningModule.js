import mongoose from 'mongoose';

const learningModuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  missionOrder: { type: Number, default: 9999, index: true },
  topic: { type: String, required: true },
  duration: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  learningObjective: { type: String, required: true },
  briefing: { type: [String], required: true },
  hints: { type: [String], required: true },
  scenario: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  answerIndex: { type: Number, required: true, min: 0 },
  explanation: { type: String, required: true },
}, { timestamps: true });

export const LearningModule = mongoose.model('LearningModule', learningModuleSchema);
