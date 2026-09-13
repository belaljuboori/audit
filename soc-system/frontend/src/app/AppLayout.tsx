import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/i18n-context';
import { useAuthStore } from '../features/auth/auth-store';

export function AppLayout() {
  const { t, locale, setLocale } = useI18n();
  const logout = useAuthStore((s) => s.logout);
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const canSeeNodes = permissions.includes('nodes.read');

  return (
    <div>
      <header className="soc-header">
        <span className="soc-app-name">{t.appName}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="soc-lang-toggle" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}>
            {locale === 'ar' ? 'English' : 'العربية'}
          </button>
          <button className="soc-lang-toggle" onClick={handleLogout}>
            {t.dashboard.logout}
          </button>
        </div>
      </header>
      <nav className="soc-nav">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
          {t.nav.dashboard}
        </NavLink>
        {canSeeNodes && (
          <NavLink to="/nodes" className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.nav.nodes}
          </NavLink>
        )}
      </nav>
      <Outlet />
    </div>
  );
}
