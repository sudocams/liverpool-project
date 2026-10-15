import 'dotenv/config';
import { randomInt, randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { getAssessment, isAssessmentAnswerValid, scoreAssessment } from './content/assessments.js';
import { getScenarioRemediation } from './content/remediation.js';
import { getProgress, saveProgress, deleteProgress, listProgressForAccounts, pruneExpiredProgress, startActivitySession, heartbeatActivitySession, endActivitySession } from './services/progressStore.js';
import { recommendNextActivity } from './services/adaptiveEngine.js';
import { learningPaths, pathChallengeIds, completedLearningPaths, learningPathProgress } from './content/learningPaths.js';
import { updateGamification } from './services/gamification.js';
import { generateChallengeFeedback } from './services/feedbackService.js';
import { adminResetLearnerPassword, authenticateAdmin, authenticateUser, clearResearchConsent, createUser, getUserById, hasAdminAccount, listLearnersForAdmin, listResearchConsentedParticipants, renameLearnerCode, requestLearnerPasswordReset, setLearnerPassword, setResearchConsent, validateAdminUsername, validatePassword } from './services/authService.js';
import { attachSession, clearSessionCookie, createSession, makeSessionCookie, requireAuth, requireRole, requireStudyConsent } from './services/sessionService.js';
import { createModule, deleteModule, getModule, listModules, seedModules, updateModule, validateModule } from './services/moduleStore.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const studyInfoVersion = process.env.STUDY_INFO_VERSION || 'draft-5';
const assessmentMaxAttempts = Math.max(1, Number.parseInt(process.env.ASSESSMENT_MAX_ATTEMPTS || '3', 10) || 3);
const retentionDelayDays = Math.max(14, Number.parseInt(process.env.RETENTION_TEST_DELAY_DAYS || '21', 10) || 21);
const dataRetentionDays = Math.max(0, Number.parseInt(process.env.DATA_RETENTION_DAYS || '0', 10) || 0);

function publicChallenge(challenge) {
  const { answerIndex, ...publicContent } = challenge;
  const publicRemediation = Object.fromEntries(Object.entries(getScenarioRemediation(challenge)).filter(([key]) => key !== 'answerIndex'));
  const options = [...(challenge.options ?? [])];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [options[index], options[swap]] = [options[swap], options[index]];
  }
  return { ...publicContent, options, remediation: publicRemediation };
}

function durationSeconds(value) {
  return Number.isInteger(value) && value >= 0 ? Math.min(value, 7200) : 0;
}

function hasCompletedAssessment(progress, phase) {
  return (progress.assessments ?? []).some(assessment => assessment.phase === phase);
}

function scenarioCompletionTime(progress, modules) {
  const firstClearTimes = modules.map(module => (progress.attempts ?? [])
    .filter(attempt => attempt.challengeId === module.id && attempt.correct)
    .map(attempt => new Date(attempt.at).getTime())
    .filter(Number.isFinite)
    .sort((first, second) => first - second)[0]);
  if (!modules.length || firstClearTimes.some(time => time === undefined)) return null;
  return Math.max(...firstClearTimes);
}

function postTestCompletedAfterScenarios(progress, modules) {
  const allScenariosCompletedAt = scenarioCompletionTime(progress, modules);
  return allScenariosCompletedAt !== null && (progress.assessments ?? []).some(assessment => assessment.phase === 'post' && new Date(assessment.at).getTime() >= allScenariosCompletedAt);
}

async function learnerChallengeGateError(progress) {
  if (!hasCompletedAssessment(progress, 'pre')) return 'Complete the pre-test before attempting any learning scenarios.';
  const modules = await listModules();
  if (modules.length && modules.every(module => progress.completed.includes(module.id)) && !postTestCompletedAfterScenarios(progress, modules)) {
    return 'You have completed every scenario. Complete the post-test to finish the learning path.';
  }
  return null;
}

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(attachSession);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'local-file' });
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { password } = req.body ?? {};
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    const account = await createUser(password, 'learner');
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account), account.role));
    return res.status(201).json({ handle: account.handle, role: account.role, message: 'Save this learner code and the password you chose; no contact details are collected for account recovery.' });
  } catch (error) { return next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { handle, password } = req.body ?? {};
    const account = await authenticateUser(handle, password);
    if (!account || account.role !== 'learner') return res.status(401).json({ error: 'The learner code or password is incorrect.' });
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account), account.role));
    return res.json({ handle: account.handle, role: account.role });
  } catch (error) { return next(error); }
});

app.post('/api/auth/forgot-password', async (req, res, next) => {
  try {
    const { handle } = req.body ?? {};
    if (typeof handle !== 'string' || handle.length > 40) return res.status(400).json({ error: 'Enter your learner code.' });
    await requestLearnerPasswordReset(handle);
    return res.status(202).json({ message: 'If that learner code exists, a password reset request has been sent to the admin.' });
  } catch (error) { return next(error); }
});

app.post('/api/auth/learner-password', requireAuth, async (req, res, next) => {
  try {
    if (req.account.role !== 'learner') return res.status(403).json({ error: 'This option is for learner accounts.' });
    const { password, passwordConfirm } = req.body ?? {};
    if (password !== passwordConfirm) return res.status(400).json({ error: 'The passwords do not match.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    if (!await setLearnerPassword(req.account.accountId, password)) return res.status(404).json({ error: 'Learner account not found.' });
    return res.json({ credentialsConfigured: true });
  } catch (error) { return next(error); }
});

app.post('/api/auth/admin-login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};
    if (!validateAdminUsername(username)) return res.status(400).json({ error: 'Enter a valid admin username.' });
    const account = await authenticateAdmin(username, password);
    if (!account) return res.status(401).json({ error: 'The admin username or password is incorrect.' });
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account), account.role));
    return res.json({ handle: account.handle, username: account.username, role: account.role });
  } catch (error) {
    if (error.message.includes('already uses that admin username')) return res.status(409).json({ error: error.message });
    return next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(204).end();
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ handle: req.account.handle, username: req.account.username ?? null, role: req.account.role, credentialsConfigured: req.account.credentialsConfigured === true, mustChangePassword: req.account.mustChangePassword === true, researchConsent: req.account.researchConsent ?? { version: null, acceptedAt: null }, studyInfoVersion, dataRetentionDays }));

app.get('/api/admin/learners', requireRole('admin'), async (_req, res, next) => {
  try { return res.json(await listLearnersForAdmin()); }
  catch (error) { return next(error); }
});

