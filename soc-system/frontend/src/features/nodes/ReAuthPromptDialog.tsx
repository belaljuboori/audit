import { FormEvent, useState } from 'react';
import { useI18n } from '../../i18n/i18n-context';

interface Props {
  title: string;
  onConfirm: (currentPassword: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Re-authentication prompt for sensitive actions (delete node, rotate
 * credential, bulk start/stop, maintenance mode) — the backend's ReAuthGuard
 * rejects these requests without a correct `currentPassword` regardless of
 * what this dialog does, so this is UX for that requirement, not the
 * enforcement boundary itself.
 */
export function ReAuthPromptDialog({ title, onConfirm, onCancel }: Props) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="soc-modal-backdrop" role="dialog" aria-modal="true">
      <form className="soc-modal" onSubmit={handleSubmit}>
        <h2 className="soc-title">{title}</h2>
        {error && <div className="soc-error">{error}</div>}
        <div className="soc-field">
          <label htmlFor="reauth-password">{t.nodes.confirmPassword}</label>
          <input
            id="reauth-password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="soc-button" disabled={submitting}>
            {submitting ? t.common.loading : t.nodes.confirm}
          </button>
          <button type="button" className="soc-btn-sm" onClick={onCancel}>
            {t.nodes.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
