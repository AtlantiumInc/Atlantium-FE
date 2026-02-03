import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Users,
  Sparkles,
  Loader2,
  ArrowLeft,
  Calendar,
  MapPin,
  UserCircle,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { InlineAuth } from "@/components/InlineAuth";
import { setPendingAction, setPendingRedirect } from "@/lib/pendingAction";
import type { User } from "@/lib/api";

interface InviteData {
  invite: {
    id: string;
    type: "group_join" | "event_rsvp" | "user_connect" | "platform";
    token: string;
    expires_at?: string;
    created_at: string;
  };
  inviter: {
    id: string;
    display_name: string;
    avatar_url?: string;
    username: string;
  } | null;
  target: {
    id: string;
    name?: string;
    title?: string;
    display_name?: string;
    username?: string;
    avatar?: string;
    avatar_url?: string;
    participant_count?: number;
    going_count?: number;
    start_time?: string;
    end_time?: string;
    location?: string;
    featured_image?: string;
    description?: string;
    bio?: string;
    properties?: Record<string, unknown>;
    type?: string;
  } | null;
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, login, checkAuth } = useAuth();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<"not_found" | "expired" | "already_claimed" | "generic" | null>(null);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;

      setIsLoading(true);
      setError(null);
      setErrorType(null);

      try {
        const data = await api.getInvite(token);
        setInviteData(data);
      } catch (err) {
        const status = (err as Error & { status?: number }).status;
        const message = err instanceof Error ? err.message : "Failed to load invite";

        if (status === 404) {
          setError("This invite link is invalid or has been revoked.");
          setErrorType("not_found");
        } else if (status === 410) {
          setError("This invite has expired or has already been used.");
          setErrorType("expired");
        } else {
          setError(message);
          setErrorType("generic");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  const handleClaim = async () => {
    if (!token) return;

    setIsClaiming(true);
    setError(null);

    try {
      await api.claimInvite(token);

      // Check if user needs onboarding
      const fullUser = await checkAuth();
      const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
      const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
      const isOnboardingCompleted = registrationDetails?.is_completed === true;

      if (isOnboardingCompleted) {
        navigate("/dashboard");
      } else {
        // Store redirect for after onboarding
        setPendingRedirect("/dashboard");
        navigate("/onboarding");
      }
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const message = err instanceof Error ? err.message : "Failed to claim invite";

      if (message.toLowerCase().includes("already")) {
        setError("You are already a member.");
        setErrorType("already_claimed");
      } else if (status === 410) {
        setError("This invite has expired or has already been used.");
        setErrorType("expired");
      } else {
        setError(message);
        setErrorType("generic");
      }
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAuthSuccess = async (authUser: User, authToken: string) => {
    login(authToken, authUser);

    // Set pending action for after potential onboarding
    if (token) {
      setPendingAction({ type: "invite_claim", token });
    }

    // Fetch full user data to check onboarding status
    const fullUser = await checkAuth();
    const profile = (fullUser as unknown as Record<string, unknown>)?._profile as Record<string, unknown> | undefined;
    const registrationDetails = profile?.registration_details as Record<string, unknown> | undefined;
    const isOnboardingCompleted = registrationDetails?.is_completed === true;

    if (isOnboardingCompleted) {
      // Claim immediately
      handleClaim();
    } else {
      // Go to onboarding, claim will happen after via pending action
      navigate("/onboarding");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">Atlantium</span>
            </Link>
            {!isAuthenticated && (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {errorType === "not_found" && "Invite Not Found"}
              {errorType === "expired" && "Invite Expired"}
              {errorType === "already_claimed" && "Already Joined"}
              {errorType === "generic" && "Something Went Wrong"}
            </h1>
            <p className="text-muted-foreground mb-8">{error}</p>
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go home
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!inviteData) {
    return null;
  }

  const { invite, inviter, target } = inviteData;

  const renderGroupCard = () => {
    if (!target) return null;
    const typeLabel = target.type === "focus_group" ? "Focus Group" : "Group";
    const TypeIcon = target.type === "focus_group" ? Sparkles : Users;
    const description = target.properties?.description as string | undefined;

    return (
      <>
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
          <AvatarImage src={target.avatar} alt={target.name} />
          <AvatarFallback className="text-2xl">
            <TypeIcon className="h-10 w-10 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="mt-6">
          <h1 className="text-2xl font-bold">{target.name}</h1>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <TypeIcon className="h-3.5 w-3.5" />
            {typeLabel}
          </span>
          <span className="text-sm text-muted-foreground">
            {target.participant_count} {target.participant_count === 1 ? "member" : "members"}
          </span>
        </div>

        {description && (
          <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
            {description}
          </p>
        )}
      </>
    );
  };

  const renderEventCard = () => {
    if (!target) return null;

    return (
      <>
        {target.featured_image && (
          <div className="w-full h-48 rounded-xl overflow-hidden mb-6">
            <img
              src={target.featured_image}
              alt={target.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="text-center">
          <h1 className="text-2xl font-bold">{target.title}</h1>

          <div className="mt-4 space-y-2">
            {target.start_time && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(target.start_time)}</span>
              </div>
            )}
            {target.location && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{target.location}</span>
              </div>
            )}
          </div>

          {target.going_count !== undefined && (
            <p className="mt-3 text-sm text-muted-foreground">
              {target.going_count} {target.going_count === 1 ? "person" : "people"} going
            </p>
          )}

          {target.description && (
            <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
              {target.description}
            </p>
          )}
        </div>
      </>
    );
  };

  const renderUserCard = () => {
    if (!target) return null;

    return (
      <>
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
          <AvatarImage src={target.avatar_url} alt={target.display_name} />
          <AvatarFallback className="text-2xl">
            <UserCircle className="h-10 w-10 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="mt-6">
          <h1 className="text-2xl font-bold">{target.display_name}</h1>
          {target.username && (
            <p className="text-muted-foreground">@{target.username}</p>
          )}
        </div>

        {target.bio && (
          <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
            {target.bio}
          </p>
        )}
      </>
    );
  };

  const renderPlatformCard = () => {
    return (
      <>
        <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
          <img src="/logo.png" alt="Atlantium" className="h-12 w-12" />
        </div>

        <div className="mt-6">
          <h1 className="text-2xl font-bold">Join Atlantium</h1>
        </div>

        <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
          The community for AI founders, engineers, and researchers building the future.
        </p>
      </>
    );
  };

  const getCtaText = () => {
    switch (invite.type) {
      case "group_join":
        return "Join Group";
      case "event_rsvp":
        return "RSVP";
      case "user_connect":
        return "Connect";
      case "platform":
        return "Join Atlantium";
      default:
        return "Join";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">Atlantium</span>
          </Link>
          {!isAuthenticated && (
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="flex flex-col items-center text-center">
          {/* Render card based on type */}
          {invite.type === "group_join" && renderGroupCard()}
          {invite.type === "event_rsvp" && renderEventCard()}
          {invite.type === "user_connect" && renderUserCard()}
          {invite.type === "platform" && renderPlatformCard()}

          {/* Inviter info */}
          {inviter && (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Invited by</span>
              <Avatar className="h-5 w-5">
                <AvatarImage src={inviter.avatar_url} />
                <AvatarFallback className="text-xs">
                  {inviter.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">@{inviter.username}</span>
            </div>
          )}

          {/* CTA Section */}
          <div className="mt-10 w-full max-w-sm">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="w-full"
                onClick={handleClaim}
                disabled={isClaiming}
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  getCtaText()
                )}
              </Button>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account to {getCtaText().toLowerCase()}
                </p>
                <InlineAuth
                  onSuccess={handleAuthSuccess}
                  ctaText={getCtaText()}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
