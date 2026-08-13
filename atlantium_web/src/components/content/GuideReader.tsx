import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Check, ChevronLeft, ChevronRight, ListOrdered, BookOpen, Scale, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContentMarkdown } from "@/components/content/ContentMarkdown";
import type { ContentDocumentDetail } from "@/lib/api";

export type GuidePresentation = "howto" | "ebook" | "comparison" | "document";

/** Resolve how a doc wants to be read. meta.guide.presentation overrides;
 *  format supplies the default (guide→howto, reference→comparison). */
export function resolvePresentation(doc: {
  format: string;
  meta?: { guide?: { presentation?: string } };
}): GuidePresentation | null {
  const explicit = doc.meta?.guide?.presentation;
  if (explicit === "howto" || explicit === "ebook" || explicit === "comparison" || explicit === "document") return explicit;
  if (doc.format === "guide") return "howto";
  if (doc.format === "reference") return "comparison";
  if (doc.format === "document") return "document";
  return null;
}

export const PRESENTATION_LABELS: Record<GuidePresentation, string> = {
  howto: "How-to",
  ebook: "eBook",
  comparison: "Comparison",
  document: "Document",
};

interface Section {
  title: string;
  body: string;
}

/** Split markdown into an intro block and `## `-headed sections. */
function parseSections(md: string): { intro: string; sections: Section[] } {
  const lines = md.split("\n");
  const sections: Section[] = [];
  let intro: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line.trim())) inFence = !inFence;
    if (!inFence && /^## (?!#)/.test(line)) {
      if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
      current = { title: line.replace(/^## /, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) sections.push({ title: current.title, body: current.lines.join("\n").trim() });
  return { intro: intro.join("\n").trim(), sections };
}

/** Step/chapter changes must not yank the page. Only scroll when the reader's
 *  top edge has drifted above the viewport (i.e. the reader is out of view). */
function keepReaderInView(el: HTMLElement | null) {
  if (!el) return;
  const top = el.getBoundingClientRect().top;
  const headerOffset = 88;
  if (top < headerOffset) {
    window.scrollTo({ top: window.scrollY + top - headerOffset, behavior: "auto" });
  }
}

function useStoredProgress(slug: string) {
  const key = `guide-progress:${slug}`;
  const [state, setState] = useState<{ current: number; done: number[] }>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch { /* fresh start */ }
    return { current: 0, done: [] };
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* private mode */ }
  }, [key, state]);
  return [state, setState] as const;
}

interface ReaderProps {
  doc: ContentDocumentDetail;
  onGateCta: () => void;
}

// ---------------------------------------------------------------------------
// HOW-TO: numbered step rail, one step per screen, completion dots
// ---------------------------------------------------------------------------

