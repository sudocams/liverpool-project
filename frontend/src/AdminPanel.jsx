import { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retention, setRetention] = useState({ enabled: false, retentionDays: 0 });
  const [learners, setLearners] = useState([]);
  const [codeEdits, setCodeEdits] = useState({});
  const [temporaryPassword, setTemporaryPassword] = useState(null);
  const [learnerSearch, setLearnerSearch] = useState('');
  const [learnerFilter, setLearnerFilter] = useState('all');
  const [learnerListOpen, setLearnerListOpen] = useState(false);
  const consentedLearnerCount = summary?.learners?.length ?? 0;
  const aggregateSummaryAvailable = consentedLearnerCount > 0;
  const visibleLearners = learners.filter(learner => {
    const matchesSearch = learner.handle.toLowerCase().includes(learnerSearch.trim().toLowerCase());
    const matchesFilter = learnerFilter === 'all' || (learnerFilter === 'reset' ? Boolean(learner.resetRequestedAt) : Boolean(learner.mustChangePassword));
    return matchesSearch && matchesFilter;
  });

  function formatDuration(seconds = 0) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  async function loadAdminData() {
    const [summaryResponse, retentionResponse, learnersResponse] = await Promise.all([fetch('/api/research/summary'), fetch('/api/admin/retention'), fetch('/api/admin/learners')]);
    const summaryData = await summaryResponse.json();
    const retentionData = await retentionResponse.json();
    const learnersData = await learnersResponse.json();
    if (!summaryResponse.ok) throw new Error(summaryData.error || 'Could not load research summary.');
    if (!retentionResponse.ok) throw new Error(retentionData.error || 'Could not load retention settings.');
    if (!learnersResponse.ok) throw new Error(learnersData.error || 'Could not load learners.');
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
        {!!learners.length && <div className="learner-admin-controls">
          <label className="learner-search">Search learner codes<input type="search" value={learnerSearch} onChange={event => setLearnerSearch(event.target.value)} placeholder="Search, e.g. wolf-3" /></label>
          <label className="learner-filter">Show<select value={learnerFilter} onChange={event => setLearnerFilter(event.target.value)}><option value="all">All learners</option><option value="reset">Reset requests</option><option value="temporary">Temporary password issued</option></select></label>
          <button className="secondary-button learner-list-toggle" type="button" aria-expanded={learnerListOpen} onClick={() => setLearnerListOpen(open => !open)}>{learnerListOpen ? 'Hide accounts' : `Show accounts (${visibleLearners.length})`}</button>
        </div>}
        {learnerListOpen && <div className="participant-list learner-admin-list">{visibleLearners.map(learner => <article className="participant-card learner-admin-card" key={learner.id}>
          <div className="learner-admin-row"><div><b>{learner.handle}</b><small>{learner.resetRequestedAt ? `Password reset requested ${new Date(learner.resetRequestedAt).toLocaleString()}` : learner.mustChangePassword ? 'Temporary password issued; waiting for learner to change it' : 'No pending password request'}</small></div>
            <label className="learner-code-edit">Learner code<input value={codeEdits[learner.id] ?? learner.handle} onChange={event => setCodeEdits(current => ({ ...current, [learner.id]: event.target.value }))} aria-label={`Change code for ${learner.handle}`} /></label>
            <button className="secondary-button" type="button" onClick={() => updateLearnerCode(learner)}>Save code</button>
            {learner.resetRequestedAt && <button className="primary-button" type="button" onClick={() => resetLearnerPassword(learner)}>Reset password</button>}
          </div>
        </article>)}{!visibleLearners.length && <div className="empty-analytics">No learners match this search or filter.</div>}</div>}
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


      <section className="research-summary strategy-summary"><div className="eyebrow">ADAPTIVE ENGINE ANALYSIS</div><h3>Recommendation follow-up outcomes</h3><p className="analytics-intro">Follow-up success is measured when the learner later attempts the challenge that was recommended. Group comparisons appear after five opted-in participants.</p>
        {summary?.recommendationStrategyComparison?.length ? <div className="strategy-grid">{summary.recommendationStrategyComparison.map(item => <div key={item.rule}><span>{item.rule.replaceAll('_', ' ')}</span><strong>{item.followupSuccessRate == null ? '—' : `${item.followupSuccessRate}%`}</strong><small>{item.correctFollowups}/{item.followups} correct follow-ups · {item.decisions} decisions</small></div>)}</div> : <div className="empty-analytics">No reportable recommendation comparison is available yet.</div>}
      </section>

      <section className="research-summary retention-controls"><div className="eyebrow">DATA RETENTION</div><h3>{retention.enabled ? `${retention.retentionDays}-day retention policy enabled` : 'Automatic retention is disabled'}</h3><p className="analytics-intro">{retention.enabled ? 'Expired activity is automatically pruned daily. You can also apply the configured cutoff now.' : 'Set DATA_RETENTION_DAYS in backend/.env to enable scheduled cleanup. A value of 0 keeps automatic cleanup disabled.'} Cleanup removes old learning records and derived progress while keeping sign-in accounts.</p><button className="secondary-button" type="button" disabled={!retention.enabled} onClick={pruneExpiredRecords}>Apply retention now</button>{error && <span className="editor-error" role="alert">{error}</span>}{message && <span className="editor-success" role="status">{message}</span>}</section>


    </section>
  );
}
