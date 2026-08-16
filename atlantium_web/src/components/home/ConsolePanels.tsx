import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { GraduationCap, ArrowUpRight } from "lucide-react";
import BorderGlow from "@/components/ui/BorderGlow";
import { api } from "@/lib/api";

/**
 * The homepage console — the network's real instruments, booted in sequence.
 * Design rule: every number is a live query result (one cached /console
 * call). A panel that can't show a true value doesn't render at all; the
 * page's credibility is the numbers being load-bearing.
 */

type ConsoleData = Awaited<ReturnType<typeof api.getConsole>>;

/** rAF count-up from 0 → value, ease-out, fires once — when the panel is
 *  actually on screen, so late scrollers still get the boot. */
function useCountUp(target: number, start: boolean, duration = 1100, delay = 0): number {
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!start || done.current || target === 0) return;
    done.current = true;
    let raf: number;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(Math.max(now - t0, 0) / duration, 1);
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration, delay]);
  return n;
}

function fmtSalary(min: number | null, max: number | null): string | null {
  const k = (v: number) => `$${Math.round(v / 1000)}k`;
  if (min && max) return `${k(min)}–${k(max)}`;
  if (max) return `to ${k(max)}`;
  if (min) return `${k(min)}+`;
  return null;
}

const PANEL_STAGGER = 0.14;

function PanelShell({
  index,
  label,
  to,
  children,
  className = "",
}: {
  index: number;
  label: string;
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * PANEL_STAGGER, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Link
        to={to}
        className="group relative flex h-full flex-col rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-card/60 overflow-hidden"
      >
        {/* scan line boots with the panel */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          whileInView={{ scaleX: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * PANEL_STAGGER + 0.1, duration: 0.5 }}
          className="absolute top-0 left-0 right-0 h-px origin-left bg-gradient-to-r from-cyan-400/60 to-transparent"
        />
        <div className="flex items-baseline gap-2 mb-3">
          <span className="font-mono text-[10px] text-primary/70">{String(index + 1).padStart(2, "0")}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-cyan-400 transition-colors" />
        </div>
        {children}
      </Link>
    </motion.div>
  );
}

function Readout({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between font-mono text-[10px] uppercase tracking-wide">
      <span className="text-muted-foreground">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

function BoardPanel({ data, index }: { data: ConsoleData["jobs"]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const total = useCountUp(data.total, inView, 1100, index * PANEL_STAGGER * 1000);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (data.latest.length < 2) return;
    const t = setInterval(() => setTick((n) => n + 1), 3200);
    return () => clearInterval(t);
  }, [data.latest.length]);
  const current = data.latest[tick % Math.max(data.latest.length, 1)];
  const salary = current ? fmtSalary(current.salaryMin, current.salaryMax) : null;

  return (
    <PanelShell index={index} label="The Board" to="/jobs">
      <div ref={ref} className="flex items-baseline gap-2">
        <span className="font-mono text-3xl text-foreground leading-none">{total.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">verified roles</span>
      </div>
      <div className="mt-3 space-y-1">
        <Readout label="Remote" value={data.remote.toLocaleString()} className="text-emerald-400" />
        <Readout label="New this week" value={data.new_this_week.toLocaleString()} className="text-cyan-400" />
        <Readout label="Reach $200k+" value={data.reach_200k.toLocaleString()} className="text-violet-400" />
      </div>
      {current && (
        <div className="mt-auto pt-3 min-h-[3.25rem]">
          <motion.div key={current.slug} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <p className="text-xs font-semibold truncate">{current.title}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {current.company}
              {salary ? <span className="text-emerald-400/90"> · {salary}</span> : null}
            </p>
          </motion.div>
        </div>
      )}
    </PanelShell>
  );
}

function MapPanel({ data, index }: { data: ConsoleData["directory"]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const companies = useCountUp(data.company ?? 0, inView, 1100, index * PANEL_STAGGER * 1000);
  return (
    <PanelShell index={index} label="The Map" to="/directory">
      <div ref={ref} className="flex items-baseline gap-2">
        <span className="font-mono text-3xl text-foreground leading-none">{companies.toLocaleString()}</span>
        <span className="text-xs text-muted-foreground">companies mapped</span>
      </div>
      <div className="mt-3 space-y-1">
        <Readout label="Investors" value={(data.investor ?? 0).toLocaleString()} className="text-cyan-400" />
        <Readout label="Programs" value={(data.resource ?? 0).toLocaleString()} className="text-violet-400" />
        {(data.grant ?? 0) > 0 && <Readout label="Open grants" value={(data.grant ?? 0).toLocaleString()} className="text-emerald-400" />}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground">
        The working map of Atlanta tech — every link checked.
      </p>
    </PanelShell>
  );
}

function WirePanel({ data, index }: { data: ConsoleData["wire"]; index: number }) {
  return (
    <PanelShell index={index} label="The Wire" to="/blog">
      <div className="space-y-2.5">
        {data.map((post) => (
          <p key={post.slug} className="text-xs font-medium leading-snug line-clamp-2 text-foreground/90">
            {post.title}
          </p>
        ))}
      </div>
      <p className="mt-auto pt-3 text-[11px] text-muted-foreground">Atlanta tech, covered.</p>
    </PanelShell>
  );
}

function IntensivePanel({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * PANEL_STAGGER, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <BorderGlow
        animated
        className="deck-featured h-full"
        borderRadius={12}
        glowRadius={14}
        glowIntensity={1.15}
        glowColor="189 100 60"
        backgroundColor="hsl(var(--background))"
        colors={["#00d4ff", "#38bdf8", "#22d3ee"]}
      >
        <Link to="/training" className="group flex h-full flex-col p-4">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-mono text-[10px] text-primary/70">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">The Intensive</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-cyan-400 transition-colors" />
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <GraduationCap className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold">AI Engineer Training</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            8 weeks from where you are to shipping production AI. Live sessions, a real client build, warm introductions.
          </p>
          <div className="mt-auto pt-3">
            <Readout label="Cohort" value="30 seats" className="text-cyan-300" />
            <Readout label="Status" value="Enrolling" className="text-emerald-400" />
          </div>
        </Link>
      </BorderGlow>
    </motion.div>
  );
}

export function ConsolePanels() {
  const [data, setData] = useState<ConsoleData | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.getConsole().then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // No data, no console — panels never render placeholder numbers.
  if (!data) return null;

  const panels: React.ReactNode[] = [];
  if (data.jobs.total > 0) panels.push(<BoardPanel key="board" data={data.jobs} index={panels.length} />);
  if ((data.directory.company ?? 0) > 0) panels.push(<MapPanel key="map" data={data.directory} index={panels.length} />);
  if (data.wire.length > 0) panels.push(<WirePanel key="wire" data={data.wire} index={panels.length} />);
  panels.push(<IntensivePanel key="intensive" index={panels.length} />);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
      {panels}
    </div>
  );
}
