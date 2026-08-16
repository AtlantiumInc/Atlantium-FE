import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, Loader2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * The cohort application, inline on /training — applying happens where the
 * pitch is, not on a separate page.
 *
 * No price shown: tuition is set on the call, where the grant is good news
 * rather than a discount. The form remembers an application — server-side for
 * members, localStorage for guests — so coming back never shows a blank form
 * that looks like it swallowed your submission.
 */
const KIND = "ai_engineering_cohort";
const APPLIED_KEY = `atlantium_applied_${KIND}`;

const CURRENT_ROLES = [
  { value: "engineer", label: "Software engineer" },
  { value: "tech_adjacent", label: "Tech-adjacent (PM, data, IT, design)" },
  { value: "career_change", label: "Changing careers into tech" },
  { value: "student", label: "Student / recent grad" },
  { value: "between", label: "Between roles right now" },
];

export function ApplyForm() {
  const { user } = useAuth();
  const profile = (user as unknown as Record<string, unknown> | null)?._profile as
    | Record<string, unknown>
    | undefined;
  const registration = (profile?.registration_details ?? {}) as Record<string, unknown>;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [goal, setGoal] = useState("");
  const [commitment, setCommitment] = useState<"yes" | "unsure" | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [state, setState] = useState<"loading" | "form" | "applied" | "enrolled">("loading");

  // A member's contact details are already on file — don't make them retype
  // what we know.
  useEffect(() => {
    if (user?.display_name && !name) setName(user.display_name);
    if (user?.email && !email) setEmail(user.email);
    const knownPhone = registration.phone_number;
    if (typeof knownPhone === "string" && knownPhone && !phone) setPhone(knownPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (user) {
        try {
          const { request } = await api.getMyServiceRequest(KIND);
          if (cancelled) return;
          if (request) {
            setState(request.status === "paid" || request.status === "fulfilled" ? "enrolled" : "applied");
            return;
          }
        } catch {
          // Status check failing must never block applying.
        }
      } else if (localStorage.getItem(APPLIED_KEY)) {
        setState("applied");
        return;
      }
      if (!cancelled) setState("form");
    })();
    return () => { cancelled = true; };
  }, [user]);

  const submit = async () => {
    if (name.trim().length < 2 || !email.includes("@") || phone.trim().length < 7) {
      toast.error("Name, email and phone — that's how we reach you.");
      return;
    }
    if (!currentRole || !commitment) {
      toast.error("Two quick picks left — where you are now, and the 8 weeks.");
      return;
    }
    setIsSaving(true);
    try {
      await api.submitServiceRequest({
        kind: KIND,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        answers: {
          current_role: currentRole,
          goal: goal.trim(),
          commitment,
          heard_from: "training_page",
        },
      });
      localStorage.setItem(APPLIED_KEY, "1");
      setState("applied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that — try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (state === "enrolled") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-12 text-center">
        <GraduationCap className="mx-auto mb-4 h-8 w-8 text-emerald-400" />
        <h3 className="text-2xl font-bold tracking-tight">You're enrolled</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Your seat in Cohort 1 is confirmed. Watch your email for the schedule —
          and your office-hours access starts now, not on day one.
        </p>
      </div>
    );
  }

  if (state === "applied") {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-6 py-12 text-center">
        <PhoneCall className="mx-auto mb-4 h-8 w-8 text-cyan-400" />
        <h3 className="text-2xl font-bold tracking-tight">You're in the queue</h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Kleveland calls every applicant personally — usually the same day.
          Keep your phone close; the call covers the program, your goals, and
          tuition, including Atlanta Builder Grants.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(404) 555-0100" />
          <p className="text-xs text-muted-foreground">The application IS the call — this is how we reach you.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Where are you now?</label>
          <div className="flex flex-wrap gap-1.5">
            {CURRENT_ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setCurrentRole(r.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  currentRole === r.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">What job do you want out of this?</label>
          <Textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            placeholder="AI engineer at an Atlanta startup; bringing AI into my current company; first dev role…"
            className="resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">8 weeks, live sessions, a real client build. Can you commit?</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { value: "yes" as const, label: "Yes — I'll be there" },
              { value: "unsure" as const, label: "Need to talk it through" },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setCommitment(o.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  commitment === o.value
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={submit} disabled={isSaving} size="lg" className="w-full gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Request my call
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No payment now. No obligation — the call is a fit conversation, both ways.
        </p>
      </div>
    </div>
  );
}
