import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";

import { getLessonWithContext } from "@/lib/data/courses";
import { getCurrentUser } from "@/lib/auth";
import { getCompletedLessonIds } from "@/lib/data/enrollments";
import { toggleLessonComplete } from "@/lib/actions/courses";
import { LessonTypeIcon, getLessonTypeLabel } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MarkCompleteForm } from "@/components/player/mark-complete-button";
import { Quiz } from "@/components/player/quiz";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await getLessonWithContext(lessonId);
  return { title: lesson?.title ?? "Lesson" };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const lesson = await getLessonWithContext(lessonId);

  if (!lesson || lesson.module.course.slug !== slug) {
    notFound();
  }

  const user = await getCurrentUser();
  const completedLessonIds = user
    ? await getCompletedLessonIds(user.id, lesson.module.course.id)
    : new Set<string>();
  const isCompleted = completedLessonIds.has(lesson.id);

  const orderedLessons = lesson.module.course.modules.flatMap((m) => m.lessons);
  const currentIndex = orderedLessons.findIndex((l) => l.id === lesson.id);
  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : null;

  const contentParagraphs = lesson.content.split("\n\n").filter(Boolean);
  const toggleAction = toggleLessonComplete.bind(null, slug, lesson.id, !isCompleted);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5">
          <LessonTypeIcon type={lesson.type} className="size-3.5" />
          {getLessonTypeLabel(lesson.type)}
        </Badge>
        <span className="text-sm text-muted-foreground">{lesson.durationMinutes} min</span>
      </div>

      <h1 className="mt-3 font-heading text-2xl font-bold text-foreground sm:text-3xl">
        {lesson.title}
      </h1>
      <p className="mt-2 text-muted-foreground">{lesson.summary}</p>

      <Separator className="my-8" />

      {lesson.type === "QUIZ" ? (
        <Quiz
          courseSlug={slug}
          lessonId={lesson.id}
          questions={lesson.quizQuestions.map((q) => ({
            id: q.id,
            prompt: q.prompt,
            options: JSON.parse(q.options) as string[],
          }))}
        />
      ) : (
        <>
          {lesson.type === "VIDEO" && (
            <div className="mb-8 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5">
              <div className="flex flex-col items-center gap-2 text-primary">
                <PlayCircle className="size-14" strokeWidth={1.25} />
                <span className="text-sm font-medium text-muted-foreground">
                  Video lesson · {lesson.durationMinutes} min
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4 leading-relaxed text-foreground">
            {contentParagraphs.map((paragraph, index) => (
              <p key={index} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-10">
            <MarkCompleteForm action={toggleAction} isCompleted={isCompleted} />
          </div>
        </>
      )}

      <Separator className="my-10" />

      <div className="flex items-center justify-between gap-4">
        {previousLesson ? (
          <Button variant="ghost" asChild>
            <Link href={`/learn/${slug}/${previousLesson.id}`}>
              <ChevronLeft />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {nextLesson ? (
          <Button asChild>
            <Link href={`/learn/${slug}/${nextLesson.id}`}>
              <span className="hidden sm:inline">Next lesson</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href="/dashboard">Finish course</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
