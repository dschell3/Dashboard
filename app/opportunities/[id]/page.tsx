import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/db";
import Nav from "@/components/Nav";
import DetailClient from "./DetailClient";
import type { TailoredResume } from "@/components/ResumePanel";
import type { Opportunity, Requirement } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();

  const { data: opp } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!opp) notFound();

  const { data: reqs } = await supabase
    .from("requirements")
    .select("*")
    .eq("opportunity_id", params.id)
    .order("created_at", { ascending: true });

  // Resume feature data. Both queries error harmlessly (→ empty) until
  // migration 003 has been applied.
  const [{ data: resumeRows }, { data: tailoredRows }] = await Promise.all([
    supabase.from("resumes").select("id").limit(1),
    supabase
      .from("tailored_resumes")
      .select("id, content_md, model, created_at")
      .eq("opportunity_id", params.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <>
      <Nav />
      <DetailClient
        opp={opp as Opportunity}
        reqs={(reqs || []) as Requirement[]}
        hasResume={!!(resumeRows && resumeRows.length > 0)}
        tailored={(tailoredRows || []) as TailoredResume[]}
      />
    </>
  );
}
