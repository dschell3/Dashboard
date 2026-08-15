"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Square } from "lucide-react";
import { Chip } from "@/components/ui";
import { toast } from "@/components/Toaster";
import { fmtDate, daysUntil } from "@/lib/format";

export type TaskItem = {
  id: string;
  label: string;
  due_at: string | null;
  company: string | null;
  opportunity_id: string | null;
};

export default function TasksPanel({ tasks }: { tasks: TaskItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function complete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_complete: true }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast("Could not complete the task — check your connection.", "error");
    } finally {
      setBusyId(null);
    }
  }

  if (tasks.length === 0) {
    return <p className="py-2 text-sm text-stone-500 dark:text-stone-400">No open tasks. Open a role and add its application checklist to track work here.</p>;
  }

  return (
    <>
      {tasks.map((t, i) => {
        const overdue = t.due_at && daysUntil(t.due_at) < 0;
        return (
          <div key={t.id} className={`flex items-center gap-2.5 py-2 ${i > 0 ? "border-t border-stone-200 dark:border-stone-800" : ""}`}>
            <button
              onClick={() => complete(t.id)}
              disabled={busyId === t.id}
              aria-label={`Mark "${t.label}" complete`}
              className="shrink-0 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50"
            >
              <Square className="h-[18px] w-[18px]" />
            </button>
            <div className="min-w-0 flex-1 truncate text-sm">
              {t.label}
              {t.company && (
                t.opportunity_id
                  ? <Link href={`/opportunities/${t.opportunity_id}`} className="text-stone-500 dark:text-stone-400 hover:underline"> — {t.company}</Link>
                  : <span className="text-stone-500 dark:text-stone-400"> — {t.company}</span>
              )}
            </div>
            {t.due_at && (
              <Chip tone={overdue || daysUntil(t.due_at) <= 7 ? "warning" : "neutral"}>
                {overdue ? "Overdue" : `Due ${fmtDate(t.due_at)}`}
              </Chip>
            )}
          </div>
        );
      })}
    </>
  );
}
