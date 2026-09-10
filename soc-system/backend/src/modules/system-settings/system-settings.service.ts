import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async get(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async set(key: string, value: Prisma.InputJsonValue, updatedById: string, description?: string) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value, description, updatedById },
      update: { value, updatedById, ...(description ? { description } : {}) },
    });
  }
}
