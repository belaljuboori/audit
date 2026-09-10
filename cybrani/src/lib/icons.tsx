import {
  Code2,
  ShieldCheck,
  BarChart3,
  Palette,
  Cpu,
  Cloud,
  BookOpen,
  PlayCircle,
  FileQuestion,
  type LucideProps,
} from "lucide-react";

export function CategoryIcon({ icon, ...props }: { icon: string } & LucideProps) {
  switch (icon) {
    case "code":
      return <Code2 {...props} />;
    case "shield":
      return <ShieldCheck {...props} />;
    case "chart":
      return <BarChart3 {...props} />;
    case "palette":
      return <Palette {...props} />;
    case "cpu":
      return <Cpu {...props} />;
    case "cloud":
      return <Cloud {...props} />;
    default:
      return <BookOpen {...props} />;
  }
}

export function LessonTypeIcon({
  type,
  ...props
}: { type: "VIDEO" | "READING" | "QUIZ" } & LucideProps) {
  switch (type) {
    case "VIDEO":
      return <PlayCircle {...props} />;
    case "QUIZ":
      return <FileQuestion {...props} />;
    default:
      return <BookOpen {...props} />;
  }
}

const lessonTypeLabels: Record<"VIDEO" | "READING" | "QUIZ", string> = {
  VIDEO: "Video",
  READING: "Reading",
  QUIZ: "Quiz",
};

export function getLessonTypeLabel(type: "VIDEO" | "READING" | "QUIZ") {
  return lessonTypeLabels[type];
}
