import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Copy, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/** Remembered across posts so a partner doesn't re-flip the switch every time. */
const EARN_PREF_KEY = "atlantium_share_earn";

function readEarnPref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(EARN_PREF_KEY) === "1";
}

/**
 * Footer CTA under a blog post. Logged out it asks for the membership; logged
 * in it turns into share, with an opt-in switch that tags the shared link with
 * the reader's referral code so a signup from it pays them.
 */
export function PostShareCta({
  slug,
  title,
  gated,
  onJoin,
}: {
  slug: string;
  title: string;
  gated: boolean;
  onJoin: () => void;
}) {
  const { user } = useAuth();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [standingChecked, setStandingChecked] = useState(false);
  const [earn, setEarn] = useState(readEarnPref);
  const [copied, setCopied] = useState(false);

  // Only partners have a referral code; a non-partner 403/404s here, which is
  // the signal to show the creator-program invite instead of the switch.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getMyPartnerStanding()
      .then((r) => {
        if (cancelled) return;
        const partner = r.partners?.[0];
        setRefCode(
          partner?.referral?.code
            ?? partner?.referralCode
            ?? partner?.member?.referralCode
            ?? partner?.member?.referral_code
            ?? null,
        );
      })
      .catch(() => { if (!cancelled) setRefCode(null); })
      .finally(() => { if (!cancelled) setStandingChecked(true); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const canEarn = Boolean(refCode);
  // Safari/Android expose navigator.share; desktop Chrome/Firefox mostly don't.
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}/blog/${slug}`;
    return earn && refCode ? `${base}?ref=${encodeURIComponent(refCode)}` : base;
  }, [slug, earn, refCode]);

  const toggleEarn = useCallback((next: boolean) => {
    setEarn(next);
    localStorage.setItem(EARN_PREF_KEY, next ? "1" : "0");
    api.trackEvent("content_share_earn_toggled", { slug, enabled: next, has_referral: canEarn });
  }, [slug, canEarn]);

  const handleShare = useCallback(async () => {
    api.trackEvent("content_share_clicked", { slug, surface: "blog", attributed: earn && canEarn });
    if (canNativeShare) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // Cancelled or unavailable — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; the URL is on screen for manual copy.
    }
  }, [slug, title, shareUrl, earn, canEarn]);

  // A gated post already shows ContentGate's join CTA — don't stack two.
  if (!user && gated) return null;

  if (!user) {
    return (
      <div className="rounded-2xl border border-cyan-500/20 bg-card/70 backdrop-blur p-4 text-center">
        <div className="h-9 w-9 mx-auto mb-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-cyan-400" />
        </div>
        <h3 className="font-semibold mb-1">Join Atlantium — free</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Get the Weekly Job Report, the full guide library, and the community behind it.
        </p>
        <Button
          size="sm"
          className="gap-2 w-full bg-white text-black hover:bg-gray-100"
          onClick={() => {
            api.trackEvent("content_join_cta_clicked", { slug, surface: "blog" });
            onJoin();
          }}
        >
          Create free membership
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4">
      <h3 className="font-semibold leading-tight text-sm">Share this post</h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        {earn && canEarn ? "Your link is tagged — signups from it credit you." : "Send it to someone who needs it."}
      </p>
      <Button onClick={handleShare} className="gap-2 w-full mt-3">
        {copied ? <Check className="h-4 w-4" /> : canNativeShare ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Link copied" : "Share"}
      </Button>

      <div className="mt-4 pt-4 border-t border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <label htmlFor="share-earn" className="text-sm font-medium cursor-pointer">
              Earn if anyone joins the lab
            </label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {canEarn
                ? "Adds your referral code to the link."
                : standingChecked
                  ? "Requires a partner account."
                  : "Checking your partner standing…"}
            </p>
          </div>
          <Switch
            id="share-earn"
            checked={earn && canEarn}
            disabled={!canEarn}
            onCheckedChange={toggleEarn}
            // The default unchecked track is near-invisible on this dark bg —
            // give it a real fill and border so "off" still reads as a control.
            // The dark: variant is needed to beat the base component's own.
            className="mt-0.5 flex-shrink-0 data-[state=unchecked]:bg-muted dark:data-[state=unchecked]:bg-white/20 data-[state=unchecked]:border-border"
          />
        </div>

        {standingChecked && !canEarn && (
          <Link
            to="/creator-program"
            onClick={() => api.trackEvent("partner_invite_clicked", { slug, surface: "blog_share" })}
            className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Request to join the partner program
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
