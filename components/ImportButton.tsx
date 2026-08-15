"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";

export default function ImportButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runOne(path: string) {
    const res = await fetch(path, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Import failed");
    return data;
  }

  async function run() {
    setLoading(true);
    try {
      const feed = await runOne("/api/import-swelist");
      toast(`swelist feed: ${feed.added} new, ${feed.updated} refreshed (${feed.scanned} scanned)`, "success");
    } catch (e: any) {
      toast(`swelist feed: ${e.message}`, "error");
    }
    try {
      const ats = await runOne("/api/import-ats");
      const failed = (ats.results || []).filter((r: any) => r.error);
      const closedNote = ats.closed ? `, ${ats.closed} no longer listed` : "";
      toast(`Company boards: ${ats.added} new, ${ats.updated} refreshed${closedNote}`, "success");
      if (failed.length) {
        toast(`Unreachable: ${failed.map((r: any) => `${r.company} (${r.error})`).join(", ")}`, "error");
      }
    } catch (e: any) {
      toast(`Company boards: ${e.message}`, "error");
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {loading ? "Importing…" : "Import roles"}
    </button>
  );
}
