import { useState } from 'react';

export default function StudyConsent({ version, retentionDays = 0, previouslyConsented = false, actionError = '', onParticipate, onPractice, onWithdraw }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!accepted) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/research/consent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true, version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your choice.');
      onParticipate(result.researchConsent);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <section className="auth-card consent-card">
        <a className="brand auth-brand" href="#home"><span className="brand-mark">W</span><span>cyber<span className="brand-light">wolf</span></span></a>
        <div className="eyebrow">PARTICIPANT INFORMATION · DRAFT</div>
        <h1>Choose how to use CyberWolf</h1>
        <p className="auth-description">This prototype is being evaluated as part of a study of cybersecurity learning. Taking part is your choice.</p>
        {previouslyConsented && <p className="consent-version-note">The study information has changed since your earlier consent. Review this version before recording further study activity. Your earlier records remain governed by the consent you previously gave; you can withdraw below to delete them.</p>}
        <div className="consent-details">
          <h2>If you choose to participate</h2>
          <ul>
            <li>CyberWolf records challenge answers and scores, completion, randomized pre/post assessment scores by topic, active time while the learning page is visible and focused, whether feedback was AI-generated or guided, and adaptive recommendations shown to you.</li>
            <li>Authorized admins can review per-learner progress using your pseudonymous sign-in handle, including assessment improvement, challenge and module completion, activity time, AI-feedback usage, and recommendation history. Your study events are stored under an internal random account key; event records do not contain your handle or password.</li>
            <li>{retentionDays > 0 ? `Study activity older than ${retentionDays} days is scheduled for automatic deletion. You can withdraw sooner to delete your saved study records.` : 'No automatic time-based deletion is configured in this prototype. You can withdraw at any time to delete your saved study records.'}</li>
            <li>If an external AI feedback provider is configured, the challenge context and selected answer may be sent to that provider. The final study information must name the provider and explain its data handling.</li>
            <li>The dashboard also provides group-level summaries. Questionnaire items use ratings only; there is no free-text box.</li>
            <li>You can withdraw at any time. Withdrawal deletes your saved study progress, assessment results, and feedback ratings from this prototype.</li>
          </ul>
          <h2>If you choose not to participate</h2>
          <p>You can still use the challenges in practice-only mode. Answers and progress stay only in the current browser session and are not saved as study records.</p>
          <p className="consent-draft-note">Draft information for implementation. Your supervisor and ethics process must approve the final participant information and consent wording before recruitment or research data collection.</p>
        </div>
        <form onSubmit={submit}>
          <label className="consent-checkbox"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /><span>I have read this information and voluntarily agree to take part (version {version}).</span></label>
          {error && <div className="api-error" role="alert">{error}</div>}
          {actionError && <div className="api-error" role="alert">{actionError}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={!accepted || busy}>{busy ? 'Saving…' : 'Agree and participate'}</button>
        </form>
        <button className="secondary-button practice-choice" type="button" onClick={onPractice}>Continue without participating</button>
        {previouslyConsented && <button className="logout-button consent-withdraw" type="button" onClick={onWithdraw}>Withdraw and delete my saved study records</button>}
      </section>
    </main>
  );
}
