import Link from "next/link";
import type { Category, Course, CourseSkill } from "@prisma/client";
import { Star, Clock, Users } from "lucide-react";

import { formatCount, formatDuration, formatLevel, formatPrice } from "@/lib/format";
import { CategoryIcon } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export type CourseCardData = Course & {
  category: Category;
  skills: CourseSkill[];
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/courses/${course.slug}`} className="flex h-full flex-col">
        <div
          className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5"
          aria-hidden="true"
        >
          <CategoryIcon icon={course.category.icon} className="size-12 text-primary" strokeWidth={1.5} />
        </div>
        <CardHeader className="pt-5">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{course.category.name}</Badge>
            <Badge variant="secondary">{formatLevel(course.level)}</Badge>
          </div>
          <h3 className="mt-2 font-heading text-lg font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
            {course.title}
          </h3>
        </CardHeader>
        <CardContent className="flex-1">
          <p className="text-sm text-muted-foreground line-clamp-2">{course.tagline}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="size-3.5 fill-accent text-accent" />
              {course.rating.toFixed(1)} ({formatCount(course.ratingCount)})
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {formatDuration(course.durationMinutes)}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {formatCount(course.studentCount)}
            </span>
          </div>
        </CardContent>
        <CardFooter className="justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{course.instructorName}</span>
          <span className="font-heading font-semibold text-foreground">
            {formatPrice(course.priceCents)}
          </span>
        </CardFooter>
      </Link>
    </Card>
  );
}
