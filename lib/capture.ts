// Turns a captured page title + host into a best-guess {title, company}.
// The bookmarklet stays dumb on purpose (it only ships location.href,
// document.title, and any selected text) so parsing can improve here without
// anyone re-installing the bookmark.

const ROLE_WORDS =
  /\b(intern|internship|co-?op|engineer|engineering|developer|analyst|scientist|designer|architect|technician|qa|test|administrator|specialist|programmer)\b/i;
const NOISE = /\b(careers?|jobs?|job details?|job application|openings?|hiring|apply)\b/gi;

// Hosts that belong to ATS vendors — the domain tells us nothing about the company.
const ATS_HOSTS = /greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|icims\.com|workable\.com|bamboohr\.com|jazz\.co|breezy\.hr/i;

const clean = (s: string) =>
  s.replace(NOISE, "").replace(/\s{2,}/g, " ").replace(/^[\s\-–—|:,]+|[\s\-–—|:,]+$/g, "").trim();

function companyFromHost(host: string): string {
  if (!host || ATS_HOSTS.test(host)) return "";
  const parts = host.replace(/^www\./i, "").split(".");
  const name = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

export function parseCapture(rawTitle: string, host: string, selection?: string) {
  const t = (rawTitle || "").trim().slice(0, 300);
  const sel = (selection || "").trim().slice(0, 200);

  // Greenhouse pattern: "Job Application for {Title} at {Company}"
  const gh = t.match(/^job application for (.+?) at (.+)$/i);
  if (gh) {
    return { title: sel || clean(gh[1]), company: clean(gh[2]) || companyFromHost(host) };
  }

  // Generic separators: "Title - Company Careers", "Company | Title", "Title @ Company"…
  const parts = t.split(/\s+[-–—|·@]\s+/).map(clean).filter(Boolean);
  if (parts.length >= 2) {
    const titleIdx = parts.findIndex((p) => ROLE_WORDS.test(p));
    if (titleIdx >= 0) {
      const company = parts.find((_, i) => i !== titleIdx) || "";
      return { title: sel || parts[titleIdx], company: company || companyFromHost(host) };
    }
    return { title: sel || parts[0], company: parts[1] || companyFromHost(host) };
  }

  return { title: sel || clean(t), company: companyFromHost(host) };
}
