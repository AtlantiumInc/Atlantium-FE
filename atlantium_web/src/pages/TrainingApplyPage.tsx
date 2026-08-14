import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PublicNavbar } from "@/components/PublicNavbar";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * The cohort application.
 *
 * Deliberately does not show a price — tuition is set on the call, where the
 * grant can be offered as good news instead of read as a discount. The form's
 * job is a phone number and enough context to make that call worth both
 * people's time. Public: most leads arrive from the job board, logged out.
 */
const CURRENT_ROLES = [
  { value: "engineer", label: "Software engineer" },
  { value: "tech_adjacent", label: "Tech-adjacent (PM, data, IT, design)" },
  { value: "career_change", label: "Changing careers into tech" },
  { value: "student", label: "Student / recent grad" },
  { value: "between", label: "Between roles right now" },
];

export function TrainingApplyPage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [goal, setGoal] = useState("");
  const [commitment, setCommitment] = useState<"yes" | "unsure" | "">("");
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

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
        kind: "ai_engineering_cohort",
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
      setDone(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that — try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />
      <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-28">
        {done ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-6 py-12 text-center">
            <PhoneCall className="mx-auto mb-4 h-8 w-8 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">You're in the queue</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Kleveland calls every applicant personally — usually the same day.
              Keep your phone close; the call covers the program, your goals,
              and tuition, including Atlanta Builder Grants.
            </p>
            <Link to="/training">
              <Button variant="outline" className="mt-6 gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to the program
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Link to="/training" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> AI Engineering Intensive
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Apply for Cohort 1</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              12 seats. Tuition varies — Atlanta Builder Grants cover up to half,
              and a couple of full seats each cohort. We go over it on your call.
            </p>

            <div className="mt-8 space-y-5">
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
                <div className="flex gap-1.5">
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
          </>
        )}
      </div>
    </div>
  );
}

export default TrainingApplyPage;
