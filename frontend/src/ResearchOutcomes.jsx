import { useEffect, useState } from 'react';

const pct = value => value == null ? '—' : `${value}%`;

export default function ResearchOutcomes() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/research/summary').then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load research outcomes.');
      if (!cancelled) setSummary(data);
    }).catch(loadError => { if (!cancelled) setError(loadError.message); });
    return () => { cancelled = true; };
  }, []);

  return <section className="admin-view research-outcomes-view">
    {error && <div className="api-error" role="alert">{error}</div>}
    <div className="section-heading"><div><div className="eyebrow">RESEARCH OUTCOMES</div><h2>Retention, transfer & efficiency</h2></div><span className="module-count">{summary?.consentedParticipantCount ?? 0} OPTED-IN LEARNERS</span></div>
    <p className="analytics-intro">Compare immediate learning gains with delayed recall, application to unfamiliar scenarios, and recorded learning time. Only opted-in participant records are included.</p>
    <div className="summary-grid">
      <article><span>Mean pre-test</span><strong>{pct(summary?.meanPrePercent)}</strong><small>Baseline knowledge</small></article>
      <article><span>Mean post-test</span><strong>{pct(summary?.meanPostPercent)}</strong><small>{summary?.matchedPairs ?? 0} matched pre/post learners</small></article>
      <article><span>Mean delayed retention</span><strong>{pct(summary?.meanRetentionPercent)}</strong><small>{summary?.learnersWithRetention ?? 0} completed · scheduled 3 weeks after post-test</small></article>
      <article><span>Mean transfer score</span><strong>{pct(summary?.meanTransferPercent)}</strong><small>{summary?.learnersWithTransfer ?? 0} completed on unfamiliar scenarios</small></article>
      <article><span>Mean pre/post improvement</span><strong>{summary?.meanChangePoints == null ? '—' : `${summary.meanChangePoints > 0 ? '+' : ''}${summary.meanChangePoints} pts`}</strong><small>Percentage-point change</small></article>
      <article><span>Learning efficiency</span><strong>{summary?.meanScoreGainPerHour == null ? '—' : `${summary.meanScoreGainPerHour > 0 ? '+' : ''}${summary.meanScoreGainPerHour} pts/hr`}</strong><small>Pre/post score gain per recorded learning hour</small></article>
    </div>

    <section className="outcomes-section"><div className="section-heading"><div><div className="eyebrow">TOPIC ANALYSIS</div><h3>Scores at each assessment stage</h3></div></div>
      {summary?.topicLearningGains?.length ? <div className="outcomes-table-wrap"><table className="outcomes-table"><thead><tr><th>Cybersecurity topic</th><th>Pre-test</th><th>Post-test</th><th>Delayed retention</th><th>Transfer</th><th>Pre → post</th></tr></thead><tbody>{summary.topicLearningGains.map(topic => <tr key={topic.topic}><th scope="row">{topic.topic}</th><td>{pct(topic.meanPrePercent)}</td><td>{pct(topic.meanPostPercent)}</td><td>{pct(topic.meanRetentionPercent)}</td><td>{pct(topic.meanTransferPercent)}</td><td>{topic.meanImprovementPoints == null ? '—' : `${topic.meanImprovementPoints > 0 ? '+' : ''}${topic.meanImprovementPoints} pts`}</td></tr>)}</tbody></table></div> : <p className="empty-analytics">Topic comparisons appear when learners complete assessments.</p>}
    </section>

    <section className="outcomes-section"><div className="section-heading"><div><div className="eyebrow">INDIVIDUAL PROFILES</div><h3>Assessment and efficiency by learner</h3></div></div>
      {summary?.learners?.length ? <div className="outcomes-table-wrap"><table className="outcomes-table"><thead><tr><th>Learner code</th><th>Pre</th><th>Post</th><th>Retention</th><th>Transfer</th><th>Recorded learning time</th><th>Gain / hour</th></tr></thead><tbody>{summary.learners.map(learner => <tr key={learner.handle}><th scope="row">{learner.handle}</th><td>{pct(learner.assessments.pre?.percent)}</td><td>{pct(learner.assessments.post?.percent)}</td><td>{pct(learner.assessments.retention?.percent)}</td><td>{pct(learner.assessments.transfer?.percent)}</td><td>{learner.activity.timeTrackedActivities ? `${Math.floor(learner.activity.timeSpentSeconds / 60)}m ${learner.activity.timeSpentSeconds % 60}s` : 'No time data'}</td><td>{learner.assessments.scoreGainPerHour == null ? '—' : `${learner.assessments.scoreGainPerHour > 0 ? '+' : ''}${learner.assessments.scoreGainPerHour} pts/hr`}</td></tr>)}</tbody></table></div> : <p className="empty-analytics">No opted-in learner records are available yet.</p>}
    </section>
    <p className="analytics-intro">Interpret results in light of the participant count and missing data. The dashboard reports CyberWolf outcomes; a claim that it outperforms classroom teaching requires comparable classroom-group assessment and engagement data.</p>
  </section>;
}
