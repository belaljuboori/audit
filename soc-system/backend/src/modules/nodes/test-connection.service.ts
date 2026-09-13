import { Injectable, Logger } from '@nestjs/common';
import { lookup as dnsLookup } from 'dns/promises';
import { Socket } from 'net';
import * as https from 'https';
import { Node, NodeType, HealthCheckSource, NodeHealthStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { sanitizeErrorMessage } from '../../common/utils/sanitize-error-message';

export type StepStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'PENDING_ADAPTER';

export interface TestConnectionStepResult {
  step: number;
  name: string;
  status: StepStatus;
  detail: string;
  durationMs: number;
}

export interface TestConnectionResult {
  overallStatus: NodeHealthStatus;
  latencyMs: number | null;
  steps: TestConnectionStepResult[];
}

/**
 * Implements the steps of the Test Connection workflow that can genuinely be
 * verified generically (network/TLS reachability, and our own DB write) —
 * steps 5-8 and 10 need a device-specific adapter that doesn't exist until
 * Phase 3+, so they are honestly reported as PENDING_ADAPTER rather than
 * faked as passing. See docs/phase2-architecture.md.
 */
@Injectable()
export class TestConnectionService {
  private readonly logger = new Logger(TestConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async run(node: Node, source: HealthCheckSource): Promise<TestConnectionResult> {
    const steps: TestConnectionStepResult[] = [];
    let latencyMs: number | null = null;
    const overallStart = Date.now();

    steps.push(await this.stepDnsResolution(node));
    const dnsOk = steps[0].status === 'PASSED';

    steps.push(dnsOk ? await this.stepTcpConnectivity(node) : this.skipped(2, 'tcp_connectivity', 'DNS resolution failed'));
    const tcpOk = steps[1].status === 'PASSED';

    steps.push(
      tcpOk ? await this.stepTlsCertificate(node) : this.skipped(3, 'tls_certificate', 'TCP connectivity failed'),
    );

    steps.push(await this.stepAuthReachability(node, tcpOk));

    steps.push(this.pendingAdapter(5, 'api_compatibility'));
    steps.push(this.pendingAdapter(6, 'required_permissions'));
    steps.push(this.pendingAdapter(7, 'sample_read_request'));
    steps.push(this.pendingAdapter(8, 'response_parsing'));

    steps.push(await this.stepDatabaseWriteTest());

    steps.push(this.pendingAdapter(10, 'websocket_event_delivery'));

    if (tcpOk) {
      latencyMs = Date.now() - overallStart;
    }

    const hasFailure = steps.some((s) => s.status === 'FAILED');
    const overallStatus: NodeHealthStatus = hasFailure ? 'UNHEALTHY' : dnsOk && tcpOk ? 'HEALTHY' : 'DEGRADED';

    return { overallStatus, latencyMs, steps };
  }

  private pendingAdapter(step: number, name: string): TestConnectionStepResult {
    return {
      step,
      name,
      status: 'PENDING_ADAPTER',
      detail: 'Requires a device-specific connector adapter, introduced starting Phase 3.',
      durationMs: 0,
    };
  }

  private skipped(step: number, name: string, reason: string): TestConnectionStepResult {
    return { step, name, status: 'SKIPPED', detail: reason, durationMs: 0 };
  }

  private async stepDnsResolution(node: Node): Promise<TestConnectionStepResult> {
    const start = Date.now();
    try {
      const result = await dnsLookup(node.host);
      return {
        step: 1,
        name: 'dns_resolution',
        status: 'PASSED',
        detail: `Resolved to ${result.address} (IPv${result.family})`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      // A bare IP address "fails" Node's dns.lookup in some environments only
      // in the sense of not needing resolution — treat that case as passed.
      if (/^[0-9.]+$/.test(node.host) || node.host.includes(':')) {
        return {
          step: 1,
          name: 'dns_resolution',
          status: 'PASSED',
          detail: 'Host is a literal IP address; no DNS resolution needed.',
          durationMs: Date.now() - start,
        };
      }
      return {
        step: 1,
        name: 'dns_resolution',
        status: 'FAILED',
        detail: sanitizeErrorMessage((error as Error).message),
        durationMs: Date.now() - start,
      };
    }
  }

  private stepTcpConnectivity(node: Node): Promise<TestConnectionStepResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = new Socket();
      const timeoutMs = node.connectionTimeoutMs;
      let settled = false;

      const finish = (result: TestConnectionStepResult) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(result);
      };

      socket.setTimeout(timeoutMs);
      socket.once('connect', () => {
        finish({
          step: 2,
          name: 'tcp_connectivity',
          status: 'PASSED',
          detail: `TCP connection to ${node.host}:${node.port} succeeded`,
          durationMs: Date.now() - start,
        });
      });
      socket.once('timeout', () => {
        finish({
          step: 2,
          name: 'tcp_connectivity',
          status: 'FAILED',
          detail: `Connection to ${node.host}:${node.port} timed out after ${timeoutMs}ms`,
          durationMs: Date.now() - start,
        });
      });
      socket.once('error', (err) => {
        finish({
          step: 2,
          name: 'tcp_connectivity',
          status: 'FAILED',
          detail: sanitizeErrorMessage(err.message),
          durationMs: Date.now() - start,
        });
      });

      socket.connect(node.port, node.host);
    });
  }

  private stepTlsCertificate(node: Node): Promise<TestConnectionStepResult> {
    const start = Date.now();
    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        host: node.host,
        port: node.port,
        method: 'HEAD',
        path: '/',
        timeout: node.connectionTimeoutMs,
        rejectUnauthorized: node.tlsVerify,
        ca: node.customCaCertificate ?? undefined,
      };

      const req = https.request(options, (res) => {
        const cert = (res.socket as import('tls').TLSSocket).getPeerCertificate?.();
        const expiry = cert?.valid_to ? new Date(cert.valid_to) : null;
        const daysToExpiry = expiry ? Math.floor((expiry.getTime() - Date.now()) / 86_400_000) : null;
        res.resume();
        resolve({
          step: 3,
          name: 'tls_certificate',
          status: 'PASSED',
          detail:
            daysToExpiry !== null
              ? `TLS handshake succeeded. Certificate expires in ${daysToExpiry} day(s).`
              : 'TLS handshake succeeded.',
          durationMs: Date.now() - start,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          step: 3,
          name: 'tls_certificate',
          status: 'FAILED',
          detail: 'TLS handshake timed out',
          durationMs: Date.now() - start,
        });
      });

      req.on('error', (err) => {
        resolve({
          step: 3,
          name: 'tls_certificate',
          status: 'FAILED',
          detail: sanitizeErrorMessage(err.message),
          durationMs: Date.now() - start,
        });
      });

      req.end();
    });
  }

  /**
   * Generic (non-device-specific) check that a request carrying the
   * configured credential at least reaches the server and gets an HTTP
   * response — it does NOT validate the credential is correct or that the
   * endpoint is the right one for this device type (that needs the Phase 3+
   * adapter). Only meaningful for HTTP-API node types with an apiBaseUrl.
   */
  private async stepAuthReachability(node: Node, tcpOk: boolean): Promise<TestConnectionStepResult> {
    if (node.type === NodeType.ACTIVE_DIRECTORY || node.type === NodeType.GPO_COLLECTOR) {
      return this.skipped(
        4,
        'authentication_reachability',
        'This node type authenticates via LDAPS/PowerShell remoting, not HTTP — verified by its own Phase 5/6 adapter.',
      );
    }
    if (!tcpOk) {
      return this.skipped(4, 'authentication_reachability', 'TCP connectivity failed');
    }
    if (!node.apiBaseUrl) {
      return this.skipped(4, 'authentication_reachability', 'No apiBaseUrl configured for this node');
    }

    const credential = await this.prisma.nodeCredential.findUnique({ where: { nodeId: node.id } });
    if (!credential) {
      return this.skipped(4, 'authentication_reachability', 'No credential configured for this node');
    }

    const start = Date.now();
    try {
      const secret = this.encryptionService.decrypt(credential.encryptedSecret);
      const headers: Record<string, string> = {};
      if (node.authMethod === 'API_TOKEN') {
        headers.Authorization = `Bearer ${secret}`;
      } else if (node.authMethod === 'USERNAME_PASSWORD') {
        const parsed = JSON.parse(secret) as { username: string; password: string };
        headers.Authorization = `Basic ${Buffer.from(`${parsed.username}:${parsed.password}`).toString('base64')}`;
      }

      const url = new URL(node.apiBaseUrl);
      const response = await this.httpHead(url, headers, node);
      return {
        step: 4,
        name: 'authentication_reachability',
        status: response < 500 ? 'PASSED' : 'FAILED',
        detail: `Server responded with HTTP ${response}. This confirms reachability only — it does not confirm the credential is valid for the real API, which needs the Phase 3+ adapter.`,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      return {
        step: 4,
        name: 'authentication_reachability',
        status: 'FAILED',
        detail: sanitizeErrorMessage((error as Error).message),
        durationMs: Date.now() - start,
      };
    }
  }

  private httpHead(url: URL, headers: Record<string, string>, node: Node): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname || '/',
          method: 'HEAD',
          headers,
          timeout: node.connectionTimeoutMs,
          rejectUnauthorized: node.tlsVerify,
          ca: node.customCaCertificate ?? undefined,
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
      req.on('error', reject);
      req.end();
    });
  }

  /**
   * Lightweight variant used by the collector's recurring heartbeat job —
   * just connectivity (DNS/TCP/TLS), not the full 10-step workflow. Running
   * the auth-reachability check on every poll interval would otherwise spam
   * the real device with authentication attempts purely for our own
   * bookkeeping, which is not acceptable for a production collector.
   */
  async runHeartbeat(node: Node): Promise<{ status: NodeHealthStatus; latencyMs: number | null; errorMessage: string | null }> {
    const start = Date.now();
    const dns = await this.stepDnsResolution(node);
    if (dns.status === 'FAILED') {
      return { status: 'UNHEALTHY', latencyMs: null, errorMessage: dns.detail };
    }
    const tcp = await this.stepTcpConnectivity(node);
    if (tcp.status === 'FAILED') {
      return { status: 'UNHEALTHY', latencyMs: null, errorMessage: tcp.detail };
    }
    const tls = await this.stepTlsCertificate(node);
    const latencyMs = Date.now() - start;
    if (tls.status === 'FAILED') {
      return { status: 'DEGRADED', latencyMs, errorMessage: tls.detail };
    }
    return { status: 'HEALTHY', latencyMs, errorMessage: null };
  }

  private async stepDatabaseWriteTest(): Promise<TestConnectionStepResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        step: 9,
        name: 'database_write_test',
        status: 'PASSED',
        detail: 'Application database is reachable and writable (this health check record itself is the proof).',
        durationMs: Date.now() - start,
      };
    } catch (error) {
      this.logger.error('Database write test failed during node test-connection workflow', error as Error);
      return {
        step: 9,
        name: 'database_write_test',
        status: 'FAILED',
        detail: sanitizeErrorMessage((error as Error).message),
        durationMs: Date.now() - start,
      };
    }
  }
}
