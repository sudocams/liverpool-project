import { useEffect, useState } from 'react';

const blankModule = () => ({
  id: '', topic: '', duration: '4 min', difficulty: 'intermediate', title: '', description: '', learningObjective: '',
  briefing: [''], hints: [''], scenario: '', question: '', options: ['', ''], answerIndex: 0, explanation: '',
});
const moduleFields = ['id', 'topic', 'duration', 'difficulty', 'title', 'description', 'learningObjective', 'briefing', 'hints', 'scenario', 'question', 'options', 'answerIndex', 'explanation'];

function formContent(module) {
  return Object.fromEntries(moduleFields.map(field => [field, module[field] ?? (['briefing', 'hints'].includes(field) ? [''] : field === 'options' ? ['', ''] : field === 'answerIndex' ? 0 : '')]));
}

function Field({ label, name, value, onChange, maxLength = 1200, multiline = false, hint, disabled = false, ...props }) {
  const Input = multiline ? 'textarea' : 'input';
  return <label className="module-form-field"><span>{label}<small>{value.length}/{maxLength}</small></span><Input name={name} value={value} maxLength={maxLength} disabled={disabled} onChange={event => onChange(name, event.target.value)} required={!disabled} {...props} />{hint && <small className="module-field-hint">{hint}</small>}</label>;
}

