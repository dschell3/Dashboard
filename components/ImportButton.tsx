"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

export default function ImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function runOne(path: string) {
    const res = await fetch(path, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Import failed");
    return data;
  }

  async function run() {
    setLoading(true);
    setMsg(null);
    const parts: string[] = [];
    try {
      const feed = await runOne("/api/import-swelist");
      parts.push(`feed: ${feed.added} new`);
    } catch (e: any) {
      parts.push(`feed: ${e.message}`);
    }
    try {
      const ats = await runOne("/api/import-ats");
      const errs = (ats.results || []).filter((r: any) => r.error).length;
      parts.push(`companies: ${ats.added} new${errs ? ` (${errs} board${errs > 1 ? "s" : ""} unreachable)` : ""}`);
    } catch (e: any) {
      parts.push(`companies: ${e.message}`);
    }
    setMsg(parts.join(" · "));
    router.refresh();
    setLoading(false);
    setTimeout(() => setMsg(null), 8000);
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-stone-500">{msg}</span>}
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Import roles
      </button>
    </div>
  );
}
