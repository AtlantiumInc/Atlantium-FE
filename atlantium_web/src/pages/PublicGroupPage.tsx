import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Users, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { InlineAuth } from "@/components/InlineAuth";
import { setPendingAction, setPendingRedirect } from "@/lib/pendingAction";
import type { User } from "@/lib/api";

interface PublicGroup {
  id: string;
  name: string;
  slug: string;
  type: "group" | "focus_group";
  avatar?: string;
  properties?: Record<string, unknown>;
  participant_count: number;
  created_by_profile?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  created_at?: string;
}

interface OGMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  site_name: string;
}

export function PublicGroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, login, checkAuth } = useAuth();
  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [ogData, setOgData] = useState<OGMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroup() {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getPublicGroup(slug);
        setGroup(data.group);
        setOgData(data.og);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Group not found");
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroup();
  }, [slug]);

  // Check if user is already a member
  useEffect(() => {
    async function checkMembership() {
      if (!isAuthenticated || !group) return;

      try {
        // Try to get thread details - if successful, user is a member
        await api.getThreadDetails(group.id);
        setIsMember(true);
      } catch {
        // User is not a member
        setIsMember(false);
      }
    }

    checkMembership();
  }, [isAuthenticated, group]);

  // Set document title and meta tags
  useEffect(() => {
    if (!ogData) return;

    document.title = ogData.title;

    const setMetaTag = (property: string, content: string, isName = false) => {
      const attr = isName ? "name" : "property";
      let tag = document.querySelector(`meta[${attr}="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    // Open Graph tags
    setMetaTag("og:title", ogData.title);
    setMetaTag("og:description", ogData.description);
    setMetaTag("og:image", ogData.image);
    setMetaTag("og:url", ogData.url);
    setMetaTag("og:type", ogData.type);
    setMetaTag("og:site_name", ogData.site_name);

    // Twitter Card tags
    setMetaTag("twitter:card", "summary_large_image", true);
    setMetaTag("twitter:title", ogData.title, true);
    setMetaTag("twitter:description", ogData.description, true);
    setMetaTag("twitter:image", ogData.image, true);

    // Description
    setMetaTag("description", ogData.description, true);

    return () => {
      document.title = "Atlantium";
    };
  }, [ogData]);

  const handleJoinGroup = async () => {
    if (!slug) return;

    setIsJoining(true);

    try {
      const result = await api.joinPublicGroup(slug);
      setIsMember(true);

      // Check if user needs onboarding
      const fullUser = await checkAuth();
      const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
      const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
      const isOnboardingCompleted = registrationDetails?.is_completed === true;

      if (isOnboardingCompleted) {
        navigate(`/chat/${result.thread_id}`);
      } else {
        // Store redirect for after onboarding
        setPendingRedirect(`/chat/${result.thread_id}`);
        navigate("/onboarding");
      }
    } catch {
      // If join fails (e.g., already a member), just mark as member
      setIsMember(true);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAuthSuccess = async (authUser: User, authToken: string) => {
    login(authToken, authUser);

    // Set pending action for after potential onboarding
    if (slug) {
      setPendingAction({ type: "group_join", slug });
    }

    // Fetch full user data to check onboarding status
    const fullUser = await checkAuth();
    const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
    const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
    const isOnboardingCompleted = registrationDetails?.is_completed === true;

    if (isOnboardingCompleted) {
      // Join immediately
      handleJoinGroup();
    } else {
      // Go to onboarding, join will happen after via pending action
      navigate("/onboarding");
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Group not found</h1>
        <p className="text-muted-foreground">
          This group doesn't exist or is not publicly available.
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go home
          </Button>
        </Link>
      </div>
    );
  }

  const description =
    group.properties && typeof group.properties.description === "string"
      ? group.properties.description
      : null;

  const typeLabel = group.type === "focus_group" ? "Focus Group" : "Group";
  const TypeIcon = group.type === "focus_group" ? Sparkles : Users;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left side - Group info */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Header */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Atlantium" className="h-7 w-7" />
            <span className="text-lg font-bold tracking-tight">Atlantium</span>
          </Link>
        </div>

        {/* Group info */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12 lg:pb-0">
          <div className="max-w-md">
            <div className="flex items-start gap-5">
              <Avatar className="h-20 w-20 ring-2 ring-border shrink-0">
                <AvatarImage src={group.avatar} alt={group.name} />
                <AvatarFallback>
                  <TypeIcon className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <TypeIcon className="h-3 w-3" />
                    {typeLabel}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {group.participant_count} {group.participant_count === 1 ? "member" : "members"}
                </p>
              </div>
            </div>

            {description && (
              <p className="mt-6 text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}

            {group.created_by_profile && (
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Created by</span>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={group.created_by_profile.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {group.created_by_profile.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">
                  {group.created_by_profile.display_name}
                </span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right side - Auth/Join */}
      <div className="w-full lg:w-1/2 bg-muted/30 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[400px]">
          {isAuthenticated ? (
            <div className="text-center">
              {isMember ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">You're a member</h2>
                  <p className="text-muted-foreground mb-6">
                    You're already part of this group.
                  </p>
                  <Link to="/dashboard">
                    <Button size="lg" className="w-full">
                      Go to Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">Join this group</h2>
                  <p className="text-muted-foreground mb-6">
                    Connect with {group.participant_count} {group.participant_count === 1 ? "member" : "members"} in {group.name}.
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleJoinGroup}
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Group"
                    )}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">Join {group.name}</h2>
              <p className="text-muted-foreground mb-6">
                Sign in or create an account to join this group.
              </p>
              <InlineAuth
                onSuccess={handleAuthSuccess}
                ctaText="Join Group"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