function ListFields({ label, name, values, min, max, maxLength, onChange, onRemove }) {
  function update(index, value) { onChange(name, values.map((item, itemIndex) => itemIndex === index ? value : item)); }
  function remove(index) { onChange(name, values.filter((_, itemIndex) => itemIndex !== index)); }
  return <fieldset className="module-list-editor"><legend>{label}<small>{values.length}/{max}</small></legend>
    {values.map((value, index) => <div className="module-list-input-row" key={`${name}-${index}`}><label className="sr-only" htmlFor={`${name}-${index}`}>{label} {index + 1}</label><textarea id={`${name}-${index}`} value={value} maxLength={maxLength} required onChange={event => update(index, event.target.value)} /><span>{value.length}/{maxLength}</span><button className="secondary-button" type="button" disabled={values.length <= min} aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => onRemove ? onRemove(index) : remove(index)}>Remove</button></div>)}
    <button className="secondary-button module-add-item" type="button" disabled={values.length >= max} onClick={() => onChange(name, [...values, ''])}>+ Add {label.slice(0, -1).toLowerCase()}</button>
  </fieldset>;
}

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(blankModule);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedModule = modules.find(module => module.id === selectedId);

  async function loadModules() {
    const response = await fetch('/api/admin/modules');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load modules.');
    setModules(data);
  }

  useEffect(() => { loadModules().catch(loadError => setError(loadError.message)); }, []);

  function updateField(name, value) { setForm(current => ({ ...current, [name]: value })); }

  function selectModule(module) {
    setSelectedId(module.id);
    setForm(formContent(module));
    setError('');
    setMessage('');
  }

  function createModule() {
    setSelectedId(null);
    setForm(blankModule());
    setError('');
    setMessage('');
  }

  async function saveModule(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const content = { ...form, id: selectedId ?? form.id.trim(), answerIndex: Number(form.answerIndex), briefing: form.briefing.map(item => item.trim()), hints: form.hints.map(item => item.trim()), options: form.options.map(item => item.trim()) };
      const endpoint = selectedId ? `/api/admin/modules/${selectedId}` : '/api/admin/modules';
      const response = await fetch(endpoint, { method: selectedId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the module.');
      await loadModules();
      setSelectedId(result.id);
      setForm(formContent(result));
      setMessage('Module saved and available to learners.');
    } catch (saveError) { setError(saveError.message); }
    finally { setBusy(false); }
  }

  async function removeModule() {
    if (!selectedId || !window.confirm('Delete this learning module? Existing learner attempts will remain in progress records.')) return;
    setError(''); setMessage('');
    try {
      const response = await fetch(`/api/admin/modules/${selectedId}`, { method: 'DELETE' });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not delete module.');
      createModule();
      setMessage('Module deleted.');
      await loadModules();
    } catch (removeError) { setError(removeError.message); }
  }

  function removeOption(index) {
    setForm(current => ({ ...current, options: current.options.filter((_, itemIndex) => itemIndex !== index), answerIndex: current.answerIndex === index ? 0 : current.answerIndex > index ? current.answerIndex - 1 : current.answerIndex }));
  }

  return <section className="admin-view admin-modules-view">
    <div className="section-heading"><div><div className="eyebrow">CONTENT MANAGEMENT</div><h2>Learning modules</h2></div><span className="module-count">{modules.length} MODULES</span></div>
    {error && <div className="api-error" role="alert">{error}</div>}{message && <div className="practice-status" role="status">{message}</div>}
    <div className="admin-module-layout">
      <section className="admin-module-list"><div className="eyebrow">LEARNING MODULES · {modules.length}</div><button className="primary-button new-module-button" type="button" onClick={createModule}>+ New module</button>{modules.map(module => <button className={`admin-module-choice${selectedId === module.id ? ' selected' : ''}`} type="button" key={module.id} onClick={() => selectModule(module)}><b>{module.title}</b><small>{module.topic} · {module.id}</small></button>)}</section>
      <form className="admin-editor module-structured-editor" onSubmit={saveModule}>
        <div className="section-heading"><div><div className="eyebrow">{selectedId ? 'EDIT SCENARIO' : 'NEW SCENARIO'}</div><h3>{selectedId ? form.title || 'Edit module' : 'Create module and scenario'}</h3></div>{selectedId && <button className="danger-button" type="button" disabled={selectedModule?.pathProtected} title={selectedModule?.pathProtected ? 'Guided path challenges cannot be deleted.' : undefined} onClick={removeModule}>{selectedModule?.pathProtected ? 'Path module' : 'Delete module'}</button>}</div>
        <p>Fill in the module details and its learner scenario. Fields and list limits match the existing content rules.</p>
        <fieldset className="module-form-section"><legend>Module details</legend>
          <div className="module-form-grid"><Field label="Module ID" name="id" value={form.id} onChange={updateField} maxLength={60} minLength={3} pattern="[a-z0-9-]+" placeholder="example: safe-email" disabled={Boolean(selectedId)} hint="3–60 lowercase letters, numbers, or hyphens. This is fixed after creation." />
            <Field label="Topic" name="topic" value={form.topic} onChange={updateField} />
            <Field label="Estimated duration" name="duration" value={form.duration} onChange={updateField} maxLength={50} placeholder="4 min" />
            <label className="module-form-field"><span>Difficulty</span><select value={form.difficulty} onChange={event => updateField('difficulty', event.target.value)}><option value="foundational">Foundational</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
            <Field label="Module title" name="title" value={form.title} onChange={updateField} />
            <Field label="Description" name="description" value={form.description} onChange={updateField} multiline />
            <Field label="Learning objective" name="learningObjective" value={form.learningObjective} onChange={updateField} multiline />
          </div>
        </fieldset>
        <fieldset className="module-form-section"><legend>Scenario and learner guidance</legend>
          <Field label="Scenario" name="scenario" value={form.scenario} onChange={updateField} multiline />
          <Field label="Question" name="question" value={form.question} onChange={updateField} multiline />
          <div className="module-form-grid module-guidance-grid"><ListFields label="Briefing points" name="briefing" values={form.briefing} min={1} max={5} maxLength={300} onChange={updateField} /><ListFields label="Hints" name="hints" values={form.hints} min={1} max={5} maxLength={300} onChange={updateField} /></div>
          <ListFields label="Answer options" name="options" values={form.options} min={2} max={6} maxLength={500} onChange={updateField} onRemove={removeOption} />
          <label className="module-form-field module-correct-answer"><span>Correct answer</span><select value={form.answerIndex} onChange={event => updateField('answerIndex', event.target.value)}>{form.options.map((option, index) => <option key={index} value={index}>{option.trim() ? `${String.fromCharCode(65 + index)} · ${option}` : `Option ${String.fromCharCode(65 + index)} (enter text above)`}</option>)}</select></label>
          <Field label="Explanation shown after response" name="explanation" value={form.explanation} onChange={updateField} multiline />
        </fieldset>
        <div className="module-editor-footer">{error && <span className="editor-error" role="alert">{error}</span>}{message && <span className="editor-success" role="status">{message}</span>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Saving…' : selectedId ? 'Save module' : 'Create module'}</button></div>
      </form>
    </div>
  </section>;
}
