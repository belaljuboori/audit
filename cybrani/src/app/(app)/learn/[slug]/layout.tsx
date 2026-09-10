import { notFound, redirect } from "next/navigation";

import { getCourseBySlug } from "@/lib/data/courses";
import { getCurrentUser } from "@/lib/auth";
import { computeProgress, getCompletedLessonIds, getEnrollment } from "@/lib/data/enrollments";
import { PlayerChrome } from "@/components/player/player-chrome";

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const enrollment = await getEnrollment(user.id, course.id);
  if (!enrollment) redirect(`/courses/${slug}`);

  const completedLessonIds = await getCompletedLessonIds(user.id, course.id);
  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const progress = computeProgress(totalLessons, completedLessonIds.size);

  return (
    <PlayerChrome
      slug={slug}
      courseTitle={course.title}
      modules={course.modules}
      completedLessonIds={Array.from(completedLessonIds)}
      progress={progress}
    >
      {children}
    </PlayerChrome>
  );
}
