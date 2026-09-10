import "server-only";

import { cache } from "react";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, bio: true, createdAt: true },
  });

  return user;
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