export function HowToReader({ doc, onGateCta }: ReaderProps) {
  const { intro, sections } = useMemo(() => parseSections(doc.body_md), [doc.body_md]);
  const [progress, setProgress] = useStoredProgress(doc.slug);
  const bodyRef = useRef<HTMLDivElement>(null);
  // step 0 = intro/overview; steps 1..n = sections
  const stepCount = sections.length + 1;
  const current = Math.min(progress.current, stepCount - 1);
  const pct = Math.round((progress.done.length / Math.max(sections.length, 1)) * 100);

  const goTo = (i: number) => {
    setProgress((p) => ({ ...p, current: i }));
    keepReaderInView(bodyRef.current);
  };
  const next = () => {
    if (current > 0) {
      setProgress((p) => ({
        current: Math.min(current + 1, stepCount - 1),
        done: p.done.includes(current) ? p.done : [...p.done, current],
      }));
    } else {
      setProgress((p) => ({ ...p, current: 1 }));
    }
    if (current === stepCount - 1 && doc.gated) onGateCta();
    keepReaderInView(bodyRef.current);
  };

  const atEnd = current === stepCount - 1;

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
      {/* Step rail */}
      <aside className="mb-6 lg:mb-0">
        <div className="lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Steps</span>
            <span className="text-[11px] text-cyan-400 font-medium">{pct}%</span>
          </div>
          <div className="h-1 rounded-full bg-border/40 mb-4 overflow-hidden">
            <div className="h-full bg-cyan-400/70 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
            <StepButton index={0} label="Overview" active={current === 0} done={progress.done.includes(0)} onClick={() => goTo(0)} />
            {sections.map((s, i) => (
              <StepButton
                key={s.title}
                index={i + 1}
                label={s.title.replace(/^Step \d+\s*[—–:-]\s*/i, "")}
                active={current === i + 1}
                done={progress.done.includes(i + 1)}
                onClick={() => goTo(i + 1)}
              />
            ))}
            {doc.gated && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground/60">
                <Lock className="h-3 w-3 flex-shrink-0" /> More steps after you join
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Current step */}
      <div className="min-w-0" ref={bodyRef}>
        <motion.div key={current} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
          {current === 0 ? (
            <ContentMarkdown markdown={intro || "*This guide starts at Step 1.*"} />
          ) : (
            <>
              <h2 className="text-2xl font-bold tracking-tight mb-4">{sections[current - 1].title}</h2>
              <ContentMarkdown markdown={sections[current - 1].body} />
            </>
          )}
        </motion.div>

        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/40">
          <Button variant="outline" size="sm" onClick={() => goTo(Math.max(current - 1, 0))} disabled={current === 0} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <span className="text-xs text-muted-foreground">
            {current === 0 ? "Overview" : `Step ${current} of ${sections.length}${doc.gated ? "+" : ""}`}
          </span>
          {atEnd && doc.gated ? (
            <Button size="sm" className="gap-1 bg-white text-black hover:bg-gray-100" onClick={onGateCta}>
              Unlock the rest <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={next} disabled={atEnd} className="gap-1">
              {current === 0 ? "Start" : "Next step"} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepButton({ index, label, active, done, onClick }: {
  index: number; label: string; active: boolean; done: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm whitespace-nowrap lg:whitespace-normal transition-colors ${
        active ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20" : "text-muted-foreground hover:text-foreground hover:bg-card/60"
      }`}
    >
      <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border ${
        done ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300" : active ? "border-cyan-400/40 text-cyan-300" : "border-border/60 text-muted-foreground"
      }`}>
        {done ? <Check className="h-3 w-3" /> : index === 0 ? "•" : index}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// EBOOK: chapter TOC, serif long-form reading, one chapter per page
// ---------------------------------------------------------------------------

export function EbookReader({ doc, onGateCta }: ReaderProps) {
  const { intro, sections } = useMemo(() => parseSections(doc.body_md), [doc.body_md]);
  const [progress, setProgress] = useStoredProgress(doc.slug);
  const bookRef = useRef<HTMLDivElement>(null);
  // page -1 = cover/TOC; 0..n-1 = chapters
  const [rawPage, setPage] = useState(() => (progress.current > 0 ? progress.current - 1 : -1));
  // Stored progress may exceed the chapters we can currently render (the gate
  // shortens the book when a session lapses), so clamp before indexing.
  const page = sections.length === 0 ? -1 : Math.min(rawPage, sections.length - 1);
  const pct = sections.length ? Math.round(((page + 1) / sections.length) * 100) : 0;

  const open = (i: number) => {
    setPage(i);
    setProgress((p) => ({ ...p, current: i + 1 }));
    keepReaderInView(bookRef.current);
  };

  // A book cover is portrait and physical, not a wide banner: prefer a
  // purpose-made portrait render, fall back to the landscape card art.
  const coverArt = doc.meta?.guide?.cover_portrait ?? doc.cover_image_url;

  if (page === -1) {
    return (
      <div ref={bookRef} className="rounded-2xl border border-border/40 bg-card/30 p-8 sm:p-10">
        <div className="grid md:grid-cols-[210px_1fr] gap-8 lg:gap-10">
          {/* Cover — bound-book treatment: spine, sheen, and the title set on it */}
          <div className="mx-auto md:mx-0 w-[210px] flex-shrink-0">
            <div className="relative aspect-[3/4] rounded-l-[3px] rounded-r-lg overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60 rotate-[-1deg] hover:rotate-0 transition-transform duration-500">
              {coverArt ? (
                <img src={coverArt} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 to-slate-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
              {/* spine */}
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/70 via-black/25 to-transparent" />
              <div className="absolute inset-y-0 left-3 w-px bg-white/10" />
              {/* sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.07] to-transparent" />

              <div className="absolute inset-0 p-4 pl-5 flex flex-col justify-end">
                <p className="font-serif text-[10px] uppercase tracking-[0.2em] text-violet-300/90 mb-1.5">
                  Atlantium Press
                </p>
                <p className="font-serif text-[15px] leading-tight font-bold text-white drop-shadow">
                  {doc.title}
                </p>
                {doc.author && (
                  <p className="font-serif text-[11px] text-white/70 mt-1.5">{doc.author.display_name}</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              {sections.length} chapter{sections.length === 1 ? "" : "s"}
              {doc.meta?.read_time ? ` · ${doc.meta.read_time} min` : ""}
            </p>
          </div>

          <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-400 mb-4">
          <BookOpen className="h-3.5 w-3.5" /> Atlantium Press
        </div>
        {intro && <div className="mb-8 font-serif text-lg leading-relaxed text-muted-foreground"><ContentMarkdown markdown={intro} /></div>}
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">Contents</h2>
        <ol className="space-y-1 mb-8">
          {sections.map((s, i) => (
            <li key={s.title}>
              <button
                onClick={() => open(i)}
                className="w-full flex items-baseline gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-card/60 transition-colors group"
              >
                <span className="font-serif text-lg text-violet-400/70 w-8 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-sm group-hover:text-violet-300 transition-colors">{s.title}</span>
                {progress.current === i + 1 && <span className="ml-auto text-[10px] text-cyan-400">← you were here</span>}
              </button>
            </li>
          ))}
          {doc.gated && (
            <li className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground/60">
              <Lock className="h-3.5 w-3.5 ml-2" /> Remaining chapters unlock with free membership
            </li>
          )}
        </ol>
        <Button onClick={() => open(progress.current > 0 ? progress.current - 1 : 0)} className="gap-2">
          {progress.current > 0 ? "Continue reading" : "Start reading"} <ChevronRight className="h-4 w-4" />
        </Button>
          </div>
        </div>
      </div>
    );
  }

  const chapter = sections[page];
  if (!chapter) {
    // Nothing renderable at this index — fall back to the contents page.
    return (
      <div ref={bookRef} className="rounded-2xl border border-border/40 bg-card/30 p-8 text-sm text-muted-foreground">
        This book has no readable chapters yet.
      </div>
    );
  }
  const isLast = page === sections.length - 1;

  return (
    <div ref={bookRef}>
      {/* Sticky chapter bar — the only chrome while reading */}
      <div className="sticky top-16 z-20 -mx-4 px-4 py-2.5 mb-6 bg-background/85 backdrop-blur border-b border-border/30 flex items-center gap-3">
        {coverArt && (
          <img
            src={coverArt}
            alt=""
            className="hidden sm:block h-8 w-6 object-cover rounded-[2px] ring-1 ring-white/10 flex-shrink-0"
          />
        )}
        <button onClick={() => setPage(-1)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 flex-shrink-0">
          <ListOrdered className="h-3.5 w-3.5" /> Contents
        </button>
        <span className="text-xs text-muted-foreground truncate">
          <span className="text-violet-400/80">Ch. {page + 1}</span> · {chapter.title}
        </span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <div className="w-16 sm:w-24 h-1 rounded-full bg-border/40 overflow-hidden">
            <div className="h-full bg-violet-400/70 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
        </div>
      </div>

      <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}
        className="rounded-2xl border border-border/40 bg-card/30 px-6 py-10 sm:px-16 sm:py-16 min-h-[70vh]">
        <p className="font-serif text-violet-400/70 text-sm mb-2">Chapter {page + 1}</p>
        <h2 className="font-serif text-2xl sm:text-[2rem] font-bold tracking-tight mb-8 leading-tight">{chapter.title}</h2>
        <div className="max-w-[68ch] mx-auto font-serif [&_p]:text-[1.12rem] [&_p]:leading-[1.9] [&_h2]:font-serif [&_h3]:font-serif">
          <ContentMarkdown markdown={chapter.body} />
        </div>
      </motion.div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" size="sm" onClick={() => (page === 0 ? setPage(-1) : open(page - 1))} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> {page === 0 ? "Contents" : "Previous"}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Chapter {page + 1} of {sections.length}{doc.gated ? "+" : ""}
        </span>
        {isLast && doc.gated ? (
          <Button size="sm" className="gap-1 bg-white text-black hover:bg-gray-100" onClick={onGateCta}>
            Unlock the rest <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={() => open(page + 1)} disabled={isLast} className="gap-1">
            Next chapter <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMPARISON: at-a-glance verdict, jump nav, contender cards, wide tables
// ---------------------------------------------------------------------------

export function ComparisonReader({ doc, onGateCta }: ReaderProps) {
  const { intro, sections } = useMemo(() => parseSections(doc.body_md), [doc.body_md]);
  const tldr = doc.meta?.tldr ?? [];
  const [active, setActive] = useState(0);

  const jump = (i: number) => {
    setActive(i);
    document.getElementById(`cmp-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div>
      {tldr.length > 0 && (
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-5 mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-3">
            <Scale className="h-3.5 w-3.5" /> At a glance
          </div>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {tldr.map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {intro && <div className="mb-8"><ContentMarkdown markdown={intro} /></div>}

      {/* Jump nav */}
      <div className="sticky top-16 z-20 -mx-4 px-4 py-2 bg-background/85 backdrop-blur border-b border-border/30 mb-8">
        <div className="flex gap-2 overflow-x-auto">
          {sections.map((s, i) => (
            <button
              key={s.title}
              onClick={() => jump(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                active === i ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300" : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((s, i) => (
          <section key={s.title} id={`cmp-${i}`} className="scroll-mt-32 rounded-2xl border border-border/40 bg-card/30 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="text-[10px] bg-cyan-500/10 border-cyan-500/30 text-cyan-400">{String(i + 1).padStart(2, "0")}</Badge>
              <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
            </div>
            <div className="[&_table]:w-full [&_table]:text-sm overflow-x-auto">
              <ContentMarkdown markdown={s.body} />
            </div>
          </section>
        ))}
      </div>

      {doc.gated && (
        <div className="text-center mt-8">
          <Button className="gap-1 bg-white text-black hover:bg-gray-100" onClick={onGateCta}>
            Unlock the full comparison <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DOCUMENT: formal paper — numbered sections, sticky outline, scroll-spy
// ---------------------------------------------------------------------------

export function DocumentReader({ doc, onGateCta }: ReaderProps) {
  const { intro, sections } = useMemo(() => parseSections(doc.body_md), [doc.body_md]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(Number(visible.target.getAttribute("data-idx")));
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    sections.forEach((_, i) => {
      const el = document.getElementById(`sec-${i}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
      <div className="min-w-0 order-2 lg:order-1">
        {intro && (
          <div className="pb-6 mb-8 border-b border-border/40">
            <ContentMarkdown markdown={intro} />
          </div>
        )}
        {sections.map((s, i) => (
          <section key={s.title} id={`sec-${i}`} data-idx={i} className="scroll-mt-24 mb-10">
            <h2 className="flex items-baseline gap-3 text-lg font-semibold tracking-tight mb-3">
              <span className="font-mono text-xs text-cyan-400/80 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              {s.title}
            </h2>
            <div className="pl-0 sm:pl-8">
              <ContentMarkdown markdown={s.body} />
            </div>
          </section>
        ))}
        {doc.gated && (
          <div className="pl-0 sm:pl-8">
            <Button className="gap-1 bg-white text-black hover:bg-gray-100" onClick={onGateCta}>
              Read the full document <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Outline */}
      <aside className="order-1 lg:order-2 mb-6 lg:mb-0">
        <div className="lg:sticky lg:top-24">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Contents</p>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 lg:border-l lg:border-border/40">
            {sections.map((s, i) => (
              <button
                key={s.title}
                onClick={() => document.getElementById(`sec-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className={`text-left text-xs px-3 py-1.5 whitespace-nowrap lg:whitespace-normal transition-colors lg:-ml-px lg:border-l-2 ${
                  active === i
                    ? "text-cyan-300 lg:border-cyan-400/60"
                    : "text-muted-foreground hover:text-foreground lg:border-transparent"
                }`}
              >
                <span className="font-mono text-[10px] opacity-60 mr-2">{String(i + 1).padStart(2, "0")}</span>
                {s.title}
              </button>
            ))}
            {doc.gated && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground/60">
                <Lock className="h-3 w-3" /> More sections
              </span>
            )}
          </nav>
        </div>
      </aside>
    </div>
  );
}

export function GuideReader({ doc, presentation, onGateCta }: ReaderProps & { presentation: GuidePresentation }) {
  if (presentation === "howto") return <HowToReader doc={doc} onGateCta={onGateCta} />;
  if (presentation === "ebook") return <EbookReader doc={doc} onGateCta={onGateCta} />;
  if (presentation === "document") return <DocumentReader doc={doc} onGateCta={onGateCta} />;
  return <ComparisonReader doc={doc} onGateCta={onGateCta} />;
}
