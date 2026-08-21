export type EligibilityFlag = "clear" | "review" | "blocked";
export type OppStatus =
  | "interested" | "preparing" | "applied" | "interview"
  | "offer" | "accepted" | "rejected" | "withdrawn" | "closed" | "not_relevant";

export type Opportunity = {
  id: string;
  company_id: string | null;
  company_name_raw: string | null;
  title: string;
  role_type: string | null;
  season: string | null;
  locations: string[] | null;
  work_mode: string | null;
  source: string | null;
  source_url: string | null;
  sponsorship: string | null;
  window_opens_at: string | null;
  deadline_at: string | null;
  is_rolling: boolean | null;
  status: OppStatus;
  priority: string | null;
  fit_score: number | null;
  fit_breakdown: Record<string, number> | null;
  eligibility_flag: EligibilityFlag | null;
  applied_at: string | null;
  created_at: string | null;
  date_posted: string | null;
  notes: string | null;
};

export type Requirement = {
  id: string;
  opportunity_id: string;
  type: string | null;
  label: string | null;
  is_required: boolean | null;
  is_complete: boolean | null;
  due_at: string | null;
};

export type Company = {
  id: string;
  name: string;
  location: string | null;
  bg_check_risk: string | null;
  is_focus: boolean | null;
  ats_type: string | null;
  ats_slug: string | null;
};
