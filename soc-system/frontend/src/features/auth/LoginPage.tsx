import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/i18n-context';
import { useAuthStore } from './auth-store';

export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch {
      // error surfaced via the store's `error` field
    }
  }

  return (
    <div className="soc-center-screen">
      <form className="soc-card" onSubmit={handleSubmit}>
        <h1 className="soc-title">{t.login.title}</h1>
        {error && <div className="soc-error">{error}</div>}
        <div className="soc-field">
          <label htmlFor="username">{t.login.username}</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="soc-field">
          <label htmlFor="password">{t.login.password}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="soc-button" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? t.common.loading : t.login.submit}
        </button>
      </form>
    </div>
  );
}
