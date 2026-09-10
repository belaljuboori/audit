import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";

export function getUserEnrollments(userId: string) {
  return db.enrollment.findMany({
    where: { userId },
    orderBy: { enrolledAt: "desc" },
    include: {
      course: {
        include: {
          category: true,
          modules: { include: { lessons: true } },
        },
      },
    },
  });
}

export function getEnrollment(userId: string, courseId: string) {
  return db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export const getCompletedLessonIds = cache(async function getCompletedLessonIds(
  userId: string,
  courseId: string
) {
  const progress = await db.lessonProgress.findMany({
    where: {
      userId,
      completedAt: { not: null },
      lesson: { module: { courseId } },
    },
    select: { lessonId: true },
  });
  return new Set(progress.map((p) => p.lessonId));
});

export const getAllCompletedLessonIdsForUser = cache(async function getAllCompletedLessonIdsForUser(
  userId: string
) {
  const progress = await db.lessonProgress.findMany({
    where: { userId, completedAt: { not: null } },
    select: { lessonId: true },
  });
  return new Set(progress.map((p) => p.lessonId));
});

export function computeProgress(totalLessons: number, completedLessons: number) {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}
