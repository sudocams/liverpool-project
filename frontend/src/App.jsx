import React, { useEffect, useMemo, useState } from 'react';
import EvaluationPanel from './EvaluationPanel.jsx';
import AuthScreen from './AuthScreen.jsx';
import AdminPanel from './AdminPanel.jsx';
import StudyConsent from './StudyConsent.jsx';

const blankProgress = { attempts: [], completed: [], assessments: [], researchFeedback: null };
const hasCurrentConsent = account => Boolean(account?.researchConsent?.acceptedAt && account.researchConsent.version === account.studyInfoVersion);

function getSkillLevel(completedCount) {
  const ranks = [
    { name: 'Rookie', threshold: 0 },
    { name: 'Scout', threshold: 1 },
    { name: 'Analyst', threshold: 5 },
    { name: 'Specialist', threshold: 10 },
    { name: 'Sentinel', threshold: 15 },
    { name: 'Pathfinder', threshold: 20 },
  ];
  const index = ranks.reduce((current, rank, rankIndex) => completedCount >= rank.threshold ? rankIndex : current, 0);
  return { ...ranks[index], next: ranks[index + 1] ?? null };
}

function summarizeTopics(attempts) {
  const totals = attempts.reduce((summary, attempt) => {
    const topic = summary[attempt.topic] ?? { topic: attempt.topic, correct: 0, total: 0 };
    topic.correct += Number(attempt.correct);
    topic.total += 1;
    summary[attempt.topic] = topic;
    return summary;
  }, {});
  return Object.values(totals)
    .map(topic => ({ ...topic, accuracy: Math.round(topic.correct / topic.total * 100) }))
    .sort((a, b) => b.accuracy - a.accuracy);
}

function getAchievements(progress, modules) {
  const correct = progress.attempts.filter(attempt => attempt.correct);
  const completed = new Set(modules.filter(module => progress.completed.includes(module.id)).map(module => module.id));
  const completedTopics = new Set(modules.filter(module => completed.has(module.id)).map(module => module.topic));
  const accuracy = progress.attempts.length ? Math.round(correct.length / progress.attempts.length * 100) : 0;
  return [
    { id: 'first-clear', name: 'First clear', detail: 'Clear your first mission.', earned: correct.length > 0, icon: '✦' },
    { id: 'no-hints', name: 'Sharp instincts', detail: 'Clear a mission without hints.', earned: correct.some(attempt => (attempt.hintsUsed ?? 0) === 0), icon: '◈' },
    { id: 'signal-spotter', name: 'Signal spotter', detail: 'Clear the phishing mission.', earned: completed.has('phishing'), icon: '⌁' },
    { id: 'incident-ready', name: 'Incident ready', detail: 'Clear the ransomware response mission.', earned: completed.has('ransomware-response'), icon: '⚑' },
    { id: 'cloud-guardian', name: 'Cloud guardian', detail: 'Clear the cloud security mission.', earned: completed.has('cloud-storage'), icon: '⬡' },
    { id: 'wide-scan', name: 'Wide scan', detail: 'Clear missions across five cybersecurity topics.', earned: completedTopics.size >= 5, icon: '◎' },
    { id: 'field-scout', name: 'Field scout', detail: 'Clear five missions.', earned: completed.size >= 5, icon: '5' },
    { id: 'threat-analyst', name: 'Threat analyst', detail: 'Clear ten missions.', earned: completed.size >= 10, icon: '10' },
    { id: 'cyberwolf-pathfinder', name: 'Pathfinder', detail: 'Clear all twenty missions.', earned: modules.length > 0 && completed.size >= modules.length, icon: '✓' },
    { id: 'steady-hand', name: 'Steady hand', detail: 'Reach at least 80% accuracy after ten attempts.', earned: progress.attempts.length >= 10 && accuracy >= 80, icon: '⌖' },
  ];
}

