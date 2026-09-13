import { Injectable, NotFoundException } from '@nestjs/common';
import { HealthCheckSource, NodeEnvironment, NodeType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { NodeCredentialDto } from './dto/node-credential.dto';
import { TestConnectionService } from './test-connection.service';

const nodeListSelect = {
  id: true,
  name: true,
  type: true,
  description: true,
  environment: true,
  enabled: true,
  host: true,
  port: true,
  apiVersion: true,
  vdom: true,
  tlsVerify: true,
  authMethod: true,
  pollingIntervalSeconds: true,
  currentHealth: true,
  currentLatencyMs: true,
  lastSuccessfulConnectionAt: true,
  lastCollectionAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
  collector: { select: { status: true, lastHeartbeatAt: true } },
  credential: { select: { credentialType: true, rotatedAt: true } },
} as const;

@Injectable()
export class NodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly testConnectionService: TestConnectionService,
  ) {}

  async create(dto: CreateNodeDto, actorId: string) {
    const encryptedSecret = this.encryptionService.encrypt(dto.credential.secret);

    return this.prisma.node.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        environment: dto.environment ?? NodeEnvironment.PRODUCTION,
        host: dto.host,
        port: dto.port,
        apiBaseUrl: dto.apiBaseUrl,
        apiVersion: dto.apiVersion,
        vdom: dto.vdom,
        tlsVerify: dto.tlsVerify ?? true,
        customCaCertificate: dto.customCaCertificate,
        authMethod: dto.authMethod,
        pollingIntervalSeconds: dto.pollingIntervalSeconds ?? 300,
        syslogPort: dto.syslogPort,
        connectionTimeoutMs: dto.connectionTimeoutMs ?? 5000,
        retryMaxAttempts: dto.retryMaxAttempts ?? 3,
        retryBackoffMs: dto.retryBackoffMs ?? 2000,
        createdById: actorId,
        updatedById: actorId,
        credential: {
          create: {
            credentialType: dto.credential.credentialType,
            encryptedSecret,
            rotatedById: actorId,
          },
        },
        collector: { create: {} },
      },
      select: nodeListSelect,
    });
  }

  async findAll(filters: { type?: NodeType; environment?: NodeEnvironment; enabled?: boolean }) {
    return this.prisma.node.findMany({
      where: {
        type: filters.type,
        environment: filters.environment,
        enabled: filters.enabled,
      },
      select: nodeListSelect,
      orderBy: { name: 'asc' },
    });
  }

  async findOneOrThrow(id: string) {
    const node = await this.prisma.node.findUnique({ where: { id }, select: nodeListSelect });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    return node;
  }

  /** Internal: full row including connectivity fields the test-connection workflow needs, never returned via API. */
  async findRawOrThrow(id: string) {
    const node = await this.prisma.node.findUnique({ where: { id } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    return node;
  }

  async update(id: string, dto: UpdateNodeDto, actorId: string) {
    await this.findRawOrThrow(id);
    return this.prisma.node.update({
      where: { id },
      data: { ...dto, updatedById: actorId },
      select: nodeListSelect,
    });
  }

  async setEnabled(id: string, enabled: boolean, actorId: string) {
    await this.findRawOrThrow(id);
    return this.prisma.node.update({
      where: { id },
      data: {
        enabled,
        updatedById: actorId,
        currentHealth: enabled ? undefined : 'DISABLED',
      },
      select: nodeListSelect,
    });
  }

  async remove(id: string) {
    await this.findRawOrThrow(id);
    await this.prisma.node.delete({ where: { id } });
  }

  async rotateCredential(id: string, dto: NodeCredentialDto, actorId: string) {
    await this.findRawOrThrow(id);
    const encryptedSecret = this.encryptionService.encrypt(dto.secret);

    await this.prisma.nodeCredential.upsert({
      where: { nodeId: id },
      create: {
        nodeId: id,
        credentialType: dto.credentialType,
        encryptedSecret,
        rotatedById: actorId,
      },
      update: {
        credentialType: dto.credentialType,
        encryptedSecret,
        rotatedAt: new Date(),
        rotatedById: actorId,
      },
    });

    return this.findOneOrThrow(id);
  }

  async testConnection(id: string) {
    const node = await this.findRawOrThrow(id);
    const result = await this.testConnectionService.run(node, HealthCheckSource.MANUAL_TEST);

    await this.prisma.$transaction([
      this.prisma.nodeHealthCheck.create({
        data: {
          nodeId: id,
          status: result.overallStatus,
          latencyMs: result.latencyMs,
          source: HealthCheckSource.MANUAL_TEST,
          stepsJson: result.steps as unknown as object,
          errorMessage: result.steps.find((s) => s.status === 'FAILED')?.detail,
        },
      }),
      this.prisma.node.update({
        where: { id },
        data: {
          currentHealth: result.overallStatus,
          currentLatencyMs: result.latencyMs,
          lastError: result.steps.find((s) => s.status === 'FAILED')?.detail ?? null,
          ...(result.overallStatus === 'HEALTHY' ? { lastSuccessfulConnectionAt: new Date() } : {}),
        },
      }),
    ]);

    return result;
  }

  async healthHistory(id: string, limit = 20) {
    await this.findRawOrThrow(id);
    return this.prisma.nodeHealthCheck.findMany({
      where: { nodeId: id },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }
}
