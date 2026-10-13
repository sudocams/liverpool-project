import { useEffect, useState } from 'react';

export default function EvaluationPanel() {
  const [phase, setPhase] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refreshData() {
    const progressResponse = await fetch('/api/progress');
    if (!progressResponse.ok) throw new Error('Could not load evaluation data.');
    const progress = await progressResponse.json();
    setAssessments(progress.assessments ?? []);
  }

  useEffect(() => {
    refreshData().catch(loadError => setError(loadError.message));
  }, []);

  async function beginAssessment(nextPhase) {
    setError('');
    setResult(null);
    setAnswers({});
    setPhase(nextPhase);
    try {
      const response = await fetch(`/api/assessments/${nextPhase}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load questions.');
      setQuestions(data.questions);
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
          answers: questions.map(question => ({ questionId: question.id, selectedOption: answers[question.id] })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit assessment.');
      setResult(data);
      await refreshData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  const latest = Object.fromEntries(['pre', 'post'].map(itemPhase => [
    itemPhase,
    assessments.filter(item => item.phase === itemPhase).sort((a, b) => new Date(b.at) - new Date(a.at))[0],
  ]));

  return (
    <section className="evaluation-view">
      <div className="section-heading evaluation-heading"><div><div className="eyebrow">RESEARCH EVALUATION</div><h2>Knowledge check</h2></div><span className="module-count">PRE / POST ASSESSMENT</span></div>
      <p className="evaluation-intro">Complete a short knowledge check before training and another after training. The questions cover the same topics but use different scenarios.</p>
      {error && <div className="api-error" role="alert">{error}</div>}

      <div className="assessment-scores">
        {['pre', 'post'].map(itemPhase => <article className="assessment-score" key={itemPhase}><span>{itemPhase === 'pre' ? 'PRE-ASSESSMENT' : 'POST-ASSESSMENT'}</span><strong>{latest[itemPhase] ? `${latest[itemPhase].score}/${latest[itemPhase].total}` : 'Not completed'}</strong><button className="secondary-button" type="button" onClick={() => beginAssessment(itemPhase)}>{latest[itemPhase] ? 'Retake' : 'Begin'}</button></article>)}
      </div>

      {phase && !result && <form className="assessment-form" onSubmit={submitAssessment}>
        <div className="assessment-form-heading"><div><span className="topic-tag">{phase === 'pre' ? 'BEFORE TRAINING' : 'AFTER TRAINING'}</span><h3>{phase === 'pre' ? 'Pre-assessment' : 'Post-assessment'}</h3></div><span className="difficulty">{questions.length} QUESTIONS</span></div>
        {questions.map((question, index) => <fieldset className="assessment-question" key={question.id}>
          <legend><span className="question-number">{String(index + 1).padStart(2, '0')}</span><span>{question.prompt}</span></legend>
          {question.options.map((option, optionIndex) => <label className={`assessment-option${answers[question.id] === optionIndex ? ' selected' : ''}`} key={option}><input type="radio" name={question.id} value={optionIndex} checked={answers[question.id] === optionIndex} onChange={() => setAnswers(current => ({ ...current, [question.id]: optionIndex }))} /><span>{option}</span></label>)}
        </fieldset>)}
        <div className="assessment-submit-row"><span className="hint">{Object.keys(answers).length} of {questions.length} answered</span><button className="primary-button" type="submit" disabled={busy || Object.keys(answers).length !== questions.length}>{busy ? 'Submitting…' : 'Submit assessment →'}</button></div>
      </form>}

      {result && <div className="assessment-result" role="status"><div className="result-score"><span>{phase === 'pre' ? 'PRE-ASSESSMENT RESULT' : 'POST-ASSESSMENT RESULT'}</span><strong>{result.score}<small> / {result.total}</small></strong><p>{Math.round(result.score / result.total * 100)}% correct</p></div><div className="result-explanations"><h3>Answer review</h3>{result.results.map((answer, index) => <div className="answer-review" key={answer.questionId}><span className={answer.correct ? 'review-correct' : 'review-incorrect'}>{answer.correct ? '✓' : '↻'}</span><p><b>{index + 1}. {answer.topic}</b><small>{answer.explanation}</small></p></div>)}<button className="secondary-button" type="button" onClick={() => { setPhase(null); setResult(null); }}>Back to evaluation</button></div></div>}

    </section>
  );
}
