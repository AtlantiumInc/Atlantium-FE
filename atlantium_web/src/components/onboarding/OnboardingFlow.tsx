import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "../../contexts/AuthContext";
import { useOnboardingForm } from "../../hooks/useOnboardingForm";
import type { OnboardingFormData } from "../../lib/onboarding-schema";
import {
  CHECK_BANDS,
  PERSONA_FOR_BRANCH,
  type Branch,
  type StepDef,
} from "../../lib/onboarding-steps";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { OnboardingProgress } from "./OnboardingProgress";

import { StepName } from "./steps/StepName";
import { StepAvatar } from "./steps/StepAvatar";
import { StepSeeking } from "./steps/StepSeeking";
import { StepPricing } from "./steps/StepPricing";
import { ChoiceStep, MultiStep, OrgStep, TextStep } from "./steps/GenericSteps";

type RenderArgs = {
  step: React.ReactNode;
  nav: React.ReactNode;
  progress: React.ReactNode;
  formData: Partial<OnboardingFormData>;
  /** 1-based position in the steps this member actually sees. */
  currentStep: number;
  stepId?: string;
};

type Props = {
  onComplete?: () => void;
  render?: (args: RenderArgs) => React.ReactNode;
};

/**
 * The member questionnaire.
 *
 * Which questions get asked is decided by `onboarding-steps.ts`; this component
 * renders whichever step the hook says is current and, at the end, turns the
 * answers into the rows that actually do something — a persona, an affiliation
 * claim, and the branch detail that routes the member to other people.
 */
