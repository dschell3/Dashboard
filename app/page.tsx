import Link from "next/link";
import { createServerClient } from "@/lib/db";
import Nav from "@/components/Nav";
import TasksPanel, { type TaskItem } from "@/components/TasksPanel";
import { Card, StatCard, Chip } from "@/components/ui";
import { windowInfo, statusLabel, initials, startOfTodayMs } from "@/lib/format";
import type { Opportunity } from "@/lib/types";
import { ChevronRight, Check, AlertTriangle, Clock, RefreshCw, Calendar, EyeOff } from "lucide-react";

export const dynamic = "force-dynamic";

const ACTIVE = ["interested", "preparing", "applied", "interview"];
const IN_PIPELINE = ["preparing", "applied", "interview", "offer"];
const PIPELINE = ["interested", "preparing", "applied", "interview", "offer"];

export default async function DashboardPage() {
  const supabase = createServerClient();

  const { data: oppsData } = await supabase
    .from("opportunities")
    .select("*")
    .order("fit_score", { ascending: false });
  const opps: Opportunity[] = oppsData || [];
  const visible = opps.filter((o) => o.eligibility_flag !== "blocked");

  // Date windows measure from the START of today, so a deadline due today
  // still counts as due this week (and never silently disappears).
  const todayStart = startOfTodayMs();
  const dateMs = (d: string) => new Date(d + "T00:00:00").getTime();
  const within = (d: string | null, days: number) => {
    if (!d) return false;
    const t = dateMs(d);
    return t >= todayStart && t <= todayStart + days * 86400000;
  };
  const createdWithin = (d: string | null, days: number) =>
    !!d && new Date(d).getTime() >= Date.now() - days * 86400000;

  const activeRoles = opps.filter((o) => ACTIVE.includes(o.status)).length;
  const dueThisWeek = opps.filter((o) => within(o.deadline_at, 7)).length;
  const inPipeline = opps.filter((o) => IN_PIPELINE.includes(o.status)).length;
  const newMatches = opps.filter((o) => o.source === "swelist" && createdWithin(o.created_at, 7)).length;

  const topMatches = visible.slice(0, 6);

  // Needs attention: overdue first (they need a status decision), then
  // upcoming deadlines, opening windows, and top rolling roles to apply to.
  const overdueItems = visible
    .filter((o) => o.deadline_at && dateMs(o.deadline_at) < todayStart && ACTIVE.includes(o.status))
    .sort((a, b) => (a.deadline_at! < b.deadline_at! ? -1 : 1));
  const deadlineItems = visible
    .filter((o) => within(o.deadline_at, 30) && ACTIVE.includes(o.status))
    .sort((a, b) => (a.deadline_at! < b.deadline_at! ? -1 : 1));
  const opensItems = visible.filter(
    (o) => !o.deadline_at && within(o.window_opens_at, 30) && ACTIVE.includes(o.status)
  );
  const rollingTop = visible
    .filter((o) => o.is_rolling && !o.deadline_at && !within(o.window_opens_at, 30) && ACTIVE.includes(o.status))
    .slice(0, 3);
  const attention = [...overdueItems, ...deadlineItems, ...opensItems, ...rollingTop].slice(0, 5);

  const pipelineCounts = PIPELINE.map((s) => ({ status: s, count: opps.filter((o) => o.status === s).length }));

  const { data: reqData } = await supabase
    .from("requirements")
    .select("id, label, type, due_at, is_complete, opportunity_id, opportunities(company_name_raw)")
    .eq("is_complete", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(6);
  const tasks: TaskItem[] = (reqData || []).map((t: any) => ({
    id: t.id,
    label: t.label || statusLabel(t.type || "Task"),
    due_at: t.due_at,
    company: t.opportunities?.company_name_raw || null,
    opportunity_id: t.opportunity_id || null,
  }));

  const hiddenCount = opps.length - visible.length;

  return (
    <>
      <Nav />

      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-lg font-medium">Summer 2026</h1>
        <span className="text-[13px] text-stone-500 dark:text-stone-400">{activeRoles} active roles</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active roles" value={activeRoles} />
        <StatCard label="Due this week" value={dueThisWeek} tone="warning" />
        <StatCard label="In pipeline" value={inPipeline} />
        <StatCard label="New matches" value={newMatches} tone="info" />
      </div>

      <Card className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-medium">Top matches</h2>
          <span className="text-[13px] text-stone-500 dark:text-stone-400">sorted by fit</span>
        </div>
        {topMatches.length === 0 ? (
          <p className="py-4 text-sm text-stone-500 dark:text-stone-400">
            No opportunities yet. Click <span className="font-medium text-stone-700 dark:text-stone-300">Import from swelist</span> to pull live internships scored to your profile, or <Link href="/opportunities/new" className="underline">add one</Link>.
          </p>
        ) : (
          topMatches.map((o, i) => <OppRow key={o.id} o={o} first={i === 0} />)
        )}
        {hiddenCount > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-[13px] text-stone-500 dark:text-stone-400">
            <EyeOff className="h-3.5 w-3.5" />
            {hiddenCount} role{hiddenCount > 1 ? "s" : ""} hidden in excluded sectors
          </div>
        )}
      </Card>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-base font-medium">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="py-2 text-sm text-stone-500 dark:text-stone-400">Nothing time-sensitive yet.</p>
          ) : (
            attention.map((o, i) => <AttentionRow key={o.id} o={o} first={i === 0} />)
          )}
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-medium">Tasks</h2>
          <TasksPanel tasks={tasks} />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-base font-medium">Pipeline</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {pipelineCounts.map((p) => (
            <div key={p.status} className="rounded-md bg-stone-100/70 dark:bg-stone-800/60 p-2.5 text-center">
              <div className={`text-xl font-medium ${p.count === 0 ? "text-stone-400 dark:text-stone-500" : "text-stone-900 dark:text-stone-100"}`}>{p.count}</div>
              <div className="mt-0.5 text-[13px] text-stone-500 dark:text-stone-400">{statusLabel(p.status)}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function OppRow({ o, first }: { o: Opportunity; first: boolean }) {
  const win = windowInfo(o);
  const sub = [o.title, (o.locations && o.locations[0]) || o.work_mode].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className={`flex items-center gap-3 rounded-md p-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 ${first ? "" : "border-t border-stone-200 dark:border-stone-800"}`}
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-500 dark:text-stone-400">
        {initials(o.company_name_raw || o.title)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{o.company_name_raw || "—"}</div>
        <div className="truncate text-xs text-stone-500 dark:text-stone-400">{sub}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Chip tone="blue">{o.fit_score ?? 0}</Chip>
        {/* On phones the row only has space for the two chips that drive
            action (fit + window); eligibility reappears from sm up. */}
        <span className="hidden sm:block">
          {o.eligibility_flag === "review"
            ? <Chip tone="warning"><AlertTriangle className="h-3 w-3" />Review</Chip>
            : <Chip tone="success"><Check className="h-3 w-3" />Eligible</Chip>}
        </span>
        {win.kind === "due"
          ? <Chip tone="warning"><Clock className="h-3 w-3" />{win.text}</Chip>
          : win.kind === "opens"
          ? <Chip tone="info"><Calendar className="h-3 w-3" />{win.text}</Chip>
          : <Chip tone="neutral"><RefreshCw className="h-3 w-3" />{win.text}</Chip>}
        <ChevronRight className="hidden h-4 w-4 text-stone-400 dark:text-stone-500 sm:block" />
      </div>
    </Link>
  );
}

function AttentionRow({ o, first }: { o: Opportunity; first: boolean }) {
  const win = windowInfo(o);
  const dot = win.kind === "due" ? "bg-amber-500" : win.kind === "opens" ? "bg-blue-500" : "bg-emerald-500";
  const chip =
    win.kind === "rolling" ? <Chip tone="success">Apply now</Chip>
    : win.kind === "due" ? <Chip tone="warning">{win.text}</Chip>
    : <Chip tone="info">{win.text}</Chip>;
  return (
    <Link href={`/opportunities/${o.id}`} className={`flex items-center gap-2.5 py-2 hover:bg-stone-50 dark:hover:bg-stone-800/50 ${first ? "" : "border-t border-stone-200 dark:border-stone-800"}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{o.company_name_raw}</div>
        <div className="truncate text-[13px] text-stone-500 dark:text-stone-400">{o.title}</div>
      </div>
      {chip}
    </Link>
  );
}
