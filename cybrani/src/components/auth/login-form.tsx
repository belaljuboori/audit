"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { loginAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, null);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to continue your courses.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {nextPath && <input type="hidden" name="next" value={nextPath} />}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(state?.fieldErrors?.email)}
              aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="text-sm text-destructive">
                {state.fieldErrors.email}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              aria-invalid={Boolean(state?.fieldErrors?.password)}
              aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            )}
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to Cybrani?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-3 rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          Demo login: <span className="font-medium">demo@cybrani.com</span> /{" "}
          <span className="font-medium">password123</span>
        </p>
      </CardContent>
    </Card>
  );
}
