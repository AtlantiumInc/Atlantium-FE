import { toast } from "sonner";

/**
 * Share a role. On phones this hands off to the OS share sheet — the whole
 * point is that someone can fire a job into a group chat without leaving the
 * board. Everywhere else it copies the link, because a desktop "share" that
 * opens nothing reads as broken.
 *
 * The URL is the public job page, never the raw apply link: the job page
 * unfurls with a card, survives the posting expiring, and keeps the referral
 * on our property.
 */
export async function shareJob(job: { slug: string; title: string; company: string }): Promise<void> {
  const url = `${window.location.origin}/jobs/${job.slug}`;
  const title = `${job.title} at ${job.company}`;

  // navigator.share exists but throws outside a secure context or without a
  // user gesture; treat any failure as "fall back to copying" rather than
  // surfacing a browser error to someone who just wanted a link.
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (err) {
      // An explicit dismissal is not a failure — don't then copy behind their back.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: title });
  } catch {
    toast.error("Couldn't copy the link", { description: url });
  }
}
