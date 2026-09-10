"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { LessonTypeIcon } from "@/lib/icons";

export type SidebarModule = {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    type: "VIDEO" | "READING" | "QUIZ";
    durationMinutes: number;
  }[];
};

export function LessonSidebar({
  slug,
  modules,
  completedLessonIds,
  onNavigate,
}: {
  slug: string;
  modules: SidebarModule[];
  completedLessonIds: string[];
  onNavigate?: () => void;
}) {
  const completed = new Set(completedLessonIds);
  const pathname = usePathname();
  const currentLessonId = pathname.split("/").pop();

  return (
    <nav aria-label="Course lessons" className="flex flex-col gap-6 p-4">
      {modules.map((module, moduleIndex) => (
        <div key={module.id}>
          <h2 className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Module {moduleIndex + 1}: {module.title}
          </h2>
          <ul className="mt-2 flex flex-col gap-0.5">
            {module.lessons.map((lesson) => {
              const isActive = lesson.id === currentLessonId;
              const isDone = completed.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${slug}/${lesson.id}`}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success" />
                    ) : (
                      <LessonTypeIcon
                        type={lesson.type}
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="flex-1 truncate">{lesson.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {lesson.durationMinutes}m
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
