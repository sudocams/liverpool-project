import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { getAssessment, isAssessmentAnswerValid, scoreAssessment } from './content/assessments.js';
import { getProgress, saveProgress, deleteProgress, listProgressForAccounts } from './services/progressStore.js';
import { recommendNextActivity } from './services/adaptiveEngine.js';
import { generateChallengeFeedback } from './services/feedbackService.js';
import { authenticateUser, clearResearchConsent, createUser, getUserById, hasAdminAccount, listResearchConsentedParticipants, setResearchConsent, validatePassword } from './services/authService.js';
import { attachSession, clearSessionCookie, createSession, makeSessionCookie, requireAuth, requireRole, requireStudyConsent } from './services/sessionService.js';
import { createModule, deleteModule, getModule, listModules, seedModules, updateModule, validateModule } from './services/moduleStore.js';

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const studyInfoVersion = process.env.STUDY_INFO_VERSION || 'draft-1';

function publicChallenge(challenge) {
  const { answerIndex, ...publicContent } = challenge;
  return publicContent;
}

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(attachSession);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', storage: mongoose.connection.readyState === 1 ? 'mongodb' : 'memory' });
});

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const { password } = req.body ?? {};
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    const account = await createUser(password, 'learner');
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account)));
    return res.status(201).json({ handle: account.handle, role: account.role, message: 'Save this sign-in handle. It cannot be recovered because no contact details are collected.' });
  } catch (error) { return next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const { handle, password } = req.body ?? {};
    const account = await authenticateUser(handle, password);
    if (!account) return res.status(401).json({ error: 'The sign-in handle or password is incorrect.' });
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account)));
    return res.json({ handle: account.handle, role: account.role });
  } catch (error) { return next(error); }
});

app.post('/api/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(204).end();
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ handle: req.account.handle, role: req.account.role, researchConsent: req.account.researchConsent ?? { version: null, acceptedAt: null }, studyInfoVersion }));

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
    const { setupKey, password } = req.body ?? {};
    if (!configuredKey) return res.status(404).json({ error: 'Admin setup is not enabled on this server.' });
    if (await hasAdminAccount()) return res.status(409).json({ error: 'An admin account already exists.' });
    if (typeof setupKey !== 'string' || setupKey !== configuredKey) return res.status(403).json({ error: 'Invalid admin setup key.' });
    if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password between 12 and 128 characters.' });
    const account = await createUser(password, 'admin');
    res.setHeader('Set-Cookie', makeSessionCookie(createSession(account)));
    return res.status(201).json({ handle: account.handle, role: account.role, message: 'Save this admin sign-in handle securely.' });
  } catch (error) { return next(error); }
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

app.get('/api/progress', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    return res.json(await getProgress(req.account.accountId));
  } catch (error) { return next(error); }
});

app.get('/api/recommendations', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const [progress, modules] = await Promise.all([getProgress(req.account.accountId), listModules()]);
    return res.json(recommendNextActivity(progress, modules));
  } catch (error) { return next(error); }
});

app.get('/api/assessments/:phase', (req, res) => {
  const questions = getAssessment(req.params.phase);
  if (!questions) return res.status(404).json({ error: 'Assessment phase must be pre or post.' });
  return res.json({ phase: req.params.phase, questions });
});

