import Link from "next/link";

import { getCategories } from "@/lib/data/courses";
import { CategoryIcon } from "@/lib/icons";

export async function CategoryGrid() {
  const categories = await getCategories();

  return (
    <section id="categories" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Explore by category
        </h2>
        <p className="mt-3 text-muted-foreground">
          Six focused tracks, each built around real projects you can point to.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/courses?category=${category.slug}`}
            className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center transition-colors hover:border-primary/40 hover:bg-secondary/50"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <CategoryIcon icon={category.icon} className="size-6" strokeWidth={1.75} />
            </span>
            <span className="text-sm font-medium text-foreground">{category.name}</span>
            <span className="text-xs text-muted-foreground">
              {category._count.courses} course{category._count.courses === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
