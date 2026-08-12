import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronLeft, Clock, Loader2, FileText, GraduationCap, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicNavbar } from "@/components/PublicNavbar";
import Aurora from "@/components/Aurora";
import { ContentMarkdown } from "@/components/content/ContentMarkdown";
import { ContentGate } from "@/components/content/ContentGate";
import { GuideReader, resolvePresentation } from "@/components/content/GuideReader";
import { ContentComments } from "@/components/content/ContentComments";
import { JobReportSignupModal, useJobReportSignup } from "@/components/JobReportSignupModal";
import { api, type ContentDocumentDetail } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Renders both /blog/:slug (type=post) and /docs/:slug (type=doc). */
export function ContentDocumentPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const type: "doc" | "post" = location.pathname.startsWith("/blog") ? "post" : "doc";
  const { user } = useAuth();
  const signup = useJobReportSignup();

  const [doc, setDoc] = useState<ContentDocumentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (doc?.gated && doc.type === "doc") {
      api.trackEvent("content_gate_viewed", { slug: doc.slug, type: doc.type, surface: "docs" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id]);

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    setNotFound(false);
    api.getContentDocument(type, slug)
      .then((r) => setDoc(r.document))
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
    // refetch after sign-in: the gate lifts server-side
  }, [slug, type, user?.id]);

  const backLink = type === "post" ? { to: "/blog", label: "Back to Blog" } : { to: "/docs", label: "Back to Docs" };
  const guide = doc?.format === "guide" ? doc.meta?.guide : undefined;
  const presentation = doc && doc.type === "doc" ? resolvePresentation(doc) : null;

  const openGateSignup = () => {
    api.trackEvent("content_gate_signup_started", { slug: doc?.slug, surface: "docs" });
    signup.openWithEmail();
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-20 dark:opacity-30">
        <Aurora colorStops={["#0ea5e9", "#6366f1", "#334155"]} amplitude={0.7} blend={0.5} speed={0.3} />
      </div>
      <PublicNavbar />
      <main className={`relative z-10 mx-auto px-4 sm:px-6 py-8 w-full ${presentation === "howto" || presentation === "comparison" ? "max-w-5xl" : "max-w-3xl"}`}>
        <Link to={backLink.to} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ChevronLeft className="h-4 w-4" /> {backLink.label}
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading...
          </div>
        ) : notFound || !doc ? (
          <div className="text-center py-24 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Not Found</h2>
            <p className="text-sm">This page may have moved or been unpublished.</p>
          </div>
        ) : (
          <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <header className="mb-8">
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
                {doc.format === "guide" && (
                  <Badge variant="outline" className="text-[10px] bg-violet-500/10 border-violet-500/30 text-violet-400">
                    <GraduationCap className="h-3 w-3 mr-1" /> Guide
                  </Badge>
                )}
                {doc.collection_slug && <span className="uppercase tracking-widest">{doc.collection_slug.replace(/-/g, " ")}</span>}
                <span>{formatDate(doc.published_at)}</span>
                {doc.meta?.read_time ? (
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{doc.meta.read_time} min read</span>
                ) : null}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">{doc.title}</h1>
              {doc.excerpt && <p className="text-lg text-muted-foreground mt-3">{doc.excerpt}</p>}
              {doc.author && (
                <p className="text-sm text-muted-foreground mt-4">
                  By <span className="text-foreground font-medium">{doc.author.display_name}</span>
                </p>
              )}
              {guide && (
                <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground rounded-xl border border-border/40 bg-card/40 px-4 py-3">
                  {guide.steps ? <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-violet-400" />{guide.steps} steps</span> : null}
                  {guide.difficulty ? <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-violet-400" />{guide.difficulty}</span> : null}
                  {guide.time_to_complete ? <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-violet-400" />{guide.time_to_complete}</span> : null}
                </div>
              )}
            </header>

            {doc.cover_image_url && (
              <img src={doc.cover_image_url} alt="" className="w-full rounded-2xl mb-8 border border-border/30" />
            )}

            {presentation ? (
              <GuideReader doc={doc} presentation={presentation} onGateCta={openGateSignup} />
            ) : (
              <ContentMarkdown markdown={doc.body_md} />
            )}

            {doc.gated && !presentation && (
              <ContentGate slug={doc.slug} type={doc.type} onJoin={() => signup.openWithEmail()} />
            )}

            {/* Comments: blog posts only at launch (plan §7.6), and only under full reads */}
            {doc.type === "post" && !doc.gated && (
              <ContentComments subjectId={doc.id} onJoin={() => signup.openWithEmail()} />
            )}
          </motion.article>
        )}
      </main>

      <JobReportSignupModal
        open={signup.open}
        onOpenChange={signup.setOpen}
        initialEmail={signup.initialEmail}
        initialStep={signup.initialStep}
      />
    </div>
  );
}
