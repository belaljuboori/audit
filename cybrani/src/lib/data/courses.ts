import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";

export function getCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true } } },
  });
}

export function getCourses(options?: { categorySlug?: string; search?: string }) {
  return db.course.findMany({
    where: {
      published: true,
      category: options?.categorySlug ? { slug: options.categorySlug } : undefined,
      ...(options?.search
        ? {
            OR: [
              { title: { contains: options.search } },
              { tagline: { contains: options.search } },
            ],
          }
        : {}),
    },
    include: {
      category: true,
      skills: true,
      _count: { select: { modules: true } },
    },
    orderBy: { studentCount: "desc" },
  });
}

export function getFeaturedCourses(limit = 3) {
  return db.course.findMany({
    where: { published: true },
    include: { category: true, skills: true },
    orderBy: { rating: "desc" },
    take: limit,
  });
}

export const getCourseBySlug = cache(function getCourseBySlug(slug: string) {
  return db.course.findUnique({
    where: { slug },
    include: {
      category: true,
      skills: true,
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });
});

export const getLessonWithContext = cache(function getLessonWithContext(lessonId: string) {
  return db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      quizQuestions: true,
      module: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: { order: "asc" },
                include: { lessons: { orderBy: { order: "asc" } } },
              },
            },
          },
        },
      },
    },
  });
});
