import { ReactNode } from "react";

type Tone = "neutral" | "info" | "blue" | "success" | "warning";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-stone-100 text-stone-600",
  info: "bg-blue-50 text-blue-700",
  blue: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
};

export function Chip({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs whitespace-nowrap ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-stone-200 bg-white p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, tone }: { label: string; value: ReactNode; tone?: "warning" | "info" }) {
  const color = tone === "warning" ? "text-amber-600" : tone === "info" ? "text-blue-600" : "text-stone-900";
  return (
    <div className="rounded-lg bg-stone-100/70 p-4">
      <div className="text-[13px] text-stone-500">{label}</div>
      <div className={`mt-1 text-2xl font-medium ${color}`}>{value}</div>
    </div>
  );
}
