import { BadgeCheck, Briefcase, Compass, Rocket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MemberCard } from "@/lib/api";

const ROLE_META = {
  professional: { icon: Briefcase, label: "Professional", tone: "text-sky-300 border-sky-500/40 bg-sky-500/10" },
  founder: { icon: Rocket, label: "Founder", tone: "text-violet-300 border-violet-500/40 bg-violet-500/10" },
  investor: { icon: TrendingUp, label: "Investor", tone: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" },
  advisor: { icon: Compass, label: "Advisor", tone: "text-amber-300 border-amber-500/40 bg-amber-500/10" },
} as const;

/**
 * Personas and verification, and nothing else. Notably absent: any hint of
 * whether this member is looking for work — that lives behind visibleSeekers()
 * and must never leak onto a profile.
 */
export function MemberBadges({ member, size = "default" }: { member: MemberCard; size?: "sm" | "default" }) {
  const verified = new Set(member.verifications);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {member.roles.map((r) => {
        const meta = ROLE_META[r.role];
        const Icon = meta.icon;
        // A verified persona says the lab checked it — not merely that they typed it.
        const isVerified = verified.has(r.role) || (r.role === "professional" && verified.has("employment"));
        return (
          <span
            key={r.id}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 ${
              size === "sm" ? "py-0.5 text-[11px]" : "py-1 text-xs"
            } ${meta.tone}`}
          >
            <Icon className="h-3 w-3" />
            {meta.label}
            {r.org && <span className="opacity-70">· {r.org.name}</span>}
            {isVerified && <BadgeCheck className="h-3 w-3" />}
          </span>
        );
      })}
      {member.employers.map((e) => (
        <Badge key={e.id} variant="outline" className="gap-1 border-border/60 text-muted-foreground">
          {e.name}
          {verified.has("employment") && <BadgeCheck className="h-3 w-3 text-emerald-400" />}
        </Badge>
      ))}
    </div>
  );
}
