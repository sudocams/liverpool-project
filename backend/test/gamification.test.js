import test from 'node:test';
import assert from 'node:assert/strict';
import { updateGamification } from '../src/services/gamification.js';
import { challenges } from '../src/content/challenges.js';

test('gamification persists rank changes and only newly earned badges', () => {
  const at = new Date('2026-01-01T00:00:00Z');
  const progress = {
    attempts: [{ challengeId: 'phishing', correct: true, hintsUsed: 0, points: 100, topic: 'Phishing', at }],
    completed: ['phishing'], achievements: [], rankHistory: [], currentRank: 'Rookie',
  };
  const updated = updateGamification(progress, challenges, at, 0);
  assert.equal(updated.currentRank, 'Scout');
  assert.equal(updated.rankHistory.at(-1).rank, 'Scout');
  assert.ok(updated.achievements.some(item => item.id === 'first-clear'));
  assert.ok(updated.achievements.some(item => item.id === 'no-hints'));
});
