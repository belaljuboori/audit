import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { getFeaturedCourses } from "@/lib/data/courses";
import { CourseCard } from "@/components/courses/course-card";
import { Button } from "@/components/ui/button";

export async function FeaturedCourses() {
  const courses = await getFeaturedCourses(3);

  return (
    <section className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              Top-rated courses
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Hand-picked by our instructors and rated highest by learners.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/courses">
              View all courses
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
