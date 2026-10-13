import { LearnerProgress } from '../models/LearnerProgress.js';

const temporaryProgress = new Map();

export async function getProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOne({ learnerId }).lean();
    return document ? { attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [], researchFeedback: document.researchFeedback ?? null } : { attempts: [], completed: [], assessments: [], researchFeedback: null };
  }
  return temporaryProgress.get(learnerId) ?? { attempts: [], completed: [], assessments: [], researchFeedback: null };
}

export async function saveProgress(learnerId, progress) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOneAndUpdate(
      { learnerId },
      { $set: { attempts: progress.attempts, completed: progress.completed, assessments: progress.assessments ?? [], researchFeedback: progress.researchFeedback ?? null } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    return { attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [], researchFeedback: document.researchFeedback ?? null };
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

export async function listProgressForAccounts(accountIds) {
  if (!accountIds.length) return [];
  if (LearnerProgress.db.readyState === 1) {
    return LearnerProgress.find({ learnerId: { $in: accountIds } }).lean();
  }
  const allowed = new Set(accountIds);
  return [...temporaryProgress.entries()].filter(([id]) => allowed.has(id)).map(([id, progress]) => ({ ...progress, learnerId: id }));
}

export async function deleteProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    await LearnerProgress.deleteOne({ learnerId });
    return;
  }
  temporaryProgress.delete(learnerId);
}
