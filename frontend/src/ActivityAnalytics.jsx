import { useEffect, useMemo, useState } from 'react';

function formatDuration(seconds) {
  if (seconds == null) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function average(items, selector) {
  const values = items.map(selector).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export default function ActivityAnalytics() {
  const [learners, setLearners] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/research/summary').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load activity analytics.');
      if (!cancelled) setLearners(data.learners ?? []);
    }).catch(loadError => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, []);

  const visibleLearners = useMemo(() => learners.filter(learner => learner.handle.toLowerCase().includes(search.trim().toLowerCase())), [learners, search]);
  const scenarios = learners.flatMap(learner => learner.modules.flatMap(module => module.challenges));
  const modules = learners.flatMap(learner => learner.modules);
  const sessions = learners.reduce((sum, learner) => sum + learner.activity.activeSessions, 0);
  const activeSeconds = learners.reduce((sum, learner) => sum + learner.activity.sessionDurationSeconds, 0);
  const totalLogins = learners.reduce((sum, learner) => sum + learner.activity.loginFrequency.total, 0);
  const totalXp = learners.reduce((sum, learner) => sum + learner.gamification.pointsEarned, 0);
  const totalBadges = learners.reduce((sum, learner) => sum + learner.gamification.achievementsEarned, 0);
  const totalHints = learners.reduce((sum, learner) => sum + learner.gamification.hintsUsed, 0);

  return <section className="admin-view activity-analytics-view">
    <div className="section-heading"><div><div className="eyebrow">LEARNING ACTIVITY</div><h2>Engagement and progress analytics</h2></div><span className="module-count">{learners.length} OPTED-IN LEARNERS</span></div>
    <p className="analytics-intro">Explore activity timing, participation, completion, and gamification use by learner. Login and focus-time tracking is limited to research participants; scenario times use recorded attempt durations.</p>
    {error && <div className="api-error" role="alert">{error}</div>}
    <div className="activity-metric-grid">
      <article><span>Average time per scenario</span><strong>{formatDuration(average(scenarios.filter(item => item.timeTrackedAttempts), item => item.averageDurationSeconds))}</strong><small>{scenarios.filter(item => item.timeTrackedAttempts).length} scenario records timed</small></article>
      <article><span>Average time per module</span><strong>{formatDuration(average(modules.filter(item => item.timeTrackedAttempts), item => item.timeSpentSeconds))}</strong><small>{modules.filter(item => item.timeTrackedAttempts).length} module records timed</small></article>
      <article><span>Average session duration</span><strong>{formatDuration(sessions ? Math.round(activeSeconds / sessions) : null)}</strong><small>{sessions} tracked sessions</small></article>
      <article><span>Login frequency</span><strong>{learners.length ? `${(learners.reduce((sum, learner) => sum + learner.activity.loginFrequency.perWeek, 0) / learners.length).toFixed(1)} / week` : '—'}</strong><small>Average over the last 30 days · {totalLogins} tracked sign-ins total</small></article>
      <article><span>Module completion rate</span><strong>{learners.length ? `${Math.round(learners.reduce((sum, learner) => sum + learner.moduleCompletion.rate, 0) / learners.length)}%` : '—'}</strong><small>Mean across opted-in learners</small></article>
      <article><span>Challenge completion rate</span><strong>{learners.length ? `${Math.round(learners.reduce((sum, learner) => sum + learner.challengeCompletion.rate, 0) / learners.length)}%` : '—'}</strong><small>Mean across opted-in learners</small></article>
      <article><span>Gamification activity</span><strong>{totalXp.toLocaleString()} XP · {totalBadges} badges</strong><small>{totalHints} hints used · ranks and progression shown per learner</small></article>
    </div>

    <div className="activity-learner-toolbar"><div><div className="eyebrow">PARTICIPANT BREAKDOWN</div><h3>Learner activity profiles</h3></div><label>Search learner code<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search, e.g. wolf-4" /></label></div>
    {!learners.length && !error && <div className="empty-analytics">Per-learner analytics appear after learners opt into the study and record activity.</div>}
    {!visibleLearners.length && learners.length > 0 && <div className="empty-analytics">No learners match that search.</div>}
    <div className="activity-profile-list">{visibleLearners.map(learner => {
      const timedScenarios = learner.modules.flatMap(module => module.challenges).filter(item => item.averageDurationSeconds != null);
      const timedModules = learner.modules.filter(item => item.timeTrackedAttempts > 0);
      const averageScenarioTime = average(timedScenarios, item => item.averageDurationSeconds);
      const averageModuleTime = average(timedModules, item => item.timeSpentSeconds);
      return <details className="activity-profile" key={learner.handle}>
        <summary><span><b>{learner.handle}</b><small>{learner.activity.loginFrequency.total} logins · {learner.activity.activeSessions} sessions</small></span><span className="activity-profile-stats"><span><b>{learner.challengeCompletion.rate}%</b><small>challenges</small></span><span><b>{learner.moduleCompletion.rate}%</b><small>modules</small></span><span><b>{formatDuration(learner.activity.timeSpentSeconds)}</b><small>learning time</small></span></span><i aria-hidden="true">+</i></summary>
        <div className="activity-profile-details">
          <div className="activity-learner-metrics">
            <div><span>Average scenario time</span><strong>{formatDuration(averageScenarioTime)}</strong></div>
            <div><span>Average module time</span><strong>{formatDuration(averageModuleTime)}</strong></div>
            <div><span>Session duration</span><strong>{formatDuration(learner.activity.averageSessionSeconds)}</strong><small>{learner.activity.activeSessions} sessions · {formatDuration(learner.activity.sessionDurationSeconds)} total</small></div>
            <div><span>Login frequency</span><strong>{learner.activity.loginFrequency.perWeek.toFixed(1)} per week</strong><small>Last 30 days · {learner.activity.loginFrequency.total} tracked sign-ins overall · {learner.activity.loginFrequency.activeDays} active days</small></div>
            <div><span>Module completion</span><strong>{learner.moduleCompletion.completed}/{learner.moduleCompletion.total} · {learner.moduleCompletion.rate}%</strong></div>
            <div><span>Challenge completion</span><strong>{learner.challengeCompletion.completed}/{learner.challengeCompletion.total} · {learner.challengeCompletion.rate}%</strong></div>
            <div><span>Gamification interactions</span><strong>{learner.gamification.pointsEarned.toLocaleString()} XP · {learner.gamification.achievementsEarned} badges</strong><small>{learner.gamification.hintsUsed} hints · {learner.gamification.rankUps} rank-ups · {learner.gamification.progressionDecisions} progression events · current rank: {learner.rank}</small></div>
          </div>
          <h4>Module and scenario detail</h4>
          <div className="activity-module-list">{learner.modules.map(module => <article className="activity-module" key={module.id}>
            <div className="activity-module-heading"><span><b>{module.title}</b><small>{module.pathTitle} · {module.completionRate}% module progress</small></span><strong>{module.completed ? 'COMPLETE' : `${module.completionRate}%`}</strong><span>{formatDuration(module.timeSpentSeconds)} total module time</span></div>
            <div className="activity-scenario-list">{module.challenges.map(scenario => <div className="activity-scenario-row" key={scenario.id}><span className={scenario.completed ? 'activity-clear' : ''}>{scenario.completed ? '✓' : '·'} {scenario.title}</span><span>{scenario.completionRate}% complete</span><span>{formatDuration(scenario.averageDurationSeconds)} avg · {formatDuration(scenario.timeSpentSeconds)} total</span><span>{scenario.attempts} attempts</span></div>)}</div>
          </article>)}</div>
        </div>
      </details>;
    })}</div>
  </section>;
}