export function OnboardingFlow({ onComplete, render }: Props) {
  const { user, checkAuth } = useAuth();

  const userAny = user as unknown as Record<string, unknown> | null;
  const profile = userAny?._profile as Record<string, unknown> | undefined;
  const googleAvatarUrl = user?.avatar || (profile?.avatar_url as string);

  const handleComplete = useCallback(
    async (data: OnboardingFormData) => {
      const {
        first_name, last_name, avatar_url, membership_tier, headline, ...rest
      } = data;

      const display_name = [first_name, last_name].filter(Boolean).join(" ");

      await api.updateProfile({
        first_name,
        last_name,
        display_name,
        avatar_url: avatar_url || googleAvatarUrl || null,
        // The headline is the sentence under their name everywhere, so it goes
        // in the profile column the network already reads — not into the
        // questionnaire blob where nothing would ever look for it.
        bio: headline?.trim() || (profile?.bio as string) || null,
        location: (profile?.location as string) || null,
        website_url: (profile?.website_url as string) || null,
        linkedin_url: (profile?.linkedin_url as string) || null,
        registration_details: {
          ...rest,
          headline,
          membership_tier,
          is_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        },
      });

      // Everything below is best-effort on purpose: a member who has answered
      // the questionnaire is done, and a failure here must not send them back
      // through it. Anything that doesn't land can be set from their profile.
      const branch = data.branch as Branch | undefined;
      if (!branch) {
        await checkAuth();
        onComplete?.();
        return;
      }

      try {
        const persona = PERSONA_FOR_BRANCH[branch];
        const { roles } = await api.createMemberRole({
          role: persona,
          is_primary: true,
          // The affiliation only attaches to an entry that already exists;
          // a proposed name goes through the claim queue below instead.
          entry_id: data.org_entry_id ?? undefined,
          title: data.org_title?.trim() || null,
        });

        const role = roles.find((r) => r.role === persona);
        if (role) {
          if (branch === "professional" && data.seeking) {
            await api.updateSeeking(role.id, {
              seeking: data.seeking,
              // Absent an explicit choice this stays matched_only — the server
              // default. We never widen visibility on the member's behalf.
              ...(data.seeking_visibility ? { visibility: data.seeking_visibility } : {}),
            });
          }

          const details = detailsFor(branch, data);
          if (details) await api.updateRoleDetails(role.id, details);
        }

        // An org the member named but couldn't find, or one they can only claim
        // with review, becomes a request rather than a silent no-op.
        const relationshipFor: Record<Branch, string> = {
          professional: "employee",
          founder: "founder",
          investor: "representative",
          advisor: "employee",
          hiring: "recruiter",
        };
        const claimsAuthority = branch === "founder" || branch === "investor" || branch === "hiring";
        if (data.org_proposed_name?.trim()) {
          await api.requestOrgClaim({
            proposed_name: data.org_proposed_name.trim(),
            relationship: relationshipFor[branch],
            evidence: "Named during onboarding.",
          });
        } else if (data.org_entry_id && claimsAuthority) {
          await api.requestOrgClaim({
            entry_id: data.org_entry_id,
            relationship: relationshipFor[branch],
            evidence: "Claimed during onboarding.",
          });
        }
      } catch (error) {
        console.error("Persona/affiliation save failed; questionnaire was saved", error);
      }

      await checkAuth();
      onComplete?.();
    },
    [googleAvatarUrl, checkAuth, onComplete, profile],
  );

  const {
    step,
    stepIndex,
    formData,
    errors,
    isSubmitting,
    isLastStep,
    canGoBack,
    visibleStepNumber,
    totalVisibleSteps,
    updateField,
    nextStep,
    prevStep,
    submit,
  } = useOnboardingForm({
    initialData: {
      first_name: user?.first_name || (profile?.first_name as string) || "",
      last_name: user?.last_name || (profile?.last_name as string) || "",
      phone_number: "",
      avatar_url: googleAvatarUrl || "",
    },
    onComplete: handleComplete,
  });

  const handleNext = useCallback(async () => {
    if (!isLastStep) {
      nextStep();
      return;
    }
    try {
      await submit();
    } catch (error) {
      console.error("Onboarding error:", error);
      toast.error("Something went wrong. Please try again.");
    }
  }, [isLastStep, nextStep, submit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey) return;
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      e.preventDefault();
      void handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext]);

  const stepProps = { formData, errors, onUpdate: updateField };
  const field = step?.field as keyof OnboardingFormData | undefined;
  const value = field ? formData[field] : undefined;
  const setValue = (v: unknown) => field && updateField(field, v as never);
  // Offering "Skip" next to an answer they just gave reads as though the answer
  // didn't take.
  const stepAnswered = step?.kind === "org"
    ? Boolean(formData.org_entry_id || formData.org_none || formData.org_proposed_name?.trim())
    : Boolean(field && formData[field]);

  const stepNode = !step ? null : (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18 }}
    >
      {renderStep(step)}
    </motion.div>
  );

  function renderStep(def: StepDef) {
    switch (def.kind) {
      case "identity":
        return (
          <div className="space-y-8">
            <StepName {...stepProps} />
            <StepAvatar {...stepProps} googleAvatarUrl={googleAvatarUrl} />
          </div>
        );
      case "seeking":
        return <StepSeeking {...stepProps} />;
      case "pricing":
        return <StepPricing {...stepProps} />;
      case "multi":
        return <MultiStep step={def} value={value} error={errors[def.field ?? ""]} onChange={setValue} />;
      case "text":
        return <TextStep step={def} value={value} error={errors[def.field ?? ""]} onChange={setValue} />;
      case "org":
        return (
          <OrgStep
            step={def}
            value={value}
            error={errors[def.field ?? ""]}
            onChange={setValue}
            title={formData.org_title}
            onTitleChange={(v) => updateField("org_title", v)}
            proposedName={formData.org_proposed_name}
            onProposedNameChange={(v) => updateField("org_proposed_name", v)}
            pickedName={formData.org_name}
            onPickedNameChange={(v) => updateField("org_name", v)}
            noOrg={formData.org_none}
            onNoOrgChange={(v) => updateField("org_none", v)}
          />
        );
      default:
        return <ChoiceStep step={def} value={value} error={errors[def.field ?? ""]} onChange={setValue} />;
    }
  }

  const nav = (
    <div className="flex items-center justify-between pt-4">
      <Button
        type="button"
        variant="ghost"
        onClick={prevStep}
        disabled={!canGoBack || isSubmitting}
        className={canGoBack ? "gap-2" : "gap-2 invisible"}
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <div className="flex items-center gap-2">
        {step?.optional && !isLastStep && !stepAnswered && (
          <Button type="button" variant="ghost" onClick={nextStep} disabled={isSubmitting}>
            Skip
          </Button>
        )}
        <Button type="button" onClick={handleNext} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
          ) : isLastStep ? (
            <>Finish <Check className="h-4 w-4" /></>
          ) : (
            <>Continue <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );

  const progress = (
    <OnboardingProgress currentStep={visibleStepNumber} totalSteps={totalVisibleSteps} />
  );

  if (render) {
    return <>{render({ step: stepNode, nav, progress, formData, currentStep: stepIndex + 1, stepId: step?.id })}</>;
  }

  return (
    <div className="space-y-6">
      {progress}
      <AnimatePresence mode="wait">{stepNode}</AnimatePresence>
      {nav}
    </div>
  );
}

/** Turns branch answers into the payload the role-details endpoint accepts. */
function detailsFor(branch: Branch, data: OnboardingFormData) {
  switch (branch) {
    case "founder":
      return {
        ...(data.venture_stage ? { venture_stage: data.venture_stage } : {}),
        ...(data.needs?.length ? { needs: data.needs } : {}),
      };
    case "investor": {
      const band = data.check_band ? CHECK_BANDS[data.check_band] : undefined;
      return {
        ...(band?.min != null ? { check_min: band.min } : {}),
        ...(band?.max != null ? { check_max: band.max } : {}),
        ...(data.focus_stages?.length ? { focus_stages: data.focus_stages } : {}),
        ...(data.intro_appetite ? { intro_appetite: data.intro_appetite } : {}),
      };
    }
    case "advisor":
      return {
        ...(data.domains?.length ? { domains: data.domains } : {}),
        ...(data.engagement?.length ? { engagement: data.engagement } : {}),
        ...(data.availability ? { availability: data.availability } : {}),
      };
    case "hiring": {
      const roles = (data.hiring_roles_text ?? "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean)
        .slice(0, 12);
      return {
        ...(roles.length ? { hiring_roles: roles } : {}),
        ...(data.hiring_contact ? { hiring_contact: data.hiring_contact } : {}),
      };
    }
    default:
      return null;
  }
}
