import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/i18n-context';
import { useAuthStore } from '../auth/auth-store';
import { collectorsApi, CreateNodePayload, NodeSummary, nodesApi, TestConnectionResult } from './nodes-api';
import { AddNodeDialog } from './AddNodeDialog';
import { ReAuthPromptDialog } from './ReAuthPromptDialog';
import { TestResultsDialog } from './TestResultsDialog';

type PendingReAuthAction = { kind: 'delete'; nodeId: string } | { kind: 'rotate'; nodeId: string; secret: string };

export function NodesPage() {
  const { t } = useI18n();
  const accessToken = useAuthStore((s) => s.accessToken)!;
  const permissions = useAuthStore((s) => s.user?.permissions ?? []);

  const [nodes, setNodes] = useState<NodeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [pendingReAuth, setPendingReAuth] = useState<PendingReAuthAction | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);

  const canCreate = permissions.includes('nodes.create');
  const canUpdate = permissions.includes('nodes.update');
  const canDelete = permissions.includes('nodes.delete');
  const canTest = permissions.includes('nodes.test');
  const canStartCollector = permissions.includes('collectors.start');
  const canStopCollector = permissions.includes('collectors.stop');
  const canRestartCollector = permissions.includes('collectors.restart');

  const loadNodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nodesApi.list(accessToken);
      setNodes(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadNodes();
  }, [loadNodes]);

  async function handleCreate(payload: CreateNodePayload) {
    await nodesApi.create(accessToken, payload);
    setShowAddDialog(false);
    await loadNodes();
  }

  async function handleTestConnection(nodeId: string) {
    setBusyNodeId(nodeId);
    try {
      const result = await nodesApi.testConnection(accessToken, nodeId);
      setTestResult(result);
      await loadNodes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyNodeId(null);
    }
  }

  async function handleToggleEnabled(node: NodeSummary) {
    setBusyNodeId(node.id);
    try {
      if (node.enabled) {
        await nodesApi.disable(accessToken, node.id);
      } else {
        await nodesApi.enable(accessToken, node.id);
      }
      await loadNodes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyNodeId(null);
    }
  }

  async function handleCollectorAction(nodeId: string, action: 'start' | 'stop' | 'restart') {
    setBusyNodeId(nodeId);
    try {
      await collectorsApi[action](accessToken, nodeId);
      await loadNodes();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyNodeId(null);
    }
  }

  async function handleReAuthConfirm(currentPassword: string) {
    if (!pendingReAuth) return;
    if (pendingReAuth.kind === 'delete') {
      await nodesApi.remove(accessToken, pendingReAuth.nodeId, currentPassword);
    } else {
      await nodesApi.rotateCredential(accessToken, pendingReAuth.nodeId, pendingReAuth.secret, 'API_TOKEN', currentPassword);
    }
    setPendingReAuth(null);
    await loadNodes();
  }

  function requestRotate(nodeId: string) {
    const secret = window.prompt(t.nodes.newSecret);
    if (secret) {
      setPendingReAuth({ kind: 'rotate', nodeId, secret });
    }
  }

  return (
    <div className="soc-content-wide">
      <div className="soc-toolbar">
        <h2 style={{ margin: 0 }}>{t.nodes.title}</h2>
        {canCreate && (
          <button className="soc-button" style={{ width: 'auto' }} onClick={() => setShowAddDialog(true)}>
            {t.nodes.addNode}
          </button>
        )}
      </div>

      {error && <div className="soc-error">{error}</div>}

      {loading ? (
        <div>{t.common.loading}</div>
      ) : nodes.length === 0 ? (
        <div className="soc-notice">{t.nodes.empty}</div>
      ) : (
        <div className="soc-table-wrap">
          <table className="soc-table">
            <thead>
              <tr>
                <th>{t.nodes.name}</th>
                <th>{t.nodes.type}</th>
                <th>{t.nodes.environment}</th>
                <th>{t.nodes.host}</th>
                <th>{t.nodes.health}</th>
                <th>{t.nodes.collector}</th>
                <th>{t.nodes.actions}</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => {
                const busy = busyNodeId === node.id;
                return (
                  <tr key={node.id}>
                    <td>{node.name}</td>
                    <td>{node.type}</td>
                    <td>{node.environment}</td>
                    <td>
                      {node.host}:{node.port}
                    </td>
                    <td>
                      <span className={`soc-status-dot soc-status-${node.currentHealth}`} />
                      {node.currentHealth}
                    </td>
                    <td>
                      <span className={`soc-status-dot soc-status-${node.collector?.status ?? 'STOPPED'}`} />
                      {node.collector?.status ?? '—'}
                    </td>
                    <td>
                      <div className="soc-row-actions">
                        {canTest && (
                          <button
                            className="soc-btn-sm"
                            disabled={busy}
                            onClick={() => handleTestConnection(node.id)}
                          >
                            {t.nodes.testConnection}
                          </button>
                        )}
                        {canUpdate && (
                          <button className="soc-btn-sm" disabled={busy} onClick={() => handleToggleEnabled(node)}>
                            {node.enabled ? t.nodes.disable : t.nodes.enable}
                          </button>
                        )}
                        {canStartCollector && (
                          <button
                            className="soc-btn-sm"
                            disabled={busy || !node.enabled}
                            onClick={() => handleCollectorAction(node.id, 'start')}
                          >
                            {t.nodes.start}
                          </button>
                        )}
                        {canStopCollector && (
                          <button
                            className="soc-btn-sm"
                            disabled={busy}
                            onClick={() => handleCollectorAction(node.id, 'stop')}
                          >
                            {t.nodes.stop}
                          </button>
                        )}
                        {canRestartCollector && (
                          <button
                            className="soc-btn-sm"
                            disabled={busy || !node.enabled}
                            onClick={() => handleCollectorAction(node.id, 'restart')}
                          >
                            {t.nodes.restart}
                          </button>
                        )}
                        {canUpdate && (
                          <button className="soc-btn-sm" disabled={busy} onClick={() => requestRotate(node.id)}>
                            {t.nodes.rotateCredential}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="soc-btn-sm soc-btn-danger"
                            disabled={busy}
                            onClick={() => setPendingReAuth({ kind: 'delete', nodeId: node.id })}
                          >
                            {t.nodes.delete}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddDialog && <AddNodeDialog onCreate={handleCreate} onCancel={() => setShowAddDialog(false)} />}
      {testResult && <TestResultsDialog result={testResult} onClose={() => setTestResult(null)} />}
      {pendingReAuth && (
        <ReAuthPromptDialog
          title={t.nodes.confirmDeleteTitle}
          onConfirm={handleReAuthConfirm}
          onCancel={() => setPendingReAuth(null)}
        />
      )}
    </div>
  );
}
