import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Clock, Star, Users } from "lucide-react";

import { getCourseBySlug } from "@/lib/data/courses";
import { getCurrentUser } from "@/lib/auth";
import { getEnrollment } from "@/lib/data/enrollments";
import { enrollInCourse } from "@/lib/actions/courses";
import { formatCount, formatDuration, formatLevel, formatPrice } from "@/lib/format";
import { CategoryIcon, LessonTypeIcon } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};
  return { title: course.title, description: course.tagline };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const enrollment = user ? await getEnrollment(user.id, course.id) : null;
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const enrollWithSlug = enrollInCourse.bind(null, course.slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.category.name}</Badge>
            <Badge variant="secondary">{formatLevel(course.level)}</Badge>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{course.tagline}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 fill-accent text-accent" />
              <strong className="text-foreground">{course.rating.toFixed(1)}</strong>(
              {formatCount(course.ratingCount)} ratings)
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-4" />
              {formatCount(course.studentCount)} students
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" />
              {formatDuration(course.durationMinutes)}
            </span>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            Taught by <span className="font-medium text-foreground">{course.instructorName}</span>
            , {course.instructorTitle}
          </p>

          <Separator className="my-8" />

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-heading text-xl font-semibold text-foreground">
              About this course
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{course.description}</p>
          </section>

          <section aria-labelledby="skills-heading" className="mt-8">
            <h2 id="skills-heading" className="font-heading text-xl font-semibold text-foreground">
              Skills you&apos;ll build
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {course.skills.map((skill) => (
                <Badge key={skill.id} variant="outline">
                  {skill.label}
                </Badge>
              ))}
            </div>
          </section>

          <section aria-labelledby="syllabus-heading" className="mt-10">
            <div className="flex items-baseline justify-between">
              <h2
                id="syllabus-heading"
                className="font-heading text-xl font-semibold text-foreground"
              >
                Course content
              </h2>
              <span className="text-sm text-muted-foreground">
                {course.modules.length} modules · {totalLessons} lessons
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {course.modules.map((module, index) => (
                <Card key={module.id}>
                  <CardContent className="pt-6">
                    <h3 className="font-heading font-semibold text-foreground">
                      Module {index + 1}: {module.title}
                    </h3>
                    <ul className="mt-3 flex flex-col divide-y divide-border">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          className="flex items-center justify-between gap-3 py-2.5 text-sm"
                        >
                          <span className="flex items-center gap-2.5 text-foreground">
                            <LessonTypeIcon
                              type={lesson.type}
                              className="size-4 shrink-0 text-muted-foreground"
                            />
                            {lesson.title}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {lesson.durationMinutes} min
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24 overflow-hidden py-0">
            <div
              className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5"
              aria-hidden="true"
            >
              <CategoryIcon icon={course.category.icon} className="size-16 text-primary" strokeWidth={1.5} />
            </div>
            <CardContent className="flex flex-col gap-5 py-6">
              <p className="font-heading text-3xl font-bold text-foreground">
                {formatPrice(course.priceCents)}
              </p>

              {enrollment ? (
                <Button size="lg" asChild>
                  <Link href={`/learn/${course.slug}`}>Continue learning</Link>
                </Button>
              ) : (
                <form action={enrollWithSlug}>
                  <Button size="lg" type="submit" className="w-full">
                    Enroll now
                  </Button>
                </form>
              )}

              <ul className="flex flex-col gap-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Clock className="size-4 text-primary" />
                  {formatDuration(course.durationMinutes)} of content
                </li>
                <li className="flex items-center gap-2.5">
                  <BookOpen className="size-4 text-primary" />
                  {totalLessons} lessons across {course.modules.length} modules
                </li>
                <li className="flex items-center gap-2.5">
                  <Users className="size-4 text-primary" />
                  {formatCount(course.studentCount)} students enrolled
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
