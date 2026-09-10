"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { signupAction, type AuthFormState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signupAction, null);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Start learning in less than a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Rivera"
              required
              aria-invalid={Boolean(state?.fieldErrors?.name)}
              aria-describedby={state?.fieldErrors?.name ? "name-error" : undefined}
            />
            {state?.fieldErrors?.name && (
              <p id="name-error" className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
              minLength={8}
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
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
