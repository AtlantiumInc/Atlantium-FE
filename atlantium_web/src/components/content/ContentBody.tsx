import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus,
  ExternalLink,

  MessageSquare,
  UserPlus,
  LayoutGrid,
  List,
  Clock,
  Radio,
  X,
  Calendar,
  Image,
  Video,
  Layers,
  CircleDot,
  Globe,
  Instagram,
  Youtube,
  Share2,
  Zap,
  Repeat,
  Bell,
} from "lucide-react";
import { useContentStore } from "@/stores/content";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Unit, ContentStage, ContentType } from "@/lib/types";

const tabs = ["Overview", "Releases", "Thread", "Crew"] as const;

const stageBadgeClass: Record<ContentStage, string> = {
  draft: "bg-neutral-500/15 text-neutral-400 border-transparent",
  review: "bg-amber-500/15 text-amber-400 border-transparent",
  ready: "bg-green-500/15 text-green-400 border-transparent",
  published: "bg-violet-500/15 text-violet-400 border-transparent",
  archived: "bg-neutral-500/15 text-neutral-500 border-transparent",
};

function postTypeLabel(type: ContentType): string {
  switch (type) {
    case "image": return "Image";
    case "story": return "Story";
    case "carousel": return "Carousel";
    case "short-video": return "Short Video";
    case "long-video": return "Long Video";
  }
}

export default function ContentBody() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const selectedUnitId = useContentStore((s) => s.selectedUnitId);
  const clearSelectedUnit = useContentStore((s) => s.clearSelectedUnit);
  const activeUnits = useContentStore((s) => s.activeUnits);
  const activeProduction = useContentStore((s) => s.activeProduction);

  const units = activeUnits();
  const production = activeProduction();
  const selectedUnit = units.find((u) => u.unit_details.unit_id === selectedUnitId) ?? null;

  if (selectedUnit) {
    return <UnitDetail unit={selectedUnit} onClose={clearSelectedUnit} />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-3 px-6 py-3">
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-xs font-medium transition-colors",
                activeTab === tab
                  ? "text-neutral-12"
                  : "text-neutral-7 hover:text-neutral-10"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 rounded-md bg-neutral-12 px-3.5 py-1.5 text-xs font-semibold text-neutral-0 transition-colors hover:bg-white">
          <Plus className="h-3.5 w-3.5" />
          Create New
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "Overview" && <OverviewTab units={units} productionName={production?.name} />}
        {activeTab === "Releases" && <ReleasesTab units={units} />}
        {activeTab === "Thread" && <ThreadTab />}
        {activeTab === "Crew" && <CrewTab />}
      </div>
    </div>
  );
}

