/**
 * workday-cxs.ts — talk to the JSON API behind a Workday careers page.
 *
 * A rendered Workday posting is a JS shell: fetching the apply URL returns
 * HTTP 200 and essentially no text whether the job is open, closed, or was
 * never real. That is why 2,900+ postings sat permanently at
 * "unreachable / empty_page" in jobs-review — the page cannot answer either
 * question, so we could neither price them nor expire them.
 *
 * The CXS detail endpoint behind each posting answers both:
 *   live   -> 200 with jobPostingInfo.title (and usually the pay in the body)
 *   gone   -> 403 / 404 / 410 with no posting  (Workday says "permission denied"
 *             for a requisition that has been delisted, not 404)
 */

export type WorkdayProbe =
  | { state: "live"; text: string }
  | { state: "gone"; httpStatus: number }
  /** Network failure or an unexpected shape — never treat as gone. */
  | { state: "unknown"; reason: string };

/** Rewrite a Workday apply URL into its CXS detail endpoint. */
export function cxsUrl(applyUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(applyUrl);
  } catch {
    return null;
  }
  if (!/myworkdayjobs\.com$/i.test(u.hostname)) return null;
  const tenant = u.hostname.split(".")[0];
  const parts = u.pathname.split("/").filter(Boolean); // [en-US, Site, job, ...rest]
  const jobIdx = parts.indexOf("job");
  if (jobIdx < 1) return null;
  const site = parts[jobIdx - 1];
  return `https://${u.hostname}/wday/cxs/${tenant}/${site}/${parts.slice(jobIdx).join("/")}`;
}

/**
 * Ask Workday whether a posting is still real.
 *
 * Only 403/404/410 counts as gone. Everything else that is not a clean, titled
 * posting resolves to "unknown", because expiring a live job on the strength
 * of a rate limit or a blip is far worse than carrying a dead one another day.
 */
export async function probeWorkday(applyUrl: string, ua: string, timeoutMs = 12_000): Promise<WorkdayProbe> {
  const url = cxsUrl(applyUrl);
  if (!url) return { state: "unknown", reason: "not_workday" };

  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": ua },
      signal: ctl.signal,
    });
    // 410 Gone is as definitive as 404; Workday returns 403 "permission
    // denied" for a requisition that has been delisted.
    if (res.status === 403 || res.status === 404 || res.status === 410) {
      return { state: "gone", httpStatus: res.status };
    }
    if (!res.ok) return { state: "unknown", reason: `http_${res.status}` };

    const text = await res.text();
    let titled = false;
    try {
      titled = Boolean((JSON.parse(text) as { jobPostingInfo?: { title?: string } })?.jobPostingInfo?.title);
    } catch {
      return { state: "unknown", reason: "bad_json" };
    }
    // A 200 with no posting in it is Workday being odd, not proof of death.
    return titled ? { state: "live", text } : { state: "unknown", reason: "no_posting_info" };
  } catch (e) {
    return { state: "unknown", reason: e instanceof Error && e.name === "AbortError" ? "timeout" : "fetch_error" };
  } finally {
    clearTimeout(to);
  }
}
