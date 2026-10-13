import { useState } from 'react';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (mode !== 'login' && password !== passwordConfirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const endpoint = mode === 'register' ? '/api/auth/register' : mode === 'admin' ? '/api/auth/bootstrap-admin' : '/api/auth/login';
    const payload = mode === 'register' ? { password } : mode === 'admin' ? { setupKey, password } : { handle: handle.trim(), password };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = response.status === 204 ? {} : await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not authenticate.');
      const accountResponse = await fetch('/api/auth/me');
      const currentAccount = accountResponse.ok ? await accountResponse.json() : { handle: result.handle, role: result.role };
      onAuthenticated(currentAccount, mode !== 'login');
    } catch (submitError) {
      setError(`${submitError.message} Check that the backend server is running.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="#home"><span className="brand-mark">W</span><span>cyber<span className="brand-light">wolf</span></span></a>
        <div className="eyebrow">PRIVACY-FIRST LEARNING ACCOUNT</div>
        <h1>{mode === 'register' ? 'Create your account' : mode === 'admin' ? 'Set up the admin account' : 'Welcome back'}</h1>
        <p className="auth-description">No name, email, phone number, or personal ID is requested. New learners receive a random sign-in handle.</p>
        <form onSubmit={submit}>
          {mode === 'login' && <label className="auth-field">Sign-in handle<input autoComplete="username" value={handle} onChange={event => setHandle(event.target.value)} placeholder="wolf-a1b2c3d4e5" required /></label>}
          {mode === 'admin' && <label className="auth-field">One-time admin setup key<input autoComplete="off" type="password" value={setupKey} onChange={event => setSetupKey(event.target.value)} required /></label>}
          <label className="auth-field">Password<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" minLength="12" maxLength="128" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 12 characters" required /></label>
          {mode !== 'login' && <label className="auth-field">Confirm password<input autoComplete="new-password" type="password" minLength="12" maxLength="128" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} required /></label>}
          {error && <div className="api-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'admin' ? 'Create admin account' : 'Create learner account'}</button>
        </form>
        <div className="auth-links">
          {mode !== 'login' && <button type="button" onClick={() => { setMode('login'); setError(''); }}>I already have a handle</button>}
          {mode !== 'register' && <button type="button" onClick={() => { setMode('register'); setError(''); }}>Create learner account</button>}
          {mode !== 'admin' && <button type="button" onClick={() => { setMode('admin'); setError(''); }}>Set up first admin</button>}
        </div>
        <p className="auth-footnote">Keep your handle and password safe. Since no contact details are collected, lost credentials cannot be recovered.</p>
      </section>
    </main>
  );
}
