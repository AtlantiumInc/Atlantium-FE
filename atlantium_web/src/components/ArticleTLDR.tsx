import { motion } from "motion/react";
import { Zap } from "lucide-react";
import SpotlightCard from "@/components/ui/SpotlightCard";

interface ArticleTLDRProps {
  points: string[];
  className?: string;
}

export function ArticleTLDR({ points, className = "" }: ArticleTLDRProps) {
  if (!points || points.length === 0) {
    return null;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <SpotlightCard
        className="p-6"
        spotlightColor="rgba(34, 211, 238, 0.12)"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30">
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wider text-cyan-400">
              TL;DR
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              QUICK SUMMARY
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/40 via-cyan-500/20 to-transparent" />
        </div>

        {/* Points */}
        <ul className="space-y-3">
          {points.map((point, index) => (
            <motion.li
              key={index}
              className="flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + index * 0.08 }}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center mt-0.5">
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  {index + 1}
                </span>
              </span>
              <span className="text-xl text-foreground/90 leading-relaxed">
                {point}
              </span>
            </motion.li>
          ))}
        </ul>

        {/* Footer accent */}
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground font-mono">
            {points.length} KEY POINT{points.length !== 1 ? "S" : ""} EXTRACTED
          </p>
        </div>
      </SpotlightCard>
    </motion.div>
  );
}
