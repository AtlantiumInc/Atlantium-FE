import { FlaskConical } from "lucide-react";
import { MemberShell } from "@/components/MemberShell";

export function PlaygroundRoutePage() {
  return (
    <MemberShell>
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Playground</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Project and AI assistant tools will come back into this shell without blocking auth.
            </p>
          </div>
        </div>
      </div>
    </MemberShell>
  );
}

export default PlaygroundRoutePage;
