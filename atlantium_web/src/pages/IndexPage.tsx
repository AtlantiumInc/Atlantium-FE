import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { PublicNavbar } from "@/components/PublicNavbar";
import {
  Loader2,
  ArrowRight,
  User,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import SpotlightCard from "@/components/ui/SpotlightCard";
import ShinyText from "@/components/ui/ShinyText";
import Aurora from "@/components/Aurora";
import { api, type FrontierArticle } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
}

interface ArticleWithSlug extends FrontierArticle {
  slug: string;
}

function FeaturedArticleCard({ article }: { article: ArticleWithSlug }) {
  const { content } = article;

  return (
    <Link to={`/index/${article.slug}`}>
      <SpotlightCard
        className="h-full overflow-hidden group cursor-pointer"
        spotlightColor="rgba(14, 165, 233, 0.15)"
      >
        <div className="flex flex-col lg:flex-row h-full">
          {/* Image Section */}
          {content.featured_image?.url && (
            <div className="relative lg:w-1/2 h-48 lg:h-auto overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/80 z-10 pointer-events-none hidden lg:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none lg:hidden" />
              <img
                src={content.featured_image.url}
                alt={content.featured_image.alt || content.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Featured Badge */}
              <div className="absolute top-4 left-4 z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Featured
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Content Section */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center">
            {/* Publisher */}
            {content.publisher?.name && (
              <div className="flex items-center gap-2 mb-3">
                {content.publisher.logo_url && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={content.publisher.logo_url} alt={content.publisher.name} />
                    <AvatarFallback className="text-[8px]">
                      {content.publisher.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm text-muted-foreground">{content.publisher.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">{formatRelativeTime(article.created_at)}</span>
              </div>
            )}

            {/* Title */}
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-cyan-500 transition-all">
              {content.title}
            </h2>

            {/* TL;DR */}
            {content.tldr && content.tldr.length > 0 && (
              <p className="text-muted-foreground mb-4 line-clamp-2">
                {content.tldr[0]}
              </p>
            )}

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {content.tags.slice(0, 4).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-cyan-500/10 border-cyan-500/30 text-cyan-300 text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Author */}
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
                <span className="text-sm text-muted-foreground">By {content.author.name}</span>
              </div>
            )}
          </div>
        </div>
      </SpotlightCard>
    </Link>
  );
}

function ArticleCard({ article, index }: { article: ArticleWithSlug; index: number }) {
  const { content } = article;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
    >
      <Link to={`/index/${article.slug}`}>
        <SpotlightCard
          className="h-full overflow-hidden group cursor-pointer"
          spotlightColor="rgba(14, 165, 233, 0.1)"
        >
          {/* Image */}
          {content.featured_image?.url && (
            <div className="relative h-40 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none" />
              <img
                src={content.featured_image.url}
                alt={content.featured_image.alt || content.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}

          <div className="p-5">
            {/* Publisher & Time */}
            <div className="flex items-center gap-2 mb-2">
              {content.publisher?.logo_url && (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={content.publisher.logo_url} alt={content.publisher?.name} />
                  <AvatarFallback className="text-[6px]">
                    {content.publisher?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="text-xs text-muted-foreground">{content.publisher?.name}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-xs text-muted-foreground">{formatRelativeTime(article.created_at)}</span>
            </div>

            {/* Title */}
            <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
              {content.title}
            </h3>

            {/* TL;DR preview */}
            {content.tldr && content.tldr.length > 0 && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {content.tldr[0]}
              </p>
            )}

            {/* Tags */}
            {content.tags && content.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {content.tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="bg-muted/50 border-border/50 text-muted-foreground text-[10px]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </SpotlightCard>
      </Link>
    </motion.div>
  );
}

export function IndexPage() {
  const { isAuthenticated } = useAuth();
  const [articles, setArticles] = useState<ArticleWithSlug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await api.getFrontierArticles();
        // Cast to ArticleWithSlug - the API should return slug
        setArticles(data as ArticleWithSlug[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load articles");
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, []);

  // Set document title
  useEffect(() => {
    document.title = "Index | Atlantium";
    return () => {
      document.title = "Atlantium";
    };
  }, []);

  const featuredArticle = articles[0];
  const otherArticles = articles.slice(1);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 z-0 opacity-30 dark:opacity-40">
        <Aurora
          colorStops={["#0ea5e9", "#06b6d4", "#334155"]}
          amplitude={0.8}
          blend={0.6}
          speed={0.4}
        />
      </div>

      {/* Noise texture */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <PublicNavbar />

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Newspaper className="h-6 w-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <ShinyText
                  text="The Index"
                  className="text-3xl font-bold"
                  color="#22d3ee"
                  shineColor="#ffffff"
                  speed={3}
                />
              </h1>
              <p className="text-muted-foreground">Curated AI & tech news from the frontier</p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
              <p className="text-sm text-muted-foreground font-mono">LOADING INDEX...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Newspaper className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Failed to load articles</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Newspaper className="h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No articles yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {/* Featured Article */}
            {featuredArticle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="col-span-12"
              >
                <FeaturedArticleCard article={featuredArticle} />
              </motion.div>
            )}

            {/* Section Header */}
            {otherArticles.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="col-span-12 flex items-center gap-3 mt-4"
              >
                <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent" />
                <span className="text-xs font-bold text-cyan-400 tracking-wider uppercase">
                  Latest Reports
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-cyan-500/30 to-transparent" />
              </motion.div>
            )}

            {/* Other Articles Grid */}
            {otherArticles.map((article, index) => (
              <div
                key={article.id}
                className="col-span-12 sm:col-span-6 lg:col-span-4"
              >
                <ArticleCard article={article} index={index} />
              </div>
            ))}

            {/* CTA Card for non-authenticated users */}
            {!isAuthenticated && articles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="col-span-12 mt-8"
              >
                <SpotlightCard
                  className="p-8"
                  spotlightColor="rgba(14, 165, 233, 0.1)"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-400">Join the frontier</span>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        Get early access to exclusive content
                      </h3>
                      <p className="text-muted-foreground">
                        Join Atlantium to connect with builders and stay ahead of the curve.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Link to="/signup">
                        <Button className="gap-2">
                          Sign up free
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/30 mt-16">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">Atlantium</span>
            <span className="text-muted-foreground text-sm">Index</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
      </footer>
    </div>
  );
}
