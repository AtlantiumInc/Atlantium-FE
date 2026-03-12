import { Link } from "react-router-dom";
import { PublicNavbar } from "@/components/PublicNavbar";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { ExternalLink, Github, Star, Code2, Layers, Palette, Terminal } from "lucide-react";

const templates = [
  {
    name: "Minimal Developer",
    description:
      "Clean, content-focused portfolio for developers who let their work speak. Optimized for performance and SEO with a single-page layout.",
    techStack: ["React", "Tailwind", "Vite"],
    stars: 128,
    gradient: "from-slate-800 via-zinc-900 to-neutral-950",
    accent: "cyan",
    icon: Terminal,
    previewLines: [
      { w: "w-2/3", color: "bg-cyan-400/60" },
      { w: "w-1/2", color: "bg-white/20" },
      { w: "w-3/4", color: "bg-white/10" },
      { w: "w-1/3", color: "bg-cyan-400/30" },
    ],
  },
  {
    name: "AI Engineer Pro",
    description:
      "Showcase ML projects, research papers, and model demos. Includes interactive sections for live model inference and experiment tracking.",
    techStack: ["Next.js", "Tailwind", "Framer Motion", "MDX"],
    stars: 256,
    gradient: "from-violet-950 via-indigo-950 to-slate-950",
    accent: "violet",
    icon: Layers,
    previewLines: [
      { w: "w-1/2", color: "bg-violet-400/60" },
      { w: "w-2/3", color: "bg-white/20" },
      { w: "w-1/4", color: "bg-violet-400/30" },
      { w: "w-3/5", color: "bg-white/10" },
    ],
  },
  {
    name: "Research Portfolio",
    description:
      "Academic-grade template for AI researchers. Features publication lists, citation graphs, LaTeX rendering, and conference timeline views.",
    techStack: ["React", "Tailwind", "KaTeX", "D3.js"],
    stars: 89,
    gradient: "from-emerald-950 via-teal-950 to-slate-950",
    accent: "emerald",
    icon: Code2,
    previewLines: [
      { w: "w-3/5", color: "bg-emerald-400/60" },
      { w: "w-1/3", color: "bg-white/20" },
      { w: "w-2/3", color: "bg-emerald-400/30" },
      { w: "w-1/2", color: "bg-white/10" },
    ],
  },
  {
    name: "Creative Technologist",
    description:
      "Expressive, maximalist portfolio for builders at the intersection of design and engineering. WebGL-ready with rich media support.",
    techStack: ["React", "Tailwind", "Three.js", "GSAP"],
    stars: 194,
    gradient: "from-amber-950 via-orange-950 to-slate-950",
    accent: "amber",
    icon: Palette,
    previewLines: [
      { w: "w-1/3", color: "bg-amber-400/60" },
      { w: "w-3/4", color: "bg-white/20" },
      { w: "w-1/2", color: "bg-amber-400/30" },
      { w: "w-2/5", color: "bg-white/10" },
    ],
  },
];

const accentMap: Record<string, { badge: string; border: string; glow: string }> = {
  cyan: {
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    border: "hover:border-cyan-500/40",
    glow: "group-hover:shadow-cyan-500/10",
  },
  violet: {
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    border: "hover:border-violet-500/40",
    glow: "group-hover:shadow-violet-500/10",
  },
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    border: "hover:border-emerald-500/40",
    glow: "group-hover:shadow-emerald-500/10",
  },
  amber: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    border: "hover:border-amber-500/40",
    glow: "group-hover:shadow-amber-500/10",
  },
};

export function TemplatesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-6">
              <Code2 className="h-3.5 w-3.5" />
              Open Source
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-5"
          >
            Portfolio Templates
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Free, production-ready templates designed for AI engineers.
            Fork, customize, and deploy in minutes.
          </motion.p>
        </div>
      </section>

      {/* Templates Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {templates.map((template, i) => {
            const colors = accentMap[template.accent];
            const Icon = template.icon;
            return (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08, duration: 0.5 }}
                className={`group relative rounded-2xl border border-border/40 ${colors.border} bg-card/50 overflow-hidden transition-all duration-300 ${colors.glow} group-hover:shadow-xl`}
              >
                {/* Preview area */}
                <div className={`relative h-44 bg-gradient-to-br ${template.gradient} overflow-hidden`}>
                  {/* Fake UI chrome */}
                  <div className="absolute top-3 left-4 flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  </div>
                  <div className="absolute top-3 right-4">
                    <div className="h-5 w-20 rounded bg-white/5" />
                  </div>
                  {/* Skeleton content lines */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2.5">
                    {template.previewLines.map((line, j) => (
                      <div key={j} className={`h-2 ${line.w} ${line.color} rounded-full`} />
                    ))}
                  </div>
                  {/* Subtle grid overlay */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  />
                </div>

                {/* Card body */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-lg ${colors.badge} border flex items-center justify-center`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground">{template.name}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3" />
                      {template.stars}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {template.description}
                  </p>

                  {/* Tech stack */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {template.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-muted/60 text-muted-foreground border border-border/40"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="gap-1.5 flex-1 border-border/50 hover:bg-muted/40"
                    >
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview
                      </a>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      className="gap-1.5 flex-1 bg-white text-black hover:bg-gray-100 border-0"
                    >
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/30">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Want to contribute?</h2>
            <p className="text-muted-foreground mb-6">
              Submit your own template to the collection. Open a PR and we'll review it.
            </p>
            <Button asChild size="lg" className="gap-2 bg-white text-black hover:bg-gray-100 border-0 shadow-lg shadow-black/20">
              <a href="#" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Atlantium. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/policies" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}