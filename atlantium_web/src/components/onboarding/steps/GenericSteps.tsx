import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Building2, Check, Loader2, Search } from "lucide-react";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { api, type DirectoryEntry } from "../../../lib/api";
import type { StepDef } from "../../../lib/onboarding-steps";
import { cn } from "../../../lib/utils";

/**
 * The four shapes nearly every question takes.
 *
 * Each screen used to be its own component, which is why the flow was fourteen
 * files long and why adding a persona branch meant writing five more. A
 * question that is "pick one of these" is now data, and only the steps that
 * genuinely behave differently — identity, the org picker, seeking, pricing —
 * still get code of their own.
 */
type Common = {
  step: StepDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
};

export function StepHeader({ step }: { step: StepDef }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-bold tracking-tight">{step.question}</h2>
      {step.help && <p className="text-muted-foreground">{step.help}</p>}
    </div>
  );
}

export function ChoiceStep({ step, value, error, onChange }: Common) {
  return (
    <div className="space-y-6">
      <StepHeader step={step} />
      <div className="space-y-2">
        {step.options?.map((option, i) => {
          const selected = value === option.value;
          return (
            <motion.button
              key={option.value}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border/60 hover:border-border hover:bg-muted/40",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{option.label}</p>
                {option.hint && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{option.hint}</p>
                )}
              </div>
              {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </motion.button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function MultiStep({ step, value, error, onChange }: Common) {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <div className="space-y-6">
      <StepHeader step={step} />
      <div className="flex flex-wrap gap-2">
        {step.options?.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggle(option.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                on
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function TextStep({ step, value, error, onChange }: Common) {
  const text = typeof value === "string" ? value : "";
  return (
    <div className="space-y-6">
      <StepHeader step={step} />
      {step.multiline ? (
        <Textarea
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          rows={5}
          className="resize-none"
          autoFocus
        />
      ) : (
        <Input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={step.placeholder}
          className="h-12 text-base"
          autoFocus
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/**
 * The org picker.
 *
 * Members never free-create organizations (plan §4.1) — this either points at
 * something already in the catalog or proposes one for review. Either way the
 * affiliation shows up unverified until a human approves the claim, so nothing
 * here grants anything on its own.
 */
export function OrgStep({
  step,
  value,
  error,
  onChange,
  title,
  onTitleChange,
  proposedName,
  onProposedNameChange,
  pickedName,
  onPickedNameChange,
}: Common & {
  title?: string;
  onTitleChange?: (v: string) => void;
  proposedName?: string;
  onProposedNameChange?: (v: string) => void;
  pickedName?: string;
  onPickedNameChange?: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Seeded from the answer already on file, so coming back to this step — or
  // reloading mid-flow — shows the company they chose rather than a blank box.
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(
    value && pickedName ? { id: String(value), name: pickedName } : null,
  );

  useEffect(() => {
    if (picked || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { entries } = await api.getDirectory({
          kind: "company", q: query.trim(), name_only: "1", limit: 6,
        });
        setResults(entries);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, picked]);

  const pick = (entry: DirectoryEntry) => {
    setPicked(entry);
    onChange(entry.id);
    onPickedNameChange?.(entry.name);
    onProposedNameChange?.("");
  };

  const clear = () => {
    setPicked(null);
    setQuery("");
    onChange(undefined);
    onPickedNameChange?.("");
  };

  return (
    <div className="space-y-6">
      <StepHeader step={step} />

      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <Building2 className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{picked.name}</p>
          <button type="button" onClick={clear} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies…"
              className="h-12 pl-9 text-base"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>

          {results.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border/50">
              {results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => pick(entry)}
                  className="flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left last:border-0 hover:bg-muted/50"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Not in the catalog is not a dead end — the reviewer adds it. */}
          {query.trim().length >= 2 && !isSearching && results.length === 0 && (
            <div className="space-y-2 rounded-xl border border-dashed border-border/50 p-4">
              <p className="text-xs text-muted-foreground">
                Not listed yet — we'll add it when we review your claim.
              </p>
              <Input
                value={proposedName || query}
                onChange={(e) => onProposedNameChange?.(e.target.value)}
                placeholder="Company name"
              />
            </div>
          )}
        </>
      )}

      {step.withTitle && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Your title</label>
          <Input
            value={title ?? ""}
            onChange={(e) => onTitleChange?.(e.target.value)}
            placeholder="Staff engineer"
            className="h-11"
          />
        </div>
      )}

      {step.noOrgLabel && !picked && (
        <button
          type="button"
          onClick={clear}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {step.noOrgLabel}
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
