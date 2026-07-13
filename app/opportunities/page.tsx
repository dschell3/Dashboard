import { createServerClient } from "@/lib/db";
import Nav from "@/components/Nav";
import OpportunitiesTable from "./OpportunitiesTable";
import type { Opportunity } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const supabase = createServerClient();
  const { data } = await supabase.from("opportunities").select("*").order("fit_score", { ascending: false }).limit(2000);
  const opps: Opportunity[] = (data || []).filter((o) => o.eligibility_flag !== "blocked");
  return (
    <>
      <Nav />
      <OpportunitiesTable initial={opps} />
    </>
  );
}
