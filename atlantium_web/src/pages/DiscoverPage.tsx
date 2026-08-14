import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Compass, Loader2, Rocket, Search, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, type MemberSearchResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Find people in the lab.
 *
 * Shows exactly what a profile shows — personas, affiliations, a line of bio —
 * and never anything about whether someone is looking for work. That lives
 * behind visibleSeekers() and is not a search surface.
 */
const ROLES = [
  { value: "", label: "Everyone", icon: Users },
  { value: "professional", label: "Professionals", icon: Briefcase },
  { value: "founder", label: "Founders", icon: Rocket },
  { value: "investor", label: "Investors", icon: TrendingUp },
  { value: "advisor", label: "Advisors", icon: Compass },
];

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [members, setMembers] = useState<MemberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (q: string, r: string) => {
    setIsLoading(true);
    try {
      const { members } = await api.searchMembers({ q: q || undefined, role: r || undefined, limit: 40 });
      setMembers(members);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't search members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced: searching on every keystroke hammers the API for nothing.
  useEffect(() => {
    const t = setTimeout(() => void load(query, role), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, role, load]);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Find people</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Everyone who's completed their lab profile.
      </p>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, or title…"
          className="pl-9 h-11"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {ROLES.map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                role === r.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {r.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/50 py-16 text-center">
          <p className="text-sm font-medium">Nobody matches that</p>
          <p className="mt-1 text-xs text-muted-foreground">Try a different name, company, or role.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <Link
              key={m.profile_id}
              to={`/members/${m.profile_id}`}
              className="group rounded-xl border border-border/40 bg-card/40 p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-card ring-1 ring-border/60 flex items-center justify-center">
                  {m.avatar_url
                    ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    : <span className="text-xs font-semibold text-muted-foreground">
                        {m.display_name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                      </span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
                    {m.display_name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.roles.map((r) => [r.title, r.org].filter(Boolean).join(" · ") || r.role).join(" • ")}
                  </p>
                  {m.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.bio}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
