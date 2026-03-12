import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  Search,
  Crown,
  MapPin,
  ArrowRight,
  ContactRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Member {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  location: string;
}

export function MembersPage() {
  const { user } = useAuth();
  const tier = user?._subscription?.membership_tier ?? "free";
  const hasClubAccess = user?._subscription?.has_club_access ?? false;

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const isAnnual = tier === "club_annual";
  const isClub = !isAnnual && hasClubAccess;
  const isFree = !hasClubAccess;

  // Annual members: load all on mount
  useEffect(() => {
    if (!isAnnual) return;
    setIsLoading(true);
    api.getMemberDirectory()
      .then((res) => setMembers(res.members || []))
      .catch(() => setError("Failed to load members"))
      .finally(() => setIsLoading(false));
  }, [isAnnual]);

  // Club members: search with debounce
  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) {
      setMembers([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getMemberDirectory(q);
      setMembers(res.members || []);
    } catch {
      setError("Search failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isClub) return;
    const timeout = setTimeout(() => searchMembers(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, isClub, searchMembers]);

  // Free tier: upgrade prompt
  if (isFree) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6">
          <ContactRound className="h-8 w-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Member Directory</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Upgrade to Club membership to search for members, or go Annual for full directory access.
        </p>
        <div className="flex gap-3">
          <Link to="/pricing">
            <Button className="gap-2 bg-white text-black hover:bg-gray-100 border-0">
              <Crown className="h-4 w-4" />
              View Plans
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">
            {isAnnual ? "Member Directory" : "Member Search"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAnnual
              ? `${members.length} member${members.length !== 1 ? "s" : ""}`
              : "Search by name or username (min 2 characters)"}
          </p>
        </div>
        {isAnnual && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
            <Crown className="h-3 w-3" />
            Annual
          </span>
        )}
      </div>

      {/* Search bar for club members (always shown for annual as filter) */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isAnnual ? "Filter members..." : "Search members..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8 text-sm text-red-400">{error}</div>
      )}

      {/* Empty state */}
      {!isLoading && !error && members.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          {isClub && searchQuery.length < 2
            ? "Type at least 2 characters to search"
            : "No members found"}
        </div>
      )}

      {/* Member grid */}
      {!isLoading && members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(isAnnual && searchQuery
            ? members.filter(
                (m) =>
                  m.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.username?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : members
          ).map((member) => (
            <Link
              key={member.user_id}
              to={`/u/${member.username}`}
              target="_blank"
              className="group rounded-xl border border-border/40 hover:border-primary/40 bg-card/50 hover:bg-card/80 p-4 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-muted text-xs">
                    {member.display_name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {member.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{member.username}
                  </p>
                </div>
              </div>
              {member.bio && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                  {member.bio}
                </p>
              )}
              {member.location && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{member.location}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
