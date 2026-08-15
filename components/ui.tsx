import { ReactNode } from "react";

type Tone = "neutral" | "info" | "blue" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300",
  info: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
  blue: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
  success: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs whitespace-nowrap ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, tone }: { label: string; value: ReactNode; tone?: "warning" | "info" }) {
  const color = tone === "warning" ? "text-amber-600 dark:text-amber-400" : tone === "info" ? "text-blue-600 dark:text-blue-400" : "text-stone-900 dark:text-stone-100";
  return (
    <div className="rounded-lg bg-stone-100/70 dark:bg-stone-800/60 p-4">
      <div className="text-[13px] text-stone-500 dark:text-stone-400">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${color}`}>{value}</div>
    </div>
  );
}
