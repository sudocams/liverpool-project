import { useEffect, useState } from 'react';

const blankModule = {
  id: 'new-module', topic: 'New topic', duration: '4 min', title: 'New learning module', description: '',
  learningObjective: '', briefing: [''], hints: ['', ''], scenario: '', question: '', options: ['', '', '', ''], answerIndex: 0, explanation: '',
};

function editable(module) {
  const { _id, __v, createdAt, updatedAt, ...content } = module;
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

  async function loadAdminData() {
    const [moduleResponse, summaryResponse] = await Promise.all([fetch('/api/admin/modules'), fetch('/api/research/summary')]);
    const moduleData = await moduleResponse.json();
    const summaryData = await summaryResponse.json();
    if (!moduleResponse.ok) throw new Error(moduleData.error || 'Could not load modules.');
    if (!summaryResponse.ok) throw new Error(summaryData.error || 'Could not load research summary.');
    setModules(moduleData);
    setSummary(summaryData);
  }

  useEffect(() => { loadAdminData().catch(loadError => setError(loadError.message)); }, []);

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

  return (
    <section className="admin-view">
      <div className="section-heading"><div><div className="eyebrow">ADMINISTRATION</div><h2>Project control room</h2></div><span className="module-count">ADMIN ACCESS</span></div>
      <div className="research-summary"><div className="eyebrow">RESEARCH SUMMARY</div><h3>Aggregate evaluation snapshot</h3><div className="summary-grid">
        <div><span>Pre-assessments</span><strong>{summary?.learnersWithPre ?? '—'}</strong></div><div><span>Post-assessments</span><strong>{summary?.learnersWithPost ?? '—'}</strong></div><div><span>Matched pairs</span><strong>{summary?.matchedPairs ?? '—'}</strong></div><div><span>Mean pre score</span><strong>{summary?.meanPrePercent == null ? '—' : `${summary.meanPrePercent}%`}</strong></div><div><span>Mean post score</span><strong>{summary?.meanPostPercent == null ? '—' : `${summary.meanPostPercent}%`}</strong></div><div><span>Mean score change</span><strong>{summary?.meanChangePoints == null ? '—' : `${summary.meanChangePoints > 0 ? '+' : ''}${summary.meanChangePoints} pts`}</strong></div>
      </div><h3 className="feedback-summary-title">Participant experience ratings (1–5)</h3><div className="summary-grid feedback-summary-grid">
        <div><span>Questionnaire responses</span><strong>{summary?.feedbackResponseCount ?? '—'}</strong></div>
        <div><span>Usability</span><strong>{summary?.feedbackMeanRatings?.usability ?? '—'}</strong></div>
        <div><span>Engagement</span><strong>{summary?.feedbackMeanRatings?.engagement ?? '—'}</strong></div>
        <div><span>Learning value</span><strong>{summary?.feedbackMeanRatings?.learningValue ?? '—'}</strong></div>
        <div><span>Adaptation relevance</span><strong>{summary?.feedbackMeanRatings?.adaptationRelevance ?? '—'}</strong></div>
        <div><span>Feedback clarity</span><strong>{summary?.feedbackMeanRatings?.feedbackClarity ?? '—'}</strong></div>
      </div><small className="summary-disclaimer">{summary?.note}</small></div>

      <div className="admin-module-layout"><section className="admin-module-list"><div className="eyebrow">LEARNING MODULES · {modules.length}</div><button className="primary-button new-module-button" type="button" onClick={() => { setSelectedId(null); setJsonText(JSON.stringify(blankModule, null, 2)); setMessage(''); setError(''); }}>+ New module</button>{modules.map(module => <button className={`admin-module-choice${selectedId === module.id ? ' selected' : ''}`} type="button" key={module.id} onClick={() => selectModule(module)}><b>{module.title}</b><small>{module.topic} · {module.id}</small></button>)}</section>
        <form className="admin-editor" onSubmit={saveModule}><div className="section-heading"><div><div className="eyebrow">CONTENT EDITOR</div><h3>{selectedId ? 'Edit module' : 'Create module'}</h3></div>{selectedId && <button className="danger-button" type="button" onClick={removeModule}>Delete</button>}</div><p>Edit module JSON. Keep every field and make sure `answerIndex` points to the correct option.</p><textarea aria-label="Learning module JSON" spellCheck="false" value={jsonText} onChange={event => setJsonText(event.target.value)} /><div className="editor-footer">{error && <span className="editor-error" role="alert">{error}</span>}{message && <span className="editor-success" role="status">{message}</span>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save module'}</button></div></form>
      </div>
    </section>
  );
}
