import { useEffect, useState } from 'react';

const pct = value => value == null ? '—' : `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
const signedPoints = value => value == null ? '—' : `${value > 0 ? '+' : ''}${Math.round(value * 10) / 10} pts`;
const retainedGain = (pre, post, retention) => Number.isFinite(pre) && Number.isFinite(post) && Number.isFinite(retention) && post > pre ? Math.round((retention - pre) / (post - pre) * 1000) / 10 : null;

export default function ResearchOutcomes() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [classroomCode, setClassroomCode] = useState('class-');
  const [classroomPhase, setClassroomPhase] = useState('pre');
  const [classroomDate, setClassroomDate] = useState(new Date().toISOString().slice(0, 10));
  const [classroomScores, setClassroomScores] = useState({});
  const [savingClassroom, setSavingClassroom] = useState(false);
  const [classroomMessage, setClassroomMessage] = useState('');
  const [instrumentQuestions, setInstrumentQuestions] = useState(null);
  const [instrumentLoading, setInstrumentLoading] = useState(false);
  const topics = ['Phishing', 'Account security', 'Social engineering', 'Malware & downloads', 'Public Wi-Fi'];

  async function loadOutcomes() {
    const [summaryResponse, recordsResponse] = await Promise.all([fetch('/api/research/summary'), fetch('/api/admin/classroom-comparison')]);
    const data = await summaryResponse.json();
    if (!summaryResponse.ok) throw new Error(data.error || 'Could not load research outcomes.');
    const records = await recordsResponse.json();
    if (!recordsResponse.ok) throw new Error(records.error || 'Could not load classroom comparison records.');
    setSummary(data);
    setClassroomRecords(records);
  }
  const [classroomRecords, setClassroomRecords] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadOutcomes().catch(loadError => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, []);

  async function saveClassroomResult(event) {
    event.preventDefault();
    setSavingClassroom(true); setClassroomMessage(''); setError('');
    try {
      const response = await fetch(`/api/admin/classroom-comparison/${encodeURIComponent(classroomCode)}/${classroomPhase}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: classroomDate, scores: Object.fromEntries(topics.map(topic => [topic, { correct: Number(classroomScores[topic]) }])) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save classroom results.');
      setClassroomMessage(`${classroomPhase} results saved for ${data.code}.`);
      await loadOutcomes();
    } catch (saveError) { setError(saveError.message); }
    finally { setSavingClassroom(false); }
  }

  async function loadInstrument() {
    setInstrumentLoading(true); setError('');
    try {
      const response = await fetch(`/api/admin/classroom-comparison/instrument/${classroomPhase}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the assessment form.');
      setInstrumentQuestions(data.questions);
    } catch (loadError) { setError(loadError.message); }
    finally { setInstrumentLoading(false); }
  }

  return <section className="admin-view research-outcomes-view">
    {error && <div className="api-error" role="alert">{error}</div>}
    <div className="section-heading"><div><div className="eyebrow">RESEARCH OUTCOMES</div><h2>Retention, transfer & efficiency</h2></div><span className="module-count">{summary?.consentedParticipantCount ?? 0} OPTED-IN LEARNERS</span></div>
    <p className="analytics-intro">Compare immediate learning gains with delayed recall, application to unfamiliar scenarios, and recorded learning time. Only opted-in participant records are included.</p>
    <div className="summary-grid">
      <article><span>Mean pre-test</span><strong>{pct(summary?.meanPrePercent)}</strong><small>Baseline knowledge</small></article>
      <article><span>Mean post-test</span><strong>{pct(summary?.meanPostPercent)}</strong><small>{summary?.matchedPairs ?? 0} matched pre/post learners</small></article>
      <article><span>Mean delayed retention</span><strong>{pct(summary?.meanRetentionPercent)}</strong><small>{summary?.learnersWithRetention ?? 0} completed · scheduled {summary?.retentionDelayDays ?? 21} days after post-test</small></article>
      <article><span>Retention change from post-test</span><strong>{summary?.meanPostToRetentionChangePoints == null ? '—' : `${summary.meanPostToRetentionChangePoints > 0 ? '+' : ''}${summary.meanPostToRetentionChangePoints} pts`}</strong><small>Delayed score minus immediate post-test</small></article>
      <article><span>Post-test gain retained</span><strong>{pct(summary?.meanRetainedLearningGainPercent)}</strong><small>For learners whose post-test improved over pre-test</small></article>
      <article><span>Mean transfer score</span><strong>{pct(summary?.meanTransferPercent)}</strong><small>{summary?.learnersWithTransfer ?? 0} completed on unfamiliar scenarios</small></article>
      <article><span>Mean pre/post improvement</span><strong>{summary?.meanChangePoints == null ? '—' : `${summary.meanChangePoints > 0 ? '+' : ''}${summary.meanChangePoints} pts`}</strong><small>Percentage-point change</small></article>
      <article><span>Learning efficiency</span><strong>{summary?.meanScoreGainPerHour == null ? '—' : `${summary.meanScoreGainPerHour > 0 ? '+' : ''}${summary.meanScoreGainPerHour} pts/hr`}</strong><small>Pre/post score gain per recorded learning hour</small></article>
    </div>

    <section className="outcomes-section"><div className="section-heading"><div><div className="eyebrow">TOPIC ANALYSIS</div><h3>Scores at each assessment stage</h3></div></div>
      {summary?.topicLearningGains?.length ? <div className="outcomes-table-wrap"><table className="outcomes-table"><thead><tr><th>Cybersecurity topic</th><th>App pre</th><th>App post</th><th>App retention</th><th>App post → retention</th><th>Class pre</th><th>Class post</th><th>Class retention</th><th>Class post → retention</th><th>App pre → post</th><th>App matched n</th><th>Class matched n</th></tr></thead><tbody>{summary.topicLearningGains.map(topic => { const classroom = summary.classroomComparison?.topicScores?.find(item => item.topic === topic.topic); return <tr key={topic.topic}><th scope="row">{topic.topic}</th><td>{pct(topic.meanPrePercent)}</td><td>{pct(topic.meanPostPercent)}</td><td>{pct(topic.meanRetentionPercent)}</td><td>{signedPoints(topic.meanRetentionPercent == null || topic.meanPostPercent == null ? null : topic.meanRetentionPercent - topic.meanPostPercent)}</td><td>{pct(classroom?.pre)}</td><td>{pct(classroom?.post)}</td><td>{pct(classroom?.retention)}</td><td>{signedPoints(classroom?.retention == null || classroom?.post == null ? null : classroom.retention - classroom.post)}</td><td>{signedPoints(topic.meanImprovementPoints)}</td><td>{topic.matchedLearners}</td><td>{classroom?.matchedPrePost ?? 0}</td></tr>; })}</tbody></table></div> : <p className="empty-analytics">Topic comparisons appear when learners complete assessments.</p>}
    </section>

    <section className="outcomes-section classroom-comparison-section"><div className="section-heading"><div><div className="eyebrow">CLASSROOM COMPARISON</div><h3>Traditional instruction results</h3></div><span className="module-count">{summary?.classroomComparison?.participantCount ?? 0} COMPARISON LEARNERS</span></div>
      <p className="analytics-intro">Enter scores collected from classroom learners using the same questions, topic coverage, and assessment schedule. Use a code such as class-001; do not enter names, contact information, or other identifying details. Collect and enter these results only under your approved study procedure.</p>
      <form className="classroom-comparison-form" onSubmit={saveClassroomResult}>
        <label>Pseudonymous code<input required pattern="class-[A-Za-z0-9-]{1,24}" value={classroomCode} onChange={event => { setClassroomCode(event.target.value); setClassroomScores({}); }} placeholder="class-001" /></label>
        <label>Assessment stage<select value={classroomPhase} onChange={event => { setClassroomPhase(event.target.value); setClassroomScores({}); setInstrumentQuestions(null); }}><option value="pre">Pre-test</option><option value="post">Post-test</option><option value="retention">Delayed retention</option><option value="transfer">Transfer</option></select></label>
        <label>Assessment date<input type="date" value={classroomDate} onChange={event => setClassroomDate(event.target.value)} required /></label>
        <div className="comparison-topic-inputs">{topics.map(topic => <label key={topic}>{topic}<span>Correct out of 3</span><select required value={classroomScores[topic] ?? ''} onChange={event => setClassroomScores(current => ({ ...current, [topic]: Number(event.target.value) }))}><option value="" disabled>Select score</option>{[0, 1, 2, 3].map(score => <option key={score} value={score}>{score} / 3</option>)}</select></label>)}</div>
        <div className="classroom-instrument-actions"><p>Use the matching CyberWolf question form and schedule for the classroom group.</p><button className="secondary-button" type="button" onClick={loadInstrument} disabled={instrumentLoading}>{instrumentLoading ? 'Loading…' : `View ${classroomPhase} question form`}</button>{instrumentQuestions && <button className="secondary-button" type="button" onClick={() => window.print()}>Print question form</button>}</div>
        <div className="assessment-submit-row"><span className="hint">Each classroom code can have one saved score per stage; saving again updates that stage.</span><button className="primary-button" type="submit" disabled={savingClassroom || topics.some(topic => classroomScores[topic] == null)}>{savingClassroom ? 'Saving…' : 'Save classroom results →'}</button></div>
        {classroomMessage && <p className="classroom-save-message" role="status">{classroomMessage}</p>}
      </form>
      {instrumentQuestions && <section className="classroom-instrument" aria-label="Classroom assessment question form"><div className="section-heading"><div><div className="eyebrow">CLASSROOM QUESTION FORM</div><h3>{classroomPhase.charAt(0).toUpperCase() + classroomPhase.slice(1)} · {instrumentQuestions.length} questions</h3></div><button className="secondary-button" type="button" onClick={() => setInstrumentQuestions(null)}>Close</button></div>{instrumentQuestions.map((question, index) => <article className="instrument-question" key={question.id}><strong>{index + 1}. {question.topic}</strong><p>{question.prompt}</p><ol type="A">{question.options.map(option => <li key={option}>{option}</li>)}</ol></article>)}</section>}
      <div className="summary-grid classroom-summary-grid">
        {['pre', 'post', 'retention', 'transfer'].map((phase, index) => { const names = ['Pre-test', 'Post-test', 'Delayed retention', 'Transfer']; return <article key={phase}><span>Class mean · {names[index]}</span><strong>{pct(summary?.classroomComparison?.phaseMeans?.[phase])}</strong><small>Scores available from comparison records</small></article>; })}
        <article><span>Class pre/post change</span><strong>{summary?.classroomComparison?.meanChangePoints == null ? '—' : `${summary.classroomComparison.meanChangePoints > 0 ? '+' : ''}${summary.classroomComparison.meanChangePoints} pts`}</strong><small>{summary?.classroomComparison?.matchedPrePost ?? 0} matched classroom codes</small></article>
        <article><span>Class post/retention change</span><strong>{summary?.classroomComparison?.meanPostToRetentionChangePoints == null ? '—' : `${summary.classroomComparison.meanPostToRetentionChangePoints > 0 ? '+' : ''}${summary.classroomComparison.meanPostToRetentionChangePoints} pts`}</strong><small>{summary?.classroomComparison?.matchedPostRetention ?? 0} matched classroom codes</small></article>
        <article><span>Class post-test gain retained</span><strong>{pct(summary?.classroomComparison?.meanRetainedLearningGainPercent)}</strong><small>Participants with post-test gains</small></article>
      </div>
      <div className="outcomes-table-wrap comparison-group-table"><table className="outcomes-table"><thead><tr><th>Assessment stage</th><th>CyberWolf mean</th><th>Classroom mean</th><th>Difference (app − class)</th><th>App n</th><th>Class n</th></tr></thead><tbody>{[
        ['pre', 'Pre-test', summary?.meanPrePercent, summary?.learnersWithPre], ['post', 'Post-test', summary?.meanPostPercent, summary?.learnersWithPost], ['retention', 'Delayed retention', summary?.meanRetentionPercent, summary?.learnersWithRetention], ['transfer', 'Transfer', summary?.meanTransferPercent, summary?.learnersWithTransfer],
      ].map(([phase, label, appMean, appCount]) => { const classMean = summary?.classroomComparison?.phaseMeans?.[phase]; const gap = appMean == null || classMean == null ? null : appMean - classMean; return <tr key={phase}><th scope="row">{label}</th><td>{pct(appMean)}</td><td>{pct(classMean)}</td><td>{signedPoints(gap)}</td><td>{appCount ?? 0}</td><td>{summary?.classroomComparison?.phaseCounts?.[phase] ?? 0}</td></tr>; })}
        <tr><th scope="row">Post → retention change</th><td>{signedPoints(summary?.meanPostToRetentionChangePoints)}</td><td>{signedPoints(summary?.classroomComparison?.meanPostToRetentionChangePoints)}</td><td>{signedPoints(summary?.meanPostToRetentionChangePoints == null || summary?.classroomComparison?.meanPostToRetentionChangePoints == null ? null : summary.meanPostToRetentionChangePoints - summary.classroomComparison.meanPostToRetentionChangePoints)}</td><td>{summary?.learnersWithRetention ?? 0}</td><td>{summary?.classroomComparison?.matchedPostRetention ?? 0}</td></tr>
        <tr><th scope="row">Post-test gain retained</th><td>{pct(summary?.meanRetainedLearningGainPercent)}</td><td>{pct(summary?.classroomComparison?.meanRetainedLearningGainPercent)}</td><td>—</td><td>—</td><td>—</td></tr>
      </tbody></table></div>
      {classroomRecords.length > 0 && <div className="outcomes-table-wrap classroom-records"><table className="outcomes-table"><thead><tr><th>Classroom code</th><th>Pre</th><th>Post</th><th>Retention</th><th>Post → retention</th><th>Transfer</th></tr></thead><tbody>{classroomRecords.map(record => { const phaseScores = Object.fromEntries(record.phases.map(item => { const correct = item.scores.reduce((sum, score) => sum + score.correct, 0); const total = item.scores.reduce((sum, score) => sum + score.total, 0); return [item.phase, Math.round(correct / total * 100)]; })); const completedAt = Object.fromEntries(record.phases.map(item => [item.phase, new Date(item.completedAt).getTime()])); if (completedAt.post && completedAt.retention < completedAt.post) delete phaseScores.retention; if (completedAt.post && completedAt.transfer < completedAt.post) delete phaseScores.transfer; return <tr key={record.code}><th scope="row">{record.code}</th>{['pre', 'post', 'retention'].map(phase => <td key={phase}>{pct(phaseScores[phase])}</td>)}<td>{signedPoints(phaseScores.post == null || phaseScores.retention == null ? null : phaseScores.retention - phaseScores.post)}</td><td>{pct(phaseScores.transfer)}</td></tr>; })}</tbody></table></div>}
    </section>

    <section className="outcomes-section"><div className="section-heading"><div><div className="eyebrow">INDIVIDUAL PROFILES</div><h3>Assessment and efficiency by learner</h3></div></div>
      {summary?.learners?.length ? <div className="outcomes-table-wrap"><table className="outcomes-table"><thead><tr><th>Learner code</th><th>Pre</th><th>Post</th><th>Retention</th><th>Post → retention</th><th>Gain retained</th><th>Transfer</th><th>Recorded learning time</th><th>Gain / hour</th></tr></thead><tbody>{summary.learners.map(learner => { const pre = learner.assessments.pre?.percent; const post = learner.assessments.post?.percent; const retention = learner.assessments.retention?.percent; return <tr key={learner.handle}><th scope="row">{learner.handle}</th><td>{pct(pre)}</td><td>{pct(post)}</td><td>{pct(retention)}</td><td>{signedPoints(post == null || retention == null ? null : retention - post)}</td><td>{pct(retainedGain(pre, post, retention))}</td><td>{pct(learner.assessments.transfer?.percent)}</td><td>{learner.activity.timeTrackedActivities ? `${Math.floor(learner.activity.timeSpentSeconds / 60)}m ${learner.activity.timeSpentSeconds % 60}s` : 'No time data'}</td><td>{learner.assessments.scoreGainPerHour == null ? '—' : `${learner.assessments.scoreGainPerHour > 0 ? '+' : ''}${learner.assessments.scoreGainPerHour} pts/hr`}</td></tr>; })}</tbody></table></div> : <p className="empty-analytics">No opted-in learner records are available yet.</p>}
    </section>
    <p className="analytics-intro">Interpret group differences in light of sample size, missing follow-ups, baseline scores, and differences in instruction. This dashboard reports descriptive comparisons; statistical analysis and a controlled or carefully matched study design are needed before claiming that CyberWolf caused higher retention than classroom teaching.</p>
  </section>;
}
