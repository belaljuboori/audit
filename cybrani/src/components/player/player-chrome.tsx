"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ListTree, X } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { LessonSidebar, type SidebarModule } from "@/components/player/lesson-sidebar";

export function PlayerChrome({
  slug,
  courseTitle,
  modules,
  completedLessonIds,
  progress,
  children,
}: {
  slug: string;
  courseTitle: string;
  modules: SidebarModule[];
  completedLessonIds: string[];
  progress: number;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <div className="h-6 w-px bg-border" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-sm font-semibold text-foreground">
            {courseTitle}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Progress value={progress} className="h-1.5 w-32 sm:w-48" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium cursor-pointer lg:hidden"
          aria-expanded={sidebarOpen}
          aria-controls="lesson-sidebar-mobile"
        >
          {sidebarOpen ? <X className="size-4" /> : <ListTree className="size-4" />}
          Lessons
        </button>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-80 shrink-0 border-r border-border lg:block">
          <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <LessonSidebar
              slug={slug}
              modules={modules}
              completedLessonIds={completedLessonIds}
            />
          </div>
        </aside>

        {sidebarOpen && (
          <div
            id="lesson-sidebar-mobile"
            className="fixed inset-x-0 top-16 z-30 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background shadow-lg lg:hidden"
          >
            <LessonSidebar
              slug={slug}
              modules={modules}
              completedLessonIds={completedLessonIds}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
