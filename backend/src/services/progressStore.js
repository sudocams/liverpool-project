import { LearnerProgress } from '../models/LearnerProgress.js';

const temporaryProgress = new Map();

export async function getProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOne({ learnerId }).lean();
    return document ? { attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [] } : { attempts: [], completed: [], assessments: [] };
  }
  return temporaryProgress.get(learnerId) ?? { attempts: [], completed: [], assessments: [] };
}

export async function saveProgress(learnerId, progress) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOneAndUpdate(
      { learnerId },
      { $set: { attempts: progress.attempts, completed: progress.completed, assessments: progress.assessments ?? [] } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    return { attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [] };
  }
  temporaryProgress.set(learnerId, progress);
  return progress;
}

export async function listProgress() {
  if (LearnerProgress.db.readyState === 1) {
    return LearnerProgress.find({}, { learnerId: 0 }).lean();
  }
  return [...temporaryProgress.values()];
}

export async function deleteProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    await LearnerProgress.deleteOne({ learnerId });
    return;
  }
  temporaryProgress.delete(learnerId);
}
