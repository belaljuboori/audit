import Link from "next/link";
import { ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-secondary/60 to-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-primary" />
            Trusted by 60,000+ learners
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Learn skills that{" "}
            <span className="text-primary">move you forward</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            Cybrani is a project-based learning platform for web development, cybersecurity,
            data, AI, and design. Real projects, expert instructors, and a plan that adapts
            to your pace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/courses">
                Browse courses
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/signup">
                <PlayCircle />
                Start learning free
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required. Join in under a minute.
          </p>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Continue learning</p>
                <p className="font-heading font-semibold text-foreground">
                  Modern Web Development
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                62% complete
              </span>
            </div>
            <Progress value={62} className="mt-4" />

            <div className="mt-6 flex flex-col gap-3">
              {[
                { label: "Foundations", done: true },
                { label: "Data & Server Components", done: true },
                { label: "Styling & Component Systems", done: false },
                { label: "Shipping to Production", done: false },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <span
                    className={
                      item.done
                        ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                        : "flex size-6 items-center justify-center rounded-full border-2 border-border"
                    }
                    aria-hidden="true"
                  >
                    {item.done && <CheckCircle2 className="size-4" />}
                  </span>
                  <span
                    className={
                      item.done
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm font-medium text-foreground"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="absolute -bottom-6 -left-6 -z-10 size-40 rounded-full bg-accent/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="absolute -top-6 -right-6 -z-10 size-40 rounded-full bg-primary/20 blur-3xl"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
