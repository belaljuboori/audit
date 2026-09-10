"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { loginSchema, signupSchema } from "@/lib/validation";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function firstFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists." } };
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: { name, email, passwordHash },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.issues) };
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({ where: { email } });
  const genericError: AuthFormState = { error: "Incorrect email or password." };

  if (!user) return genericError;

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) return genericError;

  await createSession(user.id);

  const next = formData.get("next");
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  redirect(safeNext);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
