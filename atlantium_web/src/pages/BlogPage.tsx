import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Loader2, PenLine, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type ContentDocumentSummary } from "@/lib/api";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PostCard({ post, featured }: { post: ContentDocumentSummary; featured?: boolean }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group block rounded-2xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all overflow-hidden ${featured ? "md:col-span-2" : ""}`}
    >
      {post.cover_image_url && (
        <div className={`overflow-hidden ${featured ? "h-56" : "h-40"}`}>
          <img
            src={post.cover_image_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <span>{formatDate(post.published_at)}</span>
          {post.meta?.read_time ? (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.meta.read_time} min</span>
          ) : null}
          {post.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0 border-border/40 text-muted-foreground">{t}</Badge>
          ))}
        </div>
        <h2 className={`font-semibold leading-snug group-hover:text-cyan-300 transition-colors ${featured ? "text-lg" : "text-[0.95rem]"}`}>
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{post.excerpt}</p>
        )}
        {post.author && (
          <p className="text-xs text-muted-foreground mt-3">{post.author.display_name}</p>
        )}
      </div>
    </Link>
  );
}

export function BlogPage() {
  const [posts, setPosts] = useState<ContentDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getContentDocuments({ type: "post", limit: 50 })
      .then((r) => setPosts(r.documents))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
            <PenLine className="h-3.5 w-3.5" /> The Atlantium Blog
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Atlanta tech, covered.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            The people, companies, and money moving Atlanta's technology scene — written from inside it.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <PenLine className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>First posts are on the way.</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-4 md:grid-cols-2"
          >
            {posts.map((p, i) => (
              <PostCard key={p.id} post={p} featured={i === 0} />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
