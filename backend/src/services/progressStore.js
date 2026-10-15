import { LearnerProgress } from '../models/LearnerProgress.js';
import { completedLearningPaths } from '../content/learningPaths.js';
import { loadLocalMap, saveLocalMap } from './localPersistence.js';

const temporaryProgress = new Map();
const ensureTemporaryProgress = () => loadLocalMap('progress.json', temporaryProgress);

export async function getProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOne({ learnerId }).lean();
    return document ? {
      attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [], progression: document.progression ?? [],
      activitySessions: document.activitySessions ?? [], completedPaths: document.completedPaths ?? [], achievements: document.achievements ?? [],
      gamificationInitialized: document.gamificationInitialized ?? false, rankHistory: document.rankHistory ?? [], currentRank: document.currentRank ?? 'Rookie', researchFeedback: document.researchFeedback ?? null,
    } : emptyProgress();
  }
  await ensureTemporaryProgress();
  return temporaryProgress.get(learnerId) ?? emptyProgress();
}

function emptyProgress() {
  return { attempts: [], completed: [], assessments: [], progression: [], activitySessions: [], completedPaths: [], achievements: [], gamificationInitialized: false, rankHistory: [], currentRank: 'Rookie', researchFeedback: null };
}

export async function saveProgress(learnerId, progress) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOneAndUpdate(
      { learnerId },
      { $set: {
        attempts: progress.attempts, completed: progress.completed, assessments: progress.assessments ?? [], progression: progress.progression ?? [],
        completedPaths: progress.completedPaths ?? [], achievements: progress.achievements ?? [], gamificationInitialized: progress.gamificationInitialized ?? false,
        rankHistory: progress.rankHistory ?? [], currentRank: progress.currentRank ?? 'Rookie', researchFeedback: progress.researchFeedback ?? null,
      } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    return {
      attempts: document.attempts, completed: document.completed, assessments: document.assessments ?? [], progression: document.progression ?? [],
      activitySessions: document.activitySessions ?? [], completedPaths: document.completedPaths ?? [], achievements: document.achievements ?? [],
      gamificationInitialized: document.gamificationInitialized ?? false, rankHistory: document.rankHistory ?? [], currentRank: document.currentRank ?? 'Rookie', researchFeedback: document.researchFeedback ?? null,
    };
  }
  await ensureTemporaryProgress();
  const latest = temporaryProgress.get(learnerId);
  const updated = latest ? { ...progress, activitySessions: latest.activitySessions ?? progress.activitySessions ?? [] } : progress;
  temporaryProgress.set(learnerId, updated);
  await saveLocalMap('progress.json', temporaryProgress);
  return updated;
}

