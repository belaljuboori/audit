import { notFound, redirect } from "next/navigation";

import { getCourseBySlug } from "@/lib/data/courses";
import { getCurrentUser } from "@/lib/auth";
import { getCompletedLessonIds } from "@/lib/data/enrollments";

export default async function LearnCourseIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const completedLessonIds = user
    ? await getCompletedLessonIds(user.id, course.id)
    : new Set<string>();

  const lessons = course.modules.flatMap((m) => m.lessons);
  const nextLesson = lessons.find((l) => !completedLessonIds.has(l.id)) ?? lessons[0];

  if (!nextLesson) notFound();

  redirect(`/learn/${slug}/${nextLesson.id}`);
}
