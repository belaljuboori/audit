"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { submitQuizAction, type QuizResult } from "@/lib/actions/courses";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export type QuizQuestionData = {
  id: string;
  prompt: string;
  options: string[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? "Grading…" : "Submit answers"}
    </Button>
  );
}

export function Quiz({
  courseSlug,
  lessonId,
  questions,
}: {
  courseSlug: string;
  lessonId: string;
  questions: QuizQuestionData[];
}) {
  const action = submitQuizAction.bind(null, courseSlug, lessonId);
  const [result, formAction] = useActionState<QuizResult, FormData>(action, null);

  if (result) {
    const passed = result.score >= 70;
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          {passed ? (
            <CheckCircle2 className="size-12 text-success" />
          ) : (
            <XCircle className="size-12 text-destructive" />
          )}
          <h2 className="font-heading text-xl font-semibold text-foreground">
            You scored {result.score}%
          </h2>
          <p className="text-sm text-muted-foreground">
            {result.correct} of {result.total} correct.{" "}
            {passed ? "Nice work — this lesson is marked complete." : "This lesson is marked complete; feel free to review and retake."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardContent className="py-5">
            <fieldset>
              <legend className="font-heading font-medium text-foreground">
                {index + 1}. {question.prompt}
              </legend>
              <div className="mt-3 flex flex-col gap-2">
                {question.options.map((option, optionIndex) => {
                  const inputId = `${question.id}-${optionIndex}`;
                  return (
                    <div
                      key={inputId}
                      className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <input
                        type="radio"
                        id={inputId}
                        name={`question-${question.id}`}
                        value={optionIndex}
                        required
                        className="size-4 accent-primary"
                      />
                      <Label htmlFor={inputId} className="flex-1 cursor-pointer font-normal">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </CardContent>
        </Card>
      ))}
      <SubmitButton />
    </form>
  );
}
