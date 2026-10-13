import test from 'node:test';
import assert from 'node:assert/strict';
import { getAssessment, isAssessmentAnswerValid, scoreAssessment } from '../src/content/assessments.js';

test('assessment forms randomize five topic-balanced questions and their answer order', () => {
  for (const phase of ['pre', 'post']) {
    const questions = getAssessment(phase);
    assert.equal(questions.length, 5);
    assert.equal(new Set(questions.map(question => question.topic)).size, 5);
    assert.ok(questions.every(question => question.options.length === 4 && !('correctIndex' in question)));
    const answers = questions.map(question => ({ questionId: question.id, selectedOption: question.options[0] }));
    assert.equal(isAssessmentAnswerValid(phase, answers), true);
    assert.equal(scoreAssessment(phase, answers).total, 5);
  }
});

test('assessment validation rejects missing topics and unknown answer text', () => {
  const questions = getAssessment('pre');
  const answers = questions.map(question => ({ questionId: question.id, selectedOption: question.options[0] }));
  assert.equal(isAssessmentAnswerValid('pre', answers.slice(1)), false);
  answers[0].selectedOption = 'not a valid answer';
  assert.equal(isAssessmentAnswerValid('pre', answers), false);
});
