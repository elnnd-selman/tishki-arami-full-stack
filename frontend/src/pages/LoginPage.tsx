import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../lib/api';
import { Spinner } from '../components/ui/Spinner';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

export function LoginPage() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@tishkiarami.com');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    const to = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      const to = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(to, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-aside">
        <div className="login-aside-inner">
          <span className="brand-mark brand-mark-lg">TA</span>
          <h2>{t('app.title')}</h2>
          <p>{t('auth.subtitle')}</p>
        </div>
        <div className="login-aside-decor" />
      </div>

      <div className="login-main">
        <div className="login-topbar">
          <LanguageSwitcher />
        </div>

        <form className="login-card" onSubmit={onSubmit}>
          <h1 className="login-title">{t('auth.welcome')}</h1>
          <p className="muted" style={{ marginBottom: 24 }}>
            {t('auth.subtitle')}
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <div className="field" style={{ marginBottom: 16 }}>
            <label className="label" htmlFor="email">
              {t('auth.email')}
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field" style={{ marginBottom: 24 }}>
            <label className="label" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <Spinner size="sm" /> : null}
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>

          <div className="login-demo">
            <span className="muted text-sm">{t('auth.demoAccounts')}</span>
            <code>admin@tishkiarami.com / Admin@12345</code>
            <code>editor@tishkiarami.com / Editor@12345</code>
            <code>viewer@tishkiarami.com / Viewer@12345</code>
          </div>
        </form>
      </div>
    </div>
  );
}
