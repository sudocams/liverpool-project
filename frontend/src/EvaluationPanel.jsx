import { useEffect, useRef, useState } from 'react';

export default function EvaluationPanel({ participant = true, consentedAt = null, requiredPhase = null, postUnlocked = false, postEligibleAt = null, onProgressUpdated = () => {} }) {
  const [phase, setPhase] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [ratings, setRatings] = useState({ usability: 0, engagement: 0, learningValue: 0, adaptationRelevance: 0, feedbackClarity: 0 });
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const assessmentStartedAt = useRef(null);
  const autoStartedPhase = useRef(null);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [retentionSchedule, setRetentionSchedule] = useState({ delayDays: 21, eligibleAt: null, available: false });

  async function refreshData() {
    const progressResponse = await fetch('/api/progress');
    if (!progressResponse.ok) throw new Error('Could not load evaluation data.');
    const progress = await progressResponse.json();
    setAssessments(progress.assessments ?? []);
    await refreshRetentionSchedule();
    setFeedback(progress.researchFeedback ?? null);
    if (progress.researchFeedback) setRatings(Object.fromEntries(Object.keys(ratings).map(key => [key, progress.researchFeedback[key] ?? 0])));
    setDataLoaded(true);
  }

  async function refreshRetentionSchedule() {
    const retentionResponse = await fetch('/api/assessments/retention');
    const retentionData = await retentionResponse.json();
    setRetentionSchedule({ delayDays: retentionData.delayDays ?? 21, eligibleAt: retentionData.eligibleAt ?? null, available: retentionResponse.ok });
  }

  useEffect(() => {
    refreshData().catch(loadError => { setError(loadError.message); setDataLoaded(true); });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => refreshRetentionSchedule().catch(() => {}), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!requiredPhase) {
      autoStartedPhase.current = null;
      return;
    }
    if (dataLoaded && !phase && !result && autoStartedPhase.current !== requiredPhase) {
      autoStartedPhase.current = requiredPhase;
      beginAssessment(requiredPhase);
    }
  }, [requiredPhase, dataLoaded, phase, result]);

  async function beginAssessment(nextPhase) {
    if (requiredPhase && nextPhase !== requiredPhase) {
      setError(requiredPhase === 'pre' ? 'Complete the pre-test before opening any learning scenarios.' : 'Complete every learning scenario before taking the post-test.');
      return;
    }
    if (nextPhase === 'post' && !postUnlocked) {
      setError('The post-test unlocks after every learning scenario is complete.');
      return;
    }
    const usedAttempts = assessments.filter(item => item.phase === nextPhase && (!participant || !consentedAt || new Date(item.at) >= new Date(consentedAt))).length;
    if (usedAttempts >= maxAttempts) {
      setError(`You have reached the ${maxAttempts}-attempt limit for this assessment.`);
      return;
    }
    setError('');
    setResult(null);
    setAnswers({});
    setPhase(nextPhase);
    assessmentStartedAt.current = Date.now();
    try {
      const response = await fetch(`/api/assessments/${nextPhase}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load questions.');
      setQuestions(data.questions);
      setMaxAttempts(data.maxAttempts ?? 3);
    } catch (loadError) {
      setPhase(null);
      setError(loadError.message);
    }
  }

  async function submitAssessment(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          durationSeconds: Math.min(7200, Math.max(0, Math.round((Date.now() - assessmentStartedAt.current) / 1000))),
          answers: questions.map(question => ({ questionId: question.id, selectedOption: answers[question.id] })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit assessment.');
      setResult(data);
      if (data.progress) onProgressUpdated(data.progress);
      await refreshData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/research/feedback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit the questionnaire.');
      setFeedback(data.researchFeedback);
      setFeedbackSaved(true);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  const eligibleAssessments = assessments.filter(item => !participant || !consentedAt || new Date(item.at) >= new Date(consentedAt));
  const phases = ['pre', 'post', 'transfer', 'retention'];
  const phaseNames = { pre: 'Pre-test', post: 'Post-test', transfer: 'Transfer test', retention: 'Delayed retention' };
  const latest = Object.fromEntries(phases.map(itemPhase => [
    itemPhase,
    eligibleAssessments.filter(item => item.phase === itemPhase && (itemPhase !== 'post' || (postUnlocked && (!postEligibleAt || new Date(item.at).getTime() >= postEligibleAt)))).sort((a, b) => new Date(b.at) - new Date(a.at))[0],
  ]));
  const retentionEligibleAt = latest.post ? new Date(new Date(latest.post.at).getTime() + retentionSchedule.delayDays * 86400000) : null;
  const topicProgress = [...new Set(phases.flatMap(itemPhase => latest[itemPhase]?.answers?.map(answer => answer.topic) ?? []))].map(topic => {
    const scores = Object.fromEntries(phases.map(itemPhase => {
      const answer = latest[itemPhase]?.answers?.find(item => item.topic === topic);
      return [itemPhase, answer ? answer.correct : null];
    }));
    return { topic, ...scores };
  });

  return (
    <section className="evaluation-view">
      <div className="section-heading evaluation-heading"><div><div className="eyebrow">RESEARCH EVALUATION</div><h2>Knowledge check</h2></div><span className="module-count">PRE / POST ASSESSMENT</span></div>
      <p className="evaluation-intro">Complete the pre-test, post-test, a transfer test with unfamiliar scenarios, and a delayed retention test scheduled three weeks after the post-test.</p>
      {error && <div className="api-error" role="alert">{error}</div>}
      {requiredPhase && <div className="assessment-required-notice" role="status"><strong>{requiredPhase === 'pre' ? 'Pre-test required before training' : 'Post-test required to finish'}</strong><span>{requiredPhase === 'pre' ? 'Complete every question below before you can start the challenges. This also applies to existing learners who have not taken the pre-test.' : 'All scenarios are complete. Submit the post-test to finish your learning campaign.'}</span></div>}

      <div className="assessment-scores">
        {phases.map(itemPhase => { const attempts = eligibleAssessments.filter(item => item.phase === itemPhase).length; const currentResult = latest[itemPhase]; const testDue = itemPhase === 'pre' || (itemPhase === 'post' && postUnlocked) || (itemPhase === 'transfer' && Boolean(latest.post)) || (itemPhase === 'retention' && retentionSchedule.available); const locked = Boolean(requiredPhase && requiredPhase !== itemPhase) || !testDue; const lockLabel = requiredPhase === 'pre' && itemPhase !== 'pre' ? 'Complete pre-test first' : itemPhase === 'post' && !postUnlocked ? 'Complete all scenarios first' : itemPhase === 'transfer' && !latest.post ? 'Complete post-test first' : itemPhase === 'retention' ? retentionEligibleAt ? `Available ${retentionEligibleAt.toLocaleDateString()}` : 'Complete post-test first' : 'Complete required test first'; return <article className={`assessment-score${locked ? ' assessment-locked' : ''}`} key={itemPhase}><span>{phaseNames[itemPhase].toUpperCase()}</span><strong>{currentResult ? `${currentResult.score}/${currentResult.total}` : itemPhase === 'retention' && locked ? 'Scheduled' : 'Not completed'}</strong><small>{attempts}/{maxAttempts} attempts used</small><button className="secondary-button" type="button" disabled={locked || attempts >= maxAttempts} onClick={() => beginAssessment(itemPhase)}>{locked ? lockLabel : attempts >= maxAttempts ? 'Limit reached' : currentResult ? 'Retake' : 'Begin'}</button></article>; })}
      </div>

      {phase && !result && <form className="assessment-form" onSubmit={submitAssessment}>
        <div className="assessment-form-heading"><div><span className="topic-tag">{phase === 'pre' ? 'BEFORE TRAINING' : phase === 'post' ? 'AFTER TRAINING' : phase === 'transfer' ? 'UNFAMILIAR SCENARIOS' : 'DELAYED FOLLOW-UP'}</span><h3>{phaseNames[phase]}</h3></div><span className="difficulty">{questions.length} QUESTIONS</span></div>
        {questions.map((question, index) => <fieldset className="assessment-question" key={question.id}>
          <legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span><span>{question.prompt}</span></legend>
          {question.options.map((option, optionIndex) => <label className={`assessment-option${answers[question.id] === option ? ' selected' : ''}`} key={`${question.id}-${optionIndex}`}><input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} /><span>{option}</span></label>)}
        </fieldset>)}
        <div className="assessment-submit-row"><span className="hint">{Object.keys(answers).length} of {questions.length} answered · one randomized question per topic</span><button className="primary-button" type="submit" disabled={busy || Object.keys(answers).length !== questions.length}>{busy ? 'Submitting…' : 'Submit assessment →'}</button></div>
      </form>}

      {topicProgress.length > 0 && <section className="assessment-topic-progress"><h3>Topic scores across assessments</h3><div className="topic-analysis-list">{topicProgress.map(topic => <div className="topic-analysis-row" key={topic.topic}><b>{topic.topic}</b>{phases.map(itemPhase => <span key={itemPhase}>{phaseNames[itemPhase]}: {topic[itemPhase] == null ? '—' : topic[itemPhase] ? 'correct' : 'missed'}</span>)}</div>)}</div></section>}

      {result && <div className="assessment-result" role="status"><div className="result-score"><span>{phaseNames[phase].toUpperCase()} RESULT</span><strong>{result.score}<small> / {result.total}</small></strong><p>{Math.round(result.score / result.total * 100)}% correct</p></div><div className="result-explanations"><h3>Answer review</h3>{result.results.map((answer, index) => <div className="answer-review" key={answer.questionId}><span className={answer.correct ? 'review-correct' : 'review-incorrect'}>{answer.correct ? '✓' : '↻'}</span><p><b>{index + 1}. {answer.topic}</b><small>{answer.explanation}</small></p></div>)}<button className="secondary-button" type="button" onClick={() => { setPhase(null); setResult(null); }}>Back to evaluation</button></div></div>}

      {participant && <form className="research-questionnaire" onSubmit={submitFeedback}>
        <div className="eyebrow">OPTIONAL PARTICIPANT QUESTIONNAIRE</div>
        <h3>{feedback ? 'Update your experience ratings' : 'How was your CyberWolf experience?'}</h3>
        <p>Rate each statement from 1 (strongly disagree) to 5 (strongly agree). You can update your answers later. No written comments or personal details are requested.</p>
        {[
          ['usability', 'The platform was easy to use.'],
          ['engagement', 'The challenges kept me engaged.'],
          ['learningValue', 'The activities helped me understand cybersecurity decisions.'],
          ['adaptationRelevance', 'The recommended next activities felt relevant to my progress.'],
          ['feedbackClarity', 'The answer feedback was clear and useful.'],
        ].map(([key, label]) => <fieldset className="rating-row" key={key}><legend>{label}</legend><div role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map(value => <label className={`rating-option${ratings[key] === value ? ' selected' : ''}`} key={value}><input type="radio" name={key} value={value} checked={ratings[key] === value} onChange={() => setRatings(current => ({ ...current, [key]: value }))} /><span>{value}</span></label>)}</div></fieldset>)}
        <div className="assessment-submit-row"><span className="hint">{feedbackSaved ? 'Your ratings were saved.' : feedback ? 'Your latest saved ratings are loaded.' : 'Questionnaire is optional.'}</span><button className="primary-button" type="submit" disabled={busy || Object.values(ratings).some(value => !value)}>{busy ? 'Saving…' : feedback ? 'Update ratings →' : 'Submit ratings →'}</button></div>
      </form>}

    </section>
  );
}
