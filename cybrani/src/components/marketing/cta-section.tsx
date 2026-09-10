import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center sm:px-16">
        <div
          className="absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <h2 className="relative font-heading text-3xl font-bold text-primary-foreground sm:text-4xl">
          Ready to start learning?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-primary-foreground/90">
          Create a free account and enroll in your first course in under a minute.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup">
              Get started for free
              <ArrowRight />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            asChild
          >
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
