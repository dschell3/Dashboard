"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, Plus, LogOut } from "lucide-react";
import ImportButton from "./ImportButton";
import ThemeToggle from "./ThemeToggle";

export default function Nav() {
  const path = usePathname();
  const router = useRouter();

  const tab = (href: string, label: string) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link
        href={href}
        className={`border-b-2 px-1 pb-2 text-sm ${active ? "border-stone-900 dark:border-stone-100 font-medium text-stone-900 dark:text-stone-100" : "border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200"}`}
      >
        {label}
      </Link>
    );
  };

  async function signOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="mb-6 border-b border-stone-200 dark:border-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-stone-500 dark:text-stone-400" />
          <span className="text-base font-medium">Internship dashboard</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportButton />
          <a href="/api/export-ics" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/50">
            Export .ics
          </a>
          <Link href="/opportunities/new" className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/50">
            <Plus className="h-4 w-4" /> Add
          </Link>
          <ThemeToggle />
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-sm text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50 hover:text-stone-800 dark:hover:text-stone-200"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <nav className="flex gap-5">
        {tab("/", "Dashboard")}
        {tab("/opportunities", "Opportunities")}
        {tab("/capture", "Capture")}
      </nav>
    </header>
  );
}
