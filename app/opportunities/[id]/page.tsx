import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/db";
import Nav from "@/components/Nav";
import DetailClient from "./DetailClient";
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

  return (
    <>
      <Nav />
      <DetailClient opp={opp as Opportunity} reqs={(reqs || []) as Requirement[]} />
    </>
  );
}
