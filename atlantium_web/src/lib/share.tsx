import { toast } from "sonner";
import { Check, Link2, Share2 } from "lucide-react";

type ShareableJob = { slug: string; title: string; company: string };

/**
 * Copy text, with a fallback for browsers that refuse the async clipboard.
 *
 * navigator.clipboard.writeText only resolves inside a live user gesture and
 * on a secure origin, and some browsers deny it outright. The old
 * execCommand path has neither restriction, so it catches the cases the
 * modern API drops rather than telling someone to copy the URL by hand.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    // Keep it off-screen but still selectable — display:none is not.
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.top = "-1000px";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    el.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

function ShareToast({
  title,
  company,
  url,
  copied,
}: {
  title: string;
  company: string;
  url: string;
  copied: boolean;
}) {
  return (
    <div className="flex items-start gap-3 w-full rounded-xl border border-cyan-500/30 bg-[#070d16]/95 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          copied
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
            : "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
        }`}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-50 leading-tight">
          {copied ? "Link copied" : "Copy this link"}
        </p>
        {copied ? (
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {title} · {company}
          </p>
        ) : (
          // The copy failed, so the link itself has to be here and selectable
          // — a message about a link nobody can reach is just an apology.
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            autoFocus
            className="mt-1 w-full rounded border border-cyan-500/20 bg-black/40 px-2 py-1 text-[11px] text-cyan-200 outline-none focus:border-cyan-400/50"
          />
        )}
      </div>
      <Share2 className="mt-1 h-3.5 w-3.5 shrink-0 text-cyan-500/50" />
    </div>
  );
}

/**
 * Share a role. On touch devices this hands off to the OS share sheet — the
 * whole point is firing a job into a group chat without leaving the board.
 *
 * On pointer devices we go straight to copying, deliberately: desktop
 * browsers expose navigator.share but a failed call there consumes the
 * transient user activation, which then makes the clipboard write fail too.
 * Trying the sheet first cost us both paths.
 *
 * The URL is the public job page, never the raw apply link: the job page
 * unfurls with a card and survives the posting expiring.
 */
export async function shareJob(job: ShareableJob): Promise<void> {
  const url = `${window.location.origin}/jobs/${job.slug}`;
  const title = `${job.title} at ${job.company}`;

  const isTouch =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  if (isTouch && typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (err) {
      // Dismissing the sheet is a choice, not a failure — don't then copy
      // behind their back.
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  const copied = await copyText(url);
  toast.custom(
    () => <ShareToast title={job.title} company={job.company} url={url} copied={copied} />,
    // A link someone has to select by hand needs longer on screen than a
    // confirmation they can ignore.
    { duration: copied ? 2600 : 6000 },
  );
}