app.patch('/api/admin/learners/:learnerId/code', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await renameLearnerCode(req.params.learnerId, req.body?.handle);
    if (!result) return res.status(404).json({ error: 'Learner account not found.' });
    return res.json(result);
  } catch (error) {
    if (error.message.toLowerCase().includes('learner code') || error.message.includes('already in use')) return res.status(409).json({ error: error.message });
    return next(error);
  }
});

app.post('/api/admin/learners/:learnerId/password-reset', requireRole('admin'), async (req, res, next) => {
  try {
    const result = await adminResetLearnerPassword(req.params.learnerId);
    if (!result) return res.status(409).json({ error: 'There is no pending reset request for this learner.' });
    return res.json({ ...result, message: 'Give this temporary password to the learner privately. They must choose a new password at their next sign-in.' });
  } catch (error) { return next(error); }
});

app.post('/api/research/consent', requireAuth, async (req, res, next) => {
  try {
    if (req.account.role !== 'learner') return res.status(403).json({ error: 'Research consent is for learner accounts.' });
    if (req.body?.accept !== true || req.body?.version !== studyInfoVersion) return res.status(400).json({ error: 'Review the current study information and explicitly accept it to participate.' });
    const consent = await setResearchConsent(req.account.accountId, studyInfoVersion);
    return res.json({ researchConsent: consent });
  } catch (error) { return next(error); }
});

app.delete('/api/research/consent', requireAuth, async (req, res, next) => {
  try {
    if (req.account.role !== 'learner') return res.status(403).json({ error: 'Research withdrawal is for learner accounts.' });
    await deleteProgress(req.account.accountId);
    await clearResearchConsent(req.account.accountId);
    return res.json({ message: 'Research participation has ended and saved study records were deleted.' });
  } catch (error) { return next(error); }
});

app.post('/api/auth/bootstrap-admin', async (req, res, next) => {
  try {
    const configuredKey = process.env.ADMIN_BOOTSTRAP_KEY;
    const { setupKey, username, password } = req.body ?? {};
    if (!configuredKey) return res.status(404).json({ error: 'Admin setup is not enabled on this server.' });
    if (await hasAdminAccount()) return res.status(409).json({ error: 'An admin account already exists.' });
    if (typeof setupKey !== 'string' || setupKey !== configuredKey) return res.status(403).json({ error: 'Invalid admin setup key.' });
    if (!validateAdminUsername(username)) return res.status(400).json({ error: 'Admin username must be 3–32 letters, numbers, dots, underscores, or hyphens.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    const account = await createUser(password, 'admin', username);
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account), account.role));
    return res.status(201).json({ handle: account.handle, username: account.username, role: account.role });
  } catch (error) {
    if (error.message.includes('already uses that admin username')) return res.status(409).json({ error: error.message });
    return next(error);
  }
});

app.get('/api/challenges', async (_req, res, next) => {
  try { return res.json((await listModules()).map(publicChallenge)); }
  catch (error) { return next(error); }
});

app.get('/api/challenges/:challengeId', async (req, res, next) => {
  try {
  const challenge = await getModule(req.params.challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
  return res.json(publicChallenge(challenge));
  } catch (error) { return next(error); }
});

app.get('/api/learning-paths', async (_req, res, next) => {
  try {
    const modules = await listModules();
    return res.json(learningPaths.map(path => {
      const pathModules = path.modules.map(module => ({
        ...module,
        challenges: module.challengeIds.map(id => modules.find(item => item.id === id)).filter(Boolean).map(item => ({ id: item.id, title: item.title, topic: item.topic })),
      }));
      return { ...path, modules: pathModules, challengeIds: pathChallengeIds(path), challenges: pathModules.flatMap(module => module.challenges) };
    }));
  } catch (error) { return next(error); }
});

app.get('/api/progress', requireAuth, async (req, res, next) => {
  try {
    return res.json(await getProgress(req.account.accountId));
  } catch (error) { return next(error); }
});

app.get('/api/recommendations', requireAuth, async (req, res, next) => {
  try {
    const [progress, modules] = await Promise.all([getProgress(req.account.accountId), listModules()]);
    progress.completedPaths = completedLearningPaths(progress.completed);
    return res.json(recommendNextActivity(progress, modules));
  } catch (error) { return next(error); }
});

app.get('/api/assessments/:phase', requireAuth, async (req, res, next) => {
  try {
  if (!['pre', 'post', 'retention', 'transfer'].includes(req.params.phase)) return res.status(404).json({ error: 'Unknown assessment phase.' });
  const phase = req.params.phase;
  const progress = await getProgress(req.account.accountId);
  const latestPost = (progress.assessments ?? []).filter(item => item.phase === 'post').sort((a, b) => new Date(b.at) - new Date(a.at))[0];
  if (phase === 'post') {
    const modules = await listModules();
    if (!hasCompletedAssessment(progress, 'pre') || modules.some(module => !progress.completed.includes(module.id))) return res.status(409).json({ error: 'Complete the pre-test and every learning scenario before taking the post-test.' });
  }
  if (phase === 'transfer' && !latestPost) return res.status(409).json({ error: 'Complete the post-test before the transfer assessment.' });
  if (phase === 'retention') {
    if (!latestPost) return res.status(409).json({ error: 'Complete the post-test before the delayed retention assessment.' });
    const eligibleAt = new Date(new Date(latestPost.at).getTime() + retentionDelayDays * 86400000);
    if (Date.now() < eligibleAt.getTime()) return res.status(423).json({ error: 'The delayed retention assessment is not available yet.', eligibleAt: eligibleAt.toISOString(), delayDays: retentionDelayDays });
  }
  const questions = getAssessment(req.params.phase);
  if (!questions) return res.status(404).json({ error: 'Assessment phase must be pre or post.' });
  return res.json({ phase, questions, maxAttempts: assessmentMaxAttempts, delayDays: retentionDelayDays });
  } catch (error) { return next(error); }
});

app.post('/api/assessments', requireAuth, async (req, res, next) => {
  try {
    const { phase, answers } = req.body ?? {};
    if (!['pre', 'post', 'retention', 'transfer'].includes(phase)) return res.status(400).json({ error: 'Choose a valid assessment phase.' });
    if (!isAssessmentAnswerValid(phase, answers)) return res.status(400).json({ error: 'Submit one valid answer for each assessment topic.' });
    const result = scoreAssessment(phase, answers);
    const current = await getProgress(req.account.accountId);
    let postEligibilityTime = null;
    if (phase === 'post') {
      if (!hasCompletedAssessment(current, 'pre')) return res.status(409).json({ error: 'Complete the pre-test before the post-test.' });
      const modules = await listModules();
      if (modules.some(module => !current.completed.includes(module.id))) return res.status(409).json({ error: 'Complete all learning scenarios before taking the post-test.' });
      postEligibilityTime = scenarioCompletionTime(current, modules);
      if (postEligibilityTime === null) return res.status(409).json({ error: 'Finish each scenario successfully before taking the post-test.' });
    }
    const latestPost = (current.assessments ?? []).filter(item => item.phase === 'post').sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    if (phase === 'transfer' && !latestPost) return res.status(409).json({ error: 'Complete the post-test before the transfer assessment.' });
    if (phase === 'retention') {
      if (!latestPost) return res.status(409).json({ error: 'Complete the post-test before the delayed retention assessment.' });
      const eligibleAt = new Date(new Date(latestPost.at).getTime() + retentionDelayDays * 86400000);
      if (Date.now() < eligibleAt.getTime()) return res.status(423).json({ error: 'The delayed retention assessment is not available yet.', eligibleAt: eligibleAt.toISOString(), delayDays: retentionDelayDays });
    }
    const consentedAt = req.account.researchConsent?.acceptedAt ? new Date(req.account.researchConsent.acceptedAt).getTime() : 0;
    const phaseAttempts = (current.assessments ?? []).filter(item => item.phase === phase
      && (req.account.role === 'admin' || new Date(item.at).getTime() >= consentedAt)
      && (phase !== 'post' || new Date(item.at).getTime() >= postEligibilityTime)).length;
    if (phaseAttempts >= assessmentMaxAttempts) return res.status(409).json({ error: `You have reached the ${assessmentMaxAttempts}-attempt limit for the ${phase}-assessment.` });
    const record = {
      phase,
      score: result.score,
      total: result.total,
      durationSeconds: durationSeconds(req.body?.durationSeconds),
      answers: result.results.map(({ questionId, topic, correct }) => ({ questionId, topic, correct })),
      at: new Date().toISOString(),
    };
    const progress = { ...current, assessments: [...(current.assessments ?? []), record] };
    await saveProgress(req.account.accountId, progress);
    return res.status(201).json({ ...result, phase, at: record.at, progress });
  } catch (error) { return next(error); }
});

app.post('/api/activity/sessions/start', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const now = new Date();
    const activity = { sessionId: randomUUID(), startedAt: now, lastHeartbeatAt: now, endedAt: null, activeSeconds: 0 };
    await startActivitySession(req.account.accountId, activity);
    return res.status(201).json({ sessionId: activity.sessionId, startedAt: activity.startedAt });
  } catch (error) { return next(error); }
});

