"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Loader2, Copy, Check, Trash2, ChevronDown, ChevronRight, Download } from "lucide-react";
import { toast } from "@/components/Toaster";

export type TailoredResume = {
  id: string;
  content_md: string;
  model: string | null;
  created_at: string | null;
};

// Per-opportunity resume tailoring: one click generates a version of the
// stored resume emphasized for this posting (via the Claude API). Versions
// are kept so earlier ones can be compared or copied later.
export default function ResumePanel({
  oppId,
  hasResume,
  tailored,
}: {
  oppId: string;
  hasResume: boolean;
  tailored: TailoredResume[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [jobText, setJobText] = useState("");
  const [open, setOpen] = useState<string | null>(tailored[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function tailor() {
    setBusy(true);
    try {
      const res = await fetch(`/api/opportunities/${oppId}/tailor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobText.trim() ? { job_text: jobText.trim() } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Tailoring failed.");
      toast(data.note || "Tailored resume ready.", data.note ? "info" : "success");
      if (data.tailored?.id) setOpen(data.tailored.id);
      setJobText("");
      setShowPaste(false);
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyVersion(t: TailoredResume) {
    try {
      await navigator.clipboard.writeText(t.content_md);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast("Could not copy — select the text manually.", "error");
    }
  }

  async function deleteVersion(id: string) {
    const res = await fetch(`/api/tailored/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Could not delete.", "error");
    router.refresh();
  }

  if (!hasResume) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        <Link href="/" className="underline">Upload a resume on the dashboard</Link> to tailor it for this role, or use your default one.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={tailor}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 dark:bg-stone-100 px-3 py-1.5 text-sm text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Tailoring… (up to a minute)" : "Tailor for this role"}
        </button>
        <a
          href="/api/resume/file"
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/50"
        >
          <Download className="h-3.5 w-3.5" /> Default resume
        </a>
      </div>

      <button
        onClick={() => setShowPaste((v) => !v)}
        className="mt-2 text-[13px] text-stone-500 dark:text-stone-400 underline-offset-2 hover:underline"
      >
        {showPaste ? "Hide pasted posting text" : "Paste posting text (optional — used when the page can't be read)"}
      </button>
      {showPaste && (
        <textarea
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
          placeholder="Paste the job description here…"
          className="mt-1.5 min-h-[96px] w-full rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-3 py-2 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500"
        />
      )}

      {tailored.length > 0 && (
        <div className="mt-3 space-y-2">
          {tailored.map((t) => {
            const isOpen = open === t.id;
            const when = t.created_at
              ? new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
                " " +
                new Date(t.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
              : "";
            return (
              <div key={t.id} className="rounded-md border border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <button
                    onClick={() => setOpen(isOpen ? null : t.id)}
                    className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm"
                    aria-expanded={isOpen}
                  >
                    {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                    <span className="truncate">Tailored {when}</span>
                  </button>
                  <button
                    onClick={() => copyVersion(t)}
                    aria-label="Copy tailored resume"
                    title="Copy Markdown"
                    className="rounded-md p-1 text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300"
                  >
                    {copiedId === t.id ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteVersion(t.id)}
                    aria-label="Delete tailored resume"
                    className="rounded-md p-1 text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {isOpen && (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 px-3 py-2 text-xs leading-relaxed">
                    {t.content_md}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
