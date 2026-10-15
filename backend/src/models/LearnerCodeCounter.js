import mongoose from 'mongoose';

const learnerCodeCounterSchema = new mongoose.Schema({
  _id: { type: String },
  sequence: { type: Number, required: true, default: 0 },
});

export const LearnerCodeCounter = mongoose.model('LearnerCodeCounter', learnerCodeCounterSchema);
