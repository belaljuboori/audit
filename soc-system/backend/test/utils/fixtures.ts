import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

export const testPrisma = new PrismaClient();

export async function createUserWithRole(roleName: string, password = 'CorrectHorseBattery9!') {
  const role = await testPrisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const suffix = randomUUID().slice(0, 8);

  const user = await testPrisma.user.create({
    data: {
      username: `test_${suffix}`,
      email: `test_${suffix}@bank.local`,
      fullName: `Test ${roleName}`,
      passwordHash,
      roles: { create: [{ roleId: role.id }] },
    },
  });

  return { user, password };
}

export async function cleanupUser(userId: string) {
  await testPrisma.refreshToken.deleteMany({ where: { userId } });
  await testPrisma.userRole.deleteMany({ where: { userId } });
  await testPrisma.user.delete({ where: { id: userId } }).catch(() => undefined);
}
