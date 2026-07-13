"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Nav from "@/components/Nav";
import { parseCapture } from "@/lib/capture";

export default function NewOpportunityPage() {
  return (
    <>
      <Nav />
      <Suspense fallback={null}>
        <NewOpportunityForm />
      </Suspense>
    </>
  );
}

function NewOpportunityForm() {
  const router = useRouter();
  const sp = useSearchParams();

  // Prefill sent by the capture bookmarklet: u = page URL, t = page title,
  // s = any text the user had selected (wins as the role title).
  const captured = useMemo(() => {
    const u = sp.get("u") || "";
    const t = sp.get("t") || "";
    const s = sp.get("s") || "";
    if (!u && !t) return null;
    let host = "";
    try { host = u ? new URL(u).hostname : ""; } catch {}
    return { url: u, host, ...parseCapture(t, host, s) };
  }, [sp]);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    company: captured?.company || "",
    title: captured?.title || "",
    location: "",
    role_type: "internship",
    status: "interested",
    deadline: "",
    source_url: captured?.url || "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.company.trim() || !f.title.trim()) { setErr("Company and role are required."); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      router.push(data.id ? `/opportunities/${data.id}` : "/opportunities");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const input = "h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400";
  const label = "mb-1 block text-[13px] text-stone-500";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-lg font-medium">Add an opportunity</h1>
      {captured && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[13px] text-blue-700">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          Captured from {captured.host || "the page"} — double-check the fields, then save.
        </div>
      )}
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-5">
        <div><label className={label}>Company</label><input className={input} value={f.company} onChange={(e) => set("company", e.target.value)} /></div>
        <div><label className={label}>Role</label><input className={input} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div><label className={label}>Location</label><input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Folsom, CA or Remote" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Type</label>
            <select className={input} value={f.role_type} onChange={(e) => set("role_type", e.target.value)}>
              <option value="internship">Internship</option>
              <option value="co-op">Co-op</option>
              <option value="new-grad">New grad</option>
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="interested">Interested</option>
              <option value="preparing">Preparing</option>
              <option value="applied">Applied</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
            </select>
          </div>
        </div>
        <div><label className={label}>Deadline (optional — blank means rolling)</label><input type="date" className={input} value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
        <div><label className={label}>Link (optional)</label><input className={input} value={f.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={save} disabled={saving} className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60">
            {saving ? "Saving…" : "Save opportunity"}
          </button>
          <Link href="/opportunities" className="rounded-md border border-stone-200 px-3 py-1.5 text-sm hover:bg-stone-50">Cancel</Link>
        </div>
      </div>
    </div>
  );
}
