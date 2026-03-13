import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { AnimatePresence, motion } from "motion/react";
import { Route, ArrowRight, Bot, FlaskConical, BookOpen, Calculator, Palette, Globe, X, Sparkles } from "lucide-react";

interface Path {
  icon: typeof Bot;
  label: string;
  description: string;
  color: string;
  available: boolean;
}

const paths: Path[] = [
  { icon: Bot, label: "AI Engineering", description: "Build and deploy production AI systems, from LLM integrations to autonomous agents", color: "cyan", available: true },
  { icon: Calculator, label: "Mathematics", description: "From foundational arithmetic to calculus, statistics, and discrete math", color: "violet", available: false },
  { icon: FlaskConical, label: "Sciences", description: "Biology, chemistry, physics, and environmental science with lab work", color: "amber", available: false },
  { icon: BookOpen, label: "Language Arts", description: "Literature, composition, rhetoric, and critical reading skills", color: "rose", available: false },
  { icon: Globe, label: "Social Studies", description: "World history, geography, economics, and government", color: "emerald", available: false },
  { icon: Palette, label: "Creative Arts", description: "Visual arts, music theory, digital media, and creative expression", color: "blue", available: false },
];

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-400",    badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" },
  violet:  { bg: "bg-violet-500/10",  border: "border-violet-500/20",  text: "text-violet-400",  badge: "bg-violet-500/10 border-violet-500/20 text-violet-400" },
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   badge: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  rose:    { bg: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-400",    badge: "bg-rose-500/10 border-rose-500/20 text-rose-400" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",    badge: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
};

export function PathsPage() {
  const [showBar, setShowBar] = useState(false);

  const handlePathClick = (path: Path) => {
    if (path.available) {
      setShowBar(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
              <Route className="h-3.5 w-3.5" />
              Learning Paths
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Learning
              <span className="text-cyan-400"> Paths</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Structured fields of study across every subject. Each path is a curated sequence of
              lessons, projects, and milestones designed to guide your education from start to finish.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Paths grid */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map(({ icon: Icon, label, description, color, available }, i) => {
            const c = colorMap[color];
            return (
              <motion.button
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                onClick={() => handlePathClick(paths[i])}
                className={`rounded-xl border bg-card/50 p-5 text-left transition-all duration-200 w-full ${
                  available
                    ? "border-cyan-500/30 hover:border-cyan-500/50 hover:bg-cyan-500/5 cursor-pointer"
                    : "border-border/40 hover:border-border/60 cursor-default"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <h3 className="font-semibold mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
                {available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
                    <Sparkles className="h-2.5 w-2.5" />
                    Available Now
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.badge}`}>
                    Coming Soon
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Atlantium. All rights reserved.</p>
      </footer>

      {/* AI Engineering bottom bar */}
      <AnimatePresence>
        {showBar && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyan-500/20 bg-background/95 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-5">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Bot className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base">AI Engineering Path</h3>
                <p className="text-sm text-muted-foreground truncate">
                  Hands-on curriculum covering LLMs, agents, RAG, fine-tuning, and production deployment.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/signup">
                  <Button className="gap-2 bg-white text-black hover:bg-gray-100 border-0 h-10 px-5">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <button
                  onClick={() => setShowBar(false)}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