app.post('/api/activity/sessions/heartbeat', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const sessionId = req.body?.sessionId;
    if (typeof sessionId !== 'string') return res.status(400).json({ error: 'A sessionId is required.' });
    const result = await heartbeatActivitySession(req.account.accountId, sessionId, new Date());
    if (result.status === 'missing') return res.status(404).json({ error: 'Activity session not found.' });
    if (result.status === 'ended') return res.status(409).json({ error: 'Activity session has ended.' });
    if (result.status === 'stale') return res.status(409).json({ error: 'A newer activity heartbeat was already recorded.' });
    return res.json({ activeSeconds: result.activeSeconds });
  } catch (error) { return next(error); }
});

app.post('/api/activity/sessions/end', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const sessionId = req.body?.sessionId;
    if (typeof sessionId !== 'string') return res.status(400).json({ error: 'A sessionId is required.' });
    const result = await endActivitySession(req.account.accountId, sessionId, new Date());
    if (result === 'missing') return res.status(404).json({ error: 'Activity session not found.' });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/research/feedback', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    if (req.account.role !== 'learner') return res.status(403).json({ error: 'The participant questionnaire is for learner accounts.' });
    const fields = ['usability', 'engagement', 'learningValue', 'adaptationRelevance', 'feedbackClarity'];
    const response = req.body?.ratings;
    if (!response || fields.some(field => !Number.isInteger(response[field]) || response[field] < 1 || response[field] > 5)) {
      return res.status(400).json({ error: 'Rate every item from 1 (strongly disagree) to 5 (strongly agree).' });
    }
    const progress = await getProgress(req.account.accountId);
    const researchFeedback = { ...Object.fromEntries(fields.map(field => [field, response[field]])), at: new Date().toISOString() };
    await saveProgress(req.account.accountId, { ...progress, researchFeedback });
    return res.status(201).json({ researchFeedback });
  } catch (error) { return next(error); }
});

