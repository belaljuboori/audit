import { Suspense } from "react";
import type { Metadata } from "next";

import { getCategories, getCourses } from "@/lib/data/courses";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFilters } from "@/components/courses/course-filters";

export const metadata: Metadata = {
  title: "All courses",
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const [courses, categories] = await Promise.all([
    getCourses({ categorySlug: category, search: q }),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          All courses
        </h1>
        <p className="mt-3 text-muted-foreground">
          {courses.length} course{courses.length === 1 ? "" : "s"} across web development,
          cybersecurity, data, AI, design, and cloud.
        </p>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div className="h-10" />}>
          <CourseFilters categories={categories} />
        </Suspense>
      </div>

      {courses.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="font-heading text-lg font-semibold text-foreground">
            No courses match your search
          </p>
          <p className="text-sm text-muted-foreground">
            Try a different keyword or clear the category filter.
          </p>
        </div>
      )}
    </div>
  );
}
