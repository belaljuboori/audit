import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatDuration } from "@/lib/format";
import { CategoryIcon } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function EnrolledCourseCard({
  slug,
  title,
  categoryName,
  categoryIcon,
  totalLessons,
  completedLessons,
  progress,
  remainingMinutes,
}: {
  slug: string;
  title: string;
  categoryName: string;
  categoryIcon: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  remainingMinutes: number;
}) {
  const isComplete = progress >= 100;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CategoryIcon icon={categoryIcon} className="size-6" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{categoryName}</Badge>
            {isComplete && <Badge variant="success">Completed</Badge>}
          </div>
          <h3 className="mt-1.5 truncate font-heading font-semibold text-foreground">{title}</h3>
          <div className="mt-2.5 flex items-center gap-3">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
              {progress}%
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {completedLessons}/{totalLessons} lessons ·{" "}
            {isComplete ? "All done" : `${formatDuration(remainingMinutes)} left`}
          </p>
        </div>

        <Button variant={isComplete ? "outline" : "default"} asChild className="shrink-0">
          <Link href={`/learn/${slug}`}>
            {isComplete ? "Review" : "Continue"}
            <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
