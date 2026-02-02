import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Users, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

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
  const [group, setGroup] = useState<PublicGroup | null>(null);
  const [ogData, setOgData] = useState<OGMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  if (isLoading) {
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

      {/* Group Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
            <AvatarImage src={group.avatar} alt={group.name} />
            <AvatarFallback className="text-3xl">
              <TypeIcon className="h-12 w-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <div className="mt-6">
            <h1 className="text-3xl font-bold">{group.name}</h1>
          </div>

          {/* Type Badge + Member Count */}
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <TypeIcon className="h-3.5 w-3.5" />
              {typeLabel}
            </span>
            <span className="text-sm text-muted-foreground">
              {group.participant_count}{" "}
              {group.participant_count === 1 ? "member" : "members"}
            </span>
          </div>

          {/* Description */}
          {description && (
            <p className="mt-4 text-muted-foreground max-w-md leading-relaxed">
              {description}
            </p>
          )}

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/signup">
              <Button size="lg">Join Atlantium</Button>
            </Link>
            <a
              href="https://apps.apple.com/app/atlantium/id6743597791"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                Get the App
              </Button>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
