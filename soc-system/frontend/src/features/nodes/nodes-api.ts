import { authorizedRequest } from '../../shared/api/authorized-request';

export type NodeType = 'FORTIGATE' | 'FORTIWEB' | 'ACTIVE_DIRECTORY' | 'GPO_COLLECTOR';
export type NodeEnvironment = 'PRODUCTION' | 'UAT' | 'DR';
export type NodeAuthMethod = 'API_TOKEN' | 'USERNAME_PASSWORD' | 'SERVICE_ACCOUNT' | 'LDAP_BIND';
export type NodeHealthStatus = 'UNKNOWN' | 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'DISABLED' | 'MAINTENANCE';
export type CollectorStatus = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR';

export interface NodeSummary {
  id: string;
  name: string;
  type: NodeType;
  description: string | null;
  environment: NodeEnvironment;
  enabled: boolean;
  host: string;
  port: number;
  apiVersion: string | null;
  vdom: string | null;
  tlsVerify: boolean;
  authMethod: NodeAuthMethod;
  pollingIntervalSeconds: number;
  currentHealth: NodeHealthStatus;
  currentLatencyMs: number | null;
  lastSuccessfulConnectionAt: string | null;
  lastCollectionAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  collector: { status: CollectorStatus; lastHeartbeatAt: string | null } | null;
  credential: { credentialType: string; rotatedAt: string } | null;
}

export interface TestConnectionStep {
  step: number;
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED' | 'PENDING_ADAPTER';
  detail: string;
  durationMs: number;
}

export interface TestConnectionResult {
  overallStatus: NodeHealthStatus;
  latencyMs: number | null;
  steps: TestConnectionStep[];
}

export interface CreateNodePayload {
  name: string;
  type: NodeType;
  description?: string;
  environment?: NodeEnvironment;
  host: string;
  port: number;
  apiBaseUrl?: string;
  apiVersion?: string;
  vdom?: string;
  tlsVerify?: boolean;
  authMethod: NodeAuthMethod;
  credential: { credentialType: string; secret: string };
  pollingIntervalSeconds?: number;
}

export const nodesApi = {
  list: (token: string) => authorizedRequest<NodeSummary[]>(token, '/nodes'),

  create: (token: string, payload: CreateNodePayload) =>
    authorizedRequest<NodeSummary>(token, '/nodes', { method: 'POST', body: payload }),

  enable: (token: string, id: string) =>
    authorizedRequest<NodeSummary>(token, `/nodes/${id}/enable`, { method: 'POST' }),

  disable: (token: string, id: string) =>
    authorizedRequest<NodeSummary>(token, `/nodes/${id}/disable`, { method: 'POST', body: { confirm: true } }),

  remove: (token: string, id: string, currentPassword: string) =>
    authorizedRequest<{ success: boolean }>(token, `/nodes/${id}`, {
      method: 'DELETE',
      body: { confirm: true, currentPassword },
    }),

  testConnection: (token: string, id: string) =>
    authorizedRequest<TestConnectionResult>(token, `/nodes/${id}/test-connection`, { method: 'POST' }),

  rotateCredential: (token: string, id: string, secret: string, credentialType: string, currentPassword: string) =>
    authorizedRequest<NodeSummary>(token, `/nodes/${id}/rotate-credential`, {
      method: 'POST',
      body: { credentialType, secret, currentPassword },
    }),
};

export const collectorsApi = {
  start: (token: string, nodeId: string) =>
    authorizedRequest<{ status: CollectorStatus }>(token, `/collectors/${nodeId}/start`, { method: 'POST' }),

  stop: (token: string, nodeId: string) =>
    authorizedRequest<{ status: CollectorStatus }>(token, `/collectors/${nodeId}/stop`, { method: 'POST' }),

  restart: (token: string, nodeId: string) =>
    authorizedRequest<{ status: CollectorStatus }>(token, `/collectors/${nodeId}/restart`, { method: 'POST' }),
};
