import { useEffect, useState } from 'react';

const blankModule = {
  id: 'new-module', topic: 'New topic', duration: '4 min', difficulty: 'intermediate', title: 'New learning module', description: '',
  learningObjective: '', briefing: [''], hints: ['', ''], scenario: '', question: '', options: ['', '', '', ''], answerIndex: 0, explanation: '',
};

function editable(module) {
  const { _id, __v, createdAt, updatedAt, pathProtected, ...content } = module;
  return content;
}

export default function AdminPanel() {
  const [modules, setModules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [jsonText, setJsonText] = useState(JSON.stringify(blankModule, null, 2));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [openLearner, setOpenLearner] = useState(null);
  const [retention, setRetention] = useState({ enabled: false, retentionDays: 0 });
  const [learners, setLearners] = useState([]);
  const [codeEdits, setCodeEdits] = useState({});
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const selectedModule = modules.find(module => module.id === selectedId);
  const consentedLearnerCount = summary?.learners?.length ?? 0;
  const aggregateSummaryAvailable = consentedLearnerCount > 0;

  function formatDuration(seconds = 0) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  async function loadAdminData() {
    const [moduleResponse, summaryResponse, retentionResponse, learnersResponse] = await Promise.all([fetch('/api/admin/modules'), fetch('/api/research/summary'), fetch('/api/admin/retention'), fetch('/api/admin/learners')]);
    const moduleData = await moduleResponse.json();
    const summaryData = await summaryResponse.json();
    const retentionData = await retentionResponse.json();
    const learnersData = await learnersResponse.json();
    if (!moduleResponse.ok) throw new Error(moduleData.error || 'Could not load modules.');
    if (!summaryResponse.ok) throw new Error(summaryData.error || 'Could not load research summary.');
    if (!retentionResponse.ok) throw new Error(retentionData.error || 'Could not load retention settings.');
    if (!learnersResponse.ok) throw new Error(learnersData.error || 'Could not load learners.');
    setModules(moduleData);
    setSummary(summaryData);
    setRetention(retentionData);
    setLearners(learnersData);
    setCodeEdits(current => Object.fromEntries(learnersData.map(learner => [learner.id, current[learner.id] ?? learner.handle])));
  }

  useEffect(() => { loadAdminData().catch(loadError => setError(loadError.message)); }, []);

  useEffect(() => {
    const refreshRequests = async () => {
      try {
        const response = await fetch('/api/admin/learners');
        if (!response.ok) return;
        setLearners(await response.json());
      } catch { /* Keep the last known learner list if a background refresh fails. */ }
    };
    const timer = window.setInterval(refreshRequests, 15000);
    return () => window.clearInterval(timer);
  }, []);

  function selectModule(module) {
    setSelectedId(module.id);
    setJsonText(JSON.stringify(editable(module), null, 2));
    setError('');
    setMessage('');
  }

  async function saveModule(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const content = JSON.parse(jsonText);
      const endpoint = selectedId ? `/api/admin/modules/${selectedId}` : '/api/admin/modules';
      const response = await fetch(endpoint, { method: selectedId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the module.');
      await loadAdminData();
      setSelectedId(result.id);
      setJsonText(JSON.stringify(editable(result), null, 2));
      setMessage('Module saved. It is now available to learners.');
    } catch (saveError) {
      setError(saveError instanceof SyntaxError ? 'The module editor must contain valid JSON.' : saveError.message);
    } finally { setBusy(false); }
  }

  async function removeModule() {
    if (!selectedId || !window.confirm('Delete this learning module? Existing learner attempts will remain in progress records.')) return;
    setError('');
    try {
      const response = await fetch(`/api/admin/modules/${selectedId}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Could not delete module.');
      }
      setSelectedId(null);
      setJsonText(JSON.stringify(blankModule, null, 2));
      setMessage('Module deleted.');
      await loadAdminData();
    } catch (removeError) { setError(removeError.message); }
  }

  async function pruneExpiredRecords() {
    if (!retention.enabled || !window.confirm(`Permanently delete learner activity older than ${retention.retentionDays} days? Learner accounts will remain.`)) return;
    setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/retention/prune', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not apply the retention policy.');
      setMessage(`Retention cleanup processed ${result.recordsProcessed} learner records using a ${result.retentionDays}-day limit.`);
      await loadAdminData();
    } catch (pruneError) { setError(pruneError.message); }
  }

  async function updateLearnerCode(learner) {
    setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/learners/${learner.id}/code`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ handle: codeEdits[learner.id] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not change learner code.');
      setCodeEdits(current => ({ ...current, [learner.id]: result.handle }));
      setMessage(`Learner code changed to ${result.handle}.`);
      await loadAdminData();
    } catch (changeError) { setError(changeError.message); }
  }

  async function resetLearnerPassword(learner) {
    setError(''); setMessage(''); setTemporaryPassword(null);
    try {
      const response = await fetch(`/api/admin/learners/${learner.id}/password-reset`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not reset learner password.');
      setTemporaryPassword({ handle: result.handle, password: result.temporaryPassword });
      setMessage(result.message);
      await loadAdminData();
    } catch (resetError) { setError(resetError.message); }
  }

  return (
    <section className="admin-view">
      <div className="section-heading"><div><div className="eyebrow">ADMINISTRATION</div><h2>Project control room</h2></div><span className="module-count">ADMIN ACCESS</span></div>
      {error && <div className="api-error" role="alert">{error}</div>}
      {message && <div className="practice-status" role="status">{message}</div>}
      <section className="participant-analytics"><div className="section-heading"><div><div className="eyebrow">LEARNER ACCOUNTS</div><h3>Codes and password reset requests</h3></div><span className="module-count">{learners.filter(learner => learner.resetRequestedAt).length} RESET REQUESTS · {learners.length} LEARNERS</span></div>
        <p className="analytics-intro">Learners can request a password reset from sign-in. Requests appear here. Resetting creates a temporary password that must be changed at the learner’s next sign-in. Share it with them privately.</p>
        {!learners.length && <div className="empty-analytics">No learner accounts yet.</div>}
        <div className="participant-list">{learners.map(learner => <article className="participant-card learner-admin-card" key={learner.id}>
          <div className="learner-admin-row"><div><b>{learner.handle}</b><small>{learner.resetRequestedAt ? `Password reset requested ${new Date(learner.resetRequestedAt).toLocaleString()}` : learner.mustChangePassword ? 'Temporary password issued; waiting for learner to change it' : 'No pending password request'}</small></div>
            <label className="learner-code-edit">Learner code<input value={codeEdits[learner.id] ?? learner.handle} onChange={event => setCodeEdits(current => ({ ...current, [learner.id]: event.target.value }))} aria-label={`Change code for ${learner.handle}`} /></label>
            <button className="secondary-button" type="button" onClick={() => updateLearnerCode(learner)}>Save code</button>
            {learner.resetRequestedAt && <button className="primary-button" type="button" onClick={() => resetLearnerPassword(learner)}>Reset password</button>}
          </div>
        </article>)}</div>
        {temporaryPassword && <div className="new-handle-banner" role="status"><strong>Temporary password for {temporaryPassword.handle}: {temporaryPassword.password}</strong><span>Copy and share this once with the learner through a private channel. It is not stored in this panel and must be changed at their next sign-in.</span><button type="button" onClick={() => setTemporaryPassword(null)}>Dismiss</button></div>}
      </section>
      <div className="research-summary"><div className="eyebrow">RESEARCH SUMMARY</div><h3>Aggregate evaluation snapshot</h3><p className="analytics-intro">This summary includes learners who opted into the study; practice-only accounts are excluded. <strong>{consentedLearnerCount} opted-in learner{consentedLearnerCount === 1 ? '' : 's'} included.</strong> Averages use the current sample and should be treated as preliminary when participation is low. Pre/post results require completed assessments; questionnaire ratings require submitted responses.</p><div className="summary-grid">
        <div><span>Pre-assessments</span><strong>{summary?.learnersWithPre ?? '—'}</strong></div><div><span>Post-assessments</span><strong>{summary?.learnersWithPost ?? '—'}</strong></div><div><span>Matched pairs</span><strong>{summary?.matchedPairs ?? '—'}</strong></div><div><span>Mean pre score</span><strong>{summary?.meanPrePercent == null ? '—' : `${summary.meanPrePercent}%`}</strong></div><div><span>Mean post score</span><strong>{summary?.meanPostPercent == null ? '—' : `${summary.meanPostPercent}%`}</strong></div><div><span>Mean score change</span><strong>{summary?.meanChangePoints == null ? '—' : `${summary.meanChangePoints > 0 ? '+' : ''}${summary.meanChangePoints} pts`}</strong></div><div><span>Mean challenge completion</span><strong>{summary?.meanChallengeCompletionRate == null ? '—' : `${summary.meanChallengeCompletionRate}%`}</strong></div><div><span>Mean module completion</span><strong>{summary?.meanModuleCompletionRate == null ? '—' : `${summary.meanModuleCompletionRate}%`}</strong></div><div><span>Mean active time</span><strong>{summary?.meanActiveLearningMinutes == null ? '—' : `${summary.meanActiveLearningMinutes} min`}</strong></div>
      </div><h3 className="feedback-summary-title">Participant experience ratings (1–5)</h3><div className="summary-grid feedback-summary-grid">
        <div><span>Questionnaire responses</span><strong>{summary?.feedbackResponseCount ?? '—'}</strong></div>
        <div><span>Usability</span><strong>{summary?.feedbackMeanRatings?.usability ?? '—'}</strong></div>
        <div><span>Engagement</span><strong>{summary?.feedbackMeanRatings?.engagement ?? '—'}</strong></div>
        <div><span>Learning value</span><strong>{summary?.feedbackMeanRatings?.learningValue ?? '—'}</strong></div>
        <div><span>Adaptation relevance</span><strong>{summary?.feedbackMeanRatings?.adaptationRelevance ?? '—'}</strong></div>
        <div><span>Feedback clarity</span><strong>{summary?.feedbackMeanRatings?.feedbackClarity ?? '—'}</strong></div>
      </div><h3 className="feedback-summary-title">Assessment change by topic</h3>{summary?.topicLearningGains?.length ? <div className="summary-grid feedback-summary-grid topic-gain-summary">{summary.topicLearningGains.map(item => <div key={item.topic}><span>{item.topic}{item.matchedLearners == null ? ' · sample too small' : ` · ${item.matchedLearners} matched`}</span><strong>{item.meanImprovementPoints == null ? '—' : `${item.meanImprovementPoints > 0 ? '+' : ''}${item.meanImprovementPoints} pts`}</strong></div>)}</div> : <p className="empty-analytics">{aggregateSummaryAvailable ? 'No topic comparison yet. Learners need to complete both pre- and post-assessments.' : 'Topic averages require five opted-in learners with matched pre- and post-assessments.'}</p>}<small className="summary-disclaimer">{summary?.note}</small></div>

      <section className="participant-analytics">
        <div className="section-heading"><div><div className="eyebrow">PARTICIPANT ANALYTICS</div><h3>Learner progress profiles</h3></div><span className="module-count">{summary?.learners?.length ?? 0} OPTED-IN LEARNERS</span></div>
        <p className="analytics-intro">Each profile uses the learner’s pseudonymous sign-in handle. Active learning time is counted while the page is visible and focused; per-module time is estimated from opening the activity to submission.</p>
        {!summary?.learners?.length && <div className="empty-analytics">No opted-in learner activity is available yet.</div>}
        <div className="participant-list">{(summary?.learners ?? []).map(learner => {
          const expanded = openLearner === learner.handle;
          return <article className="participant-card" key={learner.handle}>
            <button className="participant-toggle" type="button" aria-expanded={expanded} onClick={() => setOpenLearner(expanded ? null : learner.handle)}>
              <span><b>{learner.handle}</b><small>Joined study {new Date(learner.consentedAt).toLocaleDateString()}</small></span>
              <span className="participant-quick-stats"><span><b>{learner.challengeCompletion.rate}%</b><small>completion</small></span><span><b>{learner.assessments.improvementPoints == null ? '—' : `${learner.assessments.improvementPoints > 0 ? '+' : ''}${learner.assessments.improvementPoints} pts`}</b><small>pre/post</small></span><span><b>{learner.activity.timeTrackedActivities ? formatDuration(learner.activity.timeSpentSeconds) : '—'}</b><small>learning time</small></span></span>
              <span className="participant-chevron">{expanded ? '−' : '+'}</span>
            </button>
            {expanded && <div className="participant-detail">
              <div className="summary-grid learner-metric-grid">
                <div><span>Pre-assessment</span><strong>{learner.assessments.pre ? `${learner.assessments.pre.score}/${learner.assessments.pre.total} (${learner.assessments.pre.percent}%)` : 'Not completed'}</strong></div>
                <div><span>Post-assessment</span><strong>{learner.assessments.post ? `${learner.assessments.post.score}/${learner.assessments.post.total} (${learner.assessments.post.percent}%)` : 'Not completed'}</strong></div>
                <div><span>Challenge completion</span><strong>{learner.challengeCompletion.completed}/{learner.challengeCompletion.total} · {learner.challengeCompletion.rate}%</strong></div>
                <div><span>Module completion</span><strong>{learner.moduleCompletion.completed}/{learner.moduleCompletion.total} · {learner.moduleCompletion.rate}%</strong></div>
                <div><span>Attempts / accuracy</span><strong>{learner.activity.attempts} · {learner.activity.accuracy == null ? '—' : `${learner.activity.accuracy}%`}</strong></div>
                <div><span>Total learning time</span><strong>{learner.activity.timeTrackedActivities ? formatDuration(learner.activity.timeSpentSeconds) : 'Not recorded yet'}</strong><small>{learner.activity.activeSessions ? `${learner.activity.activeSessions} visible and focused sessions` : learner.activity.timeTrackedActivities ? 'Estimated from activity submissions' : 'No duration records yet'}</small></div>
                <div><span>Feedback source</span><strong>{learner.aiFeedback.trackedAttempts ? `AI ${learner.aiFeedback.used} · guided ${learner.aiFeedback.guided}` : 'Not recorded yet'}</strong><small>{learner.aiFeedback.usageRate == null ? 'No tracked feedback yet' : `${learner.aiFeedback.usageRate}% AI use among tracked feedback`} · ${learner.aiFeedback.untracked} older attempts untracked</small></div>
                <div><span>Adaptive decisions</span><strong>{learner.adaptiveProgression.decisions}</strong></div>
              </div>
              <div className="learner-analysis-columns">
                <div><h4>Module analysis</h4><div className="learner-module-list">{learner.modules.map(module => <div className="learner-module-group" key={module.id}><div className="learner-module-row"><span className={module.completed ? 'module-status complete' : 'module-status'}>{module.completed ? '✓' : '·'}</span><span className="learner-module-name"><b>{module.title}</b><small>{module.pathTitle} · {module.challengeCount} challenges</small></span><span>{module.attempts} attempts</span><span>{module.accuracy == null ? '—' : `${module.accuracy}% accuracy`}</span><span>{module.timeTrackedAttempts ? formatDuration(module.timeSpentSeconds) : 'No time data'}</span></div><div className="module-challenge-details">{module.challenges.map(challenge => <span key={challenge.id} className={challenge.completed ? 'complete' : ''}>{challenge.completed ? '✓' : '·'} {challenge.title} · {challenge.attempts} attempts · {challenge.accuracy == null ? '—' : `${challenge.accuracy}%`}</span>)}</div></div>)}</div></div>
                <div><h4>Adaptive progression history</h4>{learner.adaptiveProgression.history.length ? <div className="progression-history">{[...learner.adaptiveProgression.history].reverse().map((event, index) => <div className="progression-entry" key={`${event.at}-${index}`}><b>{event.rule.replaceAll('_', ' ')}</b><span>{event.reason}</span><small>{event.recommendedChallengeId || 'No next module'} · {new Date(event.at).toLocaleString()}</small></div>)}</div> : <p className="empty-analytics">No recommendations recorded yet.</p>}</div>
              </div>
              <div className="learner-analysis-columns learner-secondary-analysis">
                <div><h4>Assessment change by topic</h4>{learner.assessments.topicProgress.length ? <div className="topic-analysis-list">{learner.assessments.topicProgress.map(item => <div className="topic-analysis-row" key={item.topic}><b>{item.topic}</b><span>{item.preCorrect == null ? '—' : item.preCorrect ? 'Pre: correct' : 'Pre: missed'}</span><span>{item.postCorrect == null ? '—' : item.postCorrect ? 'Post: correct' : 'Post: missed'}</span><strong>{item.improvementPoints == null ? '—' : `${item.improvementPoints > 0 ? '+' : ''}${item.improvementPoints} pts`}</strong></div>)}</div> : <p className="empty-analytics">Complete pre and post assessments to compare topics.</p>}</div>
                <div><h4>Weekly learning trend</h4>{learner.learningTrend.length ? <div className="trend-list">{learner.learningTrend.map(week => <div className="trend-row" key={week.weekStarting}><span>{week.weekStarting}</span><div className="trend-track"><i style={{ width: `${Math.max(week.accuracy ?? 0, week.assessmentPercent ?? 0)}%` }} /></div><b>{week.accuracy == null ? '—' : `${week.accuracy}%`}</b><small>{week.attempts} attempts · {week.challengeClears} clears · {formatDuration(week.activeSeconds)}</small></div>)}</div> : <p className="empty-analytics">Weekly trends will appear after learning activity.</p>}</div>
              </div>
              <div className="learner-path-summary"><h4>Learning paths and gamification</h4><div>{learner.learningPaths.map(path => <span key={path.id}>{path.title}: {path.completed}/{path.total} ({path.rate}%)</span>)}</div><p>Current rank: <b>{learner.rank}</b> · Rank history: {learner.rankHistory.length ? learner.rankHistory.map(item => `${item.rank} (${new Date(item.reachedAt).toLocaleDateString()})`).join(' → ') : 'no rank change recorded'} · Persistent badges: {learner.achievements.length ? learner.achievements.map(item => item.id.replaceAll('-', ' ')).join(', ') : 'none yet'}</p></div>
            </div>}
          </article>;
        })}</div>
      </section>

      <section className="research-summary strategy-summary"><div className="eyebrow">ADAPTIVE ENGINE ANALYSIS</div><h3>Recommendation follow-up outcomes</h3><p className="analytics-intro">Follow-up success is measured when the learner later attempts the challenge that was recommended. Group comparisons appear after five opted-in participants.</p>
        {summary?.recommendationStrategyComparison?.length ? <div className="strategy-grid">{summary.recommendationStrategyComparison.map(item => <div key={item.rule}><span>{item.rule.replaceAll('_', ' ')}</span><strong>{item.followupSuccessRate == null ? '—' : `${item.followupSuccessRate}%`}</strong><small>{item.correctFollowups}/{item.followups} correct follow-ups · {item.decisions} decisions</small></div>)}</div> : <div className="empty-analytics">No reportable recommendation comparison is available yet.</div>}
      </section>

      <section className="research-summary retention-controls"><div className="eyebrow">DATA RETENTION</div><h3>{retention.enabled ? `${retention.retentionDays}-day retention policy enabled` : 'Automatic retention is disabled'}</h3><p className="analytics-intro">{retention.enabled ? 'Expired activity is automatically pruned daily. You can also apply the configured cutoff now.' : 'Set DATA_RETENTION_DAYS in backend/.env to enable scheduled cleanup. A value of 0 keeps automatic cleanup disabled.'} Cleanup removes old learning records and derived progress while keeping sign-in accounts.</p><button className="secondary-button" type="button" disabled={!retention.enabled} onClick={pruneExpiredRecords}>Apply retention now</button>{error && <span className="editor-error" role="alert">{error}</span>}{message && <span className="editor-success" role="status">{message}</span>}</section>

      <div className="admin-module-layout"><section className="admin-module-list"><div className="eyebrow">LEARNING MODULES · {modules.length}</div><button className="primary-button new-module-button" type="button" onClick={() => { setSelectedId(null); setJsonText(JSON.stringify(blankModule, null, 2)); setMessage(''); setError(''); }}>+ New module</button>{modules.map(module => <button className={`admin-module-choice${selectedId === module.id ? ' selected' : ''}`} type="button" key={module.id} onClick={() => selectModule(module)}><b>{module.title}</b><small>{module.topic} · {module.id}</small></button>)}</section>
        <form className="admin-editor" onSubmit={saveModule}><div className="section-heading"><div><div className="eyebrow">CONTENT EDITOR</div><h3>{selectedId ? 'Edit module' : 'Create module'}</h3></div>{selectedId && <button className="danger-button" type="button" disabled={selectedModule?.pathProtected} title={selectedModule?.pathProtected ? 'Guided path challenges cannot be deleted.' : undefined} onClick={removeModule}>{selectedModule?.pathProtected ? 'Path module' : 'Delete'}</button>}</div><p>Edit module JSON. Set `difficulty` to foundational, intermediate, or advanced, and keep `answerIndex` aligned with the correct option. Recommendations use response time and performance to adjust challenge level. Challenges in guided paths can be edited but not deleted.</p><textarea aria-label="Learning module JSON" spellCheck="false" value={jsonText} onChange={event => setJsonText(event.target.value)} /><div className="editor-footer">{error && <span className="editor-error" role="alert">{error}</span>}{message && <span className="editor-success" role="status">{message}</span>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save module'}</button></div></form>
      </div>
    </section>
  );
}