function App() {
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState(blankProgress);
  const [challengeId, setChallengeId] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [activeView, setActiveView] = useState('learning');
  const [account, setAccount] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [newAccountHandle, setNewAccountHandle] = useState('');
  const [practiceOnly, setPracticeOnly] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const challenge = challenges.find(item => item.id === challengeId) ?? challenges[0];
  const totalPoints = useMemo(() => progress.attempts.reduce((sum, item) => sum + item.points, 0), [progress]);
  const accuracy = progress.attempts.length ? Math.round(progress.attempts.filter(item => item.correct).length / progress.attempts.length * 100) : null;
  const nextChallenge = challenges.find(item => !progress.completed.includes(item.id));
  const topicSummary = useMemo(() => summarizeTopics(progress.attempts), [progress.attempts]);
  const strongestTopic = topicSummary[0];
  const achievements = getAchievements(progress, challenges);
  const clearedCount = challenges.filter(item => progress.completed.includes(item.id)).length;
  const rank = getSkillLevel(clearedCount);
  const rankProgress = rank.next ? Math.max(0, Math.min(100, (clearedCount - rank.threshold) / (rank.next.threshold - rank.threshold) * 100)) : 100;
  const missedModules = [...new Set(progress.attempts.filter(attempt => !attempt.correct).map(attempt => attempt.challengeId))]
    .map(id => ({ module: challenges.find(item => item.id === id), count: progress.attempts.filter(attempt => !attempt.correct && attempt.challengeId === id).length }))
    .filter(item => item.module);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me').then(async response => {
      if (response.status === 401) return null;
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check sign-in.');
      return data;
    }).then(currentAccount => { if (!cancelled) setAccount(currentAccount); })
      .catch(error => { if (!cancelled) setApiError(`${error.message} Check that the backend server is running.`); })
      .finally(() => { if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!account) return undefined;
    let cancelled = false;
    setLoading(true);
    const optedIn = account.role === 'admin' || hasCurrentConsent(account);
    const requests = [fetch('/api/challenges').then(response => { if (!response.ok) throw new Error('Could not load challenges.'); return response.json(); })];
    if (optedIn) requests.push(
      fetch('/api/progress').then(response => { if (!response.ok) throw new Error('Could not load your progress.'); return response.json(); }),
      fetch('/api/recommendations').then(response => { if (!response.ok) throw new Error('Could not load your recommendation.'); return response.json(); }),
    );
    Promise.all(requests).then(([items, savedProgress = blankProgress, nextStep = null]) => {
      if (cancelled) return;
      setChallenges(items);
      setProgress(savedProgress);
      setRecommendation(nextStep);
      setChallengeId(nextStep.challengeId ?? items.find(item => !savedProgress.completed.includes(item.id))?.id ?? items[0]?.id ?? null);
      setApiError('');
    }).catch(error => {
      if (!cancelled) setApiError(`${error.message} Start the backend server in the backend folder, then refresh.`);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [account?.handle, account?.researchConsent?.acceptedAt]);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAccount(null);
    setActiveView('learning');
    setProgress(blankProgress);
    setNewAccountHandle('');
    setPracticeOnly(false);
    setShowConsent(false);
  }

  async function withdrawFromResearch() {
    if (!window.confirm('Withdraw from the study? This permanently deletes your saved challenge history, assessment results, and questionnaire ratings. Your sign-in account remains for practice-only use.')) return;
    try {
      const response = await fetch('/api/research/consent', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not withdraw from the study.');
      setAccount(current => ({ ...current, researchConsent: { version: null, acceptedAt: null } }));
      setPracticeOnly(true);
      setProgress(blankProgress);
      setRecommendation(null);
      setActiveView('learning');
      setApiError('');
    } catch (error) { setApiError(error.message); }
  }

  function chooseChallenge(item) {
    setChallengeId(item.id);
    setSelectedOption(null);
    setHintsUsed(0);
    setFeedback(null);
  }

  async function resetProgress() {
    const confirmed = window.confirm('Reset your challenge progress and learning history?');
    if (!confirmed) return;

    if (account.role === 'admin' || hasCurrentConsent(account)) {
      try {
        const response = await fetch('/api/progress', { method: 'DELETE' });
        if (!response.ok) throw new Error('Could not reset progress.');
      } catch (error) {
        setApiError(`${error.message} Your local draft could not be cleared. Please try again.`);
        return;
      }
    }

    const freshProgress = blankProgress;
    setProgress(freshProgress);
    setRecommendation({ challengeId: challenges[0]?.id, topic: challenges[0]?.topic, message: 'Start with this foundation challenge.', rule: 'start', reason: 'There are no recorded attempts yet.' });
    setChallengeId(challenges[0]?.id ?? null);
    setSelectedOption(null);
    setHintsUsed(0);
    setFeedback(null);
    setApiError('');
  }

  async function submitAnswer() {
    if (selectedOption === null || feedback || !challenge) return;
    setSubmitting(true);
    setApiError('');
    try {
      const participating = account.role === 'admin' || hasCurrentConsent(account);
      const response = await fetch(participating ? '/api/attempts' : '/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, selectedOption, hintsUsed }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit your answer.');
      const practicePoints = !participating && result.correct && progress.completed.includes(challenge.id)
        ? Math.max(10, 25 - hintsUsed * 5)
        : result.points;
      if (participating) {
        setProgress(result.progress);
        setRecommendation(result.recommendation);
      } else {
        const attempt = { challengeId: challenge.id, topic: challenge.topic, correct: result.correct, points: practicePoints, hintsUsed };
        const completed = result.correct && !progress.completed.includes(challenge.id) ? [...progress.completed, challenge.id] : progress.completed;
        setProgress(current => ({ ...current, attempts: [...current.attempts, attempt], completed }));
        const next = challenges.find(item => !completed.includes(item.id));
        setRecommendation(next ? { challengeId: next.id, topic: next.topic, message: `Continue with ${next.title}. This practice suggestion is not saved.`, reason: 'practice session only' } : { challengeId: challenge.id, topic: challenge.topic, message: 'You have completed every challenge in this session. You can review any module.', reason: 'practice session only' });
      }
      setFeedback({ correct: participating ? result.attempt.correct : result.correct, points: participating ? result.attempt.points : practicePoints, hintsUsed: participating ? result.attempt.hintsUsed ?? 0 : hintsUsed, explanation: result.feedback.text, feedbackSource: result.feedback.source });
    } catch (error) {
      setApiError(`${error.message} Check that the backend is running, then try again.`);
    } finally {
      setSubmitting(false);
    }
  }

  function continueLearning() {
    chooseChallenge(challenges.find(item => item.id === recommendation?.challengeId) ?? nextChallenge ?? challenge);
  }

  async function participate(consent) {
    setAccount(current => ({ ...current, researchConsent: consent }));
    setPracticeOnly(false);
    setShowConsent(false);
    setActiveView('learning');
  }

  async function withdrawFromConsentScreen() {
    if (!window.confirm('Withdraw from the study and permanently delete saved study records? Your sign-in account remains available for practice.')) return;
    try {
      const response = await fetch('/api/research/consent', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not withdraw from the study.');
      setAccount(current => ({ ...current, researchConsent: { version: null, acceptedAt: null } }));
      setPracticeOnly(true);
      setProgress(blankProgress);
      setShowConsent(false);
      setApiError('');
    } catch (error) { setApiError(error.message); }
  }

  if (!authChecked) return <main className="auth-loading">Connecting to CyberWolf…</main>;
  if (!account) return <AuthScreen onAuthenticated={(signedInAccount, isNew) => { setAccount(signedInAccount); setNewAccountHandle(isNew ? signedInAccount.handle : ''); setApiError(''); }} />;
  if (account.role === 'learner' && (showConsent || (!practiceOnly && !hasCurrentConsent(account)))) {
    return <StudyConsent version={account.studyInfoVersion || 'draft-1'} previouslyConsented={Boolean(account.researchConsent?.acceptedAt)} actionError={apiError} onParticipate={participate} onPractice={() => { setPracticeOnly(true); setShowConsent(false); }} onWithdraw={withdrawFromConsentScreen} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#home" aria-label="CyberWolf home"><span className="brand-mark">W</span><span>cyber<span className="brand-light">wolf</span></span></a>
        <div className="side-label">LEARN</div>
        <nav>
          <a className={`nav-link${activeView === 'learning' ? ' active' : ''}`} href="#home" onClick={event => { event.preventDefault(); setActiveView('learning'); }}><span aria-hidden="true">◈</span> Overview</a>
          {(account.role === 'admin' || hasCurrentConsent(account)) && <a className={`nav-link${activeView === 'evaluation' ? ' active' : ''}`} href="#evaluation" onClick={event => { event.preventDefault(); setActiveView('evaluation'); }}><span aria-hidden="true">▥</span> Evaluation</a>}
          {account.role === 'admin' && <a className={`nav-link${activeView === 'admin' ? ' active' : ''}`} href="#admin" onClick={event => { event.preventDefault(); setActiveView('admin'); }}><span aria-hidden="true">⚙</span> Admin</a>}
        </nav>
        <div className="sidebar-bottom"><div className="side-label">YOUR FIELD GUIDE</div><p>Small, smart decisions make a safer digital world.</p><div className="wolf-card"><span aria-hidden="true">🐺</span><div><strong>Stay curious.</strong><small>Think before you click.</small></div></div></div>
      </aside>

      <main id="home" className="main-content">
        <header className="topbar"><div className="breadcrumb">LEARN <span>/</span> {activeView.toUpperCase()}</div><div className="user-chip"><span className="avatar">{account.role === 'admin' ? 'A' : 'W'}</span><span>{account.handle} · {account.role}</span>{account.role === 'learner' && (hasCurrentConsent(account) ? <button className="logout-button" type="button" onClick={withdrawFromResearch}>Withdraw</button> : <button className="logout-button" type="button" onClick={() => setShowConsent(true)}>Join study</button>)}<button className="logout-button" type="button" onClick={signOut}>Sign out</button></div></header>
        <section className="welcome-row"><div><div className="eyebrow"><span className="status-dot" /> YOUR CYBERSECURITY FIELD GUIDE</div><h1>Make the smart call.</h1><p className="subtitle">Real-world scenarios. Better instincts. One challenge at a time.</p></div><div className="streak-card"><span className="streak-icon">✦</span><div><small>YOUR POINTS</small><strong>{totalPoints} <span>XP</span></strong></div></div></section>

        {newAccountHandle && <div className="new-handle-banner" role="status"><strong>Your sign-in handle is {newAccountHandle}</strong><span>Save it with your password. It cannot be recovered because CyberWolf does not collect contact details.</span><button type="button" onClick={() => setNewAccountHandle('')}>I’ve saved it</button></div>}
        {practiceOnly && <div className="practice-status" role="status">Practice-only mode: answers are sent to CyberWolf for grading but are not saved; progress stays in this browser session. <button className="logout-button" type="button" onClick={() => setShowConsent(true)}>Review study information</button></div>}
        {apiError && <div className="api-error" role="alert">{apiError}</div>}
        {activeView === 'admin' && account.role === 'admin' ? <AdminPanel /> : activeView === 'evaluation' && (account.role === 'admin' || hasCurrentConsent(account)) ? <EvaluationPanel participant={account.role === 'learner'} /> : <>
        <section className="stats-grid" aria-label="Learning summary">
          <article className="stat-card"><span className="stat-icon green">◉</span><div><span className="stat-label">MISSIONS CLEARED</span><strong>{clearedCount} <small>/ {challenges.length}</small></strong></div><span className="stat-note">Keep it going</span></article>
          <article className="stat-card"><span className="stat-icon gold">✧</span><div><span className="stat-label">ACCURACY</span><strong>{accuracy ?? '—'}<small>%</small></strong></div><span className="stat-note">Across attempts</span></article>
          <article className="stat-card"><span className="stat-icon blue">↗</span><div><span className="stat-label">CURRENT RANK</span><strong>{rank.name}</strong></div><span className="stat-note">Earned through mission clears</span></article>
        </section>

        <section className="campaign-progress" aria-label="Campaign progress">
          <div className="campaign-progress-heading"><div><span className="eyebrow">CYBERWOLF FIELD CAMPAIGN</span><strong>{clearedCount} <small>/ {challenges.length} missions cleared</small></strong></div><span className="rank-pill">{rank.name}</span></div>
          <div className="campaign-track" role="progressbar" aria-label="Campaign mission completion" aria-valuenow={clearedCount} aria-valuemin="0" aria-valuemax={challenges.length}><span style={{ width: `${challenges.length ? clearedCount / challenges.length * 100 : 0}%` }} /></div>
          {rank.next && <div className="rank-progress"><span>{rank.next.threshold - clearedCount} mission clear{rank.next.threshold - clearedCount === 1 ? '' : 's'} to {rank.next.name}</span><div><i style={{ width: `${rankProgress}%` }} /></div></div>}
          <p>{rank.next ? 'First clears award the most XP; hints reduce that reward, and replay clears earn a smaller bonus.' : 'All campaign missions cleared. You are a Pathfinder.'}</p>
        </section>

        <section className="content-grid">
          <div className="challenge-column" id="challenges">
            <div className="section-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Your next module</h2></div><span className="module-count">{challenges.length} LEARNING MODULES</span></div>
            <div className="challenge-card">
              {loading && <p className="load-message">Connecting to the CyberWolf API…</p>}
              {!loading && !challenge && <p className="load-message">No challenges are available. Check the backend server.</p>}
              {challenge && <>
              <div className="challenge-top"><div><span className="topic-tag">{challenge.topic}</span><h3>{challenge.title}</h3><p className="challenge-desc">{challenge.description}</p></div><span className="difficulty">MISSION {challenge.missionOrder ?? challenges.findIndex(item => item.id === challenge.id) + 1} OF {challenges.length} · {challenge.duration.toUpperCase()}</span></div>
              <section className="module-briefing" aria-label="Module briefing"><div className="briefing-heading"><span className="briefing-icon">i</span><div><span className="briefing-label">QUICK BRIEFING</span><strong>What you’ll learn</strong></div></div><p className="learning-objective">{challenge.learningObjective}</p><ul>{challenge.briefing?.map(point => <li key={point}>{point}</li>)}</ul></section>
              <div className="scenario">{challenge.scenario}</div>
              <fieldset className="options" disabled={Boolean(feedback) || submitting}><legend>{challenge.question}</legend>{challenge.options.map((option, index) => <button key={option} className={`answer-option${selectedOption === index ? ' selected' : ''}`} type="button" aria-pressed={selectedOption === index} onClick={() => setSelectedOption(index)}><span className="option-key">{String.fromCharCode(65 + index)}</span><span>{option}</span></button>)}</fieldset>
              {!feedback && <div className="challenge-actions challenge-actions-wrap"><div className="action-help"><span className="hint">Choose the response that best protects you.</span>{hintsUsed > 0 && <span className="hint-count">{hintsUsed} hint{hintsUsed === 1 ? '' : 's'} used · fewer points for hinted answers</span>}</div><div className="action-buttons">{hintsUsed < (challenge.hints?.length ?? 0) && <button className="secondary-button hint-button" type="button" disabled={submitting} onClick={() => setHintsUsed(count => count + 1)}>Show hint {hintsUsed + 1}</button>}<button className="primary-button" type="button" disabled={selectedOption === null || submitting} onClick={submitAnswer}>{submitting ? 'Checking…' : 'Check my answer'} <span aria-hidden="true">→</span></button></div></div>}
              {!feedback && hintsUsed > 0 && <div className="hint-reveal" aria-live="polite">{challenge.hints.slice(0, hintsUsed).map((hint, index) => <p key={hint}><span>HINT {index + 1}</span>{hint}</p>)}</div>}
              {feedback && <><div className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`} role="status"><strong>{feedback.correct ? `Good call! +${feedback.points} XP${feedback.hintsUsed ? ` · ${feedback.hintsUsed} hint${feedback.hintsUsed === 1 ? '' : 's'} used` : ''}` : `Not quite. +${feedback.points} XP for giving it a try.`}</strong><span className="feedback-source">{feedback.feedbackSource === 'ai' ? 'AI-assisted feedback' : 'Guided feedback'}</span>{feedback.explanation}</div><div className="challenge-actions"><span className="hint">{clearedCount} of {challenges.length} missions cleared</span><button className="secondary-button" type="button" onClick={continueLearning}>{recommendation?.challengeId === challenge?.id ? 'Review this mission ↻' : 'Continue learning →'}</button></div></>}
              </>}
            </div>
            {challenges.length > 0 && <div className="challenge-picker"><span className="picker-label">MISSION BOARD · {challenges.length} SCENARIOS · CLEAR THEM IN ANY ORDER</span>{challenges.map((item, index) => <button className={`picker-item${item.id === challenge?.id ? ' current' : ''}${progress.completed.includes(item.id) ? ' cleared' : ''}`} key={item.id} onClick={() => chooseChallenge(item)} type="button" aria-current={item.id === challenge?.id ? 'step' : undefined}><span className="picker-state">{progress.completed.includes(item.id) ? '✓' : String(item.missionOrder ?? index + 1).padStart(2, '0')}</span><span className="picker-title">{item.title}<small>{item.topic}</small></span><span className="mission-state">{progress.completed.includes(item.id) ? 'CLEARED' : 'READY'}</span></button>)}</div>}
          </div>
          <aside className="recommendation" id="progress"><div className="recommend-icon">✳</div><div className="eyebrow">PERSONALIZED FOR YOU</div><h3>Your next move</h3><p>{recommendation?.message ?? 'Complete a challenge to get a recommendation based on your results.'}</p><div className="recommend-rule"><span className="rule-dot" /><span>{recommendation ? `Rule: ${recommendation.reason}` : 'Recommendations use your recent challenge results.'}</span></div>
            {topicSummary.length > 0 && <div className="insight-panel"><strong className="insight-title">TOPIC MASTERY</strong>{topicSummary.map(topic => <div className="mastery-row" key={topic.topic}><div className="mastery-label"><span>{topic.topic}</span><span>{topic.accuracy}%</span></div><div className="mastery-track"><span style={{ width: `${topic.accuracy}%` }} /></div></div>)}<small>{strongestTopic?.topic} is currently your strongest topic.</small></div>}
            {missedModules.length > 0 && <div className="insight-panel"><strong className="insight-title">REVIEW MISSED MODULES</strong>{missedModules.map(({ module, count }) => <button className="review-missed" type="button" key={module.id} onClick={() => chooseChallenge(module)}><span>{module.topic}<small>{count} missed attempt{count === 1 ? '' : 's'}</small></span><b>Review →</b></button>)}</div>}
            <div className="insight-panel"><strong className="insight-title">ACHIEVEMENTS · {achievements.filter(item => item.earned).length}/{achievements.length}</strong><div className="achievement-grid">{achievements.map(item => <div className={`achievement${item.earned ? ' earned' : ''}`} key={item.id} title={item.detail} aria-label={`${item.name}: ${item.detail}${item.earned ? ' Earned.' : ' Locked.'}`}><span>{item.icon}</span><small>{item.name}</small></div>)}</div></div>
            <div className="challenge-actions" style={{marginTop: '1rem', justifyContent:'space-between'}}>
              <button className="secondary-button" type="button" onClick={resetProgress}>Reset progress</button>
              <a href="#challenges" className="text-link">Explore challenges <span>→</span></a>
            </div>
          </aside>
        </section>
        </>}
        <footer>CYBERWOLF <span>•</span> LEARN TO SPOT THE SIGNAL</footer>
      </main>
    </div>
  );
}

export default App;
