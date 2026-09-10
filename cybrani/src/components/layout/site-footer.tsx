import Link from "next/link";
import { GraduationCap } from "lucide-react";

const columns = [
  {
    title: "Learn",
    links: [
      { href: "/courses", label: "All courses" },
      { href: "/courses?category=web-development", label: "Web development" },
      { href: "/courses?category=cybersecurity", label: "Cybersecurity" },
      { href: "/courses?category=data-science", label: "Data science" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#categories", label: "Categories" },
      { href: "/signup", label: "Get started" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-5" />
              </span>
              Cybrani
            </Link>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              Practical, project-based courses in web development, cybersecurity, data,
              AI, and design — built to get you from curious to capable.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-heading text-sm font-semibold text-foreground">{col.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Cybrani. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">Built for learning, one course at a time.</p>
        </div>
      </div>
    </footer>
  );
}
