import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Share2,
  Bookmark,
  Tag,
  FileText,
  Beaker,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import { api, type FrontierArticle } from "@/lib/api";
import { ArticleTLDR } from "@/components/ArticleTLDR";
import { toast } from "sonner";

interface ArticleWithSlug extends FrontierArticle {
  slug: string;
}

interface OGMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
  site_name: string;
  author: string;
  published_time: number;
  tags: string[];
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatUTCTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleWithSlug | null>(null);
  const [ogData, setOgData] = useState<OGMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    async function fetchArticle() {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getPublicArticle(slug);
        setArticle(data.article);
        setOgData(data.og);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Article not found");
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticle();
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

    // Article-specific OG tags
    setMetaTag("article:author", ogData.author);
    setMetaTag("article:published_time", new Date(ogData.published_time).toISOString());
    ogData.tags.forEach((tag, index) => {
      setMetaTag(`article:tag:${index}`, tag);
    });

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article?.content.title,
        text: article?.content.tldr?.[0] || article?.content.body.slice(0, 150),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Bookmark removed" : "Article bookmarked");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-mono">LOADING RESEARCH DOCUMENT...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-full bg-destructive/10">
          <FileText className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Document Not Found</h1>
        <p className="text-muted-foreground font-mono text-sm">
          DOCUMENT ID: {slug} - STATUS: NOT_FOUND
        </p>
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Index
          </Button>
        </Link>
      </div>
    );
  }

  const { content } = article;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <Aurora
          colorStops={["#0ea5e9", "#06b6d4", "#334155"]}
          amplitude={0.8}
          blend={0.6}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-xl font-bold">Atlantium</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground font-mono">INDEX</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBookmark}>
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid grid-cols-12 gap-6 max-w-6xl mx-auto">
          {/* Header Card - Full Width */}
          <motion.div
            className="col-span-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SpotlightCard
              className="p-6 md:p-8"
              spotlightColor="rgba(14, 165, 233, 0.15)"
            >
              {/* Classification Badge */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                  <Beaker className="h-3 w-3 text-cyan-400" />
                  <ShinyText
                    text="RESEARCH DOCUMENT"
                    className="text-xs font-bold tracking-wider"
                    color="#22d3ee"
                    shineColor="#ffffff"
                    speed={3}
                  />
                </div>
                <span className="text-xs text-muted-foreground font-mono uppercase">
                  INDEX REPORT
                </span>
              </div>

              {/* Document ID */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-muted-foreground">DOC_ID:</span>
                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  {article.slug}
                </code>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                {content.title}
              </h1>

              {/* Author/Publisher Metadata */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
                {content.author?.name && (
                  <div className="flex items-center gap-2">
                    {content.author.avatar_url ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={content.author.avatar_url} alt={content.author.name} />
                        <AvatarFallback className="text-xs">
                          {content.author.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {content.author.name}
                    </span>
                  </div>
                )}
                {content.publisher?.name && (
                  <div className="flex items-center gap-2">
                    {content.publisher.logo_url ? (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={content.publisher.logo_url} alt={content.publisher.name} />
                        <AvatarFallback className="text-[10px]">
                          {content.publisher.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <span className="text-sm text-muted-foreground">
                      via {content.publisher.name}
                    </span>
                  </div>
                )}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* TL;DR Section */}
          {content.tldr && content.tldr.length > 0 && (
            <ArticleTLDR
              points={content.tldr}
              className="col-span-12 lg:col-span-8"
            />
          )}

          {/* Featured Image - 8 columns */}
          {content.featured_image?.url && (
            <motion.div
              className="col-span-12 lg:col-span-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <SpotlightCard
                className="overflow-hidden"
                spotlightColor="rgba(14, 165, 233, 0.1)"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none" />
                  <img
                    src={content.featured_image.url}
                    alt={content.featured_image.alt || content.title}
                    className="w-full h-auto max-h-[500px] object-cover"
                  />
                  {content.featured_image.caption && (
                    <p className="absolute bottom-0 left-0 right-0 p-4 text-sm text-muted-foreground z-20 font-mono">
                      {content.featured_image.caption}
                    </p>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          )}

          {/* Metadata Sidebar - 4 columns */}
          <motion.div
            className={`col-span-12 ${content.featured_image?.url ? "lg:col-span-4" : "lg:col-span-4 lg:col-start-9"}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SpotlightCard
              className="p-6 h-full"
              spotlightColor="rgba(14, 165, 233, 0.1)"
            >
              {/* Analysis Parameters Header */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold tracking-wider text-cyan-400">
                  ANALYSIS PARAMETERS
                </h3>
              </div>

              {/* Tags as Classification Badges */}
              {content.tags && content.tags.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">CLASSIFICATION</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {content.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">PUBLISHED</span>
                  </div>
                  <p className="text-sm font-mono">
                    {formatTimestamp(article.created_at)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {formatUTCTimestamp(article.created_at)}
                  </p>
                </div>

                {article.updated_at !== article.created_at && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">LAST UPDATED</span>
                    </div>
                    <p className="text-sm font-mono">
                      {formatTimestamp(article.updated_at)}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 pt-6 border-t border-border/50 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleBookmark}
                >
                  <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? "fill-current" : ""}`} />
                  {isBookmarked ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Article Body - Full or 8 columns */}
          <motion.div
            className="col-span-12 lg:col-span-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <SpotlightCard
              className="p-6 md:p-8"
              spotlightColor="rgba(14, 165, 233, 0.08)"
            >
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-bold tracking-wider text-cyan-400">
                  DOCUMENT CONTENT
                </h2>
              </div>
              <article className="prose prose-invert prose-cyan max-w-none">
                <div
                  className="text-foreground leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: content.body }}
                />
              </article>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Back to Index Link */}
        <motion.div
          className="max-w-6xl mx-auto mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Atlantium
            </Button>
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background/80 backdrop-blur-xl mt-16 relative z-10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Atlantium</span>
              <span className="text-muted-foreground text-sm">Index</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/policies" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link to="/signup" className="hover:text-foreground transition-colors">
                Join
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
