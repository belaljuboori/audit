import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, GraduationCap } from "lucide-react";

import { getCurrentUser } from "@/lib/auth";
import { getAllCompletedLessonIdsForUser, computeProgress, getUserEnrollments } from "@/lib/data/enrollments";
import { formatDuration } from "@/lib/format";
import { StatCard } from "@/components/dashboard/stat-card";
import { EnrolledCourseCard } from "@/components/dashboard/enrolled-course-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Your dashboard",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [enrollments, completedLessonIds] = await Promise.all([
    getUserEnrollments(user.id),
    getAllCompletedLessonIdsForUser(user.id),
  ]);

  const courseSummaries = enrollments.map((enrollment) => {
    const lessons = enrollment.course.modules.flatMap((m) => m.lessons);
    const completedLessons = lessons.filter((l) => completedLessonIds.has(l.id));
    const remainingMinutes = lessons
      .filter((l) => !completedLessonIds.has(l.id))
      .reduce((sum, l) => sum + l.durationMinutes, 0);

    return {
      slug: enrollment.course.slug,
      title: enrollment.course.title,
      categoryName: enrollment.course.category.name,
      categoryIcon: enrollment.course.category.icon,
      totalLessons: lessons.length,
      completedLessons: completedLessons.length,
      progress: computeProgress(lessons.length, completedLessons.length),
      remainingMinutes,
    };
  });

  const totalMinutesLearned = enrollments
    .flatMap((e) => e.course.modules.flatMap((m) => m.lessons))
    .filter((l) => completedLessonIds.has(l.id))
    .reduce((sum, l) => sum + l.durationMinutes, 0);

  const coursesInProgress = courseSummaries.filter((c) => c.progress > 0 && c.progress < 100);
  const coursesCompleted = courseSummaries.filter((c) => c.progress >= 100);
  const coursesNotStarted = courseSummaries.filter((c) => c.progress === 0);
  const orderedSummaries = [...coursesInProgress, ...coursesNotStarted, ...coursesCompleted];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          {coursesInProgress.length > 0
            ? "Here's where you left off."
            : "Ready to start your next course?"}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Enrolled courses" value={String(enrollments.length)} />
        <StatCard
          icon={CheckCircle2}
          label="Lessons completed"
          value={String(completedLessonIds.size)}
        />
        <StatCard icon={Clock} label="Time learned" value={formatDuration(totalMinutesLearned)} />
        <StatCard
          icon={GraduationCap}
          label="Courses completed"
          value={String(coursesCompleted.length)}
        />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-semibold text-foreground">Your courses</h2>
          <Button variant="outline" asChild>
            <Link href="/courses">Browse more courses</Link>
          </Button>
        </div>

        {orderedSummaries.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4">
            {orderedSummaries.map((course) => (
              <EnrolledCourseCard key={course.slug} {...course} />
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
            <GraduationCap className="size-10 text-muted-foreground" strokeWidth={1.5} />
            <p className="font-heading font-semibold text-foreground">
              You haven&apos;t enrolled in any courses yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Browse the catalog and enroll in your first course — your progress will show up
              here.
            </p>
            <Button asChild className="mt-2">
              <Link href="/courses">Browse courses</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
