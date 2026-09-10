"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function enrollInCourse(courseSlug: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/courses/${courseSlug}`);
  }

  const course = await db.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    throw new Error("Course not found.");
  }

  await db.enrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
    update: {},
    create: { userId: user.id, courseId: course.id },
  });

  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath("/dashboard");
  redirect(`/learn/${courseSlug}`);
}

export async function toggleLessonComplete(
  courseSlug: string,
  lessonId: string,
  completed: boolean
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be signed in to update lesson progress.");
  }

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });

  if (!lesson) {
    throw new Error("Lesson not found.");
  }

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: lesson.module.courseId } },
  });
  if (!enrollment) {
    throw new Error("You must be enrolled in this course to track progress.");
  }

  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    update: { completedAt: completed ? new Date() : null },
    create: { userId: user.id, lessonId, completedAt: completed ? new Date() : null },
  });

  revalidatePath(`/learn/${courseSlug}`);
  revalidatePath("/dashboard");
}

export type QuizResult = {
  score: number;
  correct: number;
  total: number;
  submittedAt: number;
} | null;

export async function submitQuizAction(
  courseSlug: string,
  lessonId: string,
  _prevState: QuizResult,
  formData: FormData
): Promise<QuizResult> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be signed in to submit a quiz.");
  }

  const questions = await db.quizQuestion.findMany({ where: { lessonId } });
  if (questions.length === 0) {
    throw new Error("This quiz has no questions.");
  }

  let correct = 0;
  for (const question of questions) {
    const selected = formData.get(`question-${question.id}`);
    if (selected !== null && Number(selected) === question.correctOption) {
      correct += 1;
    }
  }

  const score = Math.round((correct / questions.length) * 100);

  await db.quizAttempt.create({ data: { userId: user.id, lessonId, score } });
  await toggleLessonComplete(courseSlug, lessonId, true);

  return { score, correct, total: questions.length, submittedAt: Date.now() };
}
