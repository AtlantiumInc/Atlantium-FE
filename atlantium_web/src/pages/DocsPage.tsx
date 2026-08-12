import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  BookOpen, GraduationCap, FileText, Scale, Loader2, Lock, Clock, Gauge, Search, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { api, type ContentCollection, type ContentDocumentSummary } from "@/lib/api";
import {
  resolvePresentation, PRESENTATION_LABELS, type GuidePresentation,
} from "@/components/content/GuideReader";
import { useAuth } from "@/contexts/AuthContext";

/** Type-first information architecture: readers pick a *kind* of reading first,
 *  collection second. Order here is the display order of the page sections. */
const TYPE_ORDER: GuidePresentation[] = ["howto", "document", "ebook", "comparison"];

const TYPE_META: Record<GuidePresentation, {
  icon: typeof GraduationCap;
  blurb: string;
  accent: string;
  chip: string;
}> = {
  howto: {
    icon: GraduationCap,
    blurb: "Step-by-step walkthroughs you follow at the keyboard.",
    accent: "text-violet-400",
    chip: "bg-violet-500/10 border-violet-500/30 text-violet-300",
  },
  document: {
    icon: FileText,
    blurb: "Research and reports from our own verified data.",
    accent: "text-cyan-400",
    chip: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  },
  ebook: {
    icon: BookOpen,
    blurb: "Long-form reads, written to finish in one sitting.",
    accent: "text-amber-400",
    chip: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  },
  comparison: {
    icon: Scale,
    blurb: "Tool and platform comparisons from teams running them.",
    accent: "text-emerald-400",
    chip: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  },
};

function DocCard({ doc, isMember }: { doc: ContentDocumentSummary; isMember: boolean }) {
  const presentation = resolvePresentation(doc);
  const meta = presentation ? TYPE_META[presentation] : null;
  const Icon = meta?.icon ?? FileText;
  const guide = doc.meta?.guide;

  return (
    <Link
      to={`/docs/${doc.slug}`}
      className="group flex flex-col rounded-xl border border-border/40 bg-card/40 hover:border-cyan-500/30 hover:bg-card/60 transition-all overflow-hidden"
    >
      <div className="relative h-32 overflow-hidden bg-card/60 flex-shrink-0">
        {doc.cover_image_url ? (
          <img
            src={doc.cover_image_url}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="h-7 w-7 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent" />
        {!isMember && (
          <span className="absolute top-2.5 right-2.5 h-6 w-6 rounded-full bg-background/70 backdrop-blur border border-border/50 flex items-center justify-center">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-cyan-300 transition-colors">
          {doc.title}
        </h3>
        {doc.excerpt && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">{doc.excerpt}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-border/30 text-[11px] text-muted-foreground">
          {doc.meta?.read_time ? (
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{doc.meta.read_time} min</span>
          ) : null}
          {guide?.steps ? (
            <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{guide.steps} steps</span>
          ) : null}
          {guide?.difficulty ? (
            <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{guide.difficulty}</span>
          ) : null}
          {doc.collection_slug && (
            <span className="ml-auto uppercase tracking-wider opacity-70">
              {doc.collection_slug.replace(/-/g, " ")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCollection = searchParams.get("collection") ?? "all";
  const activeType = (searchParams.get("type") ?? "all") as "all" | GuidePresentation;
  const { user } = useAuth();

  const [collections, setCollections] = useState<ContentCollection[]>([]);
  const [docs, setDocs] = useState<ContentDocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return docs;
    return docs.filter(
      (d) => d.title.toLowerCase().includes(needle) || (d.excerpt ?? "").toLowerCase().includes(needle),
    );
  }, [docs, search]);

  const byType = useMemo(() => {
    const map = new Map<GuidePresentation, ContentDocumentSummary[]>();
    for (const d of visible) {
      const p = resolvePresentation(d) ?? "document";
      map.set(p, [...(map.get(p) ?? []), d]);
    }
    return map;
  }, [visible]);

  const typeCounts = useMemo(() => {
    const map = new Map<GuidePresentation, number>();
    for (const d of docs) {
      const p = resolvePresentation(d) ?? "document";
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return map;
  }, [docs]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const sectionsToRender = TYPE_ORDER.filter(
    (t) => (activeType === "all" || activeType === t) && (byType.get(t)?.length ?? 0) > 0,
  );

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
            <BookOpen className="h-3.5 w-3.5" /> Docs & Guides
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Learn to build with AI.</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            How-tos, reports, and long reads from the team that teaches Atlanta's AI engineers.
            The opening section of everything here is free — a membership unlocks the rest.
          </p>
        </div>

        {/* Type rail: the primary axis */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {TYPE_ORDER.map((t) => {
            const m = TYPE_META[t];
            const Icon = m.icon;
            const count = typeCounts.get(t) ?? 0;
            const isActive = activeType === t;
            return (
              <button
                key={t}
                onClick={() => setParam("type", isActive ? "all" : t)}
                disabled={count === 0}
                className={`text-left rounded-xl border p-4 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  isActive
                    ? "border-cyan-500/40 bg-cyan-500/[0.06]"
                    : "border-border/40 bg-card/30 hover:border-border hover:bg-card/50"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${m.accent}`} />
                  <span className="text-[11px] text-muted-foreground tabular-nums">{count}</span>
                </div>
                <p className="text-sm font-semibold">{PRESENTATION_LABELS[t]}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug line-clamp-2">{m.blurb}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar: search + collections + join nudge */}
          <aside className="lg:w-52 flex-shrink-0">
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search docs..."
                  className="pl-8 h-9 text-xs"
                />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                  Collections
                </p>
                <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
                  <button
                    onClick={() => setParam("collection", "all")}
                    className={`text-left px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                      activeCollection === "all"
                        ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                    }`}
                  >
                    Everything
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setParam("collection", c.slug)}
                      className={`text-left px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center justify-between gap-2 ${
                        activeCollection === c.slug
                          ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                      }`}
                    >
                      {c.title}
                      <span className="text-[10px] opacity-60 tabular-nums">{c.published_count}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {!user && (
                <div className="hidden lg:block rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3">
                  <p className="text-xs font-medium mb-1">Read everything free</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                    A free membership unlocks every guide and report.
                  </p>
                  <Link to="/signup" className="text-[11px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1">
                    Join Atlantium <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* Type-grouped grid */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
              </div>
            ) : sectionsToRender.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {search ? `Nothing matches "${search}".` : "Guides are being written — check back soon."}
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                {sectionsToRender.map((t) => {
                  const list = byType.get(t) ?? [];
                  const m = TYPE_META[t];
                  const Icon = m.icon;
                  return (
                    <section key={t}>
                      <div className="flex items-baseline gap-2.5 mb-3">
                        <Icon className={`h-4 w-4 ${m.accent} translate-y-0.5`} />
                        <h2 className="text-sm font-semibold uppercase tracking-widest">
                          {PRESENTATION_LABELS[t]}
                        </h2>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${m.chip}`}>
                          {list.length}
                        </Badge>
                        <span className="hidden sm:block text-[11px] text-muted-foreground ml-1">{m.blurb}</span>
                      </div>
                      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {list.map((d) => (
                          <DocCard key={d.id} doc={d} isMember={Boolean(user)} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