app.get('/api/research/summary', requireRole('admin'), async (_req, res, next) => {
  try {
    const participants = await listResearchConsentedParticipants();
    const participantDates = new Map(participants.map(item => [item.id, new Date(item.acceptedAt).getTime()]));
    const participantIds = participants.map(item => item.id);
    const storedProgress = await listProgressForAccounts(participantIds);
    const progressByAccount = new Map(storedProgress.map(record => [record.learnerId, record]));
    const learners = participants.map(participant => {
      const record = progressByAccount.get(participant.id) ?? { attempts: [], assessments: [], progression: [], activitySessions: [], achievements: [], rankHistory: [], researchFeedback: null };
      const startsAt = participantDates.get(participant.id);
      const afterConsent = item => new Date(item.at).getTime() >= startsAt;
      const attempts = (record.attempts ?? []).filter(afterConsent);
      return {
        attempts,
        assessments: (record.assessments ?? []).filter(afterConsent),
        progression: (record.progression ?? []).filter(afterConsent),
        activitySessions: (record.activitySessions ?? []).filter(session => new Date(session.startedAt).getTime() >= startsAt),
        achievements: (record.achievements ?? []).filter(item => new Date(item.earnedAt).getTime() >= startsAt),
        rankHistory: (record.rankHistory ?? []).filter(item => new Date(item.reachedAt).getTime() >= startsAt),
        currentRank: record.currentRank ?? 'Rookie',
        loginEvents: (participant.loginEvents ?? []).filter(at => new Date(at).getTime() >= startsAt),
        completed: [...new Set(attempts.filter(item => item.correct).map(item => item.challengeId))],
        researchFeedback: record.researchFeedback && afterConsent(record.researchFeedback) ? record.researchFeedback : null,
      };
    });
    const pairs = learners.map(learner => {
      const latestByPhase = {};
      for (const assessment of learner.assessments ?? []) {
        if (!latestByPhase[assessment.phase] || new Date(assessment.at) > new Date(latestByPhase[assessment.phase].at)) latestByPhase[assessment.phase] = assessment;
      }
      return { pre: latestByPhase.pre, post: latestByPhase.post, completed: learner.completed?.length ?? 0 };
    });
    const matched = pairs.filter(pair => pair.pre && pair.post);
    const mean = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
    const learnersWithTimedActivity = learners.filter(learner => (learner.activitySessions ?? []).length || learner.attempts.some(attempt => Number.isInteger(attempt.durationSeconds)) || learner.assessments.some(assessment => Number.isInteger(assessment.durationSeconds)));
    const toPercent = item => item ? item.score / item.total * 100 : null;
    const challengeCatalog = await listModules();
    const learningModuleCatalog = learningPaths.flatMap(path => path.modules.map(module => ({ ...module, pathId: path.id, pathTitle: path.title })));
    const groupedChallengeIds = new Set(learningModuleCatalog.flatMap(module => module.challengeIds));
    learningModuleCatalog.push(...challengeCatalog.filter(module => !groupedChallengeIds.has(module.id)).map(module => ({
      id: `standalone-${module.id}`, title: module.title, pathTitle: 'Standalone modules', challengeIds: [module.id],
    })));
    const learnerAnalytics = learners.map((learner, index) => {
      const participant = participants[index];
      const latestByPhase = {};
      for (const assessment of learner.assessments) {
        if (!latestByPhase[assessment.phase] || new Date(assessment.at) > new Date(latestByPhase[assessment.phase].at)) latestByPhase[assessment.phase] = assessment;
      }
      const completedIds = new Set(challengeCatalog.map(module => module.id).filter(id => learner.completed.includes(id)));
      const rank = [{ name: 'Rookie', threshold: 0 }, { name: 'Scout', threshold: 1 }, { name: 'Analyst', threshold: 5 }, { name: 'Specialist', threshold: 10 }, { name: 'Sentinel', threshold: 15 }, { name: 'Pathfinder', threshold: 20 }]
        .filter(item => completedIds.size >= item.threshold).at(-1)?.name ?? 'Rookie';
      const totalAttempts = learner.attempts.length;
      const correctAttempts = learner.attempts.filter(attempt => attempt.correct).length;
      const estimatedSubmissionSeconds = learner.attempts.reduce((sum, attempt) => sum + (attempt.durationSeconds ?? 0), 0)
        + learner.assessments.reduce((sum, assessment) => sum + (assessment.durationSeconds ?? 0), 0);
      const sessionSeconds = (learner.activitySessions ?? []).reduce((sum, session) => sum + (session.activeSeconds ?? 0), 0);
      const secondsLearning = learner.activitySessions?.length ? sessionSeconds : estimatedSubmissionSeconds;
      const sessionDurations = (learner.activitySessions ?? []).map(session => session.activeSeconds ?? 0);
      const loginEvents = (learner.loginEvents ?? []).map(at => new Date(at)).filter(date => Number.isFinite(date.getTime())).sort((a, b) => a - b);
      const recentLoginEvents = loginEvents.filter(date => Date.now() - date.getTime() <= 30 * 24 * 60 * 60 * 1000);
      const aiFeedbackCount = learner.attempts.filter(attempt => attempt.feedbackSource === 'ai').length;
      const guidedFeedbackCount = learner.attempts.filter(attempt => attempt.feedbackSource === 'guided').length;
      const feedbackTrackedCount = aiFeedbackCount + guidedFeedbackCount;
      const durationTrackedCount = learner.activitySessions?.length || (learner.attempts.filter(attempt => Number.isInteger(attempt.durationSeconds)).length
        + learner.assessments.filter(assessment => Number.isInteger(assessment.durationSeconds)).length);
      const progressionCounts = learner.progression.reduce((counts, event) => ({ ...counts, [event.rule]: (counts[event.rule] ?? 0) + 1 }), {});
      const percentCompleted = challengeCatalog.length ? Math.round(completedIds.size / challengeCatalog.length * 100) : 0;
      const topicAssessmentProgress = [...new Set(Object.values(latestByPhase).flatMap(assessment => assessment?.answers?.map(answer => answer.topic) ?? []))].map(topic => {
        const scores = Object.fromEntries(['pre', 'post', 'retention', 'transfer'].map(phase => {
          const answers = latestByPhase[phase]?.answers?.filter(answer => answer.topic === topic) ?? [];
          return [phase, answers.length ? Math.round(answers.filter(answer => answer.correct).length / answers.length * 100) : null];
        }));
        return { topic, ...scores, preCorrect: scores.pre === null ? null : scores.pre === 100, postCorrect: scores.post === null ? null : scores.post === 100, improvementPoints: scores.pre === null || scores.post === null ? null : scores.post - scores.pre };
      });
      const postTime = latestByPhase.post ? new Date(latestByPhase.post.at).getTime() : Infinity;
      const sessionsThroughPost = (learner.activitySessions ?? []).filter(session => new Date(session.startedAt).getTime() <= postTime);
      const timedSubmissionsThroughPost = learner.attempts.filter(attempt => new Date(attempt.at).getTime() <= postTime).reduce((sum, attempt) => sum + (attempt.durationSeconds ?? 0), 0)
        + learner.assessments.filter(assessment => ['pre', 'post'].includes(assessment.phase) && new Date(assessment.at).getTime() <= postTime).reduce((sum, assessment) => sum + (assessment.durationSeconds ?? 0), 0);
      const learningSecondsThroughPost = sessionsThroughPost.length
        ? sessionsThroughPost.reduce((sum, session) => sum + (session.activeSeconds ?? 0), 0)
        : timedSubmissionsThroughPost;
      const scoreGainPerHour = learningSecondsThroughPost > 0 && latestByPhase.pre && latestByPhase.post
        ? Math.round(((latestByPhase.post.score / latestByPhase.post.total - latestByPhase.pre.score / latestByPhase.pre.total) * 100) / (learningSecondsThroughPost / 3600) * 10) / 10
        : null;
      const weekKey = value => {
        const date = new Date(value);
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
        return date.toISOString().slice(0, 10);
      };
      const trendMap = new Map();
      const trendFor = key => {
        if (!trendMap.has(key)) trendMap.set(key, { weekStarting: key, attempts: 0, correct: 0, completions: 0, assessmentScores: [], activeSeconds: 0 });
        return trendMap.get(key);
      };
      const seenClears = new Set();
      for (const attempt of learner.attempts) {
        const point = trendFor(weekKey(attempt.at));
        point.attempts += 1; point.correct += Number(attempt.correct);
        if (attempt.correct && !seenClears.has(attempt.challengeId)) { point.completions += 1; seenClears.add(attempt.challengeId); }
      }
      for (const assessment of learner.assessments) trendFor(weekKey(assessment.at)).assessmentScores.push(assessment.score / assessment.total * 100);
      for (const session of learner.activitySessions ?? []) trendFor(weekKey(session.startedAt)).activeSeconds += session.activeSeconds ?? 0;
      const learningTrend = [...trendMap.values()].sort((a, b) => a.weekStarting.localeCompare(b.weekStarting)).map(point => ({
        weekStarting: point.weekStarting, attempts: point.attempts, accuracy: point.attempts ? Math.round(point.correct / point.attempts * 100) : null,
        challengeClears: point.completions, assessmentPercent: point.assessmentScores.length ? mean(point.assessmentScores) : null, activeSeconds: point.activeSeconds,
      }));
      const pathProgress = learningPaths.map(path => ({ id: path.id, title: path.title, ...learningPathProgress(path, [...completedIds]) }));
      return {
        handle: participant.handle,
        consentedAt: participant.acceptedAt,
        assessments: {
          pre: latestByPhase.pre ? { score: latestByPhase.pre.score, total: latestByPhase.pre.total, percent: Math.round(toPercent(latestByPhase.pre)), at: latestByPhase.pre.at } : null,
          post: latestByPhase.post ? { score: latestByPhase.post.score, total: latestByPhase.post.total, percent: Math.round(toPercent(latestByPhase.post)), at: latestByPhase.post.at } : null,
          retention: latestByPhase.retention ? { score: latestByPhase.retention.score, total: latestByPhase.retention.total, percent: Math.round(toPercent(latestByPhase.retention)), at: latestByPhase.retention.at } : null,
          transfer: latestByPhase.transfer ? { score: latestByPhase.transfer.score, total: latestByPhase.transfer.total, percent: Math.round(toPercent(latestByPhase.transfer)), at: latestByPhase.transfer.at } : null,
          improvementPoints: latestByPhase.pre && latestByPhase.post ? Math.round((toPercent(latestByPhase.post) - toPercent(latestByPhase.pre)) * 10) / 10 : null,
          scoreGainPerHour,
          topicProgress: topicAssessmentProgress,
        },
        challengeCompletion: { completed: completedIds.size, total: challengeCatalog.length, rate: percentCompleted },
        moduleCompletion: {
          completed: learningModuleCatalog.filter(module => module.challengeIds.every(id => completedIds.has(id))).length,
          total: learningModuleCatalog.length,
          rate: learningModuleCatalog.length ? Math.round(learningModuleCatalog.filter(module => module.challengeIds.every(id => completedIds.has(id))).length / learningModuleCatalog.length * 100) : 0,
        },
        activity: {
          attempts: totalAttempts, accuracy: totalAttempts ? Math.round(correctAttempts / totalAttempts * 100) : null,
          timeSpentSeconds: secondsLearning, timeTrackedActivities: durationTrackedCount, activeSessions: learner.activitySessions?.length ?? 0,
          sessionDurationSeconds: sessionSeconds, averageSessionSeconds: sessionDurations.length ? Math.round(sessionSeconds / sessionDurations.length) : null,
          loginFrequency: {
            total: loginEvents.length,
            activeDays: new Set(loginEvents.map(date => date.toISOString().slice(0, 10))).size,
            perWeek: Math.round(recentLoginEvents.length / 30 * 7 * 10) / 10,
            lastLoginAt: loginEvents.at(-1)?.toISOString() ?? null,
          },
        },
        gamification: {
          pointsEarned: learner.attempts.reduce((sum, attempt) => sum + (attempt.points ?? 0), 0),
          hintsUsed: learner.attempts.reduce((sum, attempt) => sum + (attempt.hintsUsed ?? 0), 0),
          achievementsEarned: learner.achievements.length,
          rankUps: learner.rankHistory.length,
          progressionDecisions: learner.progression.length,
        },
        aiFeedback: { used: aiFeedbackCount, guided: guidedFeedbackCount, untracked: totalAttempts - feedbackTrackedCount, trackedAttempts: feedbackTrackedCount, usageRate: feedbackTrackedCount ? Math.round(aiFeedbackCount / feedbackTrackedCount * 100) : null },
        adaptiveProgression: { decisions: learner.progression.length, rules: progressionCounts, history: learner.progression },
        learningPaths: pathProgress,
        learningTrend,
        achievements: learner.achievements ?? [],
        rank,
        rankHistory: learner.rankHistory,
        modules: learningModuleCatalog.map(module => {
          const moduleAttempts = learner.attempts.filter(attempt => module.challengeIds.includes(attempt.challengeId));
          const wins = moduleAttempts.filter(attempt => attempt.correct).length;
          const moduleChallenges = module.challengeIds.map(id => challengeCatalog.find(challenge => challenge.id === id)).filter(Boolean);
          return {
            id: module.id, title: module.title, pathTitle: module.pathTitle, completed: moduleChallenges.length > 0 && moduleChallenges.every(challenge => completedIds.has(challenge.id)),
            completionRate: moduleChallenges.length ? Math.round(moduleChallenges.filter(challenge => completedIds.has(challenge.id)).length / moduleChallenges.length * 100) : 0,
            challengeCount: moduleChallenges.length, attempts: moduleAttempts.length, accuracy: moduleAttempts.length ? Math.round(wins / moduleAttempts.length * 100) : null,
            timeSpentSeconds: moduleAttempts.reduce((sum, attempt) => sum + (attempt.durationSeconds ?? 0), 0),
            timeTrackedAttempts: moduleAttempts.filter(attempt => Number.isInteger(attempt.durationSeconds)).length,
            challenges: moduleChallenges.map(challenge => {
              const attempts = moduleAttempts.filter(attempt => attempt.challengeId === challenge.id);
              const correct = attempts.filter(attempt => attempt.correct).length;
              const timedAttempts = attempts.filter(attempt => Number.isInteger(attempt.durationSeconds));
              const timeSpentSeconds = timedAttempts.reduce((sum, attempt) => sum + attempt.durationSeconds, 0);
              return { id: challenge.id, title: challenge.title, completed: completedIds.has(challenge.id), completionRate: completedIds.has(challenge.id) ? 100 : 0, attempts: attempts.length, accuracy: attempts.length ? Math.round(correct / attempts.length * 100) : null, timeSpentSeconds, timeTrackedAttempts: timedAttempts.length, averageDurationSeconds: timedAttempts.length ? Math.round(timeSpentSeconds / timedAttempts.length) : null };
            }),
          };
        }),
        challenges: challengeCatalog.map(challenge => {
          const attempts = learner.attempts.filter(attempt => attempt.challengeId === challenge.id);
          const correct = attempts.filter(attempt => attempt.correct).length;
          const timedAttempts = attempts.filter(attempt => Number.isInteger(attempt.durationSeconds));
          const timeSpentSeconds = timedAttempts.reduce((sum, attempt) => sum + attempt.durationSeconds, 0);
          return { id: challenge.id, title: challenge.title, completed: completedIds.has(challenge.id), completionRate: completedIds.has(challenge.id) ? 100 : 0, attempts: attempts.length, accuracy: attempts.length ? Math.round(correct / attempts.length * 100) : null, timeSpentSeconds, timeTrackedAttempts: timedAttempts.length, averageDurationSeconds: timedAttempts.length ? Math.round(timeSpentSeconds / timedAttempts.length) : null };
        }),
      };
    });
    const strategyStats = new Map();
    for (const learner of learners) {
      for (const event of learner.progression ?? []) {
        const attempts = learner.attempts ?? [];
        const eventIndex = attempts.findIndex(attempt => new Date(attempt.at).getTime() === new Date(event.at).getTime());
        const immediateFollowup = eventIndex >= 0 ? attempts[eventIndex + 1] : null;
        const followup = immediateFollowup?.challengeId === event.recommendedChallengeId
          ? immediateFollowup
          : null;
        const stats = strategyStats.get(event.rule) ?? { rule: event.rule, decisions: 0, followups: 0, correctFollowups: 0 };
        stats.decisions += 1;
        if (followup) { stats.followups += 1; stats.correctFollowups += Number(followup.correct); }
        strategyStats.set(event.rule, stats);
      }
    }
    const topicGains = [...new Set(learnerAnalytics.flatMap(learner => learner.assessments.topicProgress.map(item => item.topic)))].map(topic => {
      const scoreAt = phase => learnerAnalytics.map(learner => learner.assessments.topicProgress.find(item => item.topic === topic)?.[phase]).filter(Number.isFinite);
      const pre = scoreAt('pre'); const post = scoreAt('post'); const retention = scoreAt('retention'); const transfer = scoreAt('transfer');
      return {
        topic, matchedLearners: Math.min(pre.length, post.length), meanPrePercent: mean(pre), meanPostPercent: mean(post), meanRetentionPercent: mean(retention), meanTransferPercent: mean(transfer),
        meanImprovementPoints: pre.length && post.length ? mean(learnerAnalytics.map(learner => { const item = learner.assessments.topicProgress.find(entry => entry.topic === topic); return item?.improvementPoints; }).filter(Number.isFinite)) : null,
      };
    });
    return res.json({
      consentedParticipantCount: participants.length,
      learnersWithPre: pairs.filter(pair => pair.pre).length,
      learnersWithPost: pairs.filter(pair => pair.post).length,
      matchedPairs: matched.length,
      meanPrePercent: mean(pairs.filter(pair => pair.pre).map(pair => toPercent(pair.pre))),
      meanPostPercent: mean(pairs.filter(pair => pair.post).map(pair => toPercent(pair.post))),
      meanChangePoints: mean(matched.map(pair => toPercent(pair.post) - toPercent(pair.pre))),
      learnersWithRetention: learners.filter(learner => learner.assessments.some(item => item.phase === 'retention')).length,
      meanRetentionPercent: mean(learnerAnalytics.map(learner => learner.assessments.retention?.percent).filter(Number.isFinite)),
      learnersWithTransfer: learners.filter(learner => learner.assessments.some(item => item.phase === 'transfer')).length,
      meanTransferPercent: mean(learnerAnalytics.map(learner => learner.assessments.transfer?.percent).filter(Number.isFinite)),
      meanScoreGainPerHour: mean(learnerAnalytics.map(learner => learner.assessments.scoreGainPerHour).filter(Number.isFinite)),
      meanModulesCompleted: mean(learnerAnalytics.map(learner => learner.moduleCompletion.completed)),
      meanModuleCompletionRate: mean(learnerAnalytics.map(learner => learner.moduleCompletion.rate)),
      meanChallengeCompletionRate: mean(learnerAnalytics.map(learner => learner.challengeCompletion.rate)),
      meanActiveLearningMinutes: learnersWithTimedActivity.length ? mean(learnerAnalytics.filter(learner => learner.activity.timeTrackedActivities > 0).map(learner => learner.activity.timeSpentSeconds / 60)) : null,
      learnersWithTimedActivity: learnersWithTimedActivity.length,
      feedbackResponseCount: learners.filter(learner => learner.researchFeedback).length,
      feedbackMeanRatings: Object.fromEntries(['usability', 'engagement', 'learningValue', 'adaptationRelevance', 'feedbackClarity'].map(field => {
        const values = learners.map(learner => learner.researchFeedback?.[field]).filter(Number.isInteger);
        return [field, values.length ? mean(values) : null];
      })),
      learners: learnerAnalytics,
      recommendationStrategyComparison: [...strategyStats.values()].map(item => ({ ...item, followupSuccessRate: item.followups ? Math.round(item.correctFollowups / item.followups * 100) : null })),
      topicLearningGains: topicGains,
      moduleCount: learningModuleCatalog.length,
      challengeCount: challengeCatalog.length,
      note: 'Only opted-in learner records are included. Aggregate results use the current sample size; interpret small-sample averages as preliminary. Consent text remains a draft until approved for the study.',
    });
  } catch (error) { return next(error); }
});

