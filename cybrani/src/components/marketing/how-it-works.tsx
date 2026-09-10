import { Search, BookOpenCheck, Trophy } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Find your course",
    description:
      "Browse six tracks — from web development to AI — and filter by level to find the right starting point.",
  },
  {
    icon: BookOpenCheck,
    title: "Learn by building",
    description:
      "Work through modules of hands-on lessons and short knowledge checks, at whatever pace fits your week.",
  },
  {
    icon: Trophy,
    title: "Track your progress",
    description:
      "Your dashboard shows exactly where you left off, so picking a course back up never means starting over.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          How Cybrani works
        </h2>
        <p className="mt-3 text-muted-foreground">
          Three steps between you and your next skill.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="relative flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <step.icon className="size-7" strokeWidth={1.75} />
            </span>
            <span className="absolute -top-2 right-1/2 flex size-6 translate-x-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {index + 1}
            </span>
            <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">
              {step.title}
            </h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
