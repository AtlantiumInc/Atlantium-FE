import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/PublicNavbar";
import { motion } from "motion/react";
import { GraduationCap, ArrowRight, BookOpen, Code, Brain, Sparkles } from "lucide-react";

const subjects = [
  { icon: Code, label: "Computer Science", description: "Fundamentals of programming, algorithms, and systems design" },
  { icon: Brain, label: "AI & Machine Learning", description: "Neural networks, LLMs, and hands-on model building" },
  { icon: BookOpen, label: "Mathematics", description: "Linear algebra, calculus, and statistics for AI" },
  { icon: Sparkles, label: "Applied Projects", description: "Real-world capstones that build a portfolio from day one" },
];

export function HomeschoolPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <GraduationCap className="h-3.5 w-3.5" />
              Coming Soon
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              AI-Native Homeschool
              <br />
              <span className="text-emerald-400">Curriculum</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
              A structured computer science and AI engineering curriculum designed for homeschool families.
              Project-based learning that prepares students to build real technology.
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

      {/* Subject cards */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map(({ icon: Icon, label, description }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              className="rounded-xl border border-border/40 bg-card/50 p-5"
            >
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold mb-1">{label}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Atlantium. All rights reserved.</p>
      </footer>
    </div>
  );
}
