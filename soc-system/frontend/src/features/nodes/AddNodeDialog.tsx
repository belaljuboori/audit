import { FormEvent, useState } from 'react';
import { useI18n } from '../../i18n/i18n-context';
import { CreateNodePayload, NodeAuthMethod, NodeEnvironment, NodeType } from './nodes-api';

interface Props {
  onCreate: (payload: CreateNodePayload) => Promise<void>;
  onCancel: () => void;
}

const NODE_TYPES: NodeType[] = ['FORTIGATE', 'FORTIWEB', 'ACTIVE_DIRECTORY', 'GPO_COLLECTOR'];
const ENVIRONMENTS: NodeEnvironment[] = ['PRODUCTION', 'UAT', 'DR'];
const AUTH_METHODS: NodeAuthMethod[] = ['API_TOKEN', 'USERNAME_PASSWORD', 'SERVICE_ACCOUNT', 'LDAP_BIND'];

export function AddNodeDialog({ onCreate, onCancel }: Props) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'FORTIGATE' as NodeType,
    environment: 'PRODUCTION' as NodeEnvironment,
    host: '',
    port: 443,
    apiBaseUrl: '',
    authMethod: 'API_TOKEN' as NodeAuthMethod,
    secret: '',
    tlsVerify: true,
    pollingIntervalSeconds: 300,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: form.name,
        type: form.type,
        environment: form.environment,
        host: form.host,
        port: Number(form.port),
        apiBaseUrl: form.apiBaseUrl || undefined,
        authMethod: form.authMethod,
        credential: { credentialType: form.authMethod === 'API_TOKEN' ? 'API_TOKEN' : 'PASSWORD', secret: form.secret },
        tlsVerify: form.tlsVerify,
        pollingIntervalSeconds: Number(form.pollingIntervalSeconds),
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="soc-modal-backdrop" role="dialog" aria-modal="true">
      <form className="soc-modal" onSubmit={handleSubmit}>
        <h2 className="soc-title">{t.nodes.addNode}</h2>
        {error && <div className="soc-error">{error}</div>}
        <div className="soc-form-grid">
          <div className="soc-field soc-field-full">
            <label htmlFor="node-name">{t.nodes.name}</label>
            <input id="node-name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>

          <div className="soc-field">
            <label htmlFor="node-type">{t.nodes.type}</label>
            <select id="node-type" value={form.type} onChange={(e) => update('type', e.target.value as NodeType)}>
              {NODE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="soc-field">
            <label htmlFor="node-env">{t.nodes.environment}</label>
            <select
              id="node-env"
              value={form.environment}
              onChange={(e) => update('environment', e.target.value as NodeEnvironment)}
            >
              {ENVIRONMENTS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="soc-field">
            <label htmlFor="node-host">{t.nodes.host}</label>
            <input id="node-host" value={form.host} onChange={(e) => update('host', e.target.value)} required />
          </div>

          <div className="soc-field">
            <label htmlFor="node-port">{t.nodes.port}</label>
            <input
              id="node-port"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(e) => update('port', Number(e.target.value))}
              required
            />
          </div>

          <div className="soc-field soc-field-full">
            <label htmlFor="node-api-base-url">{t.nodes.apiBaseUrl}</label>
            <input
              id="node-api-base-url"
              value={form.apiBaseUrl}
              onChange={(e) => update('apiBaseUrl', e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="soc-field">
            <label htmlFor="node-auth-method">{t.nodes.authMethod}</label>
            <select
              id="node-auth-method"
              value={form.authMethod}
              onChange={(e) => update('authMethod', e.target.value as NodeAuthMethod)}
            >
              {AUTH_METHODS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="soc-field">
            <label htmlFor="node-secret">{t.nodes.secret}</label>
            <input
              id="node-secret"
              type="password"
              value={form.secret}
              onChange={(e) => update('secret', e.target.value)}
              required
            />
          </div>

          <div className="soc-field">
            <label htmlFor="node-polling">{t.nodes.pollingInterval}</label>
            <input
              id="node-polling"
              type="number"
              min={30}
              value={form.pollingIntervalSeconds}
              onChange={(e) => update('pollingIntervalSeconds', Number(e.target.value))}
            />
          </div>

          <div className="soc-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="node-tls-verify"
              type="checkbox"
              checked={form.tlsVerify}
              onChange={(e) => update('tlsVerify', e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="node-tls-verify" style={{ margin: 0 }}>
              {t.nodes.tlsVerify}
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="soc-button" disabled={submitting}>
            {submitting ? t.common.loading : t.nodes.create}
          </button>
          <button type="button" className="soc-btn-sm" onClick={onCancel}>
            {t.nodes.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
