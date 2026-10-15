import { useState } from 'react';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('welcome');
  const [username, setUsername] = useState('');
  const [learnerCode, setLearnerCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
  }

  async function finishSignIn(result, isNew) {
    const accountResponse = await fetch('/api/auth/me');
    const currentAccount = accountResponse.ok ? await accountResponse.json() : result;
    onAuthenticated(currentAccount, isNew);
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const isSetup = mode === 'admin-setup';
    const isCreate = mode === 'learner-create';
    if ((isSetup || isCreate) && password !== passwordConfirm) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    const endpoint = mode === 'admin-login' ? '/api/auth/admin-login' : isSetup ? '/api/auth/bootstrap-admin' : isCreate ? '/api/auth/register' : '/api/auth/login';
    const payload = mode === 'admin-login'
      ? { username: username.trim(), password }
      : isSetup
        ? { setupKey, username: username.trim(), password }
        : isCreate ? { password } : { handle: learnerCode.trim(), password };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not authenticate.');
      await finishSignIn(result, isSetup || isCreate);
    } catch (submitError) {
      setError(`${submitError.message} Check that the backend server is running.`);
    } finally { setBusy(false); }
  }

  const isAdmin = mode === 'admin-login' || mode === 'admin-setup';
  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="#home"><span className="brand-mark">W</span><span>cyber<span className="brand-light">wolf</span></span></a>
        <div className="eyebrow">PRIVACY-FIRST CYBERSECURITY LEARNING</div>
        {mode === 'welcome' ? <>
          <h1>Choose how to continue</h1>
          <p className="auth-description">Create a private learner profile with a random code and password. This keeps your saved progress available after clearing browser data or changing devices. No name, email, phone number, or personal ID is requested.</p>
          {error && <div className="api-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="button" onClick={() => changeMode('learner-create')}>Create learner profile</button>
          <p className="auth-footnote">Your progress is saved to the account on the CyberWolf server. Save your learner code and password somewhere safe; without either, there is no recovery contact.</p>
          <div className="auth-links"><button type="button" onClick={() => changeMode('admin-login')}>Admin sign in</button><button type="button" onClick={() => changeMode('learner-login')}>Returning learner with a code</button><button type="button" onClick={() => changeMode('admin-setup')}>Set up first admin</button></div>
        </> : <>
          <h1>{mode === 'admin-setup' ? 'Set up the first admin' : mode === 'admin-login' ? 'Admin sign in' : mode === 'learner-create' ? 'Create learner profile' : 'Returning learner sign in'}</h1>
          <p className="auth-description">{isAdmin ? 'Admin access is separate from learner sessions and requires an admin username and password.' : mode === 'learner-create' ? 'CyberWolf creates a learner code and saves your progress to your server-side profile. No personal details are needed.' : 'Enter the learner code and password you saved when you created your account.'}</p>
          <form onSubmit={submit}>
            {mode === 'learner-login' && <label className="auth-field">Learner code<input autoComplete="username" value={learnerCode} onChange={event => setLearnerCode(event.target.value)} placeholder="wolf-a1b2c3d4e5" required /></label>}
            {isAdmin && <label className="auth-field">Admin username<input autoComplete="username" minLength="3" maxLength="32" value={username} onChange={event => setUsername(event.target.value)} required /></label>}
            {mode === 'admin-setup' && <label className="auth-field">One-time setup key<input autoComplete="off" type="password" value={setupKey} onChange={event => setSetupKey(event.target.value)} required /></label>}
            <label className="auth-field">Password<input autoComplete={mode === 'admin-login' || mode === 'learner-login' ? 'current-password' : 'new-password'} type="password" minLength={mode === 'admin-login' || mode === 'learner-login' ? undefined : '12'} maxLength="128" value={password} onChange={event => setPassword(event.target.value)} required /></label>
            {(mode === 'admin-setup' || isCreate) && <label className="auth-field">Confirm password<input autoComplete="new-password" type="password" minLength="12" maxLength="128" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} required /></label>}
            {error && <div className="api-error" role="alert">{error}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'admin-setup' ? 'Create admin account' : 'Sign in'}</button>
          </form>
          <div className="auth-links"><button type="button" onClick={() => changeMode('welcome')}>Back to learner access</button>{mode === 'admin-login' && <button type="button" onClick={() => changeMode('admin-setup')}>Set up first admin</button>}{mode === 'learner-login' && <button type="button" onClick={() => changeMode('learner-create')}>Create a learner profile</button>}</div>
          {mode === 'learner-login' && <p className="auth-footnote">Use the learner code and password you saved. Your progress is stored with that account.</p>}
          {isAdmin && <p className="auth-footnote">Admin credentials should be private and unique. The first admin account also requires the server’s one-time setup key.</p>}
        </>}
      </section>
    </main>
  );
}
