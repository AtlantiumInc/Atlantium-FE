import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The training card that rides the job board.
 *
 * ONE copy on purpose: it used to exist identically in JobsPage and
 * JobDetailPage, and when the program changed shape the rewrite caught one and
 * missed the other — the board kept advertising a 4-week bootcamp that no
 * longer existed. Marketing copy that appears twice will drift; this is the
 * only place it lives now.
 */
export function TrainingPromoCard() {
  return (
    <>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <GraduationCap className="h-[18px] w-[18px] text-violet-400" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Atlantium</p>
          <h3 className="font-semibold text-foreground text-sm leading-tight">AI Engineer Training</h3>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Not landing the roles you want yet? Our 8-week intensive takes you from
        where you are to shipping production AI — live sessions, a real client
        build, and warm introductions to hiring partners. 30 seats a cohort,
        and they fill.
      </p>
      <div className="space-y-1.5 mb-4">
        {["8 weeks, fully hands-on", "Live sessions + a real client build", "Portfolio + warm introductions"].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-violet-400 flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>
      <Link to="/training">
        <Button size="sm" className="w-full gap-2 bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30">
          Learn More
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </>
  );
}