app.post('/api/assessments', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const { phase, answers } = req.body ?? {};
    if (!isAssessmentAnswerValid(phase, answers)) return res.status(400).json({ error: 'Submit one valid answer for every assessment question.' });
    const result = scoreAssessment(phase, answers);
    const current = await getProgress(req.account.accountId);
    const record = {
      phase,
      score: result.score,
      total: result.total,
      answers: result.results.map(({ questionId, topic, correct }) => ({ questionId, topic, correct })),
      at: new Date().toISOString(),
    };
    const progress = { ...current, assessments: [...(current.assessments ?? []), record] };
    await saveProgress(req.account.accountId, progress);
    return res.status(201).json({ ...result, phase, at: record.at, progress });
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
      const record = progressByAccount.get(participant.id) ?? { attempts: [], assessments: [], researchFeedback: null };
      const startsAt = participantDates.get(participant.id);
      const afterConsent = item => new Date(item.at).getTime() >= startsAt;
      const attempts = (record.attempts ?? []).filter(afterConsent);
      return {
        attempts,
        assessments: (record.assessments ?? []).filter(afterConsent),
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
    const reportable = participants.length >= 5;
    const toPercent = item => item ? item.score / item.total * 100 : null;
    return res.json({
      learnersWithPre: reportable ? pairs.filter(pair => pair.pre).length : null,
      learnersWithPost: reportable ? pairs.filter(pair => pair.post).length : null,
      matchedPairs: reportable ? matched.length : null,
      meanPrePercent: reportable ? mean(matched.map(pair => toPercent(pair.pre))) : null,
      meanPostPercent: reportable ? mean(matched.map(pair => toPercent(pair.post))) : null,
      meanChangePoints: reportable ? mean(matched.map(pair => toPercent(pair.post) - toPercent(pair.pre))) : null,
      meanModulesCompleted: reportable ? mean(pairs.map(pair => pair.completed)) : null,
      feedbackResponseCount: reportable ? learners.filter(learner => learner.researchFeedback).length : null,
      feedbackMeanRatings: Object.fromEntries(['usability', 'engagement', 'learningValue', 'adaptationRelevance', 'feedbackClarity'].map(field => {
        const values = learners.map(learner => learner.researchFeedback?.[field]).filter(Number.isInteger);
        return [field, reportable && values.length >= 5 ? mean(values) : null];
      })),
      note: 'Only opted-in learner records are included. Aggregate means are hidden until at least five participants have consented; feedback means also require five responses. Consent text remains a draft until approved for the study.',
    });
  } catch (error) { return next(error); }
});

app.delete('/api/progress', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    await deleteProgress(req.account.accountId);
    return res.status(204).end();
  } catch (error) { return next(error); }
});

app.post('/api/attempts', requireAuth, requireStudyConsent, async (req, res, next) => {
  try {
    const { challengeId, selectedOption, hintsUsed = 0 } = req.body ?? {};
    if (typeof challengeId !== 'string') return res.status(400).json({ error: 'A challengeId is required.' });
    if (!Number.isInteger(selectedOption)) return res.status(400).json({ error: 'selectedOption must be an integer.' });
    if (!Number.isInteger(hintsUsed) || hintsUsed < 0) return res.status(400).json({ error: 'hintsUsed must be a non-negative integer.' });
    const challenge = await getModule(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
    if (selectedOption < 0 || selectedOption >= challenge.options.length) return res.status(400).json({ error: 'selectedOption is out of range.' });
    if (hintsUsed > (challenge.hints?.length ?? 0)) return res.status(400).json({ error: 'hintsUsed is out of range.' });

    const correct = selectedOption === challenge.answerIndex;
    const points = correct ? Math.max(40, 100 - hintsUsed * 20) : 10;
    const attempt = { challengeId, topic: challenge.topic, correct, points, hintsUsed, at: new Date().toISOString() };
    const current = await getProgress(req.account.accountId);
    const progress = {
      attempts: [...current.attempts, attempt],
      completed: correct && !current.completed.includes(challengeId) ? [...current.completed, challengeId] : current.completed,
      assessments: current.assessments ?? [],
      researchFeedback: current.researchFeedback ?? null,
    };
    await saveProgress(req.account.accountId, progress);
    const feedback = await generateChallengeFeedback({ challenge, selectedOption, correct });
    const modules = await listModules();
    return res.status(201).json({ attempt, feedback, progress, recommendation: recommendNextActivity(progress, modules) });
  } catch (error) { return next(error); }
});

app.post('/api/practice/answer', requireAuth, async (req, res, next) => {
  try {
    const { challengeId, selectedOption } = req.body ?? {};
    if (typeof challengeId !== 'string' || !Number.isInteger(selectedOption)) return res.status(400).json({ error: 'Select an answer for a valid challenge.' });
    const challenge = await getModule(challengeId);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });
    if (selectedOption < 0 || selectedOption >= challenge.options.length) return res.status(400).json({ error: 'selectedOption is out of range.' });
    const correct = selectedOption === challenge.answerIndex;
    return res.json({ correct, points: correct ? 100 : 10, feedback: { text: challenge.explanation, source: 'guided' } });
  } catch (error) { return next(error); }
});

app.get('/api/admin/modules', requireRole('admin'), async (_req, res, next) => {
  try { return res.json(await listModules()); }
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

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => seedModules().then(() => console.log('Connected to MongoDB and loaded learning modules.')))
    .catch(error => console.error('MongoDB connection failed; using temporary in-memory progress.', error.message));
}

app.listen(port, () => console.log(`CyberWolf API listening on http://localhost:${port}`));
