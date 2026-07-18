"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, Trash2, Square, CheckSquare, Plus,
  Check, AlertTriangle, Clock, RefreshCw, Calendar, ScanSearch,
} from "lucide-react";
import type { Opportunity, Requirement } from "@/lib/types";
import { windowInfo, statusLabel, safeUrl, fmtDate, daysUntil, sourceLabel } from "@/lib/format";
import { Chip, Card } from "@/components/ui";
import { toast } from "@/components/Toaster";

const STATUSES = ["interested", "preparing", "applied", "interview", "offer", "rejected", "withdrawn", "closed"];
const REQ_TYPES = ["resume", "cover_letter", "transcript", "essay", "references", "portfolio", "online_assessment", "other"];
const BREAKDOWN_LABELS: Record<string, string> = {
  location: "Location", focus: "Focus company", keywords: "Keywords", role: "Role type", freshness: "Freshness",
};

const input = "h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400";
const label = "mb-1 block text-[13px] text-stone-500";

export default function DetailClient({ opp, reqs }: { opp: Opportunity; reqs: Requirement[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [f, setF] = useState({
    status: opp.status as string,
    priority: opp.priority || "",
    deadline_at: opp.deadline_at || "",
    window_opens_at: opp.window_opens_at || "",
    work_mode: opp.work_mode || "",
    source_url: opp.source_url || "",
    notes: opp.notes || "",
  });
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const [reqForm, setReqForm] = useState({ label: "", type: "other", due_at: "" });
  const [reqBusy, setReqBusy] = useState(false);

  const win = windowInfo(opp);
  const link = safeUrl(opp.source_url);
  const breakdown = Object.entries(opp.fit_breakdown || {}).filter(([, v]) => v > 0);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/opportunities/${opp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      toast("Saved", "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function scanDeadline() {
    setScanning(true);
    try {
      const res = await fetch(`/api/opportunities/${opp.id}/scan`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Scan failed.");
      if (data.found) {
        set("deadline_at", data.found);
        toast(`Deadline found: ${fmtDate(data.found)}`, "success");
        router.refresh();
      } else {
        toast(data.reason || "No stated deadline found — likely rolling.");
      }
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setScanning(false);
    }
  }

  async function toggleReq(r: Requirement) {
    const res = await fetch(`/api/requirements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: !r.is_complete }),
    }).catch(() => null);
    if (!res?.ok) return toast("Could not update the task — check your connection.", "error");
    router.refresh();
  }

  async function deleteReq(id: string) {
    const res = await fetch(`/api/requirements/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Could not delete the task — check your connection.", "error");
    router.refresh();
  }

  async function addReq() {
    if (!reqForm.label.trim()) return;
    setReqBusy(true);
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity_id: opp.id, ...reqForm }),
      });
      if (!res.ok) throw new Error();
      setReqForm({ label: "", type: "other", due_at: "" });
      router.refresh();
    } catch {
      toast("Could not add the task — check your connection.", "error");
    } finally {
      setReqBusy(false);
    }
  }

  async function deleteOpp() {
    if (!confirm(`Remove ${opp.company_name_raw || "this role"} from your dashboard?`)) return;
    const res = await fetch(`/api/opportunities/${opp.id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      router.push("/opportunities");
      router.refresh();
    } else {
      toast("Could not delete — check your connection.", "error");
    }
  }

  return (
    <div>
      <Link href="/opportunities" className="mb-4 inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800">
        <ArrowLeft className="h-4 w-4" /> All opportunities
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">{opp.company_name_raw || "—"}</h1>
          <p className="text-sm text-stone-500">
            {opp.title}
            {opp.locations && opp.locations[0] ? ` · ${opp.locations[0]}` : opp.work_mode ? ` · ${opp.work_mode}` : ""}
            {" · "}{sourceLabel(opp.source)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="blue">Fit {opp.fit_score ?? 0}</Chip>
          {opp.eligibility_flag === "review"
            ? <Chip tone="warning"><AlertTriangle className="h-3 w-3" />Review</Chip>
            : <Chip tone="success"><Check className="h-3 w-3" />Eligible</Chip>}
          {win.kind === "due"
            ? <Chip tone="warning"><Clock className="h-3 w-3" />{win.text}</Chip>
            : win.kind === "opens"
            ? <Chip tone="info"><Calendar className="h-3 w-3" />{win.text}</Chip>
            : <Chip tone="neutral"><RefreshCw className="h-3 w-3" />{win.text}</Chip>}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              <ExternalLink className="h-4 w-4" /> Posting
            </a>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="mb-3 text-base font-medium">Details</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Status</label>
              <select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Priority</label>
              <select className={input} value={f.priority} onChange={(e) => set("priority", e.target.value)}>
                <option value="">—</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[13px] text-stone-500">Deadline (blank = rolling)</label>
                {safeUrl(f.source_url) && (
                  <button
                    onClick={scanDeadline}
                    disabled={scanning}
                    title="Fetch the posting and look for a stated deadline"
                    className="inline-flex items-center gap-1 text-[13px] text-stone-500 underline hover:text-stone-800 disabled:opacity-60"
                  >
                    <ScanSearch className="h-3.5 w-3.5" />
                    {scanning ? "Scanning…" : "Scan posting"}
                  </button>
                )}
              </div>
              <input type="date" className={input} value={f.deadline_at} onChange={(e) => set("deadline_at", e.target.value)} />
            </div>
            <div>
              <label className={label}>Window opens</label>
              <input type="date" className={input} value={f.window_opens_at} onChange={(e) => set("window_opens_at", e.target.value)} />
            </div>
            <div>
              <label className={label}>Work mode</label>
              <select className={input} value={f.work_mode} onChange={(e) => set("work_mode", e.target.value)}>
                <option value="">—</option>
                <option value="onsite">Onsite</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className={label}>Posting link</label>
              <input className={input} value={f.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Notes (recruiter names, referral, application details…)</label>
              <textarea
                className="min-h-[96px] w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-stone-400"
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={save} disabled={saving} className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60">
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <h2 className="mb-2 text-base font-medium">Why this score</h2>
            {breakdown.length === 0 ? (
              <p className="text-sm text-stone-500">No score breakdown stored for this role.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {breakdown.map(([k, v]) => (
                  <Chip key={k} tone="blue">+{v} {BREAKDOWN_LABELS[k] || k}</Chip>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-1 text-[13px] text-stone-500">
              {opp.date_posted && <p>Posted {new Date(opp.date_posted).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
              {opp.applied_at && <p>Applied {new Date(opp.applied_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
              {opp.season && <p>{opp.season}</p>}
              {opp.sponsorship && <p>Sponsorship: {opp.sponsorship}</p>}
            </div>
          </Card>
          <Card>
            <h2 className="mb-2 text-base font-medium">Remove</h2>
            <p className="mb-2 text-[13px] text-stone-500">Deletes this role and its checklist. It will come back on the next import if it is still in the feed.</p>
            <button onClick={deleteOpp} className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Delete role
            </button>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-2 text-base font-medium">Application checklist</h2>
        {reqs.length === 0 && <p className="py-1 text-sm text-stone-500">Nothing yet. Add what this application needs — items show up in Tasks on the dashboard.</p>}
        {reqs.map((r, i) => {
          const overdue = r.due_at && !r.is_complete && daysUntil(r.due_at) < 0;
          return (
            <div key={r.id} className={`flex items-center gap-2.5 py-2 ${i > 0 ? "border-t border-stone-200" : ""}`}>
              <button onClick={() => toggleReq(r)} aria-label={r.is_complete ? "Mark incomplete" : "Mark complete"} className="text-stone-400 hover:text-stone-700">
                {r.is_complete ? <CheckSquare className="h-[18px] w-[18px] text-emerald-600" /> : <Square className="h-[18px] w-[18px]" />}
              </button>
              <div className={`min-w-0 flex-1 truncate text-sm ${r.is_complete ? "text-stone-400 line-through" : ""}`}>
                {r.label || statusLabel(r.type || "Task")}
              </div>
              {r.due_at && (
                <Chip tone={overdue || daysUntil(r.due_at) <= 7 ? "warning" : "neutral"}>
                  {overdue ? "Overdue" : `Due ${fmtDate(r.due_at)}`}
                </Chip>
              )}
              <button onClick={() => deleteReq(r.id)} aria-label="Delete task" className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
          <input
            className="h-9 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400"
            placeholder="e.g. Tailor resume for QA emphasis"
            value={reqForm.label}
            onChange={(e) => setReqForm((p) => ({ ...p, label: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addReq()}
          />
          <select
            className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm outline-none focus:border-stone-400"
            value={reqForm.type}
            onChange={(e) => setReqForm((p) => ({ ...p, type: e.target.value }))}
            aria-label="Task type"
          >
            {REQ_TYPES.map((t) => <option key={t} value={t}>{statusLabel(t.replace("_", " "))}</option>)}
          </select>
          <input
            type="date"
            className="h-9 rounded-md border border-stone-200 bg-white px-2 text-sm outline-none focus:border-stone-400"
            value={reqForm.due_at}
            onChange={(e) => setReqForm((p) => ({ ...p, due_at: e.target.value }))}
            aria-label="Due date"
          />
          <button onClick={addReq} disabled={reqBusy || !reqForm.label.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </Card>
    </div>
  );
}
