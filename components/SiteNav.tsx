import Link from "next/link";
import { LayoutDashboard, Shield } from "lucide-react";

type SiteNavProps = {
  active: "home" | "dashboard";
};

export default function SiteNav({ active }: SiteNavProps) {
  const linkClass = (key: SiteNavProps["active"]) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active === key
        ? "bg-[var(--ink)] text-white"
        : "text-[var(--muted)] hover:bg-white/60 hover:text-[var(--ink)]"
    }`;

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[var(--accent)]"
      >
        <Shield className="h-5 w-5" aria-hidden />
        <span className="font-display text-sm font-semibold tracking-wide">
          HassMelden
        </span>
      </Link>
      <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
        <Link href="/" className={linkClass("home")}>
          Anzeige erstellen
        </Link>
        <Link href="/dashboard" className={linkClass("dashboard")}>
          <span className="inline-flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
            Dashboard
          </span>
        </Link>
      </div>
    </nav>
  );
}
