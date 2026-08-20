// Application-funnel Sankey for the dashboard. Pure SVG, no dependencies —
// counts come from current statuses. Chain stages wear a sequential blue ramp
// (deeper into the funnel = darker); terminal outcomes wear the app's status
// hues. Every node is direct-labeled (name + count), so color never carries
// identity alone; ribbons get native <title> tooltips.

export type FunnelCounts = {
  apps: number;      // everything that reached "applied" (current status in the applied set)
  noAnswer: number;  // still sitting at applied
  interviews: number;
  offers: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
};

const W = 12;              // node width
const X = [28, 236, 444, 652]; // column x positions
const CHAIN_Y = 34;        // top of the chain row
const VIEW_W = 760;

type NodeSpec = { x: number; y: number; h: number; count: number; label: string; node: string; text: string };

function ribbon(x1: number, y1: number, x2: number, y2: number, h: number) {
  const m = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2} L ${x2} ${y2 + h} C ${m} ${y2 + h}, ${m} ${y1 + h}, ${x1} ${y1 + h} Z`;
}

export default function FunnelSankey({ counts }: { counts: FunnelCounts }) {
  const { apps, noAnswer, interviews, offers, accepted, rejected, withdrawn } = counts;
  const unit = Math.min(16, 110 / Math.max(apps, 1));
  const t = (n: number) => (n > 0 ? Math.max(7, n * unit) : 0);

  // Chain nodes along the top.
  const chain: NodeSpec[] = [];
  if (interviews > 0)
    chain.push({ x: X[1], y: CHAIN_Y, h: t(interviews), count: interviews, label: "interviews", node: "fill-blue-500 dark:fill-blue-400", text: "" });
  if (offers > 0)
    chain.push({ x: X[2], y: CHAIN_Y, h: t(offers), count: offers, label: "offers", node: "fill-blue-700 dark:fill-blue-500", text: "" });
  if (accepted > 0)
    chain.push({ x: X[3], y: CHAIN_Y, h: t(accepted), count: accepted, label: "accepted", node: "fill-emerald-600 dark:fill-emerald-500", text: "" });

  // Branch nodes stacked below the chain, in the second column.
  const branches: NodeSpec[] = [];
  let branchY = Math.max(CHAIN_Y + t(interviews) + 96, 168);
  const pushBranch = (count: number, label: string, node: string) => {
    if (count <= 0) return;
    branches.push({ x: X[1], y: branchY, h: t(count), count, label, node, text: "" });
    branchY += t(count) + 44;
  };
  pushBranch(rejected, "rejected", "fill-red-600 dark:fill-red-400");
  pushBranch(withdrawn, "withdrawn", "fill-stone-400 dark:fill-stone-500");
  pushBranch(noAnswer, "no answer yet", "fill-amber-600 dark:fill-amber-400");

  const viewH = Math.max(branchY + 8, 240);

  // Applications node: slices in draw order (interviews first, then branches).
  const slices: { h: number; to: NodeSpec; rib: string; label: string }[] = [];
  const ribFor = (label: string) =>
    label === "interviews" ? "fill-blue-500/30 dark:fill-blue-400/25"
    : label === "rejected" ? "fill-red-600/25 dark:fill-red-400/20"
    : label === "withdrawn" ? "fill-stone-400/30 dark:fill-stone-500/25"
    : "fill-amber-600/25 dark:fill-amber-400/20";
  const ivNode = chain.find((c) => c.label === "interviews");
  if (ivNode) slices.push({ h: ivNode.h, to: ivNode, rib: ribFor("interviews"), label: "interviews" });
  for (const b of branches) slices.push({ h: b.h, to: b, rib: ribFor(b.label), label: b.label });

  const appsH = slices.reduce((s, x) => s + x.h, 0) || t(apps);
  // Center the applications node against everything it feeds.
  const feedTop = Math.min(...slices.map((s) => s.to.y), CHAIN_Y);
  const feedBottom = Math.max(...slices.map((s) => s.to.y + s.to.h), CHAIN_Y + 20);
  const appsY = Math.max(24, (feedTop + feedBottom) / 2 - appsH / 2);

  // Chain-to-chain ribbons (interviews→offers→accepted): flows leave the TOP
  // of the source node with the thickness of the target.
  const chainFlows: { from: NodeSpec; to: NodeSpec; rib: string }[] = [];
  const ofNode = chain.find((c) => c.label === "offers");
  const accNode = chain.find((c) => c.label === "accepted");
  if (ivNode && ofNode) chainFlows.push({ from: ivNode, to: ofNode, rib: "fill-blue-700/30 dark:fill-blue-500/25" });
  if (ofNode && accNode) chainFlows.push({ from: ofNode, to: accNode, rib: "fill-emerald-600/30 dark:fill-emerald-500/25" });

  const ink = "fill-stone-900 dark:fill-stone-100";
  const muted = "fill-stone-500 dark:fill-stone-400";

  let sliceOffset = 0;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${viewH}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Application funnel: ${apps} applications, ${interviews} interviews, ${offers} offers, ${accepted} accepted, ${rejected} rejected, ${withdrawn} withdrawn, ${noAnswer} awaiting answer.`}
    >
      {/* Ribbons from applications */}
      {slices.map((s) => {
        const y1 = appsY + sliceOffset;
        sliceOffset += s.h;
        return (
          <path key={`rib-${s.label}`} d={ribbon(X[0] + W, y1, s.to.x, s.to.y, s.h)} className={s.rib}>
            <title>{`applications → ${s.label}: ${s.to.count}`}</title>
          </path>
        );
      })}
      {/* Chain ribbons */}
      {chainFlows.map((f) => (
        <path key={`chain-${f.to.label}`} d={ribbon(f.from.x + W, f.from.y, f.to.x, f.to.y, f.to.h)} className={f.rib}>
          <title>{`${f.from.label} → ${f.to.label}: ${f.to.count}`}</title>
        </path>
      ))}

      {/* Applications node */}
      <rect x={X[0]} y={appsY} width={W} height={appsH} rx={2} className="fill-stone-500 dark:fill-stone-400" />
      <text x={X[0]} y={appsY - 8} fontSize={14} fontWeight={600} className={ink}>{apps}</text>
      <text x={X[0]} y={appsY + appsH + 16} fontSize={12} className={muted}>applications</text>

      {/* Stage + branch nodes */}
      {[...chain, ...branches].map((n) => (
        <g key={n.label}>
          <rect x={n.x} y={n.y} width={W} height={n.h} rx={2} className={n.node} />
          <text x={n.x} y={n.y - 8} fontSize={14} fontWeight={600} className={ink}>{n.count}</text>
          <text x={n.x} y={n.y + n.h + 16} fontSize={12} className={muted}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}
