import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Loader2, PenLine, Clock, ArrowRight, Search, Newspaper } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type ContentDocumentSummary } from "@/lib/api";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Editorial categories. Author tags map onto a small curated set so the rail
 *  stays legible no matter what gets typed; anything unmapped is a Dispatch. */
const CATEGORIES: Array<{ key: string; label: string; blurb: string; tags: string[]; accent: string }> = [
  {
    key: "hiring",
    label: "Hiring & Jobs",
    blurb: "Who's hiring, what they pay, and how to get in.",
    tags: ["jobs", "hiring", "career", "data"],
    accent: "text-cyan-400",
  },
  {
    key: "money",
    label: "Money & Funding",
    blurb: "Grants, rounds, and capital moving through Atlanta.",
    tags: ["funding", "grants", "investors", "money"],
    accent: "text-emerald-400",
  },
  {
    key: "building",
    label: "Building with AI",
    blurb: "Engineering notes from shipping real AI features.",
    tags: ["ai", "llm", "engineering", "infra", "comparison"],
    accent: "text-violet-400",
  },
  {
    key: "scene",
    label: "The Scene",
    blurb: "People, companies, and community around Atlanta tech.",
    tags: ["atlanta", "community", "atlantium", "announcements"],
    accent: "text-amber-400",
  },
];

function categoryOf(post: ContentDocumentSummary): string {
  for (const c of CATEGORIES) {
    if (post.tags.some((t) => c.tags.includes(t.toLowerCase()))) return c.key;
  }
  return "dispatch";
}

function categoryLabel(key: string) {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "Dispatch";
}

function HeadlinePost({ post }: { post: ContentDocumentSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group grid md:grid-cols-2 rounded-2xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all overflow-hidden mb-10"
    >
      <div className="relative h-52 md:h-full md:min-h-[240px] overflow-hidden">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full bg-card/60 flex items-center justify-center">
            <Newspaper className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-card/80 via-transparent to-transparent" />
        <Badge
          variant="outline"
          className="absolute top-4 left-4 text-[10px] font-semibold bg-background/80 backdrop-blur border-cyan-500/40 text-cyan-300"
        >
          Latest
        </Badge>
      </div>

      <div className="p-6 sm:p-8 flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
          <span className="text-cyan-400 font-semibold">{categoryLabel(categoryOf(post))}</span>
          <span>·</span>
          <span>{formatDate(post.published_at)}</span>
          {post.meta?.read_time ? (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <Clock className="h-3 w-3" />{post.meta.read_time} min
              </span>
            </>
          ) : null}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight group-hover:text-cyan-300 transition-colors">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-3">{post.excerpt}</p>
        )}
        <div className="flex items-center gap-2 mt-5 text-sm text-cyan-400 font-medium">
          Read the story <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post }: { post: ContentDocumentSummary }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all overflow-hidden"
    >
      <div className="relative h-36 overflow-hidden bg-card/60 flex-shrink-0">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent" />
        <Badge
          variant="outline"
          className="absolute top-2.5 left-2.5 text-[10px] bg-background/70 backdrop-blur border-border/50 text-muted-foreground"
        >
          {categoryLabel(categoryOf(post))}
        </Badge>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
          <span>{formatDate(post.published_at)}</span>
          {post.meta?.read_time ? (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.meta.read_time} min</span>
          ) : null}
        </div>
        <h3 className="text-sm font-semibold leading-snug group-hover:text-cyan-300 transition-colors">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{post.excerpt}</p>
        )}
        {post.author && (
          <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border/30">
            {post.author.display_name}
          </p>
        )}
      </div>
    </Link>
  );
}

export function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") ?? "all";
  const [posts, setPosts] = useState<ContentDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getContentDocuments({ type: "post", limit: 100 })
      .then((r) => setPosts(r.documents))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) {
      const key = categoryOf(p);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [posts]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts.filter((p) =>
      (activeCategory === "all" || categoryOf(p) === activeCategory) &&
      (!needle || p.title.toLowerCase().includes(needle) || (p.excerpt ?? "").toLowerCase().includes(needle)),
    );
  }, [posts, activeCategory, search]);

  // The headline slot only belongs on the unfiltered, unsearched front page.
  const isFrontPage = activeCategory === "all" && !search.trim();
  const headline = isFrontPage ? filtered[0] : undefined;
  const rest = headline ? filtered.slice(1) : filtered;

  const setCategory = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === "all") next.delete("category");
    else next.set("category", key);
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-clip">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        {/* Masthead */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-400 mb-2">
            <PenLine className="h-3.5 w-3.5" /> The Atlantium Blog
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Atlanta tech, covered.</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            The people, companies, and money moving Atlanta's technology scene — written from inside it,
            and backed by our own verified hiring data.
          </p>
        </div>

        {/* Featured story — above the category rail */}
        {!isLoading && headline && <HeadlinePost post={headline} />}

        {/* Category rail */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {CATEGORIES.map((c) => {
            const count = counts.get(c.key) ?? 0;
            const isActive = activeCategory === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setCategory(isActive ? "all" : c.key)}
                disabled={count === 0}
                className={`text-left rounded-xl border p-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                    : "border-border/40 bg-card/30 hover:border-border hover:bg-card/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`text-sm font-semibold ${isActive ? "text-cyan-300" : c.accent}`}>{c.label}</p>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{count}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{c.blurb}</p>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {activeCategory !== "all" && (
            <button
              onClick={() => setCategory("all")}
              className="text-xs text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
            >
              ← All stories
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "story" : "stories"}
            {activeCategory !== "all" ? ` in ${categoryLabel(activeCategory)}` : ""}
          </span>
          <div className="relative ml-auto w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stories..."
              className="pl-8 h-9 text-xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <PenLine className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {search ? `Nothing matches "${search}".` : "No stories in this category yet."}
            </p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {rest.length > 0 ? (
              <>
                {headline && (
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    More stories
                  </h2>
                )}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* Funnel */}
        <div className="mt-12 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Get the stories in your inbox</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Free members get the Weekly Job Report — new roles, new grants, and the week's coverage.
            </p>
          </div>
          <Link to="/signup">
            <Button size="sm" className="gap-1.5 bg-white text-black hover:bg-gray-100">
              Join free <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