export async function startActivitySession(learnerId, session) {
  if (LearnerProgress.db.readyState === 1) {
    await LearnerProgress.updateOne({ learnerId, 'activitySessions.endedAt': null }, { $set: { 'activitySessions.$[open].endedAt': session.startedAt } }, { arrayFilters: [{ 'open.endedAt': null }] });
    await LearnerProgress.findOneAndUpdate({ learnerId }, { $setOnInsert: { learnerId }, $push: { activitySessions: session } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return;
  }
  await ensureTemporaryProgress();
  const progress = await getProgress(learnerId);
  progress.activitySessions = [...(progress.activitySessions ?? []).map(item => item.endedAt ? item : { ...item, endedAt: session.startedAt }), session];
  temporaryProgress.set(learnerId, progress);
  await saveLocalMap('progress.json', temporaryProgress);
}

export async function heartbeatActivitySession(learnerId, sessionId, now) {
  if (LearnerProgress.db.readyState === 1) {
    const document = await LearnerProgress.findOne({ learnerId, 'activitySessions.sessionId': sessionId }, { 'activitySessions.$': 1 }).lean();
    const session = document?.activitySessions?.[0];
    if (!session) return { status: 'missing' };
    if (session.endedAt) return { status: 'ended' };
    const seconds = Math.min(30, Math.max(0, Math.floor((now.getTime() - new Date(session.lastHeartbeatAt).getTime()) / 1000)));
    const result = await LearnerProgress.updateOne(
      { learnerId, 'activitySessions.sessionId': sessionId },
      { $set: { 'activitySessions.$[active].lastHeartbeatAt': now }, $inc: { 'activitySessions.$[active].activeSeconds': seconds } },
      { arrayFilters: [{ 'active.sessionId': sessionId, 'active.lastHeartbeatAt': session.lastHeartbeatAt, 'active.endedAt': null }] },
    );
    return result.modifiedCount ? { status: 'ok', activeSeconds: (session.activeSeconds ?? 0) + seconds } : { status: 'stale' };
  }
  await ensureTemporaryProgress();
  const progress = await getProgress(learnerId);
  const index = (progress.activitySessions ?? []).findIndex(item => item.sessionId === sessionId);
  if (index < 0) return { status: 'missing' };
  const session = progress.activitySessions[index];
  if (session.endedAt) return { status: 'ended' };
  const seconds = Math.min(30, Math.max(0, Math.floor((now.getTime() - new Date(session.lastHeartbeatAt).getTime()) / 1000)));
  const updated = { ...session, lastHeartbeatAt: now, activeSeconds: (session.activeSeconds ?? 0) + seconds };
  progress.activitySessions = progress.activitySessions.map((item, itemIndex) => itemIndex === index ? updated : item);
  temporaryProgress.set(learnerId, progress);
  await saveLocalMap('progress.json', temporaryProgress);
  return { status: 'ok', activeSeconds: updated.activeSeconds };
}

export async function endActivitySession(learnerId, sessionId, now) {
  if (LearnerProgress.db.readyState === 1) {
    const result = await LearnerProgress.updateOne(
      { learnerId, 'activitySessions.sessionId': sessionId, 'activitySessions.endedAt': null },
      { $set: { 'activitySessions.$[active].endedAt': now } },
      { arrayFilters: [{ 'active.sessionId': sessionId, 'active.endedAt': null }] },
    );
    if (result.modifiedCount) return 'ok';
    const exists = await LearnerProgress.exists({ learnerId, 'activitySessions.sessionId': sessionId });
    return exists ? 'ended' : 'missing';
  }
  await ensureTemporaryProgress();
  const progress = await getProgress(learnerId);
  let found = false;
  progress.activitySessions = (progress.activitySessions ?? []).map(session => {
    if (session.sessionId !== sessionId) return session;
    found = true;
    return session.endedAt ? session : { ...session, endedAt: now };
  });
  if (!found) return 'missing';
  temporaryProgress.set(learnerId, progress);
  await saveLocalMap('progress.json', temporaryProgress);
  return 'ok';
}

export async function pruneExpiredProgress(cutoff) {
  const prune = progress => {
    const attempts = (progress.attempts ?? []).filter(item => new Date(item.at).getTime() >= cutoff.getTime());
    const completed = [...new Set(attempts.filter(item => item.correct).map(item => item.challengeId))];
    const thresholds = [{ name: 'Rookie', threshold: 0 }, { name: 'Scout', threshold: 1 }, { name: 'Analyst', threshold: 5 }, { name: 'Specialist', threshold: 10 }, { name: 'Sentinel', threshold: 15 }, { name: 'Pathfinder', threshold: 20 }];
    const currentRank = thresholds.reduce((rank, item) => completed.length >= item.threshold ? item.name : rank, 'Rookie');
    return {
      ...progress,
      attempts,
      completed,
      completedPaths: completedLearningPaths(completed),
      assessments: (progress.assessments ?? []).filter(item => new Date(item.at).getTime() >= cutoff.getTime()),
      progression: (progress.progression ?? []).filter(item => new Date(item.at).getTime() >= cutoff.getTime()),
      activitySessions: (progress.activitySessions ?? []).filter(item => new Date(item.startedAt).getTime() >= cutoff.getTime()),
      achievements: (progress.achievements ?? []).filter(item => new Date(item.earnedAt).getTime() >= cutoff.getTime()),
      rankHistory: (progress.rankHistory ?? []).filter(item => new Date(item.reachedAt).getTime() >= cutoff.getTime()),
      currentRank,
      researchFeedback: progress.researchFeedback && new Date(progress.researchFeedback.at).getTime() >= cutoff.getTime() ? progress.researchFeedback : null,
    };
  };
  if (LearnerProgress.db.readyState === 1) {
    const records = await LearnerProgress.find({}).lean();
    const operations = records.map(record => {
      const updated = prune(record);
      return { updateOne: { filter: { _id: record._id }, update: { $set: {
        attempts: updated.attempts, completed: updated.completed, completedPaths: updated.completedPaths,
        currentRank: updated.currentRank, assessments: updated.assessments, progression: updated.progression,
        activitySessions: updated.activitySessions, achievements: updated.achievements, rankHistory: updated.rankHistory,
        researchFeedback: updated.researchFeedback,
      } } } };
    });
    if (operations.length) await LearnerProgress.bulkWrite(operations);
    return records.length;
  }
  await ensureTemporaryProgress();
  for (const [id, progress] of temporaryProgress) temporaryProgress.set(id, prune(progress));
  await saveLocalMap('progress.json', temporaryProgress);
  return temporaryProgress.size;
}

export async function listProgress() {
  if (LearnerProgress.db.readyState === 1) {
    return LearnerProgress.find({}, { learnerId: 0 }).lean();
  }
  await ensureTemporaryProgress();
  return [...temporaryProgress.values()];
}

export async function listProgressForAccounts(accountIds) {
  if (!accountIds.length) return [];
  if (LearnerProgress.db.readyState === 1) {
    return LearnerProgress.find({ learnerId: { $in: accountIds } }).lean();
  }
  await ensureTemporaryProgress();
  const allowed = new Set(accountIds);
  return [...temporaryProgress.entries()].filter(([id]) => allowed.has(id)).map(([id, progress]) => ({ ...progress, learnerId: id }));
}

export async function deleteProgress(learnerId) {
  if (LearnerProgress.db.readyState === 1) {
    await LearnerProgress.deleteOne({ learnerId });
    return;
  }
  await ensureTemporaryProgress();
  temporaryProgress.delete(learnerId);
  await saveLocalMap('progress.json', temporaryProgress);
}