app.delete('/api/progress', requireAuth, async (req, res, next) => {
  try {
    await deleteProgress(req.account.accountId);
    return res.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/admin/retention/prune', requireRole('admin'), async (_req, res, next) => {
  if (!dataRetentionDays) return res.status(409).json({ error: 'Data retention is disabled. Configure DATA_RETENTION_DAYS first.' });
  try {
    const cutoff = new Date(Date.now() - dataRetentionDays * 24 * 60 * 60 * 1000);
    const recordsProcessed = await pruneExpiredProgress(cutoff);
    return res.json({ recordsProcessed, cutoff, retentionDays: dataRetentionDays });
  } catch (error) { return next(error); }
});

app.get('/api/admin/retention', requireRole('admin'), (_req, res) => res.json({ enabled: dataRetentionDays > 0, retentionDays: dataRetentionDays }));

app.post('/api/attempts', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const { challengeId, selectedAnswer, hintsUsed = 0 } = req.body ?? {};
    if (typeof challengeId !== 'string') return res.status(400).json({ error: 'A challengeId is required.' });
    if (typeof selectedAnswer !== 'string') return res.status(400).json({ error: 'Select an answer.' });
    if (!Number.isInteger(hintsUsed) || hintsUsed < 0) return res.status(400).json({ error: 'hintsUsed must be a non-negative integer.' });
    const challenge = await getModule(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
    if (!challenge.options.includes(selectedAnswer)) return res.status(400).json({ error: 'The selected answer is not valid for this challenge.' });
    if (hintsUsed > (challenge.hints?.length ?? 0)) return res.status(400).json({ error: 'hintsUsed is out of range.' });

    const current = await getProgress(req.account.accountId);
    const gateError = await learnerChallengeGateError(current);
    if (gateError) return res.status(409).json({ error: gateError });
    const owningPath = learningPaths.find(path => path.modules.some(module => module.challengeIds.includes(challengeId)));
    const completedPathIds = new Set(completedLearningPaths(current.completed));
    if (owningPath && owningPath.prerequisites.some(id => !completedPathIds.has(id))) return res.status(409).json({ error: 'Complete the prerequisite learning path before starting this challenge.' });
    const owningModuleIndex = owningPath?.modules.findIndex(module => module.challengeIds.includes(challengeId)) ?? -1;
    if (owningModuleIndex > 0 && owningPath.modules.slice(0, owningModuleIndex).some(module => !module.challengeIds.every(id => current.completed.includes(id)))) return res.status(409).json({ error: 'Complete the earlier modules in this learning path before starting this challenge.' });
    const owningModule = owningPath?.modules[owningModuleIndex];
    const scenarioIndex = owningModule?.challengeIds.indexOf(challengeId) ?? -1;
    if (!current.completed.includes(challengeId) && scenarioIndex > 0 && owningModule.challengeIds.slice(0, scenarioIndex).some(id => !current.completed.includes(id))) return res.status(409).json({ error: 'Complete the earlier scenarios in this module before starting this one.' });
    const correct = selectedAnswer === challenge.options[challenge.answerIndex];
    const firstClear = correct && !current.completed.includes(challengeId);
    const points = correct
      ? firstClear ? Math.max(40, 100 - hintsUsed * 20) : Math.max(10, 25 - hintsUsed * 5)
      : 5;
    const duration = durationSeconds(req.body?.durationSeconds);
    const modules = await listModules();
    const feedback = await generateChallengeFeedback({ challenge, selectedAnswer, correct });
    const attempt = { challengeId, topic: challenge.topic, correct, points, hintsUsed, durationSeconds: duration, feedbackSource: feedback.source, at: new Date().toISOString() };
    const previousCompletedCount = current.completed.length;
    let progress = {
      ...current,
      attempts: [...current.attempts, attempt],
      completed: correct && !current.completed.includes(challengeId) ? [...current.completed, challengeId] : current.completed,
    };
    progress.completedPaths = completedLearningPaths(progress.completed);
    const recommendation = recommendNextActivity(progress, modules, learningPaths);
    progress.progression = [...progress.progression, { rule: recommendation.rule, reason: recommendation.reason, recommendedChallengeId: recommendation.challengeId, at: attempt.at }];
    progress = updateGamification(progress, modules, new Date(attempt.at), previousCompletedCount);
    await saveProgress(req.account.accountId, progress);
    return res.status(201).json({ attempt, feedback, progress, recommendation });
  } catch (error) { return next(error); }
});

