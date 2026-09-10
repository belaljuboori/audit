"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category } from "@prisma/client";

export function CourseFilters({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      startTransition(() => {
        router.push(`/courses?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        role="search"
        className="relative flex-1"
        onSubmit={(event) => {
          event.preventDefault();
          updateParams({ q: search || null });
        }}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search courses…"
          className="pl-9"
          aria-label="Search courses"
        />
      </form>

      <Select
        value={searchParams.get("category") ?? "all"}
        onValueChange={(value) => updateParams({ category: value === "all" ? null : value })}
      >
        <SelectTrigger className="w-full sm:w-56" aria-label="Filter by category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.slug}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="sr-only" role="status">
        {isPending ? "Updating results…" : ""}
      </span>
    </div>
  );
}
