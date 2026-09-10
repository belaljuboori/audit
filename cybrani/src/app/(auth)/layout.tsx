import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/40">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2 text-lg font-heading font-semibold text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            Cybrani
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
