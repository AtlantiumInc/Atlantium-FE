import { MemberShell } from "@/components/MemberShell";
import { PartnersPanel } from "@/components/pages/PartnersPanel";

export function PartnersRoutePage() {
  return (
    <MemberShell>
      <div className="mx-auto max-w-5xl">
        <PartnersPanel />
      </div>
    </MemberShell>
  );
}

export default PartnersRoutePage;
