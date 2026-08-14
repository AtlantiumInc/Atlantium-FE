import { Link } from "react-router-dom";
import { FlaskConical, Radio, Sparkles, Users } from "lucide-react";
import { MemberShell, SIDEBAR_ROUTES } from "@/components/MemberShell";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Member HQ.
 *
 * This page used to BE the app: it owned the chrome and switched between panes
 * with local state, so Lobby, Partners and Playground had no URLs of their own —
 * unlinkable, lost on refresh, invisible to the back button. Each is a real
 * route now, and the chrome lives in MemberShell.
 */
const QUICK_STATS = [
  { label: "Profile", value: "Active" },
  { label: "Membership", value: "Free" },
  { label: "Auth", value: "Neon" },
];

const DESTINATIONS = [
  { to: SIDEBAR_ROUTES.lobby, label: "Lobby", icon: Radio },
  { to: SIDEBAR_ROUTES.discover, label: "Find people", icon: Users },
  { to: SIDEBAR_ROUTES.partners, label: "Partners", icon: Users },
  { to: SIDEBAR_ROUTES.playground, label: "Playground", icon: FlaskConical },
];

export function MemberDashboardPage() {
  const { user } = useAuth();

  return (
    <MemberShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome{user?.display_name ? `, ${user.display_name}` : ""}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your Atlantium profile is active.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_STATS.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border/60 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-lg font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border/60 bg-background/60 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {DESTINATIONS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </MemberShell>
  );
}

export default MemberDashboardPage;
