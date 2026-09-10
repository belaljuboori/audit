import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/i18n-context';
import { useAuthStore } from '../auth/auth-store';

export function DashboardShell() {
  const { t, locale, setLocale } = useI18n();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div>
      <header className="soc-header">
        <span className="soc-app-name">{t.appName}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="soc-lang-toggle"
            onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
          >
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>
          <button className="soc-lang-toggle" onClick={handleLogout}>
            {t.dashboard.logout}
          </button>
        </div>
      </header>
      <main className="soc-content">
        <h2>
          {t.dashboard.welcome}, {user?.fullName}
        </h2>

        <section>
          <h3>{t.dashboard.roles}</h3>
          {user?.roles.map((role) => (
            <span key={role} className="soc-badge">
              {role}
            </span>
          ))}
        </section>

        <section style={{ marginTop: 16 }}>
          <h3>{t.dashboard.permissions}</h3>
          {user?.permissions.length ? (
            user.permissions.map((p) => (
              <span key={p} className="soc-badge">
                {p}
              </span>
            ))
          ) : (
            <span className="soc-badge">—</span>
          )}
        </section>

        <div className="soc-notice">{t.dashboard.placeholderNotice}</div>
      </main>
    </div>
  );
}