app.post('/api/practice/answer', requireAuth, async (req, res, next) => {
  try {
    const { challengeId, selectedAnswer, hintsUsed = 0 } = req.body ?? {};
    if (typeof challengeId !== 'string' || typeof selectedAnswer !== 'string') return res.status(400).json({ error: 'Select an answer for a valid challenge.' });
    if (!Number.isInteger(hintsUsed) || hintsUsed < 0) return res.status(400).json({ error: 'hintsUsed must be a non-negative integer.' });
    const challenge = await getModule(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
    if (!challenge.options.includes(selectedAnswer)) return res.status(400).json({ error: 'The selected answer is not valid for this challenge.' });
    if (hintsUsed > (challenge.hints?.length ?? 0)) return res.status(400).json({ error: 'hintsUsed is out of range.' });
    const current = await getProgress(req.account.accountId);
    const gateError = await learnerChallengeGateError(current);
    if (gateError) return res.status(409).json({ error: gateError });
    const owningPath = learningPaths.find(path => path.modules.some(module => module.challengeIds.includes(challengeId)));
    const completedPathIds = new Set(completedLearningPaths(current.completed));
    if (owningPath && owningPath.prerequisites.some(id => !completedPathIds.has(id))) return res.status(409).json({ error: 'Complete the prerequisite learning path before starting this challenge.' });
    const owningModuleIndex = owningPath?.modules.findIndex(module => module.challengeIds.includes(challengeId)) ?? -1;
    if (owningModuleIndex > 0 && owningPath.modules.slice(0, owningModuleIndex).some(module => !module.challengeIds.every(id => current.completed.includes(id)))) return res.status(409).json({ error: 'Complete the earlier modules in this learning path before starting this challenge.' });
    const owningModule = owningPath?.modules[owningModuleIndex];
    const scenarioIndex = owningModule?.challengeIds.indexOf(challengeId) ?? -1;
    if (!current.completed.includes(challengeId) && scenarioIndex > 0 && owningModule.challengeIds.slice(0, scenarioIndex).some(id => !current.completed.includes(id))) return res.status(409).json({ error: 'Complete the earlier scenarios in this module before starting this one.' });
    const correct = selectedAnswer === challenge.options[challenge.answerIndex];
    const firstClear = correct && !current.completed.includes(challengeId);
    const points = correct ? firstClear ? Math.max(40, 100 - hintsUsed * 20) : Math.max(10, 25 - hintsUsed * 5) : 5;
    const modules = await listModules();
    const attempt = { challengeId, topic: challenge.topic, correct, points, hintsUsed, durationSeconds: null, feedbackSource: 'guided', at: new Date().toISOString() };
    const previousCompletedCount = current.completed.length;
    let progress = { ...current, attempts: [...current.attempts, attempt], completed: correct && !current.completed.includes(challengeId) ? [...current.completed, challengeId] : current.completed };
    progress.completedPaths = completedLearningPaths(progress.completed);
    const recommendation = recommendNextActivity(progress, modules, learningPaths);
    progress.progression = [...progress.progression, { rule: recommendation.rule, reason: recommendation.reason, recommendedChallengeId: recommendation.challengeId, at: attempt.at }];
    progress = updateGamification(progress, modules, new Date(attempt.at), previousCompletedCount);
    await saveProgress(req.account.accountId, progress);
    return res.json({ correct, points, feedback: { text: challenge.explanation, source: 'guided' }, progress, recommendation });
  } catch (error) { return next(error); }
});

app.post('/api/challenges/:challengeId/remediation-answer', requireAuth, async (req, res, next) => {
  try {
    const { challengeId } = req.params;
    const { selectedAnswer } = req.body ?? {};
    if (typeof selectedAnswer !== 'string') return res.status(400).json({ error: 'Select an answer for the follow-up question.' });
    const challenge = await getModule(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
    const remediation = getScenarioRemediation(challenge);
    if (!remediation.options.includes(selectedAnswer)) return res.status(400).json({ error: 'The selected follow-up answer is not valid.' });

    const current = await getProgress(req.account.accountId);
    const gateError = await learnerChallengeGateError(current);
    if (gateError) return res.status(409).json({ error: gateError });
    if (current.completed.includes(challengeId)) return res.status(409).json({ error: 'This scenario has already been completed.' });
    if (!(current.attempts ?? []).some(attempt => attempt.challengeId === challengeId && !attempt.correct)) return res.status(409).json({ error: 'Answer the scenario question incorrectly before its learning follow-up.' });
    const owningPath = learningPaths.find(path => path.modules.some(module => module.challengeIds.includes(challengeId)));
    const completedPathIds = new Set(completedLearningPaths(current.completed));
    if (owningPath?.prerequisites.some(id => !completedPathIds.has(id))) return res.status(409).json({ error: 'Complete the prerequisite learning path before starting this challenge.' });
    const owningModuleIndex = owningPath?.modules.findIndex(module => module.challengeIds.includes(challengeId)) ?? -1;
    if (owningModuleIndex > 0 && owningPath.modules.slice(0, owningModuleIndex).some(module => !module.challengeIds.every(id => current.completed.includes(id)))) return res.status(409).json({ error: 'Complete the earlier modules in this learning path before starting this challenge.' });
    const owningModule = owningPath?.modules[owningModuleIndex];
    const scenarioIndex = owningModule?.challengeIds.indexOf(challengeId) ?? -1;
    if (scenarioIndex > 0 && owningModule.challengeIds.slice(0, scenarioIndex).some(id => !current.completed.includes(id))) return res.status(409).json({ error: 'Complete the earlier scenarios in this module before starting this one.' });

    const correct = selectedAnswer === remediation.options[remediation.answerIndex];
    const points = correct ? 60 : 0;
    const attempt = { challengeId, topic: challenge.topic, correct, points, hintsUsed: 0, durationSeconds: durationSeconds(req.body?.durationSeconds), feedbackSource: 'guided', at: new Date().toISOString() };
    const previousCompletedCount = current.completed.length;
    let progress = {
      ...current,
      attempts: [...(current.attempts ?? []), attempt],
      completed: correct ? [...current.completed, challengeId] : current.completed,
    };
    progress.completedPaths = completedLearningPaths(progress.completed);
    const modules = await listModules();
    const recommendation = recommendNextActivity(progress, modules, learningPaths);
    progress.progression = [...(progress.progression ?? []), { rule: recommendation.rule, reason: recommendation.reason, recommendedChallengeId: recommendation.challengeId, at: attempt.at }];
    progress = updateGamification(progress, modules, new Date(attempt.at), previousCompletedCount);
    await saveProgress(req.account.accountId, progress);
    return res.json({
      correct, points, attempt, progress, recommendation,
      feedback: { text: correct ? remediation.explanation : `Review the lesson card and try again. ${remediation.explanation}`, source: 'guided' },
    });
  } catch (error) { return next(error); }
});

app.get('/api/admin/modules', requireRole('admin'), async (_req, res, next) => {
  try { return res.json((await listModules()).map(module => ({ ...module, pathProtected: learningPaths.some(path => path.modules.some(group => group.challengeIds.includes(module.id))) }))); }
  catch (error) { return next(error); }
});

app.post('/api/admin/modules', requireRole('admin'), async (req, res, next) => {
  try {
    const validationError = validateModule(req.body);
    if (validationError) return res.status(400).json({ error: validationError });
    return res.status(201).json(await createModule(req.body));
  } catch (error) {
    if (error.message.includes('already exists') || error.code === 11000) return res.status(409).json({ error: 'A module with that id already exists.' });
    return next(error);
  }
});

app.put('/api/admin/modules/:moduleId', requireRole('admin'), async (req, res, next) => {
  try {
    const module = { ...req.body, id: req.params.moduleId };
    const validationError = validateModule(module);
    if (validationError) return res.status(400).json({ error: validationError });
    const updated = await updateModule(req.params.moduleId, module);
    if (!updated) return res.status(404).json({ error: 'Module not found.' });
    return res.json(updated);
  } catch (error) { return next(error); }
});

app.delete('/api/admin/modules/:moduleId', requireRole('admin'), async (req, res, next) => {
  try {
    if (learningPaths.some(path => path.modules.some(module => module.challengeIds.includes(req.params.moduleId)))) return res.status(409).json({ error: 'This challenge is part of a guided learning path and cannot be deleted. You can edit its content instead.' });
    if ((await listModules()).length <= 1) return res.status(409).json({ error: 'At least one learning module must remain.' });
    const removed = await deleteModule(req.params.moduleId);
    if (!removed) return res.status(404).json({ error: 'Module not found.' });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong while processing the request.' });
});

function scheduleDataRetention() {
  if (!dataRetentionDays) return;
  const prune = () => pruneExpiredProgress(new Date(Date.now() - dataRetentionDays * 24 * 60 * 60 * 1000))
    .then(records => console.log(`Data-retention cleanup processed ${records} learner records.`))
    .catch(error => console.error('Data-retention cleanup failed:', error.message));
  prune();
  setInterval(prune, 24 * 60 * 60 * 1000).unref();
}

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => seedModules().then(() => { console.log('Connected to MongoDB and loaded learning modules.'); scheduleDataRetention(); }))
    .catch(error => { console.error('MongoDB connection failed; using temporary in-memory progress.', error.message); scheduleDataRetention(); });
} else scheduleDataRetention();

app.listen(port, () => console.log(`CyberWolf API listening on http://localhost:${port}`));
