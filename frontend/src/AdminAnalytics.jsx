import { useEffect, useState } from 'react';

export default function AdminAnalytics() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [openLearner, setOpenLearner] = useState(null);
  const [showOtherProfiles, setShowOtherProfiles] = useState(false);
  const [profileSearch, setProfileSearch] = useState('');
  const aggregateSummaryAvailable = (summary?.learners?.length ?? 0) > 0;
  const rankedProfiles = [...(summary?.learners ?? [])].sort((first, second) =>
    second.challengeCompletion.rate - first.challengeCompletion.rate
    || second.moduleCompletion.rate - first.moduleCompletion.rate
    || (second.assessments.improvementPoints ?? -Infinity) - (first.assessments.improvementPoints ?? -Infinity)
    || first.handle.localeCompare(second.handle));
  const topProfiles = rankedProfiles.slice(0, 5);
  const otherProfiles = rankedProfiles.slice(5).filter(learner => learner.handle.toLowerCase().includes(profileSearch.trim().toLowerCase()));
  const profilesToRender = showOtherProfiles ? [...topProfiles, ...otherProfiles] : topProfiles;

  function formatDuration(seconds = 0) {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/research/summary').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load participant analytics.');
      if (!cancelled) setSummary(data);
    }).catch(loadError => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, []);

  return <section className="admin-view">{error && <div className="api-error" role="alert">{error}</div>}
      <section className="participant-analytics admin-participant-analytics">
        <div className="section-heading"><div><div className="eyebrow">PARTICIPANT ANALYTICS</div><h2>Learner progress profiles</h2></div><span className="module-count">{summary?.learners?.length ?? 0} OPTED-IN LEARNERS</span></div>
        <div className="admin-participant-analytics-content">
        <p className="analytics-intro">Profiles are ranked by challenge completion, then module completion and assessment improvement. Active learning time is counted while the page is visible and focused; per-module time is estimated from opening the activity to submission.</p>
        {!summary?.learners?.length && <div className="empty-analytics">No opted-in learner activity is available yet.</div>}
        <div className="profile-list-heading"><strong>TOP {topProfiles.length} PROFILES</strong><span>Ranked by learning progress</span></div>
        <div className="participant-list">{profilesToRender.map(learner => {
          const rank = rankedProfiles.findIndex(profile => profile.handle === learner.handle) + 1;
          const expanded = openLearner === learner.handle;
          return <article className="participant-card" key={learner.handle}>
            <button className="participant-toggle" type="button" aria-expanded={expanded} onClick={() => setOpenLearner(expanded ? null : learner.handle)}>
              <span><b><i className="profile-rank">{String(rank).padStart(2, '0')}</i>{learner.handle}</b><small>Joined study {new Date(learner.consentedAt).toLocaleDateString()}</small></span>
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
        {!!rankedProfiles.slice(5).length && <div className="other-profiles-browser"><button className="secondary-button" type="button" aria-expanded={showOtherProfiles} onClick={() => { setShowOtherProfiles(open => !open); setProfileSearch(''); }}>{showOtherProfiles ? 'Hide other profiles' : `Browse ${rankedProfiles.length - 5} more profile${rankedProfiles.length - 5 === 1 ? '' : 's'}`}<span aria-hidden="true">{showOtherProfiles ? ' ↑' : ' ↓'}</span></button>
          {showOtherProfiles && <label className="other-profiles-search">Find another learner<input type="search" value={profileSearch} onChange={event => setProfileSearch(event.target.value)} placeholder="Search learner code" /><small>Showing {otherProfiles.length} of {rankedProfiles.length - 5} additional profiles.</small></label>}
        </div>}
        </div>
      </section>

  </section>;
}
