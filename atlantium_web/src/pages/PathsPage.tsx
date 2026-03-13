import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { motion } from "motion/react";
import { Route, ArrowRight, Bot, Database, Eye, Shield, Cpu, Globe } from "lucide-react";

const paths = [
  { icon: Bot, label: "AI Engineering", description: "Build and deploy production AI systems, from LLM integrations to autonomous agents", color: "cyan" },
  { icon: Database, label: "Data Engineering", description: "Design data pipelines, warehouses, and real-time streaming architectures", color: "violet" },
  { icon: Eye, label: "Computer Vision", description: "Image recognition, object detection, and video analysis with deep learning", color: "amber" },
  { icon: Shield, label: "AI Safety & Alignment", description: "Responsible AI development, red-teaming, and alignment research", color: "rose" },
  { icon: Cpu, label: "ML Infrastructure", description: "Model serving, training pipelines, and MLOps at scale", color: "emerald" },
  { icon: Globe, label: "Full-Stack AI Apps", description: "End-to-end applications with AI-powered backends and modern frontends", color: "blue" },
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
              Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Learning
              <span className="text-cyan-400"> Paths</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              Guided fields of study for AI engineers. Each path is a curated sequence of projects,
              resources, and milestones designed to take you from fundamentals to mastery.
            </p>
            <Link to="/signup">
              <Button className="gap-2 bg-white text-black hover:bg-gray-100 border-0 h-11 px-6">
                Join Waitlist
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Paths grid */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map(({ icon: Icon, label, description, color }, i) => {
            const c = colorMap[color];
            return (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                className="rounded-xl border border-border/40 bg-card/50 p-5 hover:border-border/60 transition-colors"
              >
                <div className={`h-10 w-10 rounded-lg ${c.bg} ${c.border} border flex items-center justify-center mb-3`}>
                  <Icon className={`h-5 w-5 ${c.text}`} />
                </div>
                <h3 className="font-semibold mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{description}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.badge}`}>
                  Coming Soon
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Atlantium. All rights reserved.</p>
      </footer>
    </div>
  );
}
