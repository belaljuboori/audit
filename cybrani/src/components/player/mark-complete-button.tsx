"use client";

import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function SubmitButton({ isCompleted }: { isCompleted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={isCompleted ? "outline" : "default"}
      size="lg"
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <CheckCircle2 className={isCompleted ? "text-success" : undefined} />
      )}
      {isCompleted ? "Completed — mark as not done" : "Mark as complete"}
    </Button>
  );
}

export function MarkCompleteForm({
  action,
  isCompleted,
}: {
  action: () => Promise<void>;
  isCompleted: boolean;
}) {
  return (
    <form action={action}>
      <SubmitButton isCompleted={isCompleted} />
    </form>
  );
}
