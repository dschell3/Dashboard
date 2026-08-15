"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ArrowUpDown, ChevronDown, Clock, RefreshCw, Calendar, Trash2, Star, ExternalLink } from "lucide-react";
import type { Opportunity, OppStatus } from "@/lib/types";
import { windowInfo, statusLabel, safeUrl, sourceLabel, postedAgo } from "@/lib/format";
import { Chip } from "@/components/ui";
import { toast } from "@/components/Toaster";

type SortKey = "fit" | "deadline" | "company" | "posted";
const STATUSES: OppStatus[] = ["interested", "preparing", "applied", "interview", "offer", "rejected", "withdrawn", "closed"];

function deadlineRank(o: Opportunity) {
  if (o.deadline_at) return (new Date(o.deadline_at + "T00:00:00").getTime() - Date.now()) / 86400000;
  if (o.window_opens_at) {
    const d = (new Date(o.window_opens_at + "T00:00:00").getTime() - Date.now()) / 86400000;
    return d > 0 ? d + 0.5 : 900;
  }
  return 900;
}

export default function OpportunitiesTable({ initial }: { initial: Opportunity[] }) {
  const router = useRouter();
  // Filters/sort start from the URL so a view survives navigating away and
  // back (or a refresh), and a filtered view can be bookmarked.
  const sp = useSearchParams();
  const rawSort = sp.get("sort");
  const [opps, setOpps] = useState(initial);
  const [q, setQ] = useState(sp.get("q") || "");
  const [status, setStatus] = useState(sp.get("status") || "all");
  const [source, setSource] = useState(sp.get("source") || "all");
  const [elig, setElig] = useState(sp.get("elig") || "all");
  const [focusOnly, setFocusOnly] = useState(sp.get("focus") === "1");
  const [sort, setSort] = useState<SortKey>(
    rawSort === "deadline" || rawSort === "company" || rawSort === "posted" ? rawSort : "fit"
  );

  // Optimistic edits live in local state; when the server sends fresh rows
  // (after an import or a save elsewhere), fold them back in.
  useEffect(() => setOpps(initial), [initial]);

  // Mirror the current view into the URL (replaceState: no navigation, no
  // history spam, defaults omitted so the clean view keeps a clean URL).
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status !== "all") p.set("status", status);
    if (source !== "all") p.set("source", source);
    if (elig !== "all") p.set("elig", elig);
    if (focusOnly) p.set("focus", "1");
    if (sort !== "fit") p.set("sort", sort);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [q, status, source, elig, focusOnly, sort]);

  const rows = useMemo(() => {
    const out = opps.filter((o) => {
      const hay = `${o.company_name_raw || ""} ${o.title} ${(o.locations || []).join(" ")}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase().trim())) return false;
      if (status !== "all" && o.status !== status) return false;
      if (source !== "all" && (o.source || "manual") !== source) return false;
      if (elig !== "all" && (o.eligibility_flag || "clear") !== elig) return false;
      if (focusOnly && !o.company_id) return false;
      return true;
    });
    const postedRank = (o: Opportunity) => (o.date_posted ? new Date(o.date_posted).getTime() : -Infinity);
    out.sort((a, b) => {
      if (sort === "fit") return (b.fit_score || 0) - (a.fit_score || 0);
      if (sort === "deadline") return deadlineRank(a) - deadlineRank(b);
      if (sort === "posted") return postedRank(b) - postedRank(a); // newest first, undated last
      return (a.company_name_raw || "").localeCompare(b.company_name_raw || "");
    });
    return out;
  }, [opps, q, status, source, elig, focusOnly, sort]);

  async function setOppStatus(id: string, next: OppStatus) {
    const prev = opps;
    setOpps((p) => p.map((o) => (o.id === id ? { ...o, status: next } : o))); // optimistic
    const res = await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setOpps(prev);
      toast("Could not update status — check your connection.", "error");
    } else {
      router.refresh();
    }
  }

  async function removeOpp(id: string, name: string) {
    if (!confirm(`Remove "${name}" from your board? (A future swelist import can re-add live listings.)`)) return;
    const prev = opps;
    setOpps((p) => p.filter((o) => o.id !== id));
    const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setOpps(prev);
      toast("Could not delete — check your connection.", "error");
    } else {
      router.refresh();
    }
  }

  const sel = "h-9 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500";

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h1 className="text-lg font-medium">All opportunities</h1>
        <span className="text-[13px] text-stone-500 dark:text-stone-400">{rows.length} of {opps.length} roles</span>
      </div>

      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search company, role, or location…"
          className="h-9 w-full rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 pl-8 pr-3 text-sm outline-none focus:border-stone-400 dark:focus:border-stone-500"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={sel} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={sel} aria-label="Filter by source">
          <option value="all">All sources</option>
          <option value="swelist">swelist</option>
          <option value="ats">Company feed</option>
          <option value="manual">Tracked</option>
        </select>
        <select value={elig} onChange={(e) => setElig(e.target.value)} className={sel} aria-label="Filter by eligibility">
          <option value="all">All eligibility</option>
          <option value="clear">Eligible</option>
          <option value="review">Review</option>
        </select>
        <button
          onClick={() => setFocusOnly((v) => !v)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm ${focusOnly ? "border-stone-900 dark:border-stone-100 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50"}`}
          aria-pressed={focusOnly}
        >
          <Star className="h-3.5 w-3.5" /> Focus only
        </button>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-[13px] text-stone-500 dark:text-stone-400">
          <ArrowUpDown className="h-4 w-4" /> Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={sel} aria-label="Sort by">
            <option value="fit">Fit</option>
            <option value="posted">Newest</option>
            <option value="deadline">Deadline</option>
            <option value="company">Company</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-800">
        <table className="w-full min-w-[720px] table-fixed border-collapse">
          <thead>
            <tr className="bg-stone-50 dark:bg-stone-800/50 text-left text-[13px] text-stone-500 dark:text-stone-400">
              <Th w="30%" active={sort === "company"} dir="ascending" onClick={() => setSort("company")}>Company</Th>
              <th className="hidden px-3 py-2.5 font-medium sm:table-cell" style={{ width: "14%" }}>Location</th>
              <Th w="8%" active={sort === "fit"} dir="descending" onClick={() => setSort("fit")}>Fit</Th>
              <Th w="10%" active={sort === "posted"} dir="descending" onClick={() => setSort("posted")} hideBelow="md">Posted</Th>
              <Th w="14%" active={sort === "deadline"} dir="ascending" onClick={() => setSort("deadline")}>Window</Th>
              <th className="px-3 py-2.5 font-medium" style={{ width: "16%" }}>Status</th>
              <th className="px-3 py-2.5" style={{ width: "8%" }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <Row key={o.id} o={o} onStatus={setOppStatus} onDelete={removeOpp} />
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm text-stone-500 dark:text-stone-400">No roles match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ w, active, dir, onClick, hideBelow, children }: {
  w: string;
  active: boolean;
  dir: "ascending" | "descending";
  onClick: () => void;
  hideBelow?: "sm" | "md";
  children: React.ReactNode;
}) {
  // A real <button> so sorting works from the keyboard, with aria-sort so
  // screen readers announce the current order.
  const hide = hideBelow === "md" ? "hidden md:table-cell" : hideBelow === "sm" ? "hidden sm:table-cell" : "";
  return (
    <th style={{ width: w }} aria-sort={active ? dir : "none"} className={`px-3 py-2.5 font-medium ${hide}`}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex select-none items-center gap-1 rounded font-medium outline-none focus-visible:ring-2 focus-visible:ring-stone-400 dark:focus-visible:ring-stone-500"
      >
        {children}
        <ChevronDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-0"}`} />
      </button>
    </th>
  );
}

function Row({ o, onStatus, onDelete }: {
  o: Opportunity;
  onStatus: (id: string, s: OppStatus) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const win = windowInfo(o);
  const dot = o.eligibility_flag === "review" ? "bg-amber-500" : "bg-emerald-500";
  const done = ["rejected", "withdrawn", "closed"].includes(o.status);
  return (
    <tr className={`border-t border-stone-200 dark:border-stone-800 align-middle ${done ? "opacity-50" : ""}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} title={o.eligibility_flag === "review" ? "Review" : "Eligible"} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/opportunities/${o.id}`} className="truncate text-sm font-medium hover:underline">
                {o.company_name_raw || "—"}
              </Link>
              {safeUrl(o.source_url) && (
                <a
                  href={safeUrl(o.source_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                  aria-label={`Open posting for ${o.company_name_raw}`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <div className="truncate text-xs text-stone-500 dark:text-stone-400">{o.title} · {sourceLabel(o.source)}</div>
          </div>
        </div>
      </td>
      <td className="hidden truncate px-3 py-2.5 text-sm text-stone-500 dark:text-stone-400 sm:table-cell">{(o.locations && o.locations[0]) || o.work_mode || "—"}</td>
      <td className="px-3 py-2.5"><Chip tone="blue">{o.fit_score ?? 0}</Chip></td>
      <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">
        {(() => {
          const p = postedAgo(o.date_posted);
          if (!p) return <span className="text-sm text-stone-400 dark:text-stone-500">—</span>;
          return p.recent
            ? <Chip tone="success">{p.text}</Chip>
            : <span className="text-sm text-stone-500 dark:text-stone-400">{p.text}</span>;
        })()}
      </td>
      <td className="px-3 py-2.5">
        {win.kind === "due" ? <Chip tone="warning"><Clock className="h-3 w-3" />{win.text}</Chip>
          : win.kind === "opens" ? <Chip tone="info"><Calendar className="h-3 w-3" />{win.text}</Chip>
          : <Chip tone="neutral"><RefreshCw className="h-3 w-3" />{win.text}</Chip>}
      </td>
      <td className="px-3 py-2.5">
        <select
          value={o.status}
          onChange={(e) => onStatus(o.id, e.target.value as OppStatus)}
          className="h-8 w-full rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-1.5 text-xs outline-none focus:border-stone-400 dark:focus:border-stone-500"
          aria-label={`Status for ${o.company_name_raw}`}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 text-right">
        <button
          onClick={() => onDelete(o.id, o.company_name_raw || o.title)}
          className="rounded-md p-1.5 text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:bg-white hover:text-red-600 dark:hover:text-red-400"
          aria-label={`Delete ${o.company_name_raw}`}
          title="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
