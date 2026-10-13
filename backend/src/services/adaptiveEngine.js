import { challenges } from '../content/challenges.js';

function challengeRecommendation(challenge, rule, reason, message) {
  if (!challenge) return { challengeId: null, topic: null, title: null, rule, reason, message };
  return { challengeId: challenge.id, topic: challenge.topic, title: challenge.title, rule, reason, message };
}

export function recommendNextActivity(progress, modules = challenges) {
  const attempts = progress.attempts ?? [];
  const completed = progress.completed ?? [];
  const lastAttempt = attempts.at(-1);

  if (!lastAttempt) {
    const first = modules.find(challenge => !completed.includes(challenge.id)) ?? modules[0];
    return challengeRecommendation(first, 'start', 'There are no recorded attempts yet.', 'Start with this foundation challenge.');
  }

  if (!lastAttempt.correct) {
    const review = modules.find(challenge => challenge.id === lastAttempt.challengeId);
    return challengeRecommendation(review, 'review_recent_error', `Your latest answer in ${lastAttempt.topic} was incorrect.`, `Review ${lastAttempt.topic.toLowerCase()} before moving on.`);
  }

  const next = modules.find(challenge => !completed.includes(challenge.id));
  if (next) {
    return challengeRecommendation(next, 'progress_after_success', `Your latest answer was correct and ${next.topic} is not completed yet.`, `Good call. Continue with ${next.topic.toLowerCase()}.`);
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
  return challengeRecommendation(review, 'review_weakest_topic', `${weakest?.[0] ?? review.topic} has your lowest recorded accuracy (${accuracy}%).`, `You’ve completed every challenge. Revisit ${review.topic.toLowerCase()} to strengthen your least confident area.`);
}
