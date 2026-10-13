import test from 'node:test';
import assert from 'node:assert/strict';
import { learningPaths, completedLearningPaths, learningPathProgress } from '../src/content/learningPaths.js';
import { recommendNextActivity } from '../src/services/adaptiveEngine.js';
import { challenges } from '../src/content/challenges.js';

test('learning paths refer to existing challenges and unlock after prerequisites', () => {
  const knownIds = new Set(challenges.map(challenge => challenge.id));
  assert.ok(learningPaths.every(path => path.modules.every(module => module.challengeIds.every(id => knownIds.has(id)))));
  const foundation = learningPaths[0];
  const firstModuleChallenges = foundation.modules[0].challengeIds;
  assert.equal(learningPathProgress(foundation, firstModuleChallenges).rate, 33);
  const allChallenges = foundation.modules.flatMap(module => module.challengeIds);
  assert.deepEqual(completedLearningPaths(allChallenges), [foundation.id]);
});

test('adaptive recommendations move along an unlocked path after a correct attempt', () => {
  const foundation = learningPaths[0];
  const pathChallengeIds = foundation.modules.flatMap(module => module.challengeIds);
  const current = challenges.find(challenge => challenge.id === pathChallengeIds[0]);
  const next = recommendNextActivity({ attempts: [{ challengeId: current.id, topic: current.topic, correct: true }], completed: [current.id], completedPaths: [] }, challenges, learningPaths);
  assert.equal(next.challengeId, pathChallengeIds[1]);
  assert.equal(next.rule, 'progress_after_success');
});
