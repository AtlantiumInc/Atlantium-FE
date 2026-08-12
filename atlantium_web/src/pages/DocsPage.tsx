import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpen, GraduationCap, FileText, Loader2, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type ContentCollection, type ContentDocumentSummary } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCollection = searchParams.get("collection") ?? "all";
  const { user } = useAuth();

  const [collections, setCollections] = useState<ContentCollection[]>([]);
  const [docs, setDocs] = useState<ContentDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getContentCollections().then((r) => setCollections(r.collections)).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);
    api.getContentDocuments({
      type: "doc",
      collection: activeCollection !== "all" ? activeCollection : undefined,
      limit: 100,
    })
      .then((r) => setDocs(r.documents))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [activeCollection]);

  const grouped = useMemo(() => {
    const byCollection = new Map<string, ContentDocumentSummary[]>();
    for (const d of docs) {
      const key = d.collection_slug ?? "more";
      byCollection.set(key, [...(byCollection.get(key) ?? []), d]);
    }
    return byCollection;
  }, [docs]);

  const collectionTitle = (slug: string) =>
    collections.find((c) => c.slug === slug)?.title ?? (slug === "more" ? "More" : slug.replace(/-/g, " "));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
            <BookOpen className="h-3.5 w-3.5" /> Docs & Guides
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Learn to build with AI.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            How-tos and walkthroughs from the team that teaches Atlanta's AI engineers.
            The first section of every guide is free — membership unlocks the rest.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Collection sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setSearchParams({})}
                className={`text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeCollection === "all" ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                }`}
              >
                All guides
              </button>
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSearchParams({ collection: c.slug })}
                  className={`text-left px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    activeCollection === c.slug ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                  }`}
                >
                  {c.title}
                  <span className="ml-2 text-[10px] text-muted-foreground">{c.published_count}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Doc list */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Guides are being written — check back soon.</p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {[...grouped.entries()].map(([slug, list]) => (
                  <section key={slug}>
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      {collectionTitle(slug)}
                    </h2>
                    <div className="space-y-2">
                      {list.map((d) => (
                        <Link
                          key={d.id}
                          to={`/docs/${d.slug}`}
                          className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all px-4 py-3"
                        >
                          <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                            {d.format === "guide"
                              ? <GraduationCap className="h-4 w-4 text-violet-400" />
                              : <FileText className="h-4 w-4 text-violet-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium group-hover:text-cyan-300 transition-colors truncate">{d.title}</p>
                            {d.excerpt && <p className="text-xs text-muted-foreground truncate">{d.excerpt}</p>}
                          </div>
                          {d.format === "guide" && (
                            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-400">Guide</Badge>
                          )}
                          {!user && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                          )}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
