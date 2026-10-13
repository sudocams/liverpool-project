import { challenges } from '../content/challenges.js';
import { learningPaths } from '../content/learningPaths.js';

const difficultyOrder = { foundational: 0, intermediate: 1, advanced: 2 };

function expectedSeconds(challenge) {
  const minutes = Number.parseFloat(String(challenge?.duration ?? '').match(/[\d.]+/)?.[0]);
  return Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : null;
}

function challengeRecommendation(challenge, rule, reason, message) {
  if (!challenge) return { challengeId: null, topic: null, title: null, difficulty: null, estimatedDurationSeconds: null, rule, reason, message };
  return {
    challengeId: challenge.id,
    topic: challenge.topic,
    title: challenge.title,
    difficulty: challenge.difficulty ?? 'intermediate',
    estimatedDurationSeconds: expectedSeconds(challenge),
    rule,
    reason,
    message,
  };
}

function firstIncompleteModule(completed, paths) {
  const completedPaths = new Set(paths.filter(path => path.modules.every(module => module.challengeIds.every(id => completed.includes(id)))).map(path => path.id));
  for (const path of paths) {
    if (!path.prerequisites.every(id => completedPaths.has(id))) continue;
    const module = path.modules.find(item => !item.challengeIds.every(id => completed.includes(id)));
    if (module) return module;
  }
  return null;
}

function topicHistory(attempts, topic) {
  return attempts.filter(attempt => attempt.topic === topic);
}

function chooseByDifficulty(candidates, preference) {
  if (!candidates.length) return null;
  return [...candidates].sort((left, right) => {
    const difference = (difficultyOrder[left.difficulty] ?? 1) - (difficultyOrder[right.difficulty] ?? 1);
    return (preference === 'harder' ? -difference : difference);
  })[0];
}

export function recommendNextActivity(progress, modules = challenges, paths = learningPaths) {
  const attempts = progress.attempts ?? [];
  const completed = progress.completed ?? [];
  const lastAttempt = attempts.at(-1);
  const activeModule = firstIncompleteModule(completed, paths);
  const activeCandidates = (activeModule?.challengeIds ?? [])
    .filter(id => !completed.includes(id))
    .map(id => modules.find(challenge => challenge.id === id))
    .filter(Boolean);

  if (!lastAttempt) {
    const first = activeCandidates[0] ?? modules.find(challenge => !completed.includes(challenge.id)) ?? modules[0];
    return challengeRecommendation(first, 'start', 'No challenge attempts are recorded yet. The first activity follows the foundation path order.', 'Start with this foundation challenge.');
  }

  const lastChallenge = modules.find(challenge => challenge.id === lastAttempt.challengeId);
  const expected = expectedSeconds(lastChallenge);
  const tookLongerThanExpected = expected !== null && Number.isFinite(lastAttempt.durationSeconds) && lastAttempt.durationSeconds > expected * 1.5;
  const history = topicHistory(attempts, lastAttempt.topic);
  const topicAccuracy = history.length ? history.filter(attempt => attempt.correct).length / history.length : 0;
  const struggling = (history.length >= 2 && topicAccuracy < 0.6) || (!lastAttempt.correct && tookLongerThanExpected);
  const demonstratedMastery = history.length >= 3 && topicAccuracy >= 0.8 && lastAttempt.correct && !tookLongerThanExpected;

  if (!lastAttempt.correct) {
    const easierActivity = struggling ? chooseByDifficulty(activeCandidates, 'easier') : null;
    if (easierActivity && easierActivity.id !== lastAttempt.challengeId && difficultyOrder[easierActivity.difficulty] < difficultyOrder[lastChallenge?.difficulty ?? 'intermediate']) {
      const timeNote = tookLongerThanExpected ? ` The response took longer than the estimated ${Math.round(expected / 60)} minutes.` : '';
      return challengeRecommendation(easierActivity, 'scaffold_after_struggle', `Recent ${lastAttempt.topic} results show difficulty${timeNote} A lower-difficulty activity is available in the current module.`, `Let’s work through a more foundational activity, then return to this topic.`);
    }
    const effortReason = tookLongerThanExpected ? ` Your response took longer than the estimated ${Math.round(expected / 60)} minutes, so take time to review the key steps.` : '';
    return challengeRecommendation(lastChallenge, 'review_recent_error', `Your latest answer in ${lastAttempt.topic} was incorrect.${effortReason}`, `Review ${lastAttempt.topic.toLowerCase()} before moving on.`);
  }

  if (activeCandidates.length) {
    if (demonstratedMastery) {
      const harder = chooseByDifficulty(activeCandidates, 'harder');
      if (harder && (difficultyOrder[harder.difficulty] ?? 1) > (difficultyOrder[lastChallenge?.difficulty] ?? 1)) {
        return challengeRecommendation(harder, 'increase_challenge', `You have answered ${history.filter(attempt => attempt.correct).length} of ${history.length} ${lastAttempt.topic} attempts correctly, and your latest response was within the expected time. This module has a higher-difficulty activity available.`, `You’re showing strong understanding. Try this more challenging activity.`);
      }
    }
    if (tookLongerThanExpected && history.length >= 2 && topicAccuracy < 0.6) {
      const easier = chooseByDifficulty(activeCandidates, 'easier');
      return challengeRecommendation(easier, 'adjust_for_time', `Your recent ${lastAttempt.topic} accuracy is ${Math.round(topicAccuracy * 100)}%, and your latest response took longer than the estimated ${Math.round(expected / 60)} minutes. The next activity stays at the lowest available difficulty while you build confidence.`, `Take the next step at a foundational pace.`);
    }
    const next = activeCandidates[0];
    return challengeRecommendation(next, 'progress_after_success', `Your latest answer was correct. Continue with the next incomplete activity in the current module (${next.difficulty ?? 'intermediate'} difficulty).`, `Good call. Continue with ${next.topic.toLowerCase()}.`);
  }

  const topicResults = new Map();
  for (const attempt of attempts) {
    const current = topicResults.get(attempt.topic) ?? { correct: 0, total: 0, latestAt: 0 };
    current.correct += Number(attempt.correct);
    current.total += 1;
    current.latestAt = Math.max(current.latestAt, new Date(attempt.at).getTime() || 0);
    topicResults.set(attempt.topic, current);
  }
  const weakest = [...topicResults.entries()].sort((a, b) => {
    const accuracyDifference = a[1].correct / a[1].total - b[1].correct / b[1].total;
    return accuracyDifference || b[1].latestAt - a[1].latestAt;
  })[0];
  const review = modules.find(challenge => challenge.topic === weakest?.[0]) ?? modules[0];
  const accuracy = Math.round((weakest?.[1].correct ?? 0) / (weakest?.[1].total ?? 1) * 100);
  return challengeRecommendation(review, 'review_weakest_topic', `${weakest?.[0] ?? review.topic} has your lowest recorded accuracy (${accuracy}%).`, `You’ve completed every guided path. Revisit ${review.topic.toLowerCase()} to strengthen your least confident area.`);
}
