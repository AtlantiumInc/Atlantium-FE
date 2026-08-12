import { useEffect } from "react";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/** Fade-out + signup CTA rendered under the truncated body of a gated document. */
export function ContentGate({ slug, type, onJoin }: { slug: string; type: string; onJoin: () => void }) {
  useEffect(() => {
    api.trackEvent("content_gate_viewed", { slug, type, surface: type === "post" ? "blog" : "docs" });
  }, [slug, type]);

  return (
    <div className="relative mt-[-120px] pt-32 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="max-w-md mx-auto text-center rounded-2xl border border-cyan-500/20 bg-card/70 backdrop-blur p-6">
        <div className="h-10 w-10 mx-auto mb-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <Lock className="h-5 w-5 text-cyan-400" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Keep reading — free</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a free Atlantium membership to read the full {type === "post" ? "post" : "guide"},
          get the Weekly Job Report, and join the community.
        </p>
        <Button
          className="w-full gap-2 bg-white text-black hover:bg-gray-100"
          onClick={() => {
            api.trackEvent("content_gate_signup_started", { slug, surface: type === "post" ? "blog" : "docs" });
            onJoin();
          }}
        >
          Join free & keep reading
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