/* ── Unit Detail (full window) ── */
function UnitDetail({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const { unit_details: details, unit_data: channels } = unit;
  const channelCount = channels.length;

  const toggle = (id: string) => setOpenMenu(openMenu === id ? null : id);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-3 px-6 py-3">
        <div className="flex flex-1 items-center gap-3">
          <button
            onClick={onClose}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-8 transition-colors hover:bg-neutral-3 hover:text-neutral-12"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content Type dropdown */}
          <div className="relative flex-1">
            <button onClick={() => toggle("type")} className="flex flex-col text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-7">Content Type</span>
              <span className="text-xs font-medium text-neutral-12">{postTypeLabel(details.post_type)}</span>
            </button>
            {openMenu === "type" && (
              <div className="absolute left-0 top-full z-50 mt-2 w-40 rounded-lg border border-neutral-4 bg-neutral-2 py-1 shadow-lg">
                {([
                  { icon: Image, label: "Image", value: "image" },
                  { icon: CircleDot, label: "Story", value: "story" },
                  { icon: Layers, label: "Carousel", value: "carousel" },
                  { icon: Video, label: "Short Video", value: "short-video" },
                  { icon: Video, label: "Long Video", value: "long-video" },
                ] as const).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setOpenMenu(null)}
                      className={cn(
                        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-3",
                        details.post_type === t.value ? "text-violet-400" : "text-neutral-11"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribution dropdown */}
          <div className="relative flex-1">
            <button onClick={() => toggle("dist")} className="flex flex-col text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-7">Distribution</span>
              <span className="text-xs font-medium text-neutral-12">{channelCount} channel{channelCount !== 1 ? "s" : ""}</span>
            </button>
            {openMenu === "dist" && (
              <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-lg border border-neutral-4 bg-neutral-2 p-2 shadow-lg">
                {channels.map((ch) => {
                  const Icon = platformIcon(ch.platform);
                  return (
                    <div key={ch.channel_id} className="flex items-center justify-between rounded-md px-2.5 py-2 hover:bg-neutral-3">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-neutral-8" />
                        <span className="text-xs text-neutral-11">{ch.channel_info.name}</span>
                      </div>
                      <div className="flex h-4 w-7 items-center justify-end rounded-full bg-violet-600 p-0.5">
                        <div className="h-3 w-3 rounded-full bg-white" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Crew dropdown */}
          <div className="relative flex-1">
            <button onClick={() => toggle("crew")} className="flex flex-col text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-7">Crew</span>
              <span className="text-xs font-medium text-neutral-12">2 assigned</span>
            </button>
            {openMenu === "crew" && (
              <div className="absolute left-0 top-full z-50 mt-2 w-56 rounded-lg border border-neutral-4 bg-neutral-2 p-2 shadow-lg">
                {[
                  { name: "Alex Chen", role: "Editor" },
                  { name: "Jordan Lee", role: "Reviewer" },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 hover:bg-neutral-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-4 text-[9px] font-bold text-neutral-11">
                      {m.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-12">{m.name}</p>
                      <p className="text-[10px] text-neutral-6">{m.role}</p>
                    </div>
                  </div>
                ))}
                <button className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-8 transition-colors hover:bg-neutral-3 hover:text-neutral-11">
                  <UserPlus className="h-3 w-3" />
                  Add member
                </button>
              </div>
            )}
          </div>

          {/* Automation dropdown */}
          <div className="relative flex-1">
            <button onClick={() => toggle("auto")} className="flex flex-col text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-7">Automation</span>
              <span className="text-xs font-medium text-neutral-12">
                {details.workflows.length} active
              </span>
            </button>
            {openMenu === "auto" && (
              <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-neutral-4 bg-neutral-2 p-2 shadow-lg">
                {[
                  { icon: Repeat, label: "Auto-repost", desc: "Repost 24h after publish", key: "auto-repost" },
                  { icon: Bell, label: "Notify crew", desc: "Alert when live", key: "notify-crew" },
                  { icon: Zap, label: "AI caption", desc: "Generate from media", key: "ai-caption" },
                ].map((rule) => {
                  const Icon = rule.icon;
                  const isOn = details.workflows.includes(rule.key);
                  return (
                    <div key={rule.key} className="flex items-center justify-between rounded-md px-2.5 py-2 hover:bg-neutral-3">
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-3.5 w-3.5 text-neutral-8" />
                        <div>
                          <p className="text-xs text-neutral-11">{rule.label}</p>
                          <p className="text-[10px] text-neutral-6">{rule.desc}</p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex h-4 w-7 items-center rounded-full p-0.5 transition-colors",
                          isOn ? "bg-violet-600 justify-end" : "bg-neutral-5 justify-start"
                        )}
                      >
                        <div className="h-3 w-3 rounded-full bg-white" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Publish */}
        <div className="flex items-center gap-3 rounded-lg bg-green-500/10 px-4 py-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-green-400">Publish</p>
            <p className="text-[10px] text-neutral-7">{details.stage}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-8">
            {new Date(details.publishing_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            <Calendar className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Body — caption, channels, preview */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-[1fr_1.5fr_auto] gap-3">
          <div className="flex min-h-[120px] flex-col rounded-lg border border-neutral-4 p-4">
            <span className="text-xs text-neutral-10">
              {details.main_caption || "Type in caption..."}
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-neutral-4 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-7">Selected Channels</span>
            {channels.map((ch) => {
              const PlatIcon = platformIcon(ch.platform);
              return (
                <div key={ch.channel_id} className="flex items-center gap-2 text-xs text-neutral-10">
                  <PlatIcon className="h-3.5 w-3.5 text-neutral-8" />
                  {ch.channel_info.name}
                  <span className="text-neutral-6">@{ch.channel_info.username}</span>
                </div>
              );
            })}
          </div>
          <div className="flex w-28 flex-col items-center justify-center rounded-lg border border-neutral-4 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-7">Preview</span>
          </div>
        </div>
      </div>

      {/* Releases Dock */}
      <ReleaseDock />
    </div>
  );
}

/* ── Platform icon helper ── */
function platformIcon(platform: string) {
  switch (platform) {
    case "instagram": return Instagram;
    case "youtube": return Youtube;
    case "tiktok": return Share2;
    case "twitter": return Globe;
    default: return Globe;
  }
}

/* ── Release Dock (macOS-style magnification) ── */
const DOCK_MAGNIFY_RANGE = 150;
const DOCK_MAX_SCALE = 1.45;

function ReleaseDock() {
  const activeUnits = useContentStore((s) => s.activeUnits);
  const selectedUnitId = useContentStore((s) => s.selectedUnitId);
  const selectUnit = useContentStore((s) => s.selectUnit);
  const units = activeUnits();

  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [mouseX, setMouseX] = useState<number | null>(null);
  const [scales, setScales] = useState<number[]>(units.map(() => 1));
  const rafRef = useRef<number>(0);

  // Re-init scales when units change
  useEffect(() => {
    setScales(units.map(() => 1));
  }, [units.length]);

  const recompute = useCallback(
    (clientX: number | null) => {
      if (clientX === null) {
        setScales(units.map(() => 1));
        return;
      }
      const next = units.map((_, i) => {
        const el = itemRefs.current[i];
        if (!el) return 1;
        const rect = el.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(clientX - center);
        if (dist > DOCK_MAGNIFY_RANGE) return 1;
        const t = 1 - dist / DOCK_MAGNIFY_RANGE;
        return 1 + (DOCK_MAX_SCALE - 1) * Math.cos(((1 - t) * Math.PI) / 2);
      });
      setScales(next);
    },
    [units]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX;
      setMouseX(x);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => recompute(x));
    },
    [recompute]
  );

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setMouseX(null);
    setScales(units.map(() => 1));
  }, [units]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="shrink-0 border-t border-neutral-3 bg-neutral-1/80 backdrop-blur-md">
      <div
        className="flex items-end justify-center gap-5 overflow-x-auto px-6 pb-3 pt-4"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {units.map((unit, i) => {
          const s = scales[i] ?? 1;
          const d = unit.unit_details;
          const isActive = d.unit_id === selectedUnitId;
          const TypeIcon = d.post_type.includes("video") ? Video : d.post_type === "carousel" ? Layers : d.post_type === "story" ? CircleDot : Image;
          const dateStr = new Date(d.publishing_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <button
              key={d.unit_id}
              ref={(el) => { itemRefs.current[i] = el; }}
              onClick={() => selectUnit(d.unit_id)}
              className="relative flex-shrink-0 origin-bottom"
              style={{
                transform: `scale(${s})`,
                transition:
                  mouseX !== null
                    ? "transform 0.08s linear"
                    : "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 shadow-md shadow-black/20 transition-all",
                  isActive
                    ? "bg-neutral-3 ring-2 ring-white"
                    : "bg-neutral-2 ring-1 ring-neutral-4 hover:ring-neutral-6 hover:bg-neutral-3/50"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-3/80">
                  <TypeIcon className="h-4 w-4 text-neutral-8" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="whitespace-nowrap text-[11px] font-semibold text-neutral-12">
                    {d.main_caption.slice(0, 20)}{d.main_caption.length > 20 ? "…" : ""}
                  </span>
                  <span className="text-[9px] text-neutral-7">{dateStr}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Overview ── */
function OverviewTab({ units, productionName }: { units: Unit[]; productionName?: string }) {
  const byStage = (stage: string) => units.filter((u) => u.unit_details.stage === stage).length;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-12">
          {productionName ?? "Production"} Overview
        </h3>
        <span className="text-xs text-neutral-7">
          {units.length} unit{units.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-neutral-3 p-4">
          <span className="text-[11px] text-neutral-7">Total Units</span>
          <p className="mt-1 text-xl font-semibold text-neutral-12">{units.length}</p>
        </div>
        <div className="rounded-lg border border-neutral-3 p-4">
          <span className="text-[11px] text-neutral-7">Published</span>
          <p className="mt-1 text-xl font-semibold text-neutral-12">{byStage("published")}</p>
        </div>
        <div className="rounded-lg border border-neutral-3 p-4">
          <span className="text-[11px] text-neutral-7">In Review</span>
          <p className="mt-1 text-xl font-semibold text-neutral-12">{byStage("review")}</p>
        </div>
      </div>
      <div className="rounded-lg border border-neutral-3 p-4">
        <span className="text-[11px] text-neutral-7">Description</span>
        <p className="mt-2 text-sm text-neutral-10">No description added yet.</p>
      </div>
    </div>
  );
}

/* ── Releases ── */
function ReleasesTab({ units }: { units: Unit[] }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const selectUnit = useContentStore((s) => s.selectUnit);

  // Split units into upcoming (ready/review) and drafts
  const upcoming = units.filter((u) => u.unit_details.stage === "ready" || u.unit_details.stage === "review");
  const drafts = units.filter((u) => u.unit_details.stage === "draft");

  return (
    <div className="flex h-full flex-col">
      {/* Upcoming + Draft summary */}
      <div className="grid grid-cols-2 gap-3 px-6 pt-4">
        <div className="flex flex-col gap-2.5 rounded-lg border border-neutral-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-12">Upcoming</p>
              <p className="text-[11px] text-neutral-7">{upcoming.length} unit{upcoming.length !== 1 ? "s" : ""} ready or in review</p>
            </div>
          </div>
          <div className="flex gap-2">
            {upcoming.slice(0, 3).map((u) => {
              const d = u.unit_details;
              const dateStr = new Date(d.publishing_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <button
                  key={d.unit_id}
                  onClick={() => selectUnit(d.unit_id)}
                  className="flex aspect-[3/4] w-14 flex-col items-center justify-center gap-1 rounded-md border border-neutral-4 bg-neutral-2 transition-colors hover:border-neutral-6"
                >
                  <span className="text-[9px] text-neutral-8">{postTypeLabel(d.post_type)}</span>
                  <span className="text-[8px] text-neutral-6">{dateStr}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-lg border border-neutral-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Radio className="h-4 w-4 shrink-0 text-green-400" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-neutral-12">Drafts</p>
              <p className="text-[11px] text-neutral-7">{drafts.length} unit{drafts.length !== 1 ? "s" : ""} in progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            {drafts.slice(0, 3).map((u) => {
              const d = u.unit_details;
              return (
                <button
                  key={d.unit_id}
                  onClick={() => selectUnit(d.unit_id)}
                  className="flex aspect-[3/4] w-14 items-center justify-center rounded-md border border-neutral-4 bg-neutral-2 transition-colors hover:border-neutral-6"
                >
                  <span className="text-[9px] text-neutral-8">{postTypeLabel(d.post_type)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 px-6 pb-3 pt-4">
        <button
          onClick={() => setView("grid")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            view === "grid" ? "bg-neutral-3 text-neutral-12" : "text-neutral-7 hover:text-neutral-10"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            view === "list" ? "bg-neutral-3 text-neutral-12" : "text-neutral-7 hover:text-neutral-10"
          )}
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>

      {units.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-neutral-7">No units found</span>
        </div>
      )}

      {units.length > 0 && view === "grid" && (
        <div className="grid grid-cols-4 gap-3 px-6 pb-6">
          {units.map((unit) => {
            const d = unit.unit_details;
            const channels = unit.unit_data.map((ud) => ud.channel_info.name).join(", ");
            return (
              <button
                key={d.unit_id}
                onClick={() => selectUnit(d.unit_id)}
                className="group flex flex-col overflow-hidden rounded-lg border border-neutral-3 text-left transition-colors hover:border-neutral-5"
              >
                <div className="flex aspect-[3/4] items-center justify-center bg-neutral-2">
                  <span className="text-xs text-neutral-6">{postTypeLabel(d.post_type)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-neutral-12">
                      {d.main_caption.slice(0, 30)}{d.main_caption.length > 30 ? "…" : ""}
                    </p>
                    <p className="text-[10px] text-neutral-7">{channels}</p>
                  </div>
                  <Badge className={cn("text-[10px]", stageBadgeClass[d.stage])}>
                    {d.stage}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {units.length > 0 && view === "list" && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-3">
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-8">Content Type</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-8">Channels</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-8">Stage</th>
              <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-8">Publish Date</th>
              <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-8">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <UnitRow key={unit.unit_details.unit_id} unit={unit} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Thread ── */
function ThreadTab() {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h3 className="text-sm font-semibold text-neutral-12">Thread</h3>
      <div className="flex flex-col gap-2">
        {[
          { name: "Alex", time: "2h ago", text: "Updated the intro sequence" },
          { name: "Jordan", time: "5h ago", text: "Uploaded new b-roll footage" },
          { name: "Sam", time: "1d ago", text: "Created this production" },
        ].map((msg, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-neutral-3 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-3 text-[10px] font-bold text-neutral-11">
              {msg.name[0]}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-12">{msg.name}</span>
                <span className="text-[10px] text-neutral-7">{msg.time}</span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-10">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-4 px-3 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-neutral-7" />
        <span className="text-xs text-neutral-7">Write a message...</span>
      </div>
    </div>
  );
}

/* ── Crew ── */
function CrewTab() {
  const members = [
    { name: "Alex Chen", role: "Producer" },
    { name: "Jordan Lee", role: "Editor" },
    { name: "Sam Rivera", role: "Camera" },
  ];

  return (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-12">Crew</h3>
        <button className="flex items-center gap-1.5 rounded-md bg-neutral-3 px-3 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-4">
          <UserPlus className="h-3 w-3" />
          Invite
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {members.map((m) => (
          <div key={m.name} className="flex items-center justify-between rounded-lg border border-neutral-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-3 text-[10px] font-bold text-neutral-11">
                {m.name[0]}
              </div>
              <span className="text-sm text-neutral-12">{m.name}</span>
            </div>
            <span className="text-xs text-neutral-7">{m.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared row ── */
function UnitRow({ unit }: { unit: Unit }) {
  const selectUnit = useContentStore((s) => s.selectUnit);
  const d = unit.unit_details;
  const channels = unit.unit_data.map((ud) => ud.channel_info.name).join(", ");
  const dateStr = new Date(d.publishing_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <tr
      onClick={() => selectUnit(d.unit_id)}
      className="cursor-pointer border-b border-neutral-3/50 transition-colors hover:bg-neutral-3/20"
    >
      <td className="px-6 py-3">
        <span className="text-sm text-neutral-12">{postTypeLabel(d.post_type)}</span>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-neutral-10">{channels}</span>
      </td>
      <td className="px-6 py-3">
        <Badge className={cn("text-[10px]", stageBadgeClass[d.stage])}>
          {d.stage}
        </Badge>
      </td>
      <td className="px-6 py-3">
        <span className="text-sm text-neutral-10 font-mono">{dateStr}</span>
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); selectUnit(d.unit_id); }}
            className="flex items-center gap-1.5 rounded-md bg-neutral-3 px-3 py-1.5 text-xs font-medium text-neutral-12 transition-colors hover:bg-neutral-4"
          >
            <ExternalLink className="h-3 w-3" />
            open
          </button>
        </div>
      </td>
    </tr>
  );
}
