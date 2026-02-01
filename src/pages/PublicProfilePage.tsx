import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Link as LinkIcon, Linkedin, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface PublicProfile {
  id: string;
  username: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website_url?: string;
  linkedin_url?: string;
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString?: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ogData, setOgData] = useState<OGMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!username) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getPublicProfile(username);
        setProfile(data.profile);
        setOgData(data.og);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Profile not found");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [username]);

  // Set document title and meta tags
  useEffect(() => {
    if (!ogData) return;

    // Set document title
    document.title = ogData.title;

    // Helper to set or create meta tag
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
    setMetaTag("twitter:card", "summary", true);
    setMetaTag("twitter:title", ogData.title, true);
    setMetaTag("twitter:description", ogData.description, true);
    setMetaTag("twitter:image", ogData.image, true);

    // Description
    setMetaTag("description", ogData.description, true);

    // Cleanup on unmount
    return () => {
      document.title = "Atlantium";
    };
  }, [ogData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-muted-foreground">The user @{username} doesn't exist.</p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go home
          </Button>
        </Link>
      </div>
    );
  }

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name;

  return (
    <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">Atlantium</span>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          </div>
        </header>

        {/* Profile Content */}
        <main className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
              <AvatarImage src={profile.avatar_url} alt={fullName} />
              <AvatarFallback className="text-3xl">{getInitials(fullName)}</AvatarFallback>
            </Avatar>

            {/* Name & Username */}
            <div className="mt-6">
              <h1 className="text-3xl font-bold">{fullName}</h1>
              <p className="text-lg text-muted-foreground">@{profile.username}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Details */}
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {profile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <LinkIcon className="h-4 w-4" />
                  {profile.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
              {profile.created_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profile.created_at)}
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link to="/signup">
                <Button size="lg">
                  Join Atlantium
                </Button>
              </Link>
            </div>
          </div>
        </main>
    </div>
  );
}
